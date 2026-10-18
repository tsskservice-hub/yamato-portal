/**
 * @file kanji-grammar-checker.tsx
 * @description VCE Kanji & Grammar Checker 独立ページ（PageLayout完全連動版）
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useRouteLoaderData } from '@remix-run/react';
import { 
  Sparkles, 
  Coins, 
  FileText, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Flame,
  ShieldCheck
} from 'lucide-react';
import PageLayout, { PageLayoutRef } from '../components/PageLayout';

// VCE Kanji List
const VCE_KANJI_LIST = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万", "本", "人", "回", "才", "円", "番", "春", "夏", "秋", "冬", "日", "月", "火", "水", "木", "金", "土", "曜", "年", "時", "分", "夕", "半", "午", "毎", "週", "間", "今", "先", "朝", "晩", "昼", "夜", "去", "目", "口", "耳", "手", "体", "上", "中", "下", "右", "左", "前", "後", "東", "西", "南", "北", "外", "学", "校", "英", "語", "文", "漢", "字", "勉", "強", "父", "母", "子", "家", "族", "兄", "弟", "姉", "妹", "友", "私", "男", "女", "大", "小", "好", "安", "高", "新", "古", "多", "少", "楽", "長", "近", "正", "広", "早", "明", "行", "来", "休", "出", "入", "生", "見", "思", "書", "言", "話", "読", "売", "買", "食", "飲", "知", "作", "住", "会", "使", "着", "発", "聞", "帰", "持", "待", "教", "乗", "働", "動", "歩", "終", "始", "泊", "洗", "立", "考", "習", "山", "川", "田", "花", "島", "海", "天", "雨", "雪", "牛", "魚", "馬", "犬", "京", "都", "市", "県", "州", "国", "町", "神", "寺", "駅", "店", "電", "車", "道", "旅", "赤", "青", "白", "黒", "色", "銀", "々", "何", "紙", "元", "気", "活", "社", "自", "物", "名", "方", "院", "所", "屋", "肉", "場", "飯", "洋", "和", "病", "次", "同", "仕", "事", "点"
];

// VCE Grammar List
const VCE_GRAMMAR_LIST = [
  "しなければなりませんでした", "なければなりません", "なくてはいけません", "たくなかったです", "いたいと思っています", "にいったことがあります", "ことがある", "ことが好きじゃないです", "ことができました", "ことができます", "ことがはじまります", "ほうがいいです", "てもいいですか", "ていただけませんか", "てくださいませんか", "いでください", "かもしれません", "たのしみにしています", "にきょうみがあります", "としてしられています", "でゆう名です", "のおかげで、", "のほかに、", "だけでなく", "とchigaimasu", "にとにています", "をつうじて", "たいです", "たくないです", "たがります", "たがっている", "つもりです", "が上手です", "下手です", "やすい", "づらい", "にくい", "が好きです", "大好です", "きらいです", "ほしいです", "がいります", "分かります", "はじめました", "おえました", "に来ます", "行きます", "てしまいます", "試してみます", "みたいです", "もいいです", "はいけません", "てはだめです", "なくてもいいです", "なくてもよかったです", "べきです", "べきじゃないです", "べきでした", "ましょう", "ましょうか", "ませんか", "てください", "すぎます", "という", "などの", "ために", "あいだ", "まえに", "あとで", "からです", "ですから", "そうだです", "らしいです", "ようです", "でしょう", "だろう", "のようです", "と思います", "と言います", "んです", "られます", "といえば、", "たとえば、", "だから、", "しかし、", "また、", "そして、", "一方、", "によると、", "として", "は一番", "ことは", "ながら", "なので、", "てから、", "でから、", "から、", "ので、", "たら、", "ば、", "でも", "ても、", "けれど", "けど", "のに", "し、", "くて", "より", "など", "ほか", "て、", "ています", "でいます"
];

export default function KanjiGrammarCheckerPage() {
  const layoutRef = useRef<PageLayoutRef>(null);

  // rootData からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;

  const [text, setText] = useState(
    "私は日本へ行って、日本語の勉強をたくさんしなければなりません。"
  );

  useEffect(() => {
    document.title = "VCE Kanji & Grammar Checker | AI Yamato Portal";
  }, []);

  const getHighlightedText = () => {
    let processedText = text;
    const placeholders: { [key: string]: string } = {};
    let placeholderIndex = 0;

    const foundUniqueGrammar = new Set<string>();
    VCE_GRAMMAR_LIST.forEach((grammar) => {
      if (processedText.includes(grammar)) {
        let canonicalGrammar = grammar;
        if (grammar === "でいます") {
          canonicalGrammar = "ています";
        } else if (grammar === "でから、") {
          canonicalGrammar = "てから、";
        }
        foundUniqueGrammar.add(canonicalGrammar);

        while (processedText.includes(grammar)) {
          const key = `__GRAMMAR_PLACEHOLDER_${placeholderIndex}__`;
          placeholders[key] = `<span style="background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 4px; padding: 2px 4px; margin: 0 2px; font-weight: bold; font-size: 18px;">${grammar}</span>`;

          const targetIndex = processedText.indexOf(grammar);
          if (targetIndex !== -1) {
            processedText =
              processedText.substring(0, targetIndex) +
              key +
              processedText.substring(targetIndex + grammar.length);
          } else {
            break;
          }
          placeholderIndex++;
        }
      }
    });

    const grammarCount = foundUniqueGrammar.size;
    const foundUniqueKanji = new Set<string>();

    VCE_KANJI_LIST.forEach((kanji) => {
      const cleanCheck = processedText.replace(
        /__GRAMMAR_PLACEHOLDER_\d+__/g,
        ""
      );
      const realMatches = cleanCheck.match(
        new RegExp(kanji.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g")
      );

      if (realMatches) {
        foundUniqueKanji.add(kanji);
        while (processedText.includes(kanji)) {
          const key = `__KANJI_PLACEHOLDER_${placeholderIndex}__`;
          placeholders[key] = `<span style="background-color: #fef08a; color: #854d0e; border: 1px solid #fde047; border-radius: 4px; padding: 2px 4px; margin: 0 2px; font-weight: bold; font-size: 18px;">${kanji}</span>`;

          const targetIndex = processedText.indexOf(kanji);
          if (targetIndex !== -1) {
            processedText =
              processedText.substring(0, targetIndex) +
              key +
              processedText.substring(targetIndex + kanji.length);
          } else {
            break;
          }
          placeholderIndex++;
        }
      }
    });

    const kanjiCount = foundUniqueKanji.size;
    let finalHtml = processedText;
    Object.keys(placeholders).forEach((key) => {
      finalHtml = finalHtml.split(key).join(placeholders[key]);
    });

    return { html: finalHtml, kanjiCount, grammarCount };
  };

  const { html, kanjiCount, grammarCount } = getHighlightedText();

  return (
    <PageLayout ref={layoutRef}>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8">
        <main className="max-w-4xl mx-auto space-y-8">
          {/* Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              VCE Kanji & Grammar Checker
            </h1>
            
            <p className="text-base text-slate-600 leading-relaxed">
              Paste the text transcribed by your AI Tutor from the photo of your handwritten answer here to instantly check your unique VCE Kanji (<span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">🟡 Yellow</span>) and VCE Grammar (<span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">🟢 Green</span>)!
            </p>
          </div>

          {/* Checker Workspace */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Japanese Text Input
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste Japanese text here..."
                className="w-full h-40 p-4 rounded-2xl border border-slate-300 text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y box-border bg-slate-50/50 text-slate-800 leading-relaxed"
              />
            </div>

            {/* Results Section */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-6">
              <div className="flex gap-4 flex-wrap pb-4 border-b border-slate-200">
                <span className="text-base font-bold text-amber-900 bg-amber-100 border border-amber-300 px-4 py-2 rounded-xl shadow-xs">
                  🟡 Kanji Count (Unique): {kanjiCount}
                </span>
                <span className="text-base font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-xl shadow-xs">
                  🟢 Grammar Count (Unique): {grammarCount}
                </span>
              </div>

              <div className="min-h-[120px] bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                {text ? (
                  <div
                    className="text-xl sm:text-2xl leading-relaxed text-slate-800"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <div className="text-slate-400 italic text-lg">
                    Enter text above to see the highlighted results here.
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-900 leading-relaxed flex items-start space-x-3">
                <span className="text-lg shrink-0">⚠️</span>
                <div>
                  <strong className="font-bold">Note for Students:</strong> The counting is based on exact matches of grammar patterns and kanji. Because unexpected phrases or typos might occasionally trigger false matches, please use these numbers <strong className="font-bold">for reference only</strong> and double-check your work!
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}