-- =====================================================================
-- 65: 利用規約（kl_app LEGAL_CONTENTS → terms）を新しい版に入れ替える
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: サブスク・パス・Yamato Town などを main に出すのと同じ日（先に出すと、まだ無いプランの説明が載ってしまう）
--
-- 元の文: yamato-portal/docs/legal/terms-of-service-draft-2026-11.md（2026-11-22 ユーザー確認済み）
-- ・入れ替える前の LEGAL_CONTENTS 全体を kl_app_backup に残す（34・38 と同じやり方）
-- ・lastUpdated は実行した日になる
-- ・何度実行しても同じ結果になる
-- =====================================================================

-- 1) 前の規約を残す
insert into public.kl_app_backup (key, data)
select key, data from public.kl_app where key = 'LEGAL_CONTENTS';

-- 2) 新しい規約に入れ替える
update public.kl_app
set data = jsonb_set(
      data,
      '{terms}',
      $t${
  "title": "Terms of Service",
  "lastUpdated": "",
  "summary": "These Terms explain how you can use JP Tutor AI Yamato, how credits work, how paid plans renew and how to cancel, and when you can get a refund. Nothing in these Terms takes away your rights under the Australian Consumer Law.",
  "sections": [
    {
      "heading": "1. About these Terms",
      "content": "JP Tutor AI Yamato (\"Yamato\", \"we\", \"us\") is a Japanese learning website at jptutoraiyamato.com, run by JP TUTOR AI YAMATO (ABN 60 402 594 691), Victoria, Australia. By creating an account or using the site, you agree to these Terms, our Privacy Policy and our Disclaimer. If you do not agree, please do not use the site. Nothing in these Terms takes away your rights under the Australian Consumer Law."
    },
    {
      "heading": "2. Your account",
      "listItems": [
        {"strong": "Age", "text": "If you are under 18, you must have permission from a parent or guardian to use the site. Payments must be made by an adult who is allowed to use the payment method, usually a parent or guardian."},
        {"strong": "One person per account", "text": "Do not share your account or let others use it. You are responsible for what happens in your account."},
        {"strong": "Accurate details", "text": "Please give correct details and keep your login details safe. Tell us straight away if you think someone else has used your account."},
        {"strong": "Teacher accounts", "text": "Teacher accounts are checked and approved by us by hand before teacher features are turned on (see section 11)."}
      ]
    },
    {
      "heading": "3. Free plan",
      "content": "You can use part of the site for free. This includes games, reference pages, the daily quiz, and anything your teacher sets for your class. We may change what is included in the free plan. If a change removes something you have paid for, section 9 applies."
    },
    {
      "heading": "4. Credits",
      "listItems": [
        {"strong": "What credits are", "text": "Credits are used to pay for AI features, such as AI feedback, AI conversations and mock exams. The number of credits each feature uses is shown on our Prices page and before you start the feature."},
        {"strong": "No cash value", "text": "Credits are not money. They cannot be exchanged for cash, moved to another account or sold. They are not refunded when they expire, except where the law requires it."},
        {"strong": "When something goes wrong", "text": "If an AI feature fails because of a problem on our side, the credits for that use are returned to your account automatically."},
        {"strong": "Order of use", "text": "Credits that expire soonest are used first."},
        {"strong": "Daily quiz credits", "text": "These can only be used for AI features after you have done the AI Trial or bought a plan or pass. Until then, they are kept until they expire."}
      ]
    },
    {
      "heading": "How long credits last",
      "content": "The time is counted from the day the credits are given, not from the end of a calendar month.",
      "listItems": [
        {"strong": "Monthly or yearly subscription", "text": "The credits for each month last 2 months (the month they are given and the next month). For example, credits given on 28 January expire on 28 March."},
        {"strong": "3-Month or 6-Month Pass", "text": "Until the pass ends. For example, for a 6-Month Pass bought on 5 May, the credits expire on 5 November."},
        {"strong": "AI Trial", "text": "1 year from the day you buy it."},
        {"strong": "Top-up credits", "text": "1 year from the day you buy them."},
        {"strong": "Daily quiz", "text": "7 days. For example, credits earned on 1 June expire on 8 June."}
      ]
    },
    {
      "heading": "5. Paid plans and purchases",
      "content": "All prices are in Australian dollars (AUD). We are not registered for GST, so no GST is charged.",
      "listItems": [
        {"strong": "AI Trial (A$1, one payment)", "text": "It gives you 100 credits and lets you use AI features. You can buy it only once per account and once per card. If the same card is used for a second trial, we refund that payment in full and no credits are given."},
        {"strong": "Basic and Plus subscriptions", "text": "Basic gives you site access and 200 credits a month. Plus gives you site access and 700 credits a month. You can pay monthly, or yearly at a discount. With a yearly plan, you pay once a year and the credits are given every month."},
        {"strong": "3-Month and 6-Month Passes (one payment)", "text": "A pass gives you site access for 3 or 6 months, with all of its credits given at the start. Passes do not renew automatically. If you buy another pass, the new one starts when your current pass ends."},
        {"strong": "Subscriptions and passes cannot overlap", "text": "You cannot buy a pass while a subscription is active. This includes a cancelled subscription that has not reached the end of its paid period. You cannot start a subscription while a pass is active."},
        {"strong": "Top-up credits", "text": "Top-ups are extra credits for people who have an active plan or pass."},
        {"strong": "First-plan discount", "text": "Your first subscription or pass is A$2 cheaper if you did the AI Trial, or A$1 cheaper if you did not. You can get this discount only once."},
        {"strong": "Prices page", "text": "The current prices, credit amounts and costs per feature are shown on our Prices page. The price and plan shown when you pay are the ones that apply to that payment."}
      ]
    },
    {
      "heading": "6. Automatic renewal",
      "content": "Subscriptions renew automatically at the end of each monthly or yearly period. The renewal is charged to the payment method you used, at the price that applies then, until you cancel.",
      "listItems": [
        {"text": "Before a yearly subscription renews, we send you a reminder email."},
        {"text": "Your next renewal date is always shown in My Account."},
        {"text": "Passes, the AI Trial and top-ups never renew."}
      ]
    },
    {
      "heading": "7. Cancelling",
      "listItems": [
        {"strong": "How", "text": "You can cancel a subscription at any time in My Account → Manage plan, card and receipts. You do not need to contact us."},
        {"strong": "When it takes effect", "text": "Cancelling stops the next renewal. You keep site access until the end of the period you have already paid for."},
        {"strong": "Your credits", "text": "Credits you already have stay in your account until their normal expiry date (section 4). After your plan ends you can still use them for AI features until they expire."},
        {"strong": "No partial refunds", "text": "Cancelling does not give a refund for the rest of the current period, except as set out in section 8."}
      ]
    },
    {
      "heading": "8. Refunds",
      "content": "Your rights under the Australian Consumer Law are not affected. If the service has a major problem, you can choose a refund for the unused part of what you paid. A major problem includes a paid feature not working, or not being as described. If the problem is minor, we will fix it, or give a refund if we cannot fix it in a reasonable time. On top of these rights, we offer the following:",
      "listItems": [
        {"strong": "First payment", "text": "If you change your mind within 7 days of your first payment for a subscription or pass, and you have used no more than 50 credits from it, we will refund that payment in full."},
        {"strong": "Forgotten renewal", "text": "If a subscription renews and you contact us within 7 days of the renewal, and you have used none of the credits from that renewal, we will refund the renewal and cancel the subscription."},
        {"strong": "AI Trial and top-ups", "text": "These are not refunded for change of mind once credits from them have been used."},
        {"strong": "How to ask for a refund", "text": "Use the Contact page. Tell us the email address of the account and the date of the payment."},
        {"strong": "What happens after a refund", "text": "Refunds go back to the original payment method through Stripe. When we refund a payment, we remove any credits from that payment that have not been used, and the plan or pass linked to it ends."}
      ]
    },
    {
      "heading": "9. Changes to prices and plans",
      "listItems": [
        {"text": "If we change the price of a subscription, we will tell you by email at least 30 days before the change applies to your next renewal. You can cancel before then if you do not want to continue."},
        {"text": "If we remove or greatly reduce a paid feature during a period you have already paid for, you may ask for a refund for the unused part of that period."},
        {"text": "The number of credits a feature uses may change. Credits already in your account do not lose their value; only the number of credits a feature uses changes. The current numbers are always on the Prices page."}
      ]
    },
    {
      "heading": "10. Payments",
      "listItems": [
        {"text": "Payments are handled by Stripe. We never see or store your full card number."},
        {"text": "So that each card can be used for the AI Trial only once, we keep a code from Stripe that identifies the card (a \"card fingerprint\"). We keep it even after you delete your account. See the Privacy Policy."},
        {"text": "If a payment fails or is reversed, we may pause your plan or remove the credits linked to that payment."}
      ]
    },
    {
      "heading": "11. Teachers, schools and classes",
      "listItems": [
        {"strong": "Approval", "text": "Teacher accounts are approved by us by hand. A teacher must use a school email address, and students join a class only after the teacher approves them."},
        {"strong": "Class work is free for students", "text": "Students can use anything their teacher sets for their class, such as homework, classwork and the class live game, without paying."},
        {"strong": "Teachers' responsibilities", "text": "Teachers must follow their school's rules about students' personal information. They should only invite students they teach, and should use class features only for teaching."},
        {"strong": "School-linked accounts", "text": "Teachers, students in a class, and students who have asked to join a class cannot use Yamato Town Together mode."}
      ]
    },
    {
      "heading": "12. Yamato Town — Together mode",
      "content": "Together mode lets learners with personal accounts see each other in Yamato Town. To use it, you must agree to these rules:",
      "listItems": [
        {"text": "You are 18 or older, or a parent or guardian has said you may use it."},
        {"text": "You can only use the set Japanese phrases and stamps. There is no free chat, no voice between users and no private messages."},
        {"text": "Other users see a random town name, never your real name."},
        {"text": "Be kind. Do not follow, block the way of, or bother other users."},
        {"text": "You can block or report anyone. If you block or report someone, you and that person will no longer see each other."},
        {"text": "We check reports. If several people report a user, that user may be stopped from using Together mode automatically while we check. We may stop anyone from using Together mode if they break these rules."},
        {"text": "Together mode is a BETA feature and may change or stop."}
      ]
    },
    {
      "heading": "13. Acceptable use",
      "content": "When you use the site, you must not:",
      "listItems": [
        {"text": "use it to bully, harass or harm anyone;"},
        {"text": "share other people's personal information;"},
        {"text": "try to get around credit charges, usage limits, locks set by teachers or the school-hours homework lock;"},
        {"text": "use bots, scripts or scraping, or copy large parts of the site;"},
        {"text": "try to break into, overload or interfere with the site;"},
        {"text": "try to make the AI produce harmful, unsafe or inappropriate content;"},
        {"text": "create several accounts to get extra trials or free credits;"},
        {"text": "pass off AI-written work as your own where your school does not allow it."}
      ]
    },
    {
      "heading": "14. AI features",
      "listItems": [
        {"text": "AI feedback and AI conversations are made automatically and can be wrong. Please check important points with your teacher. AI feedback is practice. It is not an official mark and does not predict your exam result."},
        {"text": "Do not type or say personal information (such as your full name, address or phone number) in AI features."},
        {"text": "Your writing and voice are sent to our AI providers to make the feedback. See the Privacy Policy."}
      ]
    },
    {
      "heading": "15. Content and intellectual property",
      "listItems": [
        {"text": "The site, its lessons, games, pictures, audio and software belong to us or the people who licensed them to us. You may use them for your own learning, and teachers may use them with their own classes. You may not copy, sell or republish them."},
        {"text": "You keep the rights to what you write or record. You let us use it to run the site, for example to give feedback, show your work to your teacher and keep your progress."},
        {"strong": "Not affiliated", "text": "We are not affiliated with the publishers of the textbooks named on the site, or with the VCAA. These names are used only to show which topics a page matches."}
      ]
    },
    {
      "heading": "16. Suspending or closing accounts",
      "listItems": [
        {"text": "We may suspend or close an account that seriously or repeatedly breaks these Terms. If we do, credits from purchases may be cancelled, except where the law says otherwise."},
        {"text": "You can delete your account at any time in My Account. Credits and any plan or pass end when the account is deleted. If you have a subscription, it is cancelled straight away, so you will not be charged again."},
        {"text": "If we close the service, we will tell you at least 30 days before. We will refund the unused part of any subscription or pass, and the value of unused paid credits."}
      ]
    },
    {
      "heading": "17. Availability and changes to the site",
      "content": "We work to keep the site running, but it may sometimes be unavailable, for example during updates or because of problems with services we use. We may add, change or remove features. Section 9 explains what happens if this affects something you have paid for."
    },
    {
      "heading": "18. Our responsibility",
      "listItems": [
        {"text": "Nothing in these Terms removes rights you have under the Australian Consumer Law or other laws that cannot be excluded."},
        {"text": "As far as the law allows, we are not responsible for indirect loss, such as exam results, lost opportunities or lost data that you could have saved yourself."},
        {"text": "Where the law allows us to limit our responsibility, it is limited to supplying the service again, or refunding what you paid for it in the 12 months before the problem."}
      ]
    },
    {
      "heading": "19. Changes to these Terms",
      "listItems": [
        {"text": "We may update these Terms. The date at the top shows the last change."},
        {"text": "If a change is important, for example about payments, renewal or refunds, we will tell you by email or on the site before it applies."},
        {"text": "If you keep using the site after a change applies, you accept the new Terms."}
      ]
    },
    {
      "heading": "20. Law",
      "content": "These Terms are governed by the law of Victoria, Australia."
    },
    {
      "heading": "21. Contact",
      "isContactLink": true
    }
  ]
}$t$::jsonb || jsonb_build_object('lastUpdated', to_char(now() at time zone 'Australia/Melbourne', 'FMMonth FMDD, YYYY'))
    ),
    updated_at = now()
where key = 'LEGAL_CONTENTS';

-- 確認用: 新しい規約の章が 22 行（「How long credits last」を含む）。last_updated が今日の日付
select s.ord::int as ord, s.sec ->> 'heading' as heading, k.data #>> '{terms,lastUpdated}' as last_updated
from public.kl_app k,
     jsonb_array_elements(k.data #> '{terms,sections}') with ordinality as s(sec, ord)
where k.key = 'LEGAL_CONTENTS'
order by 1;
