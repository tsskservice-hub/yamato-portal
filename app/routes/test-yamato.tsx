import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import { YamatoChat } from "../components/YamatoChat"; // ★YamatoChatコンポーネントをインポート

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

export default function TestYamatoPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // === 合言葉を tssk224 に設定 ===
  const SECRET_TOKEN = "tssk224";

  // トークンが一致しない場合はアクセス権なし画面を返す
  if (token !== SECRET_TOKEN) {
    return (
      <div className="bg-slate-100 min-h-screen text-slate-800 flex items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">アクセス権がありません</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            このページを表示するための有効なトークンが指定されていません。正しいURLからアクセスしてください。
          </p>
        </div>
      </div>
    );
  }

  // 以降は合言葉が一致した場合のみレンダリングされるテスト画面
  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative p-8">
      {/* ページ本体のプレースホルダー */}
      <main className="max-w-2xl mx-auto my-auto text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">🇯🇵 ヤマト AI 独立APIテストページ</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          右下に常駐しているAIヤマトのチャット窓から、独立APIサーバー（<code>api.jptutoraiyamato.com/chat</code>）を通じたソクラテス式対話の動作テストを行えます。
        </p>
      </main>

      {/* ★ ここで「箱（YamatoChat）」を配置し、テスト用のソフト（名前や初期メッセージ）を流し込む */}
      <YamatoChat 
        characterName="【実験中】新キャラヤマト"
        initialGreeting="こんにちは！新しいテンションのテスト中だよ。何でも聞いてね！"
        systemPrompt="test-character-v1"
      />

      <footer className="text-center text-xs text-slate-400 mt-8">
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}