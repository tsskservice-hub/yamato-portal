-- =====================================================================
-- 01: 今日のクイズの報酬（+2 クレジット）をサーバー側で付与する関数
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: ポータルの修正を公開する「前」（追加するだけなので、今の動作は変わらない）
-- =====================================================================

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

  -- 今日まだ受け取っていない場合だけ +2（同時に押されても1回しか通らない）
  update public.profiles
     set credits = coalesce(credits, 0) + 2,
         last_quiz_date = today
   where id = uid
     and (last_quiz_date is null or last_quiz_date::date < today)
  returning credits into new_balance;

  if not found then
    return json_build_object('granted', false);
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description)
  values (uid, 2, 'daily_quiz', 'Daily quiz reward');

  return json_build_object('granted', true, 'credits', new_balance);
end;
$$;

-- ログインした利用者だけが呼べるようにする
revoke all on function public.claim_daily_quiz_reward() from public, anon;
grant execute on function public.claim_daily_quiz_reward() to authenticated;
