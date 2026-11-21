-- =====================================================================
-- 44_oral_realtime_sessions.sql
-- EOY Oral Accelerated（OpenAI Realtime で AI ヤマトと自由に話すページ）の 1 回分を記録する
--
-- ・会話を始めるときに 1 回だけクレジットを引き（5 分: 25 / 10 分: 50）、ここに 1 行作る
-- ・OpenAI の会話の ID（call_id）と、終わる時刻（ends_at）を記録する。
--   api の 1 分ごとの定期処理が、時間を過ぎた会話をサーバー側から切る（画面を書き換えても長く使えない）
-- ・同じ人が同時に 2 つの会話をすることはできない
-- ・英語が出た回数（english_leaks）を記録する（「指示だけで日本語を守れるか」を判断するため）
-- ・会話の中身（生徒の声・文字）は保存しない
--
-- 実行するのは api をデプロイする「前」。
-- テーブルと関数は api（service role）だけが使う。ブラウザからは読めない・書けない。
-- =====================================================================

create table if not exists public.oral_realtime_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  minutes integer not null check (minutes in (5, 10)),
  focus text not null default 'free' check (focus in ('free', 'sec1', 'sec2')),
  credits_used integer not null default 0,
  call_id text,
  created_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  english_leaks integer not null default 0,
  feedback_count integer not null default 0,
  feedback_at timestamptz
);

create index if not exists oral_realtime_sessions_user_idx on public.oral_realtime_sessions (user_id, created_at desc);
-- 1 分ごとの定期処理が「まだ切っていない会話」を探すため
create index if not exists oral_realtime_sessions_open_idx on public.oral_realtime_sessions (ends_at)
  where ended_at is null;

alter table public.oral_realtime_sessions enable row level security;

-- ---------------------------------------------------------------------
-- 最後のフィードバックを 1 回分使う（会話を始めてから 3 時間以内・3 回まで）
-- ---------------------------------------------------------------------
create or replace function public.use_oral_realtime_feedback(
  p_session_id uuid,
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.oral_realtime_sessions%rowtype;
begin
  update public.oral_realtime_sessions
     set feedback_count = feedback_count + 1,
         feedback_at = coalesce(feedback_at, now())
   where id = p_session_id
     and user_id = p_user_id
     and feedback_count < 3
     and created_at > now() - interval '3 hours'
  returning * into v_row;

  if not found then
    return null;
  end if;
  return json_build_object('minutes', v_row.minutes, 'focus', v_row.focus);
end;
$$;

revoke all on function public.use_oral_realtime_feedback(uuid, uuid) from public, anon, authenticated;
grant execute on function public.use_oral_realtime_feedback(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------
-- 公開している料金表（PRICE_PLANS / PRICE_PLANS_SANDBOX）に行を足す（すでにあれば何もしない）
-- ---------------------------------------------------------------------
-- バックアップ（kl_app_backup は SQL 34 / 38 で作ったもの。無ければここで作る）
create table if not exists public.kl_app_backup (
  id           bigint generated always as identity primary key,
  key          text not null,
  data         jsonb,
  backed_up_at timestamptz not null default now()
);
alter table public.kl_app_backup enable row level security;
revoke all on public.kl_app_backup from anon, authenticated;

insert into public.kl_app_backup (key, data)
select key, data from public.kl_app where key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX');

update public.kl_app
set data = jsonb_set(
      data,
      '{creditConsumptionGuide}',
      coalesce(data->'creditConsumptionGuide', '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
             'item', 'Voice AI: EOY Oral Accelerated (free conversation)',
             'cost', '25 credits / 5 min, 50 credits / 10 min'
           )),
      true
    ),
    updated_at = now()
where key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(data->'creditConsumptionGuide', '[]'::jsonb)) g
    where g->>'item' ilike 'Voice AI: EOY Oral Accelerated%'
  );

-- 確認: 料金表の最後の行
select k.key, g.value->>'item' as item, g.value->>'cost' as cost
from public.kl_app k,
     jsonb_array_elements(k.data->'creditConsumptionGuide') with ordinality as g(value, ord)
where k.key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
order by k.key, g.ord desc
limit 2;
