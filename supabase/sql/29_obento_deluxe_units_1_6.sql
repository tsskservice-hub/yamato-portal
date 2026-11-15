-- 29. Obento Deluxe Unit 1〜6 のレッスンを、先生の Grammar Notes に合わせる
--
--  元にしたもの：Grammar Notes Obento Deluxe U1 U2 U3 / U4 U5 U6
--  このファイルがすること（今ある 16 レッスンを更新する。レッスンは増やさない）：
--    1. タイトル（英語・日本語）、Learning Intention、Success Criteria、Key Expressions、Grammar を入れ直す
--    2. 語彙（kl_vocabulary）
--       - ノートに合わせて表記を変える語（にほん → 日本 など）は、行をそのまま書きかえる（音声 audio_url は残る）
--       - 同じ表記の語は、英語・ローマ字・読み・並び順を更新する（音声は残る）
--       - ノートにあってまだ無い語は足す（音声ファイルは無いので、画面ではブラウザの読み上げになる）
--       - ノートに無い語は消さない
--  Unit 5 はノートの Grammar 1〜3（ペット・なまえ・の・形容詞）を pets-1、Grammar 4（たべます・のみます）を pets-2 にした。
--  Unit 6 の Grammar 2・3（すき・きらい）は food-2 にまとめた。
--  何度実行しても同じ結果になる。

begin;

