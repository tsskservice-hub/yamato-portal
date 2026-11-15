-- 28. Obento Deluxe Unit 7〜12 のレッスン（タイトル・LI・SC・語彙・文法・会話表現）
--
--  元にしたもの：先生の Grammar Notes（Obento Deluxe U7〜U9、U10〜U12）
--  このファイルがすること（19・20 を実行したあとで使う）：
--    1. トピック dates / hobbies / transport / activities / leisure / holidays の名前・説明を入れ、「準備中」を外す
--    2. 18 レッスンを作る（無ければ作り、あれば内容を更新する）
--         dates-1〜4, hobbies-1〜3, transport-1〜3, activities-1〜2, leisure-1〜3, holidays-1〜3
--       タイトル（英語・日本語）、Learning Intention、Success Criteria、Key Expressions、Grammar を入れる
--       site_order = トピックの順番 × 100 ＋ レッスン番号 × 10、教科書（Obento Deluxe Unit 7〜12）と対応づける
--    3. 語彙（kl_vocabulary）を入れる。同じレッスンに同じ jp_text の語があれば、英語・ローマ字・読みだけ更新する
--       （audio_url はさわらない。音声ファイルが無い語は、画面ではブラウザの読み上げになる）
--
--  何度実行しても同じ結果になる。

begin;

-- ---------------------------------------------------------------- 1. トピック
create temporary table _t (slug text, title_en text, title_jp text, description text, persona text) on commit drop;
insert into _t values
  ('dates', 'Days, Dates and Events', '曜日・日付・行事', 'Learn the days of the week, months and dates, and how to ask and say when events and birthdays are.', 'You are AI Yamato, a warm and supportive Japanese tutor. Help the student practise days of the week (何曜日), months and dates (何月何日), and asking when events are (いつですか). Guide them with a Socratic approach and encourage correct particles.'),
  ('hobbies', 'Hobbies, Sports and Abilities', 'しゅみ・スポーツ・できること', 'Talk about your hobbies and the sports you play, and say what you can and can''t do.', 'You are AI Yamato, a warm and supportive Japanese tutor. Help the student practise hobbies (しゅみは なんですか), sports (どんな スポーツを しますか) and ability (〜が できますか、すこし／あまり／ぜんぜん). Guide them with a Socratic approach and encourage correct particles.'),
  ('transport', 'Going Places and Transport', 'どこに・だれと・なんで', 'Ask and say where you are going, who you are going with and how you will get there.', 'You are AI Yamato, a warm and supportive Japanese tutor. Help the student practise where someone is going (どこに いきますか), who with (だれと), and transport (なんで、〜で いきます). Guide them with a Socratic approach and encourage correct particles.'),
  ('activities', 'Daily Activities', '毎日の活動', 'Talk about what you do and don''t do every day using verbs with ます and ません.', 'You are AI Yamato, a warm and supportive Japanese tutor. Help the student practise daily activities with noun ＋ を ＋ verb, and positive / negative verbs (ます／ません). Guide them with a Socratic approach and encourage correct particles.'),
  ('leisure', 'Free Time and Suggestions', 'ひまなとき', 'Talk about what you do in your free time, suggest things to do together and give your opinion.', 'You are AI Yamato, a warm and supportive Japanese tutor. Help the student practise free time and time expressions (ひまなときに), suggestions (〜ましょう) and opinions with い adjectives (ね／よ). Guide them with a Socratic approach and encourage correct particles.'),
  ('holidays', 'Holidays and Past Experiences', 'どうでしたか', 'Talk about what you did in the holidays and describe what it was like using the past tense.', 'You are AI Yamato, a warm and supportive Japanese tutor. Help the student practise past tense verbs (ました／ませんでした), past time words (きのう、せんしゅう) and past い adjectives (〜かったです). Guide them with a Socratic approach and encourage correct particles.');

update public.edu_topics t
set title_en = x.title_en, title_jp = x.title_jp, description = x.description,
    yamato_persona_prompt = x.persona, is_coming_soon = false
from _t x
where t.slug = x.slug;

