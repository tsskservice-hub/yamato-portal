-- =====================================================================
-- 07: クレジット履歴に「増減後の残高（balance_after）」を記録する
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: ポータル（my-account の残高列）を公開する「前」
--   （列の追加・関数の置き換え・過去データの補完だけ。今のポータルの動作は変わらない）
-- 1 回だけ実行する。全体が 1 つのトランザクションなので、途中で失敗したら何も変わらない。
--
-- 事前確認済み（2026-11-14）:
--   - profiles.credits の既定値は 10（新規登録ボーナス。これまで履歴に記録されていなかった）
--   - credit_transactions の制約は主キーと外部キーだけ。トリガーなし
--   - preview の 1000 クレジット購入は履歴に記録済み。残り 4 の差は原因不明（管理画面での直接変更と思われる）
-- =====================================================================

begin;

-- 補完の途中で新しい履歴が書き込まれないようにする（このトランザクションの間だけ）
lock table public.credit_transactions in exclusive mode;

-- ---------------------------------------------------------------------
-- 1. 列の追加
-- ---------------------------------------------------------------------
alter table public.credit_transactions add column if not exists balance_after integer;

-- ---------------------------------------------------------------------
-- 2. クレジットを変える関数が balance_after も記録するようにする
--    （中身は 01 / 03 / 04 と同じ。insert に balance_after を足しただけ）
-- ---------------------------------------------------------------------

-- 2-1. 消費（03 と同じ）
create or replace function public.consume_credits(p_user_id uuid, p_amount integer, p_feature text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
  current_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.profiles
     set credits = credits - p_amount
   where id = p_user_id
     and credits >= p_amount
  returning credits into new_balance;

  if not found then
    select coalesce(credits, 0) into current_balance from public.profiles where id = p_user_id;
    return json_build_object('ok', false, 'balance', coalesce(current_balance, 0));
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (p_user_id, -p_amount, p_feature, 'Consumed for ' || p_feature || ' execution', new_balance);

  return json_build_object('ok', true, 'balance', new_balance);
end;
$$;

-- 2-2. 返却（03 と同じ）
create or replace function public.refund_credits(p_user_id uuid, p_amount integer, p_feature text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.profiles
     set credits = credits + p_amount
   where id = p_user_id
  returning credits into new_balance;

  if not found then
    return json_build_object('ok', false);
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (p_user_id, p_amount, p_feature, 'Refund: ' || p_feature || ' failed', new_balance);

  return json_build_object('ok', true, 'balance', new_balance);
end;
$$;

-- 2-3. デイリークイズ報酬（01 と同じ）
create or replace function public.claim_daily_quiz_reward()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  new_balance integer;
begin
  if uid is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  update public.profiles
     set credits = coalesce(credits, 0) + 2,
         last_quiz_date = today
   where id = uid
     and (last_quiz_date is null or last_quiz_date::date < today)
  returning credits into new_balance;

  if not found then
    return json_build_object('granted', false);
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (uid, 2, 'daily_quiz', 'Daily quiz reward', new_balance);

  return json_build_object('granted', true, 'credits', new_balance);
end;
$$;

-- 2-4. Stripe 購入（04 と同じ）
create or replace function public.grant_purchase_credits(
  p_user_id uuid,
  p_session_id text,
  p_amount_paid integer,
  p_regular_credits integer,
  p_bonus_credits integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := coalesce(p_regular_credits, 0) + coalesce(p_bonus_credits, 0);
  v_purchase_id uuid;
  v_new_balance integer;
begin
  if p_user_id is null or p_session_id is null or p_session_id = '' then
    raise exception 'INVALID_ARGUMENTS';
  end if;
  if v_total <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.purchases (user_id, stripe_session_id, amount_paid, credits_granted, regular_credits, bonus_credits)
  values (p_user_id, p_session_id, coalesce(p_amount_paid, 0), v_total, coalesce(p_regular_credits, 0), coalesce(p_bonus_credits, 0))
  on conflict (stripe_session_id) do nothing
  returning id into v_purchase_id;

  if v_purchase_id is null then
    return json_build_object('granted', false, 'reason', 'ALREADY_PROCESSED');
  end if;

  update public.profiles
     set credits = coalesce(credits, 0) + v_total
   where id = p_user_id
  returning credits into v_new_balance;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (p_user_id, v_total, 'credit_charge', 'Stripe purchase ' || p_session_id, v_new_balance);

  return json_build_object('granted', true, 'credits', v_new_balance);
end;
$$;

-- 2-5. 新規登録（今の handle_new_user と同じ。新しく行を作ったときだけ Welcome bonus を履歴に記録する）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_credits integer;
  v_inserted boolean;
begin
  insert into public.profiles (id, email, nickname, learning_pace)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', 'sample'),
    'normal'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    learning_pace = coalesce(public.profiles.learning_pace, excluded.learning_pace)
  returning credits, (xmax = 0) into v_credits, v_inserted;

  -- 新規作成（既定値のクレジットが入った）ときだけ記録。既存行の更新では何もしない
  if v_inserted and coalesce(v_credits, 0) > 0 then
    insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
    values (new.id, v_credits, 'welcome_bonus', 'Welcome bonus', v_credits);
  end if;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------
-- 3. 抜けている履歴の補完
-- ---------------------------------------------------------------------

-- 3-1. 全員に Welcome bonus（既定値 10）を登録日時で追加（すでにある人は除く）
insert into public.credit_transactions (user_id, amount, feature_used, description, created_at)
select p.id, 10, 'welcome_bonus', 'Welcome bonus', p.created_at
from public.profiles p
where not exists (
  select 1 from public.credit_transactions t
  where t.user_id = p.id and t.feature_used = 'welcome_bonus'
);

-- 3-2. それでも今の残高と合わない分を、登録の 1 秒後に「Balance adjustment」として 1 行追加
insert into public.credit_transactions (user_id, amount, feature_used, description, created_at)
select p.id,
       p.credits - coalesce(s.total, 0),
       'balance_adjustment',
       'Balance adjustment (changes made before history was recorded)',
       p.created_at + interval '1 second'
from public.profiles p
left join (
  select user_id, sum(amount) as total
  from public.credit_transactions
  group by user_id
) s on s.user_id = p.id
where p.credits <> coalesce(s.total, 0);

-- ---------------------------------------------------------------------
-- 4. 過去の行の balance_after を、古い順に足し上げて埋める
-- ---------------------------------------------------------------------
update public.credit_transactions t
   set balance_after = r.running
  from (
    select id,
           sum(amount) over (partition by user_id order by created_at, id
                             rows between unbounded preceding and current row) as running
    from public.credit_transactions
  ) r
 where t.id = r.id
   and t.balance_after is null;

commit;

-- ---------------------------------------------------------------------
-- 確認用: 3 行とも 0 なら成功
-- ---------------------------------------------------------------------
select 'users whose history total <> credits (expect 0)' as item, count(*)::text as value
from (
  select p.id
  from public.profiles p left join public.credit_transactions t on t.user_id = p.id
  group by p.id, p.credits
  having p.credits <> coalesce(sum(t.amount), 0)
) x
union all
select 'rows without balance_after (expect 0)', count(*)::text
from public.credit_transactions where balance_after is null
union all
select 'users whose latest balance_after <> credits (expect 0)', count(*)::text
from public.profiles p
join lateral (
  select balance_after from public.credit_transactions t
  where t.user_id = p.id
  order by created_at desc, id desc
  limit 1
) last on true
where last.balance_after <> p.credits;