-- ---------------------------------------------------------------- 1. レッスン
create temporary table _l (slug text, title_en text, title_jp text, li text, sc jsonb, ke jsonb, tg jsonb) on commit drop;
insert into _l values
  ('greetings-1', 'Greeting and saying goodbye', 'あいさつ',
   'To learn how to greet people and say goodbye in Japanese at different times of the day.',
   '["I can greet people in the morning, afternoon and evening.", "I can say goodbye and ''see you tomorrow''.", "I can say ''How do you do?'' and ''Pleased to meet you'' when I meet someone for the first time."]'::jsonb,
   '[{"jp": "おはようございます。", "romaji": "ohayou gozaimasu", "en": "Good morning."}, {"jp": "こんにちは。", "romaji": "konnichiwa", "en": "Hello. / Good afternoon."}, {"jp": "こんばんは。", "romaji": "konbanwa", "en": "Good evening."}, {"jp": "さようなら。", "romaji": "sayounara", "en": "Goodbye."}, {"jp": "またあした。", "romaji": "mata ashita", "en": "See you tomorrow."}, {"jp": "はじめまして。どうぞよろしく。", "romaji": "hajimemashite. douzo yoroshiku", "en": "How do you do? Pleased to meet you."}]'::jsonb,
   '[{"grammar": "Greetings – あいさつ", "explanation": "Use おはよう（ございます） in the morning, こんにちは during the day and こんばんは in the evening. おはよう is casual; add ございます to be polite."}, {"grammar": "Saying goodbye", "explanation": "さようなら means ''goodbye''. またあした means ''see you tomorrow'' and またね means ''see you later''."}]'::jsonb),
  ('greetings-2', 'Asking someone''s name and introducing yourself', 'おなまえは？',
   'To learn how to ask someone''s name and introduce myself in Japanese.',
   '["I can ask someone''s name using おなまえは？", "I can say my name using わたしは / ぼくは ＋ name ＋ です.", "I can use Japanese titles such as さん, くん, ちゃん and せんせい after a name."]'::jsonb,
   '[{"jp": "おなまえは？", "romaji": "onamae wa?", "en": "What is your name?"}, {"jp": "わたしは けいこです。", "romaji": "watashi wa keiko desu", "en": "I am Keiko."}, {"jp": "ぼくは ベンです。", "romaji": "boku wa ben desu", "en": "I am Ben. (boy)"}, {"jp": "ベンくんですね。", "romaji": "ben kun desu ne", "en": "You are Ben, aren''t you?"}, {"jp": "はい、そうです。", "romaji": "hai, sou desu", "en": "Yes, that''s right."}, {"jp": "どうぞ よろしく。", "romaji": "douzo yoroshiku", "en": "Pleased to meet you."}]'::jsonb,
   '[{"grammar": "おなまえは？", "explanation": "Ask someone''s name. Answer with your name ＋ です。"}, {"grammar": "わたしは ＋ Name ＋ です。", "explanation": "Introduce yourself. わたし (I) is for everybody; ぼく (I) is used by boys."}, {"grammar": "Name ＋ さん / くん / ちゃん / せんせい", "explanation": "Japanese titles come AFTER a person''s name. さん is for anyone, くん for boys, ちゃん for young children and せんせい for teachers and doctors. Never use a title after your own name."}]'::jsonb),
  ('greetings-3', 'Giving instructions', '〜てください',
   'To learn how to understand and give classroom instructions using ください.',
   '["I can understand classroom instructions such as たって and すわって.", "I can give a polite instruction by adding ください.", "I can use useful classroom expressions such as すみません and よくできました."]'::jsonb,
   '[{"jp": "たってください。", "romaji": "tatte kudasai", "en": "Please stand up."}, {"jp": "すわってください。", "romaji": "suwatte kudasai", "en": "Please sit down."}, {"jp": "きいてください。", "romaji": "kiite kudasai", "en": "Please listen."}, {"jp": "しずかにしてください。", "romaji": "shizuka ni shite kudasai", "en": "Please be quiet."}, {"jp": "はい、どうぞ。", "romaji": "hai, douzo", "en": "Here you are."}, {"jp": "すみません。", "romaji": "sumimasen", "en": "Excuse me."}, {"jp": "よくできました。", "romaji": "yoku dekimashita", "en": "Well done."}]'::jsonb,
   '[{"grammar": "Instruction ＋ ください。", "explanation": "ください means ''please''. Put it after an instruction to make it polite: みて ください。 (Please look.)"}]'::jsonb),
  ('numbers-1', 'Counting numbers', '一、二、三',
   'To learn how to count from 0 to 20 and say tens such as 30, 40 and 50 in Japanese.',
   '["I can count from 0 to 10 in Japanese.", "I can make the numbers 11 to 19 by adding じゅう (10) and a number.", "I can say tens such as にじゅう (20) and さんじゅう (30)."]'::jsonb,
   '[{"jp": "いち、に、さん。", "romaji": "ichi, ni, san", "en": "1, 2, 3."}, {"jp": "じゅういち（十一）", "romaji": "juuichi", "en": "11 = 10 + 1"}, {"jp": "にじゅう（二十）", "romaji": "nijuu", "en": "20 = 2 × 10"}, {"jp": "もういちど。", "romaji": "mou ichido", "en": "Once more."}, {"jp": "はじめ！ おわり！", "romaji": "hajime! owari!", "en": "Start! Finish!"}]'::jsonb,
   '[{"grammar": "Counting to 10", "explanation": "4 can be し or よん, 7 can be なな or しち, and 9 can be きゅう or く."}, {"grammar": "11–19 = じゅう ＋ number", "explanation": "11 is 10 + 1: じゅう ＋ いち = じゅういち（十一）."}, {"grammar": "Tens = number ＋ じゅう", "explanation": "20 is 2 × 10: に ＋ じゅう = にじゅう（二十）. 30 = さんじゅう, 40 = よんじゅう, 50 = ごじゅう."}]'::jsonb),
  ('numbers-2', 'Asking and reporting age', 'なんさいですか',
   'To learn how to ask someone''s age and say how old I am.',
   '["I can ask someone''s age using なんさいですか.", "I can say my age using わたしは / ぼくは ＋ number ＋ さいです.", "I can say the special ages correctly, such as いっさい, はっさい, じゅっさい and はたち."]'::jsonb,
   '[{"jp": "なんさいですか。", "romaji": "nansai desu ka", "en": "How old are you?"}, {"jp": "わたしは 十三さいです。", "romaji": "watashi wa juusansai desu", "en": "I am 13 years old."}, {"jp": "おたんじょうび おめでとう。", "romaji": "otanjoubi omedetou", "en": "Happy birthday."}, {"jp": "ありがとう。", "romaji": "arigatou", "en": "Thank you."}, {"jp": "うれしい。", "romaji": "ureshii", "en": "I am happy."}]'::jsonb,
   '[{"grammar": "なんさいですか。", "explanation": "なん means ''what'' and さい means ''years old'', so なんさい means ''how old''."}, {"grammar": "わたしは ＋ Number ＋ さいです。", "explanation": "Say your age. Watch the sound changes: いっさい (1), はっさい (8), じゅっさい (10), じゅういっさい (11). 20 years old is はたち."}]'::jsonb),
  ('numbers-3', 'Asking and reporting telephone numbers', 'でんわばんごうは？',
   'To learn how to ask for someone''s telephone number and say my own number.',
   '["I can ask for someone''s phone number using でんわばんごうは？", "I can say a phone number digit by digit, using の for the dash.", "I can answer the phone with もしもし."]'::jsonb,
   '[{"jp": "でんわばんごうは？", "romaji": "denwa bangou wa?", "en": "What''s your phone number?"}, {"jp": "一二三四の五六七八です。", "romaji": "ichi ni san yon no go roku nana hachi desu", "en": "It''s 1234-5678."}, {"jp": "八五二四です。", "romaji": "hachi go ni yon desu", "en": "It''s 8524."}, {"jp": "もしもし。", "romaji": "moshi moshi", "en": "Hello. (on the phone)"}, {"jp": "もういちど。", "romaji": "mou ichido", "en": "Once more."}]'::jsonb,
   '[{"grammar": "でんわばんごうは？", "explanation": "でんわばんごう means ''telephone number''. Answer: number ＋ です。"}, {"grammar": "Number の Number", "explanation": "Say each digit one by one. の stands for the dash (-) in a phone number: 一二三四の五六七八 = 1234-5678."}]'::jsonb),
  ('countries-1', 'Asking where someone comes from', 'どこから きましたか',
   'To learn how to ask where someone comes from and say where I come from.',
   '["I can name countries in Japanese.", "I can ask where someone comes from using どこから きましたか.", "I can say where I come from using country ＋ から きました."]'::jsonb,
   '[{"jp": "どこから きましたか。", "romaji": "doko kara kimashita ka", "en": "Where are you from?"}, {"jp": "にほんから きました。", "romaji": "nihon kara kimashita", "en": "I''m from Japan."}, {"jp": "げんきですか。", "romaji": "genki desu ka", "en": "How are you?"}, {"jp": "はい、げんきです。", "romaji": "hai, genki desu", "en": "Yes, I am well."}]'::jsonb,
   '[{"grammar": "どこから きましたか。", "explanation": "どこ means ''where'' and から means ''from''. To answer, replace どこ with a country: にほんから きました。"}, {"grammar": "Katakana for country names", "explanation": "Names of countries from outside Japan are written in katakana: オーストラリア, アメリカ. 日本 (にほん) is written in kanji and means ''origin of the sun''."}]'::jsonb),
  ('countries-2', 'Asking about nationality', 'なにじんですか',
   'To learn how to ask about someone''s nationality and say my nationality.',
   '["I can say nationalities by adding 人 (じん) to a country name.", "I can ask someone''s nationality using なにじんですか.", "I can say my nationality using わたしは / ぼくは ＋ country ＋ 人です."]'::jsonb,
   '[{"jp": "なにじんですか。", "romaji": "nanijin desu ka", "en": "What nationality are you?"}, {"jp": "わたしは オーストラリア人です。", "romaji": "watashi wa oosutorariajin desu", "en": "I''m Australian."}, {"jp": "ぼくは 日本人です。", "romaji": "boku wa nihonjin desu", "en": "I''m Japanese."}]'::jsonb,
   '[{"grammar": "Country ＋ 人 (じん)", "explanation": "Add 人 (じん, person) to a country to make a nationality: 日本 ＋ 人 = 日本人 (Japanese)."}, {"grammar": "なにじんですか。", "explanation": "なに means ''what'', so なにじん asks ''what nationality''."}]'::jsonb),
  ('countries-3', 'Asking where someone lives', 'どこに すんでいますか',
   'To learn how to ask where someone lives and say where I live, using city names.',
   '["I can name cities in Japan and Australia in Japanese.", "I can ask where someone lives using どこに すんでいますか.", "I can say where I live using city ＋ に すんでいます."]'::jsonb,
   '[{"jp": "どこに すんでいますか。", "romaji": "doko ni sunde imasu ka", "en": "Where do you live?"}, {"jp": "メルボルンに すんでいます。", "romaji": "meruborun ni sunde imasu", "en": "I live in Melbourne."}, {"jp": "ありがとう。", "romaji": "arigatou", "en": "Thank you."}, {"jp": "どういたしまして。", "romaji": "dou itashimashite", "en": "You''re welcome."}, {"jp": "わたしの ともだちです。", "romaji": "watashi no tomodachi desu", "en": "This is my friend."}]'::jsonb,
   '[{"grammar": "どこに すんでいますか。", "explanation": "どこ means ''where'', に means ''in'' and すんでいます means ''live''. To answer, replace どこ with a city: メルボルンに すんでいます。"}, {"grammar": "City names", "explanation": "Japanese cities are written in hiragana or kanji (とうきょう). Cities outside Japan are written in katakana (シドニー)."}]'::jsonb),
  ('family-1', 'Asking how many people are in a family', 'なん人かぞくですか',
   'To learn how to ask how many people are in someone''s family and say how many people are in my family.',
   '["I can count people using the counter 人 (にん).", "I can say the special readings ひとり (1 person) and ふたり (2 people).", "I can ask and answer how many people are in a family."]'::jsonb,
   '[{"jp": "なん人かぞくですか。", "romaji": "nannin kazoku desu ka", "en": "How many people are in your family?"}, {"jp": "五人です。", "romaji": "gonin desu", "en": "There are five people."}, {"jp": "ひとり", "romaji": "hitori", "en": "1 person"}, {"jp": "ふたり", "romaji": "futari", "en": "2 people"}]'::jsonb,
   '[{"grammar": "なん人かぞくですか。", "explanation": "なん人 (なんにん) means ''how many people'' and かぞく means ''family''."}, {"grammar": "Number ＋ 人 (にん)", "explanation": "Count people with 人 (にん): 三人 (さんにん), 四人 (よにん). 1 person is ひとり and 2 people is ふたり."}]'::jsonb),
  ('family-2', 'Saying who is in your family', 'かぞくは だれですか',
   'To learn how to name family members and say who is in my family using と.',
   '["I can name family members in Japanese.", "I can link family members using と (and).", "I can say who is in my family."]'::jsonb,
   '[{"jp": "おかあさんと おねえさんと わたしです。", "romaji": "okaasan to oneesan to watashi desu", "en": "There are my mother, older sister and me."}, {"jp": "おとうさんと おかあさんと ぼくです。", "romaji": "otousan to okaasan to boku desu", "en": "There are my father, mother and me."}]'::jsonb,
   '[{"grammar": "Noun ＋ と ＋ Noun", "explanation": "と (to) by itself means ''and''. Use it to list family members: おかあさんと おねえさんと わたしです。"}]'::jsonb),
  ('family-3', 'Asking if someone has pets', 'ペットが いますか',
   'To learn how to ask if someone has pets and say which pets I have or don''t have.',
   '["I can name pets in Japanese.", "I can ask if someone has pets using ペットが いますか.", "I can answer with います (have) or いません (don''t have)."]'::jsonb,
   '[{"jp": "ペットが いますか。", "romaji": "petto ga imasu ka", "en": "Do you have any pets?"}, {"jp": "はい、います。", "romaji": "hai, imasu", "en": "Yes, I have them."}, {"jp": "いいえ、いません。", "romaji": "iie, imasen", "en": "No, I don''t have them."}, {"jp": "はい、へびが います。", "romaji": "hai, hebi ga imasu", "en": "Yes, I have snakes."}, {"jp": "いいえ、ペットが いません。", "romaji": "iie, petto ga imasen", "en": "No, I don''t have pets."}]'::jsonb,
   '[{"grammar": "Animal ＋ が います。", "explanation": "います means ''have'' (for living things). Use が before います."}, {"grammar": "います / いません", "explanation": "います = have, いません = don''t have. Add か to ask: ペットが いますか。"}]'::jsonb),
  ('pets-1', 'Talking about your pet', 'ペットは なんですか',
   'To learn how to say what my pet is and what its name is, show ownership with の and describe pets with adjectives.',
   '["I can ask and answer what someone''s pet is and what its name is.", "I can show ownership using の, such as わたしの ペット.", "I can describe a pet using adjectives such as かわいい and おおきい, and use ね to say ''isn''t it?''."]'::jsonb,
   '[{"jp": "ペットは なんですか。", "romaji": "petto wa nan desu ka", "en": "What is your pet?"}, {"jp": "ペットは ねこです。", "romaji": "petto wa neko desu", "en": "My pet is a cat."}, {"jp": "なまえは はなです。", "romaji": "namae wa hana desu", "en": "Its name is Hana."}, {"jp": "せんせいの ペットは いぬです。", "romaji": "sensei no petto wa inu desu", "en": "The teacher''s pet is a dog."}, {"jp": "あひるの なまえは ひらです。", "romaji": "ahiru no namae wa hira desu", "en": "The duck''s name is Hira."}, {"jp": "うまは かわいいですね。", "romaji": "uma wa kawaii desu ne", "en": "The horse is cute, isn''t it?"}]'::jsonb,
   '[{"grammar": "ペットは なんですか。", "explanation": "Ask what someone''s pet is. なん means ''what''. Answer: ペットは ＋ animal ＋ です。"}, {"grammar": "Noun ＋ の ＋ Noun", "explanation": "の (no) by itself means ''s or ''of'': わたしの ペット (my pet), せんせいの ペット (the teacher''s pet)."}, {"grammar": "Noun は ＋ adjective ＋ です（ね）。", "explanation": "Describe a pet: うまは かわいいです。 Add ね to mean ''isn''t it?''."}]'::jsonb),
  ('pets-2', 'Asking what pets eat and drink', 'なにを たべますか',
   'To learn how to ask and say what pets eat and drink.',
   '["I can name pet food and drinks in Japanese.", "I can ask what a pet eats or drinks using なにを たべますか / のみますか.", "I can say what a pet eats or drinks using を たべます / のみます."]'::jsonb,
   '[{"jp": "うまは なにを たべますか。", "romaji": "uma wa nani wo tabemasu ka", "en": "What do horses eat?"}, {"jp": "うさぎは なにを のみますか。", "romaji": "usagi wa nani wo nomimasu ka", "en": "What do rabbits drink?"}, {"jp": "うまは えさを たべます。", "romaji": "uma wa esa wo tabemasu", "en": "Horses eat food (for animals)."}, {"jp": "うさぎは みずを のみます。", "romaji": "usagi wa mizu wo nomimasu", "en": "Rabbits drink water."}]'::jsonb,
   '[{"grammar": "なにを たべますか / のみますか。", "explanation": "なに means ''what''. を marks the thing that is eaten or drunk."}, {"grammar": "Animal は ＋ food ＋ を たべます。", "explanation": "Answer by putting the food or drink where なに was: うさぎは みずを のみます。"}]'::jsonb),
  ('food-1', 'Asking about breakfast and meals', 'あさごはんに なにを たべますか',
   'To learn how to ask and say what people eat and drink for breakfast.',
   '["I can name food and drinks in Japanese.", "I can ask what someone has for breakfast using あさごはんに なにを たべますか.", "I can say what I eat and drink for breakfast."]'::jsonb,
   '[{"jp": "あさごはんに なにを たべますか。", "romaji": "asagohan ni nani wo tabemasu ka", "en": "What do you have for breakfast?"}, {"jp": "あさごはんに たまごを たべます。", "romaji": "asagohan ni tamago wo tabemasu", "en": "I eat eggs for breakfast."}, {"jp": "あさごはんに おちゃを のみます。", "romaji": "asagohan ni ocha wo nomimasu", "en": "I drink tea for breakfast."}, {"jp": "おいしい！", "romaji": "oishii!", "en": "Yummy!"}]'::jsonb,
   '[{"grammar": "あさごはんに ＋ food ＋ を たべます。", "explanation": "あさごはんに means ''for breakfast''. Use たべます (eat) for food and のみます (drink) for drinks."}, {"grammar": "Katakana for foreign food", "explanation": "Food from outside Japan is written in katakana: パン, ピザ. A small ッ makes a double consonant (サンドイッチ) and ー makes a long vowel (ケーキ)."}]'::jsonb),
  ('food-2', 'Expressing likes and dislikes', 'すしが すきですか',
   'To learn how to ask if someone likes something and say what I like and dislike.',
   '["I can ask if someone likes something using が すきですか.", "I can answer with だいすきです, すきです, あんまり, きらいです or だいきらいです.", "I can say what I or other people like and dislike using は … が すきです."]'::jsonb,
   '[{"jp": "すしが すきですか。", "romaji": "sushi ga suki desu ka", "en": "Do you like sushi?"}, {"jp": "はい、だいすきです。", "romaji": "hai, daisuki desu", "en": "Yes, I love it."}, {"jp": "はい、すきです。", "romaji": "hai, suki desu", "en": "Yes, I like it."}, {"jp": "いいえ、あんまり。", "romaji": "iie, anmari", "en": "No, not really."}, {"jp": "いいえ、きらいです。", "romaji": "iie, kirai desu", "en": "No, I dislike it."}, {"jp": "いいえ、だいきらいです。", "romaji": "iie, daikirai desu", "en": "No, I hate it."}, {"jp": "わたしは すしが だいすきです。", "romaji": "watashi wa sushi ga daisuki desu", "en": "I love sushi."}, {"jp": "せんせいは にくが きらいです。", "romaji": "sensei wa niku ga kirai desu", "en": "The teacher dislikes meat."}]'::jsonb,
   '[{"grammar": "Food ＋ が すきですか。", "explanation": "Ask if someone likes something. Use が before すき and きらい."}, {"grammar": "だい ＋ すき / きらい", "explanation": "だい means ''big'', so だいすき means ''to love'' and だいきらい means ''to hate''."}, {"grammar": "Person は ＋ thing ＋ が すきです。", "explanation": "Say what someone likes: わたしは すしが だいすきです。 わたし is for everybody; ぼく is for boys."}]'::jsonb);