-- ---------------------------------------------------------------- 2. レッスン
create temporary table _l (
  slug text, topic text, lesson_order int, title_en text, title_jp text,
  li text, sc jsonb, ke jsonb, tg jsonb
) on commit drop;
insert into _l values
  ('dates-1', 'dates', 1, 'Asking what day of the week it is', '何曜日ですか',
   'To learn how to ask and say what day of the week it is today, and what day an event is on.',
   '["I can say the seven days of the week in Japanese.", "I can ask and answer what day of the week it is today.", "I can ask and answer what day of the week an event is on."]'::jsonb,
   '[{"jp": "きょうは 何曜日ですか。", "romaji": "kyou wa nanyoubi desu ka", "en": "What day of the week is it today?"}, {"jp": "きょうは 火曜日です。", "romaji": "kyou wa kayoubi desu", "en": "Today is Tuesday."}, {"jp": "やすみは 何曜日ですか。", "romaji": "yasumi wa nanyoubi desu ka", "en": "What day of the week is the holiday?"}, {"jp": "やすみは 木曜日です。", "romaji": "yasumi wa mokuyoubi desu", "en": "The holiday is Thursday."}]'::jsonb,
   '[{"grammar": "きょうは 何曜日ですか。", "explanation": "Ask what day of the week it is today. 何 (なん) means ''what'' and 曜日 (ようび) means ''day of the week''. Answer: きょうは ＋ day ＋ です。"}, {"grammar": "EVENT は 何曜日ですか。", "explanation": "Ask what day of the week an event is on. Put the event before は. E.g. やすみは 木曜日です。 (The holiday is Thursday.)"}]'::jsonb),
  ('dates-2', 'dates', 2, 'Saying the months and your birthday month', 'たんじょうびは 何月ですか',
   'To learn how to say the months in Japanese and ask and answer which month someone''s birthday is in.',
   '["I can say the twelve months in Japanese.", "I can ask which month someone''s birthday is in.", "I can say which month my birthday is in."]'::jsonb,
   '[{"jp": "たんじょうびは 何月ですか。", "romaji": "tanjoubi wa nangatsu desu ka", "en": "Which month is your birthday?"}, {"jp": "たんじょうびは 九月です。", "romaji": "tanjoubi wa kugatsu desu", "en": "My birthday is in September."}]'::jsonb,
   '[{"grammar": "Number ＋ 月 (がつ)", "explanation": "Months are the numbers 1–12 followed by 月 (がつ). Be careful with 四月 (しがつ), 七月 (しちがつ) and 九月 (くがつ)."}, {"grammar": "たんじょうびは 何月ですか。", "explanation": "Ask which month someone''s birthday is in. 何月 (なんがつ) means ''what month''. Answer: たんじょうびは ＋ month ＋ です。"}]'::jsonb),
  ('dates-3', 'dates', 3, 'Asking and saying the date', '何月何日ですか',
   'To learn how to say dates in Japanese and ask and answer what the date is today.',
   '["I can say dates, including special readings such as ついたち and ふつか.", "I can say a full date with the month first and then the date.", "I can ask and answer what the date is today."]'::jsonb,
   '[{"jp": "きょうは 何月何日ですか。", "romaji": "kyou wa nangatsu nannichi desu ka", "en": "What is the date today?"}, {"jp": "きょうは 二月十九日です。", "romaji": "kyou wa nigatsu juukunichi desu", "en": "Today is the 19th of February."}, {"jp": "一月七日", "romaji": "ichigatsu nanoka", "en": "the 7th of January"}]'::jsonb,
   '[{"grammar": "何月何日ですか。", "explanation": "Ask the month and date. 何月 (なんがつ) means ''what month'' and 何日 (なんにち) means ''what date''."}, {"grammar": "Month ＋ Date", "explanation": "Say the month first and then the date. E.g. 一月七日 (いちがつ なのか) = the 7th of January."}, {"grammar": "Number ＋ 日 (にち)", "explanation": "The 1st–10th, 14th, 20th and 24th have special readings (ついたち, ふつか, みっか …). For other dates, say the number and then 日 (にち): 十一日 = じゅういちにち."}]'::jsonb),
  ('dates-4', 'dates', 4, 'Asking when an event is', 'いつですか',
   'To learn how to ask and answer when an event is, using a day of the week, a date or a time word.',
   '["I can name school events such as えんそく and うんどうかい.", "I can ask when an event is using いつ.", "I can answer with a day of the week, a date or a time word such as あした."]'::jsonb,
   '[{"jp": "うんどうかいは いつですか。", "romaji": "undoukai wa itsu desu ka", "en": "When is the sports carnival?"}, {"jp": "うんどうかいは 金曜日です。", "romaji": "undoukai wa kinyoubi desu", "en": "The sports carnival is on Friday."}, {"jp": "テストは あしたです。", "romaji": "tesuto wa ashita desu", "en": "The test is tomorrow."}, {"jp": "ともだちの たんじょうびは 五月三日です。", "romaji": "tomodachi no tanjoubi wa gogatsu mikka desu", "en": "My friend''s birthday is the 3rd of May."}]'::jsonb,
   '[{"grammar": "EVENT は いつですか。", "explanation": "いつ means ''when''. Answer with a day of the week, a month and date, or a time word: EVENT は ＋ answer ＋ です。"}, {"grammar": "Person の たんじょうび", "explanation": "の links a person and a thing, like ''s in English: ともだちの たんじょうび = my friend''s birthday."}]'::jsonb),
  ('hobbies-1', 'hobbies', 1, 'Asking about hobbies', 'しゅみは なんですか',
   'To learn how to ask someone what their hobby is and talk about my own hobbies.',
   '["I can name hobbies and interests in Japanese.", "I can ask someone what their hobby is.", "I can say what my hobby is."]'::jsonb,
   '[{"jp": "しゅみは なんですか。", "romaji": "shumi wa nan desu ka", "en": "What is your hobby?"}, {"jp": "しゅみは かいものです。", "romaji": "shumi wa kaimono desu", "en": "My hobby is shopping."}, {"jp": "しゅみは どくしょです。", "romaji": "shumi wa dokusho desu", "en": "My hobby is reading."}]'::jsonb,
   '[{"grammar": "しゅみは なんですか。", "explanation": "Ask what someone''s hobby is. なん means ''what''."}, {"grammar": "しゅみは ＋ hobby ＋ です。", "explanation": "Say your hobby. Put your hobby where なん was in the question."}]'::jsonb),
  ('hobbies-2', 'hobbies', 2, 'Asking what sports someone plays', 'どんな スポーツを しますか',
   'To learn how to ask what kind of sport someone plays and say which sports I play.',
   '["I can name sports in Japanese, including Japanese martial arts.", "I can ask what kind of sport someone plays.", "I can say which sport I play, and use も to say ''too''."]'::jsonb,
   '[{"jp": "どんな スポーツを しますか。", "romaji": "donna supootsu wo shimasu ka", "en": "What kind of sport do you play?"}, {"jp": "わたしは テニスを します。", "romaji": "watashi wa tenisu wo shimasu", "en": "I play tennis."}, {"jp": "わたしも すいえいを します。", "romaji": "watashi mo suiei wo shimasu", "en": "I do swimming too."}]'::jsonb,
   '[{"grammar": "どんな スポーツを しますか。", "explanation": "どんな means ''what kind of'' and します means ''do / play''. を marks the sport."}, {"grammar": "わたしは ＋ sport ＋ を します。", "explanation": "Say which sport you play. E.g. わたしは すいえいを します。 (I do swimming.)"}, {"grammar": "わたしも …", "explanation": "Use も instead of は to say ''too'': わたしも すいえいを します。 (I do swimming too.)"}]'::jsonb),
  ('hobbies-3', 'hobbies', 3, 'Saying what you can do', '〜が できますか',
   'To learn how to ask if someone can do something and answer with different levels of ability.',
   '["I can ask if someone can do a sport, an activity or a language using が できますか.", "I can answer yes or no with できます and できません.", "I can show how well I can do something with すこし, あまり and ぜんぜん."]'::jsonb,
   '[{"jp": "ネットボールが できますか。", "romaji": "nettobooru ga dekimasu ka", "en": "Can you play netball?"}, {"jp": "はい、すこし できます。", "romaji": "hai, sukoshi dekimasu", "en": "Yes, I can play a little."}, {"jp": "いいえ、ぜんぜん できません。", "romaji": "iie, zenzen dekimasen", "en": "No, I can''t play at all."}, {"jp": "インドネシアごが できます。", "romaji": "indoneshiago ga dekimasu", "en": "I can speak Indonesian."}, {"jp": "ほんとう？ すごい！", "romaji": "hontou? sugoi!", "en": "Really? Awesome!"}, {"jp": "しんじられない！", "romaji": "shinjirarenai!", "en": "That''s unbelievable!"}]'::jsonb,
   '[{"grammar": "〜が できますか。", "explanation": "Ask if someone can do something. Use が (not を) before できます."}, {"grammar": "できます / できません", "explanation": "できます means ''I can''. できません means ''I can''t''."}, {"grammar": "すこし / あまり / ぜんぜん", "explanation": "Show how well you can do it: はい、すこし できます (a little). いいえ、あまり できません (not very well). いいえ、ぜんぜん できません (not at all). あまり and ぜんぜん are used with できません."}]'::jsonb),
  ('transport-1', 'transport', 1, 'Asking where someone is going', 'どこに いきますか',
   'To learn how to ask where someone is going and say where I am going, including when.',
   '["I can name places and activities to go to.", "I can ask and answer where someone is going using に いきます.", "I can add a time such as しゅうまつに or 土曜日に.", "I can say where I am not going using いきません."]'::jsonb,
   '[{"jp": "どこに いきますか。", "romaji": "doko ni ikimasu ka", "en": "Where are you going?"}, {"jp": "うみに いきます。", "romaji": "umi ni ikimasu", "en": "I am going to the beach."}, {"jp": "しゅうまつに どこに いきますか。", "romaji": "shuumatsu ni doko ni ikimasu ka", "en": "Where are you going on the weekend?"}, {"jp": "しゅうまつに まちに いきます。", "romaji": "shuumatsu ni machi ni ikimasu", "en": "I am going to town on the weekend."}, {"jp": "まちに いきません。", "romaji": "machi ni ikimasen", "en": "I am not going to town."}]'::jsonb,
   '[{"grammar": "どこに いきますか。", "explanation": "どこ means ''where'', に means ''to'' and いきます means ''go''. Replace どこ with a place to answer: うみに いきます。"}, {"grammar": "Time ＋ に ＋ Place ＋ に いきます。", "explanation": "Put a time such as しゅうまつ (weekend) or a day of the week first, followed by に."}, {"grammar": "いきます / いきません / いきました", "explanation": "いきます = go, いきません = don''t go, いきました = went (you will learn more in Unit 12)."}]'::jsonb),
  ('transport-2', 'transport', 2, 'Asking who someone is going with', 'だれと いきますか',
   'To learn how to ask who someone is going with and say who I am going with.',
   '["I can ask who someone is going with using だれと.", "I can say who I am going with using と.", "I can say I am going by myself using ひとりで."]'::jsonb,
   '[{"jp": "だれと いきますか。", "romaji": "dare to ikimasu ka", "en": "Who are you going with?"}, {"jp": "ともだちと いきます。", "romaji": "tomodachi to ikimasu", "en": "I''m going with my friend."}, {"jp": "ひとりで がっこうに いきます。", "romaji": "hitori de gakkou ni ikimasu", "en": "I''m going to school by myself."}, {"jp": "おそくなって、すみません。", "romaji": "osoku natte, sumimasen", "en": "Sorry I am late."}, {"jp": "だいじょうぶ。", "romaji": "daijoubu", "en": "It''s all right."}]'::jsonb,
   '[{"grammar": "だれと いきますか。", "explanation": "だれ means ''who'' and と means ''with''. Replace だれ with a person to answer: ともだちと いきます。"}, {"grammar": "ひとりで", "explanation": "ひとりで means ''by myself''. Do not add と: ひとりで がっこうに いきます。"}, {"grammar": "Person の うち", "explanation": "の means ''s: ともだちの うち = my friend''s house, おばあさんの うち = my grandmother''s house."}]'::jsonb),
  ('transport-3', 'transport', 3, 'Asking how someone is getting there', 'なんで いきますか',
   'To learn how to ask how someone is getting somewhere and say which transport I use.',
   '["I can name means of transport in Japanese.", "I can ask how someone is getting there using なんで.", "I can say how I get there using で, and say あるいて for ''on foot''."]'::jsonb,
   '[{"jp": "なんで いきますか。", "romaji": "nan de ikimasu ka", "en": "How do you get there?"}, {"jp": "バスで いきます。", "romaji": "basu de ikimasu", "en": "I go by bus."}, {"jp": "でんしゃで いきます。", "romaji": "densha de ikimasu", "en": "I go by train."}, {"jp": "あるいて いきます。", "romaji": "aruite ikimasu", "en": "I go on foot."}, {"jp": "日曜日は？", "romaji": "nichiyoubi wa?", "en": "What about Sunday?"}, {"jp": "はい、いいです。", "romaji": "hai, ii desu", "en": "Yes, it is okay."}]'::jsonb,
   '[{"grammar": "なんで いきますか。", "explanation": "なんで asks ''by what means'' (how). どうやって is also used."}, {"grammar": "Transport ＋ で いきます。", "explanation": "で means ''by''. E.g. バスで いきます。 (I go by bus.)"}, {"grammar": "あるいて", "explanation": "For ''on foot'', say あるいて いきます (without で)."}]'::jsonb),
  ('activities-1', 'activities', 1, 'Asking what someone does', 'なにを しますか',
   'To learn how to ask what someone does and talk about my daily activities using noun ＋ を ＋ verb.',
   '["I can ask what someone does using なにを しますか.", "I can say what I do using noun ＋ を ＋ verb, such as ほんを よみます.", "I can use に with あいます (meet) and いきます (go)."]'::jsonb,
   '[{"jp": "なにを しますか。", "romaji": "nani wo shimasu ka", "en": "What do you do?"}, {"jp": "ほんを よみます。", "romaji": "hon wo yomimasu", "en": "I read books."}, {"jp": "おんがくを ききます。", "romaji": "ongaku wo kikimasu", "en": "I listen to music."}, {"jp": "ともだちに あいます。", "romaji": "tomodachi ni aimasu", "en": "I meet my friends."}, {"jp": "がっこうに いきます。", "romaji": "gakkou ni ikimasu", "en": "I go to school."}]'::jsonb,
   '[{"grammar": "なにを しますか。", "explanation": "Ask what someone does (or will do). なに means ''what''."}, {"grammar": "Noun ＋ を ＋ Verb", "explanation": "を marks the object and comes before the verb: テレビを みます (watch TV), てがみを かきます (write a letter)."}, {"grammar": "Person ＋ に あいます / Place ＋ に いきます", "explanation": "Use に (not を) with あいます (meet) and いきます (go)."}]'::jsonb),
  ('activities-2', 'activities', 2, 'Talking about what you do and don''t do', '〜ますか・〜ません',
   'To learn how to ask if someone does an activity and answer yes or no using ます and ません.',
   '["I can ask if someone does an activity using ますか.", "I can answer yes using ます.", "I can answer no by changing ます to ません."]'::jsonb,
   '[{"jp": "ほんを よみますか。", "romaji": "hon wo yomimasu ka", "en": "Do you read books?"}, {"jp": "はい、ほんを よみます。", "romaji": "hai, hon wo yomimasu", "en": "Yes, I read books."}, {"jp": "いいえ、ほんを よみません。", "romaji": "iie, hon wo yomimasen", "en": "No, I don''t read books."}, {"jp": "しゅくだいを します。", "romaji": "shukudai wo shimasu", "en": "I do my homework."}]'::jsonb,
   '[{"grammar": "Verb ＋ ますか。", "explanation": "Add か to the verb to ask a question: よみますか。 (Do you read?)"}, {"grammar": "ます → ません", "explanation": "Change ます to ません to make the verb negative: よみます (read) → よみません (don''t read)."}]'::jsonb),
  ('leisure-1', 'leisure', 1, 'Asking what someone does in their free time', 'ひまなときに なにを しますか',
   'To learn how to ask what someone does in their free time and use time expressions to say when I do things.',
   '["I can ask and answer what someone does in their free time.", "I can use time expressions such as がっこうの あとで and ひる休みに.", "I can put a time expression at the start of a sentence."]'::jsonb,
   '[{"jp": "ひまなときに なにを しますか。", "romaji": "hima na toki ni nani wo shimasu ka", "en": "What do you do in your free time?"}, {"jp": "ひまなときに ほんを よみます。", "romaji": "hima na toki ni hon wo yomimasu", "en": "I read books in my free time."}, {"jp": "がっこうの あとで テニスを します。", "romaji": "gakkou no ato de tenisu wo shimasu", "en": "I play tennis after school."}]'::jsonb,
   '[{"grammar": "ひまなときに なにを しますか。", "explanation": "ひまなとき means ''free time''. Put the time expression at the start of the sentence."}, {"grammar": "Time expression ＋ に / で", "explanation": "Some time expressions take に (ひる休みに, ひまなときに) and some take で (がっこうの あとで). あさ, よる, きょう and あした need no particle."}, {"grammar": "の", "explanation": "の means ''of'' or ''s: 金曜日の ばん = Friday evening, あしたの あさ = tomorrow morning."}]'::jsonb),
  ('leisure-2', 'leisure', 2, 'Suggesting things to do', '〜ましょう',
   'To learn how to suggest doing something together and respond to a suggestion.',
   '["I can suggest an activity by changing ます to ましょう.", "I can use いっしょに to say ''together''.", "I can accept or politely refuse a suggestion."]'::jsonb,
   '[{"jp": "ひる休みに ほんを よみましょう。", "romaji": "hiruyasumi ni hon wo yomimashou", "en": "Let''s read books at lunchtime."}, {"jp": "はい、よみましょう。", "romaji": "hai, yomimashou", "en": "Yes, let''s read."}, {"jp": "はい、そう しましょう。", "romaji": "hai, sou shimashou", "en": "Yes, let''s do that."}, {"jp": "いいえ、それは ちょっと。", "romaji": "iie, sore wa chotto", "en": "No, that isn''t a good idea."}, {"jp": "いっしょに えいがを みましょう。", "romaji": "issho ni eiga wo mimashou", "en": "Let''s watch a movie together."}]'::jsonb,
   '[{"grammar": "Verb ます → ましょう", "explanation": "Change ます to ましょう to say ''Let''s …'': たべます → たべましょう (Let''s eat)."}, {"grammar": "いっしょに", "explanation": "いっしょに means ''together'': いっしょに えいがを みましょう。"}, {"grammar": "Responding to a suggestion", "explanation": "To agree: はい、そう しましょう。 To politely say no: いいえ、それは ちょっと。"}]'::jsonb),
  ('leisure-3', 'leisure', 3, 'Giving your opinion', 'おもしろいですね',
   'To learn how to give my opinion about things using い adjectives and respond to other people''s opinions.',
   '["I can describe things using い adjectives such as おもしろい and おいしい.", "I can give my opinion using noun は ＋ adjective ＋ です.", "I can use ね to check or agree and よ to emphasise."]'::jsonb,
   '[{"jp": "アイスクリームは おいしいです。", "romaji": "aisukuriimu wa oishii desu", "en": "The ice cream is delicious."}, {"jp": "えいがは おもしろいですね。", "romaji": "eiga wa omoshiroi desu ne", "en": "The movie is interesting, isn''t it?"}, {"jp": "はい、おもしろいです。", "romaji": "hai, omoshiroi desu", "en": "Yes, it is interesting."}, {"jp": "いいえ、つまらないですよ。", "romaji": "iie, tsumaranai desu yo", "en": "No, it is boring."}]'::jsonb,
   '[{"grammar": "Noun は ＋ い adjective ＋ です。", "explanation": "Say what something is like: えいがは おもしろいです。 (The movie is interesting.)"}, {"grammar": "〜ですね", "explanation": "Add ね to check or ask for agreement, like ''…, isn''t it?''."}, {"grammar": "〜ですよ", "explanation": "Add よ to emphasise your opinion."}]'::jsonb),
  ('holidays-1', 'holidays', 1, 'Asking what someone did', 'なにを しましたか',
   'To learn how to ask what someone did and say what I did, using past time expressions.',
   '["I can ask what someone did using なにを しましたか.", "I can say what I did by changing ます to ました.", "I can use past time expressions such as きのう and せんしゅう."]'::jsonb,
   '[{"jp": "きのう なにを しましたか。", "romaji": "kinou nani wo shimashita ka", "en": "What did you do yesterday?"}, {"jp": "きのう すしを たべました。", "romaji": "kinou sushi wo tabemashita", "en": "I ate sushi yesterday."}, {"jp": "せんしゅう としょかんに いきました。", "romaji": "senshuu toshokan ni ikimashita", "en": "I went to the library last week."}]'::jsonb,
   '[{"grammar": "なにを しましたか。", "explanation": "Ask what someone did. しました is the past form of します."}, {"grammar": "Verb ます → ました", "explanation": "Change ます to ました for the past: たべます (eat) → たべました (ate)."}, {"grammar": "Past time expressions", "explanation": "きのう (yesterday), せんしゅう (last week), せんげつ (last month) and きょねん (last year) usually come at the start of the sentence."}]'::jsonb),
  ('holidays-2', 'holidays', 2, 'Talking about what you did and didn''t do', '〜ました・〜ませんでした',
   'To learn how to ask if someone did something and answer yes or no in the past tense.',
   '["I can ask if someone did something using ましたか.", "I can answer yes using ました.", "I can answer no using ませんでした."]'::jsonb,
   '[{"jp": "休みに ケーキを つくりましたか。", "romaji": "yasumi ni keeki wo tsukurimashita ka", "en": "Did you make a cake in the holidays?"}, {"jp": "はい、ケーキを つくりました。", "romaji": "hai, keeki wo tsukurimashita", "en": "Yes, I made a cake."}, {"jp": "いいえ、ケーキを つくりませんでした。", "romaji": "iie, keeki wo tsukurimasen deshita", "en": "No, I didn''t make a cake."}]'::jsonb,
   '[{"grammar": "ました / ませんでした", "explanation": "Past positive: ます → ました (たべました = ate). Past negative: ます → ませんでした (たべませんでした = didn''t eat)."}, {"grammar": "Verb ＋ ましたか。", "explanation": "Add か to ask if someone did something: つくりましたか。 (Did you make …?)"}]'::jsonb),
  ('holidays-3', 'holidays', 3, 'Asking what something was like', 'どうでしたか',
   'To learn how to ask what something was like and describe past experiences using い adjectives.',
   '["I can ask what something was like using どうでしたか.", "I can change い adjectives to the past by replacing い with かったです.", "I can describe a trip or an event, for example りょこうは たのしかったです."]'::jsonb,
   '[{"jp": "りょこうは どうでしたか。", "romaji": "ryokou wa dou deshita ka", "en": "How was the trip?"}, {"jp": "りょこうは たのしかったです。", "romaji": "ryokou wa tanoshikatta desu", "en": "The trip was fun."}, {"jp": "すしは おいしかったです。", "romaji": "sushi wa oishikatta desu", "en": "The sushi was delicious."}]'::jsonb,
   '[{"grammar": "〜は どうでしたか。", "explanation": "Ask what something was like. どう means ''how'' and でした means ''was''."}, {"grammar": "い adjective: い → かったです", "explanation": "Drop the last い and add かったです: たのしい → たのしかったです (was fun). いい is special: よかったです (was good)."}]'::jsonb);

