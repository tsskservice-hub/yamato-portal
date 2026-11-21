-- =====================================================================
-- 37_kanji_lookups.sql
-- 漢字AI検索（どのページにもある「🔍 Kanji」ボタン）の回数を数える
--
-- ・ログインしている人: 1 日 20 回まで無料。それを超えたら 1 回 1 クレジット
-- ・ログインしていない人（LP など）: 1 日 3 回まで無料（IP アドレスを暗号化した値で数える）
-- ・「1 日」はメルボルン時間の 0 時に切りかわる
-- ・調べた言葉そのものは保存しない（数えるのに必要な情報だけ）
--
-- 実行するのは api をデプロイする「前」。
-- テーブルと関数は api（service role）だけが使う。ブラウザからは読めない・書けない。
-- =====================================================================

create table if not exists public.kanji_lookups (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  ip_hash text,
  charged boolean not null default false,
  cost integer not null default 0,
  created_at timestamptz not null default now(),
  constraint kanji_lookups_who check (user_id is not null or ip_hash is not null)
);

create index if not exists kanji_lookups_user_idx on public.kanji_lookups (user_id, created_at desc);
create index if not exists kanji_lookups_ip_idx on public.kanji_lookups (ip_hash, created_at desc);

-- RLS を有効にして、ポリシーは作らない（= ブラウザからは一切さわれない。api の service role だけ）
alter table public.kanji_lookups enable row level security;

-- ---------------------------------------------------------------------
-- 1 回分を使う。無料の回数が残っていれば無料、なければ（ログインしている人だけ）1 クレジット引く
-- 戻り値: { ok, id, free, remaining_free, free_limit, reason, balance }
--   reason: 'GUEST_LIMIT'（ログインしていない人の無料分が終わった）/ 'NO_CREDITS'（クレジットが足りない）
-- ---------------------------------------------------------------------
create or replace function public.claim_kanji_lookup(
  p_user_id uuid,
  p_ip_hash text,
  p_user_free_limit integer default 20,
  p_guest_free_limit integer default 3,
  p_cost integer default 1
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day_start timestamptz := date_trunc('day', now() at time zone 'Australia/Melbourne') at time zone 'Australia/Melbourne';
  v_limit integer := case when p_user_id is null then p_guest_free_limit else p_user_free_limit end;
  v_used integer;
  v_id bigint;
  v_consume json;
begin
  if p_user_id is null and (p_ip_hash is null or p_ip_hash = '') then
    raise exception 'NO_IDENTITY';
  end if;

  -- 同じ人の同時リクエストで、無料の回数を超えないように順番に処理する
  perform pg_advisory_xact_lock(hashtext('kanji_lookup:' || coalesce(p_user_id::text, p_ip_hash)));

  -- ついでに 3 日より前の記録を消す（数えるのは今日の分だけなので、古い記録は要らない）
  delete from public.kanji_lookups
   where created_at < now() - interval '3 days'
     and (case when p_user_id is null then ip_hash = p_ip_hash else user_id = p_user_id end);

  select count(*) into v_used
    from public.kanji_lookups
   where created_at >= v_day_start
     and charged = false
     and (case when p_user_id is null then ip_hash = p_ip_hash and user_id is null else user_id = p_user_id end);

  if v_used < v_limit then
    insert into public.kanji_lookups (user_id, ip_hash, charged)
    values (p_user_id, case when p_user_id is null then p_ip_hash else null end, false)
    returning id into v_id;
    return json_build_object('ok', true, 'id', v_id, 'free', true,
                             'remaining_free', v_limit - v_used - 1, 'free_limit', v_limit);
  end if;

  if p_user_id is null then
    return json_build_object('ok', false, 'reason', 'GUEST_LIMIT', 'remaining_free', 0, 'free_limit', v_limit);
  end if;

  -- 無料分が終わったので p_cost クレジット（引けたときだけ、credit_transactions に記録される）
  v_consume := public.consume_credits(p_user_id, p_cost, 'kanjiLookup');
  if not coalesce((v_consume->>'ok')::boolean, false) then
    return json_build_object('ok', false, 'reason', 'NO_CREDITS', 'remaining_free', 0, 'free_limit', v_limit,
                             'balance', coalesce((v_consume->>'balance')::integer, 0));
  end if;

  insert into public.kanji_lookups (user_id, ip_hash, charged, cost)
  values (p_user_id, null, true, p_cost)
  returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'free', false, 'remaining_free', 0, 'free_limit', v_limit,
                           'balance', coalesce((v_consume->>'balance')::integer, 0));
end;
$$;

-- ---------------------------------------------------------------------
-- AI が失敗したときに 1 回分を取り消す（無料なら回数を戻す・クレジットを引いていたら返す）
-- ---------------------------------------------------------------------
create or replace function public.release_kanji_lookup(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanji_lookups%rowtype;
begin
  delete from public.kanji_lookups where id = p_id returning * into v_row;
  if found and v_row.charged and v_row.cost > 0 and v_row.user_id is not null then
    perform public.refund_credits(v_row.user_id, v_row.cost, 'kanjiLookup');
  end if;
end;
$$;

revoke all on function public.claim_kanji_lookup(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.release_kanji_lookup(bigint) from public, anon, authenticated;
grant execute on function public.claim_kanji_lookup(uuid, text, integer, integer, integer) to service_role;
grant execute on function public.release_kanji_lookup(bigint) to service_role;
