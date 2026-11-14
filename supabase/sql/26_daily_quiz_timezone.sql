-- =====================================================================
-- 26: デイリークイズの「1日」をユーザーごとのタイムゾーンで区切る
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度実行しても安全。
--
-- これまで: 今日の日付を UTC で決めていたため、メルボルン（夏時間 UTC+11）では午前11時まで翌日にならなかった。
-- これから:
--   * profiles.timezone（例: 'Australia/Melbourne'）に各ユーザーの地域を保存し、その地域の真夜中で日付が変わる。
--     未設定の人は今までどおり UTC。ブラウザが最初に開いたときに自動で埋める（set_my_timezone）。
--   * タイムゾーンの変更は 30 日に 1 回まで（地域を切り替えて 1 日に何回も報酬を得るのを防ぐ）。
--     最初の自動設定は回数に数えない。
--   * 念のため、前回の受け取りから 8 時間はあける（夜に解いて翌朝に解く、は問題なくできる）。
--   * 「今日はもう解いたか」と「次のクイズまでの秒数」はサーバーが返す（get_daily_quiz_status）。
--     ブラウザの時計は判定に使わない。
--
-- 07 の claim_daily_quiz_reward を置き換える。クレジットの変更と credit_transactions への記録は 07 と同じ形。
-- profiles.timezone などはブラウザから直接書けない（02 で列ごとの update 権限を絞っている。ここでも付けない）。
-- =====================================================================

-- 1. 列の追加
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists timezone_changed_at timestamptz;
alter table public.profiles add column if not exists last_quiz_at timestamptz;

-- 2. これまでの受け取り時刻を履歴から埋める（切り替え当日に 2 回受け取れてしまうのを 8 時間ルールで防ぐため）
update public.profiles p
   set last_quiz_at = t.last_at
  from (
    select user_id, max(created_at) as last_at
      from public.credit_transactions
     where feature_used = 'daily_quiz'
     group by user_id
  ) t
 where t.user_id = p.id
   and p.last_quiz_at is null;

-- 3. 共通: 次にクイズを受け取れる時刻（その地域の翌日 0 時と、前回 + 8 時間の遅いほう）
create or replace function public._daily_quiz_next_at(p_tz text, p_last_date date, p_last_at timestamptz)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select greatest(
    case
      when p_last_date is null then now()
      else ((p_last_date + 1)::timestamp at time zone coalesce(p_tz, 'UTC'))
    end,
    coalesce(p_last_at + interval '8 hours', now())
  );
$$;
revoke all on function public._daily_quiz_next_at(text, date, timestamptz) from public, anon, authenticated;

-- 4. タイムゾーンの設定・変更
--    結果: {ok: true, timezone} / {ok: false, error: 'INVALID_TIMEZONE' | 'TOO_SOON', next_change_at}
create or replace function public.set_my_timezone(p_timezone text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur_tz text;
  changed_at timestamptz;
begin
  if uid is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  if p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then
    return json_build_object('ok', false, 'error', 'INVALID_TIMEZONE');
  end if;

  select timezone, timezone_changed_at into cur_tz, changed_at
    from public.profiles where id = uid for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  -- 同じ値なら何もしない
  if cur_tz = p_timezone then
    return json_build_object('ok', true, 'timezone', cur_tz);
  end if;

  -- 最初の設定（未設定 → 設定）は 30 日ルールの対象外
  if cur_tz is null then
    update public.profiles set timezone = p_timezone where id = uid;
    return json_build_object('ok', true, 'timezone', p_timezone);
  end if;

  if changed_at is not null and changed_at > now() - interval '30 days' then
    return json_build_object('ok', false, 'error', 'TOO_SOON',
                             'next_change_at', changed_at + interval '30 days');
  end if;

  update public.profiles
     set timezone = p_timezone,
         timezone_changed_at = now()
   where id = uid;

  return json_build_object('ok', true, 'timezone', p_timezone);
end;
$$;

-- 5. 今日のクイズの状態
--    結果: {completed, seconds_until_next, timezone, timezone_changed_at, next_timezone_change_at}
create or replace function public.get_daily_quiz_status()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p record;
  next_at timestamptz;
begin
  if uid is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  select timezone, timezone_changed_at, last_quiz_date::date as last_date, last_quiz_at
    into p
    from public.profiles where id = uid;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  next_at := public._daily_quiz_next_at(p.timezone, p.last_date, p.last_quiz_at);

  return json_build_object(
    'completed', next_at > now(),
    'seconds_until_next', greatest(0, ceil(extract(epoch from (next_at - now()))))::integer,
    'timezone', p.timezone,
    'timezone_changed_at', p.timezone_changed_at,
    'next_timezone_change_at', case when p.timezone_changed_at is null then null
                                    else p.timezone_changed_at + interval '30 days' end
  );
end;
$$;

-- 6. デイリークイズ報酬（07 を置き換え）
--    結果: {granted: true, credits, seconds_until_next} / {granted: false, seconds_until_next}
create or replace function public.claim_daily_quiz_reward()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz text;
  today date;
  new_balance integer;
  p record;
begin
  if uid is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(tz, 'UTC');
  today := (now() at time zone tz)::date;

  update public.profiles
     set credits = coalesce(credits, 0) + 2,
         last_quiz_date = today,
         last_quiz_at = now()
   where id = uid
     and (last_quiz_date is null or last_quiz_date::date < today)
     and (last_quiz_at is null or last_quiz_at <= now() - interval '8 hours')
  returning credits into new_balance;

  select last_quiz_date::date as last_date, last_quiz_at into p from public.profiles where id = uid;

  if new_balance is null then
    return json_build_object(
      'granted', false,
      'seconds_until_next', greatest(0, ceil(extract(epoch from
          (public._daily_quiz_next_at(tz, p.last_date, p.last_quiz_at) - now()))))::integer
    );
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (uid, 2, 'daily_quiz', 'Daily quiz reward', new_balance);

  return json_build_object(
    'granted', true,
    'credits', new_balance,
    'seconds_until_next', greatest(0, ceil(extract(epoch from
        (public._daily_quiz_next_at(tz, p.last_date, p.last_quiz_at) - now()))))::integer
  );
end;
$$;

-- 7. 実行権限: ログインユーザーだけ
revoke all on function public.set_my_timezone(text) from public, anon;
revoke all on function public.get_daily_quiz_status() from public, anon;
revoke all on function public.claim_daily_quiz_reward() from public, anon;
grant execute on function public.set_my_timezone(text) to authenticated;
grant execute on function public.get_daily_quiz_status() to authenticated;
grant execute on function public.claim_daily_quiz_reward() to authenticated;

notify pgrst, 'reload schema';

-- 確認用: 列が 3 つ出て、browser_can_update が false なら成功
select column_name,
       has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE') as browser_can_update
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name in ('timezone', 'timezone_changed_at', 'last_quiz_at');