insert into public.edu_lessons (topic_id, slug, title_en, title_jp, lesson_order, site_order)
select t.id, l.slug, l.title_en, l.title_jp, l.lesson_order, t.sort_order * 100 + l.lesson_order * 10
from _l l
join public.edu_topics t on t.slug = l.topic
where not exists (select 1 from public.edu_lessons e where e.slug = l.slug);

update public.edu_lessons e
set title_en = l.title_en, title_jp = l.title_jp, lesson_order = l.lesson_order,
    site_order = t.sort_order * 100 + l.lesson_order * 10,
    learning_intention = l.li, key_expressions = l.ke, target_grammar = l.tg
from _l l
join public.edu_topics t on t.slug = l.topic
where e.slug = l.slug;

-- success_criteria は列の型（jsonb か text[]）に合わせて入れる
do $$
declare col_type text;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'edu_lessons' and column_name = 'success_criteria';
  if col_type = 'ARRAY' then
    update public.edu_lessons e set success_criteria = array(select jsonb_array_elements_text(l.sc)) from _l l where e.slug = l.slug;
  elsif col_type in ('text', 'character varying') then
    update public.edu_lessons e set success_criteria = l.sc::text from _l l where e.slug = l.slug;
  else
    update public.edu_lessons e set success_criteria = l.sc from _l l where e.slug = l.slug;
  end if;
