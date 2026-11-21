-- =====================================================================
-- 67: プライバシーポリシーに「Payments and Purchases」の章を足す（Stripe・カードの識別コード・支払いの記録）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 65（利用規約）と同じ日。サブスク・パスを main に出す日
--
-- 内容はコードで確認済み（2026-11-22）:
--   ・カードの番号などは Stripe の支払い画面に入力され、こちらには届かない（create-checkout-session.ts は Checkout の URL を返すだけ）
--   ・こちらが持つもの: Stripe のお客様 ID（stripe_customers）、サブスクの状態と期間（subscriptions）、パス（season_passes）、
--     支払いの記録（purchases: 決済 ID・金額・渡したクレジット・返金日）、クレジットの増減（credit_lots / credit_transactions）
--   ・AI 体験: カードの識別コード（Stripe の card fingerprint）を ai_trials に残す。アカウントを消しても残る（user_id だけ空になる）
--   ・アカウントを消すと、上のプラン・クレジットの記録は消える（cascade）。Stripe 側の支払いの記録は Stripe に残る
--   ・領収書・更新のお知らせのメールは Stripe が送る
--
-- 「2. How We Use Your Information」の直後に新しい章として入れる。もう入っていれば何もしない（二重に実行しても重ならない）。
-- lastUpdated は実行した日になる。
-- =====================================================================

update public.kl_app
set data = jsonb_set(
      jsonb_set(
        data,
        '{privacy,sections}',
        (
          select jsonb_agg(x.sec order by x.ord, x.sub)
          from (
            select s.sec, s.ord, 0 as sub
            from jsonb_array_elements(data #> '{privacy,sections}') with ordinality as s(sec, ord)
            union all
            select $p${
  "heading": "Payments and Purchases",
  "content": "Payments on JP Tutor AI Yamato are handled by Stripe, a payment company. You enter your card or other payment details on Stripe's secure payment page. We never receive or store your full card number. Stripe uses your information as described in its own Privacy Policy (stripe.com/privacy), and it may process it outside Australia, for example in the United States.",
  "listItems": [
    {"strong": "What we keep", "text": "A customer number from Stripe, what you bought (AI Trial, plan, pass or top-up credits), the date and amount of each payment, your plan's status and renewal date, any refunds, and a history of your credits (credits given, used, expired, or removed after a refund)."},
    {"strong": "Why we keep it", "text": "To give you your credits and plan, show them in My Account, let you cancel or change your plan, handle refunds and keep our accounts."},
    {"strong": "AI Trial and card fingerprints", "text": "So that each card can be used for the AI Trial only once, we keep a code from Stripe that identifies the card (a \"card fingerprint\"). It is not your card number and cannot be used to make a payment. We keep this code even after you delete your account, so the same card cannot be used for another trial. Some payment methods do not give a card fingerprint."},
    {"strong": "Emails from Stripe", "text": "Stripe sends receipts and subscription renewal reminders to the email address you give when you pay."},
    {"strong": "When you delete your account", "text": "Your plan and credit records are deleted with your account, except the card fingerprint described above. Records of payments are also kept in our Stripe account, because Australian law requires businesses to keep payment records for at least 5 years."}
  ]
}$p$::jsonb,
                   (select s2.ord
                      from jsonb_array_elements(data #> '{privacy,sections}') with ordinality as s2(sec, ord)
                     where s2.sec ->> 'heading' = '2. How We Use Your Information'
                     limit 1),
                   1
          ) as x
        )
      ),
      '{privacy,lastUpdated}',
      to_jsonb(to_char(now() at time zone 'Australia/Melbourne', 'FMMonth FMDD, YYYY'))
    ),
    updated_at = now()
where key = 'LEGAL_CONTENTS'
  and exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '2. How We Use Your Information'
  )
  and not exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = 'Payments and Purchases'
  );

-- 確認用: 章の一覧。「2. How We Use Your Information」のすぐ下に「Payments and Purchases」が 1 つだけあれば成功
select s.ord::int as ord, s.sec ->> 'heading' as heading, k.data #>> '{privacy,lastUpdated}' as last_updated
from public.kl_app k,
     jsonb_array_elements(k.data #> '{privacy,sections}') with ordinality as s(sec, ord)
where k.key = 'LEGAL_CONTENTS'
order by 1;
