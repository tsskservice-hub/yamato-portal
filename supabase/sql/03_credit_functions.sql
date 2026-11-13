-- =====================================================================
-- 03: クレジットの消費・返却をデータベースの中で1回で行う関数（二重使用の防止）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: Worker（api）の修正をデプロイする「前」（追加するだけなので、今の動作は変わらない）
-- 呼び出せるのは Worker（service_role）だけ。ブラウザからは呼べない。
-- =====================================================================

-- 残高が足りるときだけ引く。同時に呼ばれても残高がマイナスになることはない。
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

  -- ※ プロフィールは新規登録時にトリガーが作る。ここでは作らない
  --   （profiles のチェック制約 nickname_length_check に引っかかるため）。
  --   行が無い場合は下の update が 0 件になり、残高 0 として扱われる。
  update public.profiles
     set credits = credits - p_amount
   where id = p_user_id
     and credits >= p_amount
  returning credits into new_balance;

  if not found then
    select coalesce(credits, 0) into current_balance from public.profiles where id = p_user_id;
    return json_build_object('ok', false, 'balance', coalesce(current_balance, 0));
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description)
  values (p_user_id, -p_amount, p_feature, 'Consumed for ' || p_feature || ' execution');

  return json_build_object('ok', true, 'balance', new_balance);
end;
$$;

-- AI の処理が失敗したときに、引いたぶんを返す
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

  insert into public.credit_transactions (user_id, amount, feature_used, description)
  values (p_user_id, p_amount, p_feature, 'Refund: ' || p_feature || ' failed');

  return json_build_object('ok', true, 'balance', new_balance);
end;
$$;

-- Worker（service_role）だけが呼べるようにする
revoke all on function public.consume_credits(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, integer, text) to service_role;
grant execute on function public.refund_credits(uuid, integer, text) to service_role;