end $$;

-- 教科書との対応（そのトピックのユニット：Obento Deluxe Unit 7〜12）
insert into public.edu_lesson_textbook_units (lesson_id, textbook_unit_id, coverage)
select e.id, tu.id, 'full'
from _l l
join public.edu_lessons e on e.slug = l.slug
join public.edu_topics t on t.slug = l.topic
join public.edu_textbook_units tu on tu.topic_id = t.id
on conflict (lesson_id, textbook_unit_id) do nothing;

-- ---------------------------------------------------------------- 3. 語彙
create temporary table _v (
  slug text, order_index int, jp_text text, jp_kana text, romaji text, english_text text, category text
) on commit drop;
insert into _v values
  ('dates-1', 1, '日曜日', 'にちようび', 'nichiyoubi', 'Sunday', 'days'),
  ('dates-1', 2, '月曜日', 'げつようび', 'getsuyoubi', 'Monday', 'days'),
  ('dates-1', 3, '火曜日', 'かようび', 'kayoubi', 'Tuesday', 'days'),
  ('dates-1', 4, '水曜日', 'すいようび', 'suiyoubi', 'Wednesday', 'days'),
  ('dates-1', 5, '木曜日', 'もくようび', 'mokuyoubi', 'Thursday', 'days'),
  ('dates-1', 6, '金曜日', 'きんようび', 'kinyoubi', 'Friday', 'days'),
  ('dates-1', 7, '土曜日', 'どようび', 'doyoubi', 'Saturday', 'days'),
  ('dates-1', 8, '何曜日', 'なんようび', 'nanyoubi', 'what day of the week', 'days'),
  ('dates-1', 9, 'きょう', null, 'kyou', 'today', 'time'),
  ('dates-1', 10, 'あした', null, 'ashita', 'tomorrow', 'time'),
  ('dates-1', 11, '休み', 'やすみ', 'yasumi', 'holiday / break', 'time'),
  ('dates-2', 1, '一月', 'いちがつ', 'ichigatsu', 'January', 'months'),
  ('dates-2', 2, '二月', 'にがつ', 'nigatsu', 'February', 'months'),
  ('dates-2', 3, '三月', 'さんがつ', 'sangatsu', 'March', 'months'),
  ('dates-2', 4, '四月', 'しがつ', 'shigatsu', 'April', 'months'),
  ('dates-2', 5, '五月', 'ごがつ', 'gogatsu', 'May', 'months'),
  ('dates-2', 6, '六月', 'ろくがつ', 'rokugatsu', 'June', 'months'),
  ('dates-2', 7, '七月', 'しちがつ', 'shichigatsu', 'July', 'months'),
  ('dates-2', 8, '八月', 'はちがつ', 'hachigatsu', 'August', 'months'),
  ('dates-2', 9, '九月', 'くがつ', 'kugatsu', 'September', 'months'),
  ('dates-2', 10, '十月', 'じゅうがつ', 'juugatsu', 'October', 'months'),
  ('dates-2', 11, '十一月', 'じゅういちがつ', 'juuichigatsu', 'November', 'months'),
  ('dates-2', 12, '十二月', 'じゅうにがつ', 'juunigatsu', 'December', 'months'),
  ('dates-2', 13, '何月', 'なんがつ', 'nangatsu', 'what month', 'months'),
  ('dates-2', 14, 'たんじょうび', null, 'tanjoubi', 'birthday', 'events'),
  ('dates-3', 1, '一日', 'ついたち', 'tsuitachi', '1st', 'dates'),
  ('dates-3', 2, '二日', 'ふつか', 'futsuka', '2nd', 'dates'),
  ('dates-3', 3, '三日', 'みっか', 'mikka', '3rd', 'dates'),
  ('dates-3', 4, '四日', 'よっか', 'yokka', '4th', 'dates'),
  ('dates-3', 5, '五日', 'いつか', 'itsuka', '5th', 'dates'),
  ('dates-3', 6, '六日', 'むいか', 'muika', '6th', 'dates'),
  ('dates-3', 7, '七日', 'なのか', 'nanoka', '7th', 'dates'),
  ('dates-3', 8, '八日', 'ようか', 'youka', '8th', 'dates'),
  ('dates-3', 9, '九日', 'ここのか', 'kokonoka', '9th', 'dates'),
  ('dates-3', 10, '十日', 'とおか', 'tooka', '10th', 'dates'),
  ('dates-3', 11, '十四日', 'じゅうよっか', 'juuyokka', '14th', 'dates'),
  ('dates-3', 12, '十九日', 'じゅうくにち', 'juukunichi', '19th', 'dates'),
  ('dates-3', 13, '二十日', 'はつか', 'hatsuka', '20th', 'dates'),
  ('dates-3', 14, '二十四日', 'にじゅうよっか', 'nijuuyokka', '24th', 'dates'),
  ('dates-3', 15, '二十九日', 'にじゅうくにち', 'nijuukunichi', '29th', 'dates'),
  ('dates-3', 16, '何日', 'なんにち', 'nannichi', 'what date', 'dates'),
  ('dates-4', 1, 'いつ', null, 'itsu', 'when', 'question'),
  ('dates-4', 2, 'えんそく', null, 'ensoku', 'excursion', 'events'),
  ('dates-4', 3, 'たんじょうび', null, 'tanjoubi', 'birthday', 'events'),
  ('dates-4', 4, 'うんどうかい', null, 'undoukai', 'sports carnival', 'events'),
  ('dates-4', 5, 'すいえいかい', null, 'suieikai', 'swimming carnival', 'events'),
  ('dates-4', 6, 'キャンプ', null, 'kyanpu', 'camp', 'events'),
  ('dates-4', 7, 'パーティー', null, 'paatii', 'party', 'events'),
  ('dates-4', 8, 'ダンスパーティー', null, 'dansu paatii', 'dance party', 'events'),
  ('dates-4', 9, 'テスト', null, 'tesuto', 'test', 'events'),
  ('hobbies-1', 1, 'しゅみ', null, 'shumi', 'hobby', 'hobbies'),
  ('hobbies-1', 2, 'おんがく', null, 'ongaku', 'music', 'hobbies'),
  ('hobbies-1', 3, 'かいもの', null, 'kaimono', 'shopping', 'hobbies'),
  ('hobbies-1', 4, 'どくしょ', null, 'dokusho', 'reading', 'hobbies'),
  ('hobbies-1', 5, 'りょうり', null, 'ryouri', 'cooking', 'hobbies'),
  ('hobbies-1', 6, 'ピアノ', null, 'piano', 'piano', 'hobbies'),
  ('hobbies-1', 7, 'ギター', null, 'gitaa', 'guitar', 'hobbies'),
  ('hobbies-1', 8, 'コンピューター', null, 'konpyuutaa', 'computer', 'hobbies'),
  ('hobbies-1', 9, 'ダンス', null, 'dansu', 'dance', 'hobbies'),
  ('hobbies-1', 10, 'カラオケ', null, 'karaoke', 'karaoke', 'hobbies'),
  ('hobbies-1', 11, 'しょどう', null, 'shodou', 'calligraphy', 'traditional arts'),
  ('hobbies-1', 12, 'さどう', null, 'sadou', 'tea ceremony', 'traditional arts'),
  ('hobbies-1', 13, 'いけばな', null, 'ikebana', 'flower arrangement', 'traditional arts'),
  ('hobbies-2', 1, 'スポーツ', null, 'supootsu', 'sports', 'sports'),
  ('hobbies-2', 2, 'すいえい', null, 'suiei', 'swimming', 'sports'),
  ('hobbies-2', 3, 'やきゅう', null, 'yakyuu', 'baseball', 'sports'),
  ('hobbies-2', 4, 'テニス', null, 'tenisu', 'tennis', 'sports'),
  ('hobbies-2', 5, 'サッカー', null, 'sakkaa', 'soccer', 'sports'),
  ('hobbies-2', 6, 'バスケットボール', null, 'basukettobooru', 'basketball', 'sports'),
  ('hobbies-2', 7, 'ネットボール', null, 'nettobooru', 'netball', 'sports'),
  ('hobbies-2', 8, 'クリケット', null, 'kuriketto', 'cricket', 'sports'),
  ('hobbies-2', 9, 'ゴルフ', null, 'gorufu', 'golf', 'sports'),
  ('hobbies-2', 10, 'スキー', null, 'sukii', 'skiing', 'sports'),
  ('hobbies-2', 11, 'サーフィン', null, 'saafin', 'surfing', 'sports'),
  ('hobbies-2', 12, 'からて', null, 'karate', 'karate', 'martial arts'),
  ('hobbies-2', 13, 'じゅうどう', null, 'juudou', 'judo', 'martial arts'),
  ('hobbies-2', 14, 'けんどう', null, 'kendou', 'kendo', 'martial arts'),
  ('hobbies-3', 1, 'できます', null, 'dekimasu', 'I can do it', 'ability'),
  ('hobbies-3', 2, 'できません', null, 'dekimasen', 'I cannot do it', 'ability'),
  ('hobbies-3', 3, 'すこし', null, 'sukoshi', 'a little', 'ability'),
  ('hobbies-3', 4, 'あまり', null, 'amari', 'not very well', 'ability'),
  ('hobbies-3', 5, 'ぜんぜん', null, 'zenzen', 'not at all', 'ability'),
  ('hobbies-3', 6, 'えいご', null, 'eigo', 'English', 'languages'),
  ('hobbies-3', 7, 'にほんご', null, 'nihongo', 'Japanese', 'languages'),
  ('hobbies-3', 8, 'ちゅうごくご', null, 'chuugokugo', 'Chinese', 'languages'),
  ('hobbies-3', 9, 'フランスご', null, 'furansugo', 'French', 'languages'),
  ('hobbies-3', 10, 'イタリアご', null, 'itariago', 'Italian', 'languages'),
  ('hobbies-3', 11, 'インドネシアご', null, 'indoneshiago', 'Indonesian', 'languages'),
  ('transport-1', 1, 'どこに', null, 'doko ni', 'where to', 'question'),
  ('transport-1', 2, 'いきます', null, 'ikimasu', 'go', 'verbs'),
  ('transport-1', 3, 'いきません', null, 'ikimasen', 'don''t go', 'verbs'),
  ('transport-1', 4, 'うち', null, 'uchi', 'home', 'places'),
  ('transport-1', 5, 'まち', null, 'machi', 'town', 'places'),
  ('transport-1', 6, 'がっこう', null, 'gakkou', 'school', 'places'),
  ('transport-1', 7, 'うみ', null, 'umi', 'beach / sea', 'places'),
  ('transport-1', 8, 'えいが', null, 'eiga', 'movie', 'places'),
  ('transport-1', 9, 'しあい', null, 'shiai', 'match / game', 'places'),
  ('transport-1', 10, 'デパート', null, 'depaato', 'department store', 'places'),
  ('transport-1', 11, 'レストラン', null, 'resutoran', 'restaurant', 'places'),
  ('transport-1', 12, 'コンサート', null, 'konsaato', 'concert', 'places'),
  ('transport-1', 13, 'ピクニック', null, 'pikunikku', 'picnic', 'places'),
  ('transport-1', 14, 'しゅうまつ', null, 'shuumatsu', 'weekend', 'time'),
  ('transport-2', 1, 'だれと', null, 'dare to', 'with who', 'question'),
  ('transport-2', 2, 'かぞく', null, 'kazoku', 'family', 'people'),
  ('transport-2', 3, 'ともだち', null, 'tomodachi', 'friend', 'people'),
  ('transport-2', 4, 'ひとりで', null, 'hitori de', 'by myself', 'people'),
  ('transport-2', 5, 'ともだちの うち', null, 'tomodachi no uchi', 'friend''s house', 'places'),
  ('transport-2', 6, 'おばあさんの うち', null, 'obaasan no uchi', 'grandmother''s house', 'places'),
  ('transport-2', 7, 'そして', null, 'soshite', 'and', 'conjunctions'),
  ('transport-2', 8, 'それから', null, 'sorekara', 'and then', 'conjunctions'),
  ('transport-2', 9, 'でも', null, 'demo', 'but', 'conjunctions'),
  ('transport-3', 1, 'なんで', null, 'nande', 'how / by what means', 'question'),
  ('transport-3', 2, 'くるま', null, 'kuruma', 'car', 'transport'),
  ('transport-3', 3, 'でんしゃ', null, 'densha', 'train', 'transport'),
  ('transport-3', 4, 'じてんしゃ', null, 'jitensha', 'bicycle / bike', 'transport'),
  ('transport-3', 5, 'ひこうき', null, 'hikouki', 'aeroplane / plane', 'transport'),
  ('transport-3', 6, 'しんかんせん', null, 'shinkansen', 'bullet train', 'transport'),
  ('transport-3', 7, 'ふね', null, 'fune', 'ship / boat', 'transport'),
  ('transport-3', 8, 'あるいて', null, 'aruite', 'on foot', 'transport'),
  ('transport-3', 9, 'バス', null, 'basu', 'bus', 'transport'),
  ('transport-3', 10, 'タクシー', null, 'takushii', 'taxi', 'transport'),
  ('transport-3', 11, 'フェリー', null, 'ferii', 'ferry', 'transport'),
  ('transport-3', 12, 'スクーター', null, 'sukuutaa', 'scooter', 'transport'),
  ('activities-1', 1, 'たべます', null, 'tabemasu', 'eat', 'verbs'),
  ('activities-1', 2, 'のみます', null, 'nomimasu', 'drink', 'verbs'),
  ('activities-1', 3, 'みます', null, 'mimasu', 'watch / look / see', 'verbs'),
  ('activities-1', 4, 'ききます', null, 'kikimasu', 'listen', 'verbs'),
  ('activities-1', 5, 'かきます', null, 'kakimasu', 'write', 'verbs'),
  ('activities-1', 6, 'よみます', null, 'yomimasu', 'read', 'verbs'),
  ('activities-1', 7, 'かいます', null, 'kaimasu', 'buy', 'verbs'),
  ('activities-1', 8, 'とります', null, 'torimasu', 'take', 'verbs'),
  ('activities-1', 9, 'します', null, 'shimasu', 'do / play', 'verbs'),
  ('activities-1', 10, 'つくります', null, 'tsukurimasu', 'make', 'verbs'),
  ('activities-1', 11, 'いきます', null, 'ikimasu', 'go', 'verbs'),
  ('activities-1', 12, 'あいます', null, 'aimasu', 'meet', 'verbs'),
  ('activities-1', 13, 'ねます', null, 'nemasu', 'sleep', 'verbs'),
  ('activities-2', 1, 'でんわ', null, 'denwa', 'telephone / phone', 'activities'),
  ('activities-2', 2, 'べんきょう', null, 'benkyou', 'study', 'activities'),
  ('activities-2', 3, 'しゅくだい', null, 'shukudai', 'homework', 'activities'),
  ('activities-2', 4, 'れんしゅう', null, 'renshuu', 'practice', 'activities'),
  ('activities-2', 5, 'ラジオ', null, 'rajio', 'radio', 'activities'),
  ('activities-2', 6, 'てがみ', null, 'tegami', 'letter', 'activities'),
  ('activities-2', 7, 'にっき', null, 'nikki', 'diary', 'activities'),
  ('activities-2', 8, '本', 'ほん', 'hon', 'book', 'activities'),
  ('activities-2', 9, 'ざっし', null, 'zasshi', 'magazine', 'activities'),
  ('activities-2', 10, 'しんぶん', null, 'shinbun', 'newspaper', 'activities'),
  ('activities-2', 11, 'しゃしん', null, 'shashin', 'photo', 'activities'),
  ('activities-2', 12, 'テレビ', null, 'terebi', 'TV', 'activities'),
  ('activities-2', 13, 'けいたい', null, 'keitai', 'mobile phone / mobile', 'activities'),
  ('activities-2', 14, 'おみやげ', null, 'omiyage', 'souvenir', 'activities'),
  ('activities-2', 15, 'ケーキ', null, 'keeki', 'cake', 'activities'),
  ('leisure-1', 1, 'ひまなときに', null, 'hima na toki ni', 'in your spare time / in your free time', 'time'),
  ('leisure-1', 2, 'がっこうの まえに', null, 'gakkou no mae ni', 'before school', 'time'),
  ('leisure-1', 3, 'がっこうの あとで', null, 'gakkou no ato de', 'after school', 'time'),
  ('leisure-1', 4, 'あとで', null, 'ato de', 'later', 'time'),
  ('leisure-1', 5, 'ひる休みに', 'ひるやすみに', 'hiruyasumi ni', 'at lunchtime', 'time'),
  ('leisure-1', 6, '金曜日の ばん', 'きんようびの ばん', 'kinyoubi no ban', 'Friday evening', 'time'),
  ('leisure-1', 7, 'あしたの あさ', null, 'ashita no asa', 'tomorrow morning', 'time'),
  ('leisure-1', 8, 'あさ', null, 'asa', 'morning / in the morning', 'time'),
  ('leisure-1', 9, 'よる', null, 'yoru', 'night / at night', 'time'),
  ('leisure-1', 10, 'きょう', null, 'kyou', 'today', 'time'),
  ('leisure-1', 11, 'あした', null, 'ashita', 'tomorrow', 'time'),
  ('leisure-2', 1, 'たべましょう', null, 'tabemashou', 'let''s eat', 'let''s'),
  ('leisure-2', 2, 'のみましょう', null, 'nomimashou', 'let''s drink', 'let''s'),
  ('leisure-2', 3, 'みましょう', null, 'mimashou', 'let''s watch / let''s look / let''s see', 'let''s'),
  ('leisure-2', 4, 'ききましょう', null, 'kikimashou', 'let''s listen', 'let''s'),
  ('leisure-2', 5, 'かきましょう', null, 'kakimashou', 'let''s write', 'let''s'),
  ('leisure-2', 6, 'よみましょう', null, 'yomimashou', 'let''s read', 'let''s'),
  ('leisure-2', 7, 'かいましょう', null, 'kaimashou', 'let''s buy', 'let''s'),
  ('leisure-2', 8, 'しましょう', null, 'shimashou', 'let''s do / let''s play', 'let''s'),
  ('leisure-2', 9, 'つくりましょう', null, 'tsukurimashou', 'let''s make', 'let''s'),
  ('leisure-2', 10, 'いきましょう', null, 'ikimashou', 'let''s go', 'let''s'),
  ('leisure-2', 11, 'あいましょう', null, 'aimashou', 'let''s meet', 'let''s'),
  ('leisure-2', 12, 'のりましょう', null, 'norimashou', 'let''s ride', 'let''s'),
  ('leisure-2', 13, 'いっしょに', null, 'issho ni', 'together', 'adverb'),
  ('leisure-3', 1, 'おもしろい', null, 'omoshiroi', 'interesting / funny', 'い adjectives'),
  ('leisure-3', 2, 'たのしい', null, 'tanoshii', 'fun', 'い adjectives'),
  ('leisure-3', 3, 'つまらない', null, 'tsumaranai', 'boring', 'い adjectives'),
  ('leisure-3', 4, 'おいしい', null, 'oishii', 'delicious', 'い adjectives'),
  ('leisure-3', 5, 'まずい', null, 'mazui', 'tastes awful', 'い adjectives'),
  ('leisure-3', 6, 'むずかしい', null, 'muzukashii', 'difficult', 'い adjectives'),
  ('leisure-3', 7, 'やさしい', null, 'yasashii', 'easy', 'い adjectives'),
  ('leisure-3', 8, 'たかい', null, 'takai', 'expensive', 'い adjectives'),
  ('leisure-3', 9, 'やすい', null, 'yasui', 'cheap', 'い adjectives'),
  ('leisure-3', 10, 'いい', null, 'ii', 'good', 'い adjectives'),
  ('holidays-1', 1, 'きのう', null, 'kinou', 'yesterday', 'time'),
  ('holidays-1', 2, 'せんしゅう', null, 'senshuu', 'last week', 'time'),
  ('holidays-1', 3, 'せんげつ', null, 'sengetsu', 'last month', 'time'),
  ('holidays-1', 4, 'きょねん', null, 'kyonen', 'last year', 'time'),
  ('holidays-1', 5, 'なつ休み', 'なつやすみ', 'natsuyasumi', 'summer holidays', 'school'),
  ('holidays-1', 6, 'しゅうがくりょこう', null, 'shuugakuryokou', 'school trip', 'school'),
  ('holidays-1', 7, 'りょこう', null, 'ryokou', 'trip', 'places'),
  ('holidays-1', 8, 'としょかん', null, 'toshokan', 'library', 'places'),
  ('holidays-1', 9, 'じんじゃ', null, 'jinja', 'shrine', 'places'),
  ('holidays-1', 10, 'おてら', null, 'otera', 'temple', 'places'),
  ('holidays-1', 11, 'おみやげ', null, 'omiyage', 'souvenir', 'things'),
  ('holidays-1', 12, 'ぶんかさい', null, 'bunkasai', 'cultural festival', 'school'),
  ('holidays-1', 13, 'しけん', null, 'shiken', 'exam', 'school'),
  ('holidays-1', 14, 'さくぶん', null, 'sakubun', 'composition', 'school'),
  ('holidays-1', 15, 'そつぎょうしき', null, 'sotsugyoushiki', 'graduation ceremony', 'school'),
  ('holidays-1', 16, 'にゅうがくしき', null, 'nyuugakushiki', 'school entrance ceremony', 'school'),
  ('holidays-1', 17, 'ジェットコースター', null, 'jettokoosutaa', 'roller coaster', 'things'),
  ('holidays-2', 1, 'たべました', null, 'tabemashita', 'ate', 'past verbs'),
  ('holidays-2', 2, 'のみました', null, 'nomimashita', 'drank', 'past verbs'),
  ('holidays-2', 3, 'みました', null, 'mimashita', 'watched / looked / saw', 'past verbs'),
  ('holidays-2', 4, 'ききました', null, 'kikimashita', 'listened', 'past verbs'),
  ('holidays-2', 5, 'かきました', null, 'kakimashita', 'wrote', 'past verbs'),
  ('holidays-2', 6, 'よみました', null, 'yomimashita', 'read', 'past verbs'),
  ('holidays-2', 7, 'かいました', null, 'kaimashita', 'bought', 'past verbs'),
  ('holidays-2', 8, 'とりました', null, 'torimashita', 'took', 'past verbs'),
  ('holidays-2', 9, 'しました', null, 'shimashita', 'did / played', 'past verbs'),
  ('holidays-2', 10, 'つくりました', null, 'tsukurimashita', 'made', 'past verbs'),
  ('holidays-2', 11, 'いきました', null, 'ikimashita', 'went', 'past verbs'),
  ('holidays-2', 12, 'あいました', null, 'aimashita', 'met', 'past verbs'),
  ('holidays-2', 13, 'ねました', null, 'nemashita', 'slept', 'past verbs'),
  ('holidays-2', 14, 'のりました', null, 'norimashita', 'rode', 'past verbs'),
  ('holidays-3', 1, 'たのしかったです', null, 'tanoshikatta desu', 'was enjoyable / was fun', 'past い adjectives'),
  ('holidays-3', 2, 'おいしかったです', null, 'oishikatta desu', 'was delicious', 'past い adjectives'),
  ('holidays-3', 3, 'おもしろかったです', null, 'omoshirokatta desu', 'was interesting / was funny', 'past い adjectives'),
  ('holidays-3', 4, 'すごかったです', null, 'sugokatta desu', 'was amazing', 'past い adjectives'),
  ('holidays-3', 5, 'こわかったです', null, 'kowakatta desu', 'was scary', 'past い adjectives'),
  ('holidays-3', 6, 'うるさかったです', null, 'urusakatta desu', 'was noisy', 'past い adjectives'),
  ('holidays-3', 7, 'おおきかったです', null, 'ookikatta desu', 'was big', 'past い adjectives'),
  ('holidays-3', 8, 'ちいさかったです', null, 'chiisakatta desu', 'was small', 'past い adjectives'),
  ('holidays-3', 9, 'かわいかったです', null, 'kawaikatta desu', 'was cute', 'past い adjectives'),
  ('holidays-3', 10, 'たかかったです', null, 'takakatta desu', 'was expensive', 'past い adjectives'),
  ('holidays-3', 11, 'やすかったです', null, 'yasukatta desu', 'was cheap', 'past い adjectives'),
  ('holidays-3', 12, 'むずかしかったです', null, 'muzukashikatta desu', 'was difficult', 'past い adjectives'),
  ('holidays-3', 13, 'つまらなかったです', null, 'tsumaranakatta desu', 'was boring', 'past い adjectives'),
  ('holidays-3', 14, 'よかったです', null, 'yokatta desu', 'was good', 'past い adjectives');

