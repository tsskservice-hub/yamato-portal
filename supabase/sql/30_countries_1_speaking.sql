-- 30. countries-1（どこから きましたか）のスピーキング課題
--
--  このファイルがすること：
--    1. kl_dialogues に会話を1つ入れる
--         AI Yamato：どこから きましたか。
--         生徒：{country}から きました。（国は 7 つから毎回ランダム。画面に英語の国名が出る）
--         Part 2 では生徒が質問し、AI Yamato の答えを聞いて国名をタイピングする
--    2. edu_lesson_dialogues で countries-1 のスピーキング課題に結びつける
--  音声：dialogue-audio バケットの countries/ フォルダ（where_from.mp3、from_japan.mp3 など）。
--        ファイルがまだ無い間は、画面でブラウザの音声合成が読み上げる。
--        リスニング課題（app/data/listening-tasks.ts）も同じ音声ファイルを使う。
--  何度実行しても同じ結果になる。

begin;

-- 列の型（text[] か jsonb か）に合わせて自動で変換されるよう、jsonb_populate_record を使う
with src as (
  select * from jsonb_populate_record(null::public.kl_dialogues, '{
  "id": "9b06fb1f-12e7-403f-854f-43a948f8f4b2",
  "prompt_text": "どこから きましたか。",
  "prompt_reading": "どこから きましたか。",
  "prompt_romaji": "doko kara kimashita ka.",
  "prompt_en": "Where are you from?",
  "prompt_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/where_from.mp3",
  "response_text": "{country}から きました",
  "response_reading": "{country}から きました。",
  "response_romaji": "{country} kara kimashita.",
  "response_en": "I''m from {country}.",
  "response_audio_url": null,
  "accepted_responses": [
    "{country}から きました",
    "{country}からきました",
    "{country}から来ました",
    "{country}です"
  ],
  "formality": "polite",
  "tags": [
    "countries",
    "nationality"
  ],
  "notes": "Obento Deluxe Unit 3 – countries-1",
  "is_published": true,
  "slots": {
    "country": [
      {
        "text": "日本",
        "reading": "にほん",
        "romaji": "nihon",
        "en": "Japan",
        "cue": "Japan",
        "alt": [
          "にほん",
          "ニホン",
          "にっぽん",
          "ニッポン"
        ],
        "response_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/from_japan.mp3"
      },
      {
        "text": "アメリカ",
        "reading": "アメリカ",
        "romaji": "amerika",
        "en": "USA",
        "cue": "USA",
        "alt": [
          "America",
          "United States"
        ],
        "response_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/from_america.mp3"
      },
      {
        "text": "カナダ",
        "reading": "カナダ",
        "romaji": "kanada",
        "en": "Canada",
        "cue": "Canada",
        "response_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/from_canada.mp3"
      },
      {
        "text": "ニュージーランド",
        "reading": "ニュージーランド",
        "romaji": "nyuujiirando",
        "en": "New Zealand",
        "cue": "New Zealand",
        "alt": [
          "NZ"
        ],
        "response_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/from_newzealand.mp3"
      },
      {
        "text": "オーストラリア",
        "reading": "オーストラリア",
        "romaji": "oosutoraria",
        "en": "Australia",
        "cue": "Australia",
        "response_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/from_australia.mp3"
      },
      {
        "text": "インドネシア",
        "reading": "インドネシア",
        "romaji": "indoneshia",
        "en": "Indonesia",
        "cue": "Indonesia",
        "response_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/from_indonesia.mp3"
      },
      {
        "text": "イギリス",
        "reading": "イギリス",
        "romaji": "igirisu",
        "en": "England",
        "cue": "England",
        "alt": [
          "UK",
          "Britain"
        ],
        "response_audio_url": "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/countries/from_england.mp3"
      }
    ]
  }
}'::jsonb)
)
insert into public.kl_dialogues (id, prompt_text, prompt_reading, prompt_romaji, prompt_en, prompt_audio_url, response_text, response_reading, response_romaji, response_en, response_audio_url, accepted_responses, formality, tags, notes, is_published, slots)
select id, prompt_text, prompt_reading, prompt_romaji, prompt_en, prompt_audio_url, response_text, response_reading, response_romaji, response_en, response_audio_url, accepted_responses, formality, tags, notes, is_published, slots from src
on conflict (id) do update set
  prompt_text = excluded.prompt_text, prompt_reading = excluded.prompt_reading, prompt_romaji = excluded.prompt_romaji,
  prompt_en = excluded.prompt_en, prompt_audio_url = excluded.prompt_audio_url,
  response_text = excluded.response_text, response_reading = excluded.response_reading,
  response_romaji = excluded.response_romaji, response_en = excluded.response_en,
  accepted_responses = excluded.accepted_responses, tags = excluded.tags, notes = excluded.notes,
  is_published = excluded.is_published, slots = excluded.slots;

insert into public.edu_lesson_dialogues (dialogue_id, lesson_key, task_type, sort_order)
select '9b06fb1f-12e7-403f-854f-43a948f8f4b2', 'countries-1', 'speaking', 1
where not exists (
  select 1 from public.edu_lesson_dialogues
  where dialogue_id = '9b06fb1f-12e7-403f-854f-43a948f8f4b2' and lesson_key = 'countries-1' and task_type = 'speaking'
);

-- 確認：1 行（countries-1 / speaking / どこから きましたか。 / 国が 7 つ）
select ld.lesson_key, ld.task_type, d.prompt_text, jsonb_array_length(d.slots::jsonb -> 'country') as countries
from public.edu_lesson_dialogues ld
join public.kl_dialogues d on d.id = ld.dialogue_id
where ld.lesson_key = 'countries-1';

commit;