update public.edu_lessons e
set title_en = l.title_en, title_jp = l.title_jp,
    learning_intention = l.li, key_expressions = l.ke, target_grammar = l.tg
from _l l
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

-- ---------------------------------------------------------------- 2. 語彙
-- 2a. 表記を変える語（音声は残す）
create temporary table _r (slug text, old_jp text, new_jp text) on commit drop;
insert into _r values
  ('countries-1', 'にほん', '日本'),
  ('countries-2', 'にほんじん', '日本人'),
  ('countries-2', 'アメリカじん', 'アメリカ人'),
  ('countries-2', 'オーストラリアじん', 'オーストラリア人'),
  ('food-2', 'あんまりです', 'あんまり');

update public.kl_vocabulary k
set jp_text = r.new_jp
from _r r
join public.edu_lessons e on e.slug = r.slug
where k.lesson_id = e.id and k.jp_text = r.old_jp
  and not exists (select 1 from public.kl_vocabulary k2 where k2.lesson_id = e.id and k2.jp_text = r.new_jp);

-- 2b. ノートの語
create temporary table _v (slug text, order_index int, jp_text text, jp_kana text, romaji text, english_text text, category text) on commit drop;
insert into _v values
  ('greetings-1', 1, 'おはようございます', null, 'ohayou gozaimasu', 'Good morning', 'greetings'),
  ('greetings-1', 2, 'こんにちは', null, 'konnichiwa', 'Good afternoon / hello', 'greetings'),
  ('greetings-1', 3, 'こんばんは', null, 'konbanwa', 'Good evening', 'greetings'),
  ('greetings-1', 4, 'さようなら', null, 'sayounara', 'Goodbye', 'greetings'),
  ('greetings-1', 5, 'またあした', null, 'mata ashita', 'See you tomorrow', 'greetings'),
  ('greetings-1', 6, 'またね', null, 'mata ne', 'see you later', 'greetings'),
  ('greetings-1', 7, 'はじめまして', null, 'hajimemashite', 'How do you do?', 'greetings'),
  ('greetings-1', 8, 'どうぞよろしく', null, 'douzo yoroshiku', 'Pleased to meet you', 'greetings'),
  ('greetings-1', 9, 'おやすみなさい', null, 'oyasuminasai', 'Good night', 'greetings'),
  ('greetings-1', 10, 'ありがとう', null, 'arigatou', 'thank you', 'greetings'),
  ('greetings-1', 11, 'はい', null, 'hai', 'yes', 'greetings'),
  ('greetings-1', 12, 'いいえ', null, 'iie', 'no', 'greetings'),
  ('greetings-2', 1, 'わたし', null, 'watashi', 'I / me', 'people'),
  ('greetings-2', 2, 'ぼく', null, 'boku', 'I / me (used by boys)', 'people'),
  ('greetings-2', 3, 'みなさん', null, 'minasan', 'everyone', 'people'),
  ('greetings-2', 4, 'なまえ', null, 'namae', 'name', 'people'),
  ('greetings-2', 5, 'さん', null, 'san', 'Mr / Ms', 'titles'),
  ('greetings-2', 6, 'くん', null, 'kun', 'title for boys', 'titles'),
  ('greetings-2', 7, 'ちゃん', null, 'chan', 'title for young children', 'titles'),
  ('greetings-2', 8, 'せんせい', null, 'sensei', 'teacher', 'titles'),
  ('greetings-3', 1, 'たって', null, 'tatte', 'stand up', 'instructions'),
  ('greetings-3', 2, 'すわって', null, 'suwatte', 'sit down', 'instructions'),
  ('greetings-3', 3, 'きいて', null, 'kiite', 'listen', 'instructions'),
  ('greetings-3', 4, 'みて', null, 'mite', 'look / watch / see', 'instructions'),
  ('greetings-3', 5, 'みせて', null, 'misete', 'show', 'instructions'),
  ('greetings-3', 6, 'かいて', null, 'kaite', 'write', 'instructions'),
  ('greetings-3', 7, 'よんで', null, 'yonde', 'read', 'instructions'),
  ('greetings-3', 8, 'いって', null, 'itte', 'say', 'instructions'),
  ('greetings-3', 9, 'しずかにして', null, 'shizuka ni shite', 'be quiet', 'instructions'),
  ('greetings-3', 10, 'ください', null, 'kudasai', 'please', 'instructions'),
  ('numbers-1', 1, 'れい', null, 'rei', '0 (zero)', 'numbers'),
  ('numbers-1', 2, 'いち', null, 'ichi', '1', 'numbers'),
  ('numbers-1', 3, 'に', null, 'ni', '2', 'numbers'),
  ('numbers-1', 4, 'さん', null, 'san', '3', 'numbers'),
  ('numbers-1', 5, 'よん', null, 'yon', '4', 'numbers'),
  ('numbers-1', 6, 'ご', null, 'go', '5', 'numbers'),
  ('numbers-1', 7, 'ろく', null, 'roku', '6', 'numbers'),
  ('numbers-1', 8, 'なな', null, 'nana', '7', 'numbers'),
  ('numbers-1', 9, 'はち', null, 'hachi', '8', 'numbers'),
  ('numbers-1', 10, 'きゅう', null, 'kyuu', '9', 'numbers'),
  ('numbers-1', 11, 'じゅう', null, 'juu', '10', 'numbers'),
  ('numbers-1', 12, 'じゅういち', null, 'juuichi', '11', 'numbers'),
  ('numbers-1', 13, 'じゅうに', null, 'juuni', '12', 'numbers'),
  ('numbers-1', 14, 'じゅうさん', null, 'juusan', '13', 'numbers'),
  ('numbers-1', 15, 'じゅうよん', null, 'juuyon', '14', 'numbers'),
  ('numbers-1', 16, 'じゅうご', null, 'juugo', '15', 'numbers'),
  ('numbers-1', 17, 'じゅうろく', null, 'juuroku', '16', 'numbers'),
  ('numbers-1', 18, 'じゅうなな', null, 'juunana', '17', 'numbers'),
  ('numbers-1', 19, 'じゅうはち', null, 'juuhachi', '18', 'numbers'),
  ('numbers-1', 20, 'じゅうきゅう', null, 'juukyuu', '19', 'numbers'),
  ('numbers-1', 21, 'にじゅう', null, 'nijuu', '20', 'numbers'),
  ('numbers-1', 22, 'さんじゅう', null, 'sanjuu', '30', 'numbers'),
  ('numbers-1', 23, 'よんじゅう', null, 'yonjuu', '40', 'numbers'),
  ('numbers-1', 24, 'ごじゅう', null, 'gojuu', '50', 'numbers'),
  ('numbers-2', 1, 'いっさい', null, 'issai', '1 year old', 'ages'),
  ('numbers-2', 2, 'にさい', null, 'nisai', '2 years old', 'ages'),
  ('numbers-2', 3, 'さんさい', null, 'sansai', '3 years old', 'ages'),
  ('numbers-2', 4, 'よんさい', null, 'yonsai', '4 years old', 'ages'),
  ('numbers-2', 5, 'ごさい', null, 'gosai', '5 years old', 'ages'),
  ('numbers-2', 6, 'ろくさい', null, 'rokusai', '6 years old', 'ages'),
  ('numbers-2', 7, 'ななさい', null, 'nanasai', '7 years old', 'ages'),
  ('numbers-2', 8, 'はっさい', null, 'hassai', '8 years old', 'ages'),
  ('numbers-2', 9, 'きゅうさい', null, 'kyuusai', '9 years old', 'ages'),
  ('numbers-2', 10, 'じゅっさい', null, 'jussai', '10 years old', 'ages'),
  ('numbers-2', 11, 'じゅういっさい', null, 'juuissai', '11 years old', 'ages'),
  ('numbers-2', 12, 'じゅうにさい', null, 'juunisai', '12 years old', 'ages'),
  ('numbers-2', 13, 'じゅうさんさい', null, 'juusansai', '13 years old', 'ages'),
  ('numbers-2', 14, 'じゅうよんさい', null, 'juuyonsai', '14 years old', 'ages'),
  ('numbers-2', 15, 'じゅうごさい', null, 'juugosai', '15 years old', 'ages'),
  ('numbers-2', 16, 'じゅうろくさい', null, 'juurokusai', '16 years old', 'ages'),
  ('numbers-2', 17, 'じゅうななさい', null, 'juunanasai', '17 years old', 'ages'),
  ('numbers-2', 18, 'じゅうはっさい', null, 'juuhassai', '18 years old', 'ages'),
  ('numbers-2', 19, 'じゅうきゅうさい', null, 'juukyuusai', '19 years old', 'ages'),
  ('numbers-2', 20, 'はたち', null, 'hatachi', '20 years old', 'ages'),
  ('numbers-2', 21, 'なんさい', null, 'nansai', 'how old', 'ages'),
  ('numbers-3', 1, 'でんわ', null, 'denwa', 'telephone / phone', 'phone'),
  ('numbers-3', 2, 'でんわばんごう', null, 'denwa bangou', 'telephone number / phone number', 'phone'),
  ('numbers-3', 3, 'もしもし', null, 'moshi moshi', 'hello (on the phone)', 'phone'),
  ('numbers-3', 4, 'ぜろ', null, 'zero', '0 (zero)', 'numbers'),
  ('numbers-3', 5, 'もういちど', null, 'mou ichido', 'once more', 'classroom'),
  ('countries-1', 1, '日本', 'にほん', 'nihon', 'Japan', 'countries'),
  ('countries-1', 2, 'アメリカ', null, 'amerika', 'USA', 'countries'),
  ('countries-1', 3, 'カナダ', null, 'kanada', 'Canada', 'countries'),
  ('countries-1', 4, 'ニュージーランド', null, 'nyuujiirando', 'New Zealand', 'countries'),
  ('countries-1', 5, 'オーストラリア', null, 'oosutoraria', 'Australia', 'countries'),
  ('countries-1', 6, 'インドネシア', null, 'indoneshia', 'Indonesia', 'countries'),
  ('countries-1', 7, 'イギリス', null, 'igirisu', 'England', 'countries'),
  ('countries-2', 1, '人', 'じん', 'jin', 'person / people', 'kanji'),
  ('countries-2', 2, '日本人', 'にほんじん', 'nihonjin', 'Japanese', 'nationalities'),
  ('countries-2', 3, 'アメリカ人', 'アメリカじん', 'amerikajin', 'American', 'nationalities'),
  ('countries-2', 4, 'カナダ人', 'カナダじん', 'kanadajin', 'Canadian', 'nationalities'),
  ('countries-2', 5, 'ニュージーランド人', 'ニュージーランドじん', 'nyuujiirandojin', 'New Zealander', 'nationalities'),
  ('countries-2', 6, 'オーストラリア人', 'オーストラリアじん', 'oosutorariajin', 'Australian', 'nationalities'),
  ('countries-2', 7, 'インドネシア人', 'インドネシアじん', 'indoneshiajin', 'Indonesian', 'nationalities'),
  ('countries-3', 1, 'さっぽろ', null, 'sapporo', 'Sapporo', 'cities'),
  ('countries-3', 2, 'あおもり', null, 'aomori', 'Aomori', 'cities'),
  ('countries-3', 3, 'とうきょう', null, 'toukyou', 'Tokyo', 'cities'),
  ('countries-3', 4, 'おおさか', null, 'oosaka', 'Osaka', 'cities'),
  ('countries-3', 5, 'きょうと', null, 'kyouto', 'Kyoto', 'cities'),
  ('countries-3', 6, 'なら', null, 'nara', 'Nara', 'cities'),
  ('countries-3', 7, 'ひろしま', null, 'hiroshima', 'Hiroshima', 'cities'),
  ('countries-3', 8, 'くまもと', null, 'kumamoto', 'Kumamoto', 'cities'),
  ('countries-3', 9, 'シドニー', null, 'shidonii', 'Sydney', 'cities'),
  ('countries-3', 10, 'メルボルン', null, 'meruborun', 'Melbourne', 'cities'),
  ('countries-3', 11, 'パース', null, 'paasu', 'Perth', 'cities'),
  ('countries-3', 12, 'ブリスベン', null, 'burisuben', 'Brisbane', 'cities'),
  ('countries-3', 13, 'キャンベラ', null, 'kyanbera', 'Canberra', 'cities'),
  ('countries-3', 14, 'アデレード', null, 'adereedo', 'Adelaide', 'cities'),
  ('family-1', 1, 'なん人', 'なんにん', 'nannin', 'How many people?', 'counter'),
  ('family-1', 2, '一人', 'ひとり', 'hitori', '1 person', 'counter'),
  ('family-1', 3, '二人', 'ふたり', 'futari', '2 people', 'counter'),
  ('family-1', 4, '三人', 'さんにん', 'sannin', '3 people', 'counter'),
  ('family-1', 5, '四人', 'よにん', 'yonin', '4 people', 'counter'),
  ('family-1', 6, '五人', 'ごにん', 'gonin', '5 people', 'counter'),
  ('family-1', 7, '六人', 'ろくにん', 'rokunin', '6 people', 'counter'),
  ('family-1', 8, '七人', 'ななにん', 'nananin', '7 people', 'counter'),
  ('family-1', 9, '八人', 'はちにん', 'hachinin', '8 people', 'counter'),
  ('family-1', 10, '九人', 'きゅうにん', 'kyuunin', '9 people', 'counter'),
  ('family-1', 11, '十人', 'じゅうにん', 'juunin', '10 people', 'counter'),
  ('family-2', 1, 'かぞく', null, 'kazoku', 'family', 'family'),
  ('family-2', 2, 'おとうさん', null, 'otousan', 'father', 'family'),
  ('family-2', 3, 'おかあさん', null, 'okaasan', 'mother', 'family'),
  ('family-2', 4, 'おじいさん', null, 'ojiisan', 'grandfather', 'family'),
  ('family-2', 5, 'おばあさん', null, 'obaasan', 'grandmother', 'family'),
  ('family-2', 6, 'おにいさん', null, 'oniisan', 'older brother', 'family'),
  ('family-2', 7, 'おねえさん', null, 'oneesan', 'older sister', 'family'),
  ('family-2', 8, 'おとうと', null, 'otouto', 'younger brother', 'family'),
  ('family-2', 9, 'いもうと', null, 'imouto', 'younger sister', 'family'),
  ('family-2', 10, 'わたし', null, 'watashi', 'I (for everybody)', 'people'),
  ('family-2', 11, 'ぼく', null, 'boku', 'I (for boy)', 'people'),
  ('family-2', 12, 'と', null, 'to', 'and', 'particle'),
  ('family-3', 1, 'ペット', null, 'petto', 'pet', 'pets'),
  ('family-3', 2, 'あひる', null, 'ahiru', 'duck', 'pets'),
  ('family-3', 3, 'いぬ', null, 'inu', 'dog', 'pets'),
  ('family-3', 4, 'うさぎ', null, 'usagi', 'rabbit', 'pets'),
  ('family-3', 5, 'うま', null, 'uma', 'horse', 'pets'),
  ('family-3', 6, 'きんぎょ', null, 'kingyo', 'goldfish', 'pets'),
  ('family-3', 7, 'とり', null, 'tori', 'bird', 'pets'),
  ('family-3', 8, 'ねこ', null, 'neko', 'cat', 'pets'),
  ('family-3', 9, 'へび', null, 'hebi', 'snake', 'pets'),
  ('pets-1', 1, '〜の', null, 'no', '''s / of', 'particle'),
  ('pets-1', 2, 'なまえ', null, 'namae', 'name', 'pets'),
  ('pets-1', 3, 'おおきい', null, 'ookii', 'big', 'adjectives'),
  ('pets-1', 4, 'ちいさい', null, 'chiisai', 'small', 'adjectives'),
  ('pets-1', 5, 'かわいい', null, 'kawaii', 'cute', 'adjectives'),
  ('pets-1', 6, 'こわい', null, 'kowai', 'scary', 'adjectives'),
  ('pets-1', 7, 'うるさい', null, 'urusai', 'noisy', 'adjectives'),
  ('pets-1', 8, 'おかしい', null, 'okashii', 'funny / strange', 'adjectives'),
  ('pets-1', 9, 'くさい', null, 'kusai', 'smelly', 'adjectives'),
  ('pets-1', 10, 'すごい', null, 'sugoi', 'amazing', 'adjectives'),
  ('pets-1', 11, 'おもしろい', null, 'omoshiroi', 'interesting / funny', 'adjectives'),
  ('pets-2', 1, 'えさ', null, 'esa', 'pet food', 'food'),
  ('pets-2', 2, 'いぬのえさ', null, 'inu no esa', 'dog food', 'food'),
  ('pets-2', 3, 'やさい', null, 'yasai', 'vegetables', 'food'),
  ('pets-2', 4, 'くさ', null, 'kusa', 'grass', 'food'),
  ('pets-2', 5, 'さかな', null, 'sakana', 'fish', 'food'),
  ('pets-2', 6, 'にく', null, 'niku', 'meat', 'food'),
  ('pets-2', 7, 'みず', null, 'mizu', 'water', 'food'),
  ('pets-2', 8, 'たべます', null, 'tabemasu', 'to eat', 'verbs'),
  ('pets-2', 9, 'のみます', null, 'nomimasu', 'to drink', 'verbs'),
  ('food-1', 1, 'あさごはん', null, 'asagohan', 'breakfast', 'meals'),
  ('food-1', 2, 'ごはん', null, 'gohan', 'rice / meal', 'food'),
  ('food-1', 3, 'たまご', null, 'tamago', 'eggs', 'food'),
  ('food-1', 4, 'さかな', null, 'sakana', 'fish', 'food'),
  ('food-1', 5, 'にく', null, 'niku', 'meat', 'food'),
  ('food-1', 6, 'やさい', null, 'yasai', 'vegetables', 'food'),
  ('food-1', 7, 'くだもの', null, 'kudamono', 'fruit', 'food'),
  ('food-1', 8, 'おかし', null, 'okashi', 'snacks', 'food'),
  ('food-1', 9, 'おこのみやき', null, 'okonomiyaki', 'okonomiyaki (savoury pancake)', 'food'),
  ('food-1', 10, 'シリアル', null, 'shiriaru', 'cereal', 'food'),
  ('food-1', 11, 'トースト', null, 'toosuto', 'toast', 'food'),
  ('food-1', 12, 'パン', null, 'pan', 'bread', 'food'),
  ('food-1', 13, 'サンドイッチ', null, 'sandoicchi', 'sandwich', 'food'),
  ('food-1', 14, 'ハンバーガー', null, 'hanbaagaa', 'hamburger', 'food'),
  ('food-1', 15, 'ピザ', null, 'piza', 'pizza', 'food'),
  ('food-1', 16, 'ケーキ', null, 'keeki', 'cake', 'food'),
  ('food-1', 17, 'おちゃ', null, 'ocha', 'green tea', 'drinks'),
  ('food-1', 18, 'こうちゃ', null, 'koucha', 'English (black) tea', 'drinks'),
  ('food-1', 19, 'みず', null, 'mizu', 'water', 'drinks'),
  ('food-1', 20, 'ミルク', null, 'miruku', 'milk', 'drinks'),
  ('food-1', 21, 'オレンジジュース', null, 'orenji juusu', 'orange juice', 'drinks'),
  ('food-1', 22, 'コーヒー', null, 'koohii', 'coffee', 'drinks'),
  ('food-1', 23, 'コーラ', null, 'koora', 'cola', 'drinks'),
  ('food-2', 1, 'だいすきです', null, 'daisuki desu', 'love / really like', 'preference'),
  ('food-2', 2, 'すきです', null, 'suki desu', 'like', 'preference'),
  ('food-2', 3, 'あんまり', null, 'anmari', 'not really', 'preference'),
  ('food-2', 4, 'きらいです', null, 'kirai desu', 'dislike', 'preference'),
  ('food-2', 5, 'だいきらいです', null, 'daikirai desu', 'hate', 'preference'),
  ('food-2', 6, 'すし', null, 'sushi', 'sushi', 'food');

update public.kl_vocabulary k
set jp_kana = coalesce(v.jp_kana, k.jp_kana), romaji = v.romaji, english_text = v.english_text,
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

-- ---------------------------------------------------------------- 確認（16 行）
-- extra_vocab = ノートに無いのに残っている語の数（0 でなければ、どの語か下の 2 つ目の確認で見る）
select e.site_order, e.slug, e.title_en, e.title_jp,
       jsonb_array_length(e.key_expressions::jsonb) as expressions,
       jsonb_array_length(e.target_grammar::jsonb) as grammar,
       (select count(*) from public.kl_vocabulary k where k.lesson_id = e.id) as vocabulary,
       (select count(*) from public.kl_vocabulary k where k.lesson_id = e.id
          and not exists (select 1 from _v v where v.slug = e.slug and v.jp_text = k.jp_text)) as extra_vocab
from public.edu_lessons e
where e.slug in (select slug from _l)
order by e.site_order;

-- ノートに無いのに残っている語
select e.slug, k.jp_text, k.english_text
from public.kl_vocabulary k
join public.edu_lessons e on e.id = k.lesson_id
where e.slug in (select slug from _l)
  and not exists (select 1 from _v v where v.slug = e.slug and v.jp_text = k.jp_text)
order by e.site_order, k.order_index;

commit;