update public.kl_vocabulary k
set jp_kana = v.jp_kana, romaji = v.romaji, english_text = v.english_text,
    category = v.category, order_index = v.order_index
from _v v
join public.edu_lessons e on e.slug = v.slug
where k.lesson_id = e.id and k.jp_text = v.jp_text;

insert into public.kl_vocabulary (lesson_id, jp_text, jp_kana, romaji, english_text, category, order_index)
select e.id, v.jp_text, v.jp_kana, v.romaji, v.english_text, v.category, v.order_index
from _v v
join public.edu_lessons e on e.slug = v.slug
where not exists (
  select 1 from public.kl_vocabulary k where k.lesson_id = e.id and k.jp_text = v.jp_text
);


-- 2c / 3b. 音声ファイルがまだ無い語は、ほかのレッスンにある同じ語の音声を使う（例：さかな、みず）
update public.kl_vocabulary k
set audio_url = (
  select k2.audio_url from public.kl_vocabulary k2
  where k2.jp_text = k.jp_text and k2.audio_url is not null and k2.audio_url <> ''
  order by k2.created_at limit 1
)
from _v v
join public.edu_lessons e on e.slug = v.slug
where k.lesson_id = e.id and k.jp_text = v.jp_text
  and (k.audio_url is null or k.audio_url = '')
  and exists (
    select 1 from public.kl_vocabulary k2
    where k2.jp_text = k.jp_text and k2.audio_url is not null and k2.audio_url <> ''
  );

-- ---------------------------------------------------------------- 確認（18 行。教科書の行・語彙の数が入っていれば OK）
select e.site_order, e.slug, e.title_en, e.title_jp, tb.title as textbook, tu.unit_number,
       jsonb_array_length(e.key_expressions::jsonb) as expressions,
       jsonb_array_length(e.target_grammar::jsonb) as grammar,
       (select count(*) from public.kl_vocabulary k where k.lesson_id = e.id) as vocabulary
from public.edu_lessons e
left join public.edu_lesson_textbook_units m on m.lesson_id = e.id
left join public.edu_textbook_units tu on tu.id = m.textbook_unit_id
left join public.edu_textbooks tb on tb.id = tu.textbook_id
where e.slug in (select slug from _l)
order by e.site_order;

commit;
