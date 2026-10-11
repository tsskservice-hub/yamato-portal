import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "ヤマト API テスト画面" }];
};

export default function TestYamatoPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    // 1. 今回のユーザーメッセージを会話履歴に含めた新しい配列を作成
    const updatedMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // 2. Cloudflareにデプロイした実際のAPI（api.jptutoraiyamato.com）を叩く
      // ※ history には「今回のメッセージを含まない過去の履歴」を渡すのが綺麗です
      const res = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,              // 今回のユーザーメッセージ
          history: messages,                 // 過去の会話履歴
          appType: "general",                // テスト用（"writing" や "oral" にも変更可能）
          learningPace: "normal",
          userNickname: "生徒さん",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "APIエラーが発生しました");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev, 
        { role: "assistant", content: `エラー：${err.message || "ヤマトとの通信に失敗しました。"}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", fontFamily: "sans-serif", padding: "20px" }}>
      <h1>🇯🇵 ヤマト API 動作テスト</h1>
      <p style={{ color: "#666", fontSize: "14px" }}>Socraticな指導ペルソナが正しく機能しているかテストします（接続先: api.jptutoraiyamato.com）。</p>

      <div style={{ border: "1px solid #ccc", borderRadius: "8px", height: "400px", overflowY: "auto", padding: "16px", marginBottom: "16px", background: "#f9f9f9" }}>
        {messages.length === 0 && <p style={{ color: "#996", textAlign: "center", marginTop: "150px" }}>何か話しかけてみてください（例：「先生、この文法が分かりません」）</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "12px", textAlign: m.role === "user" ? "right" : "left" }}>
            <span style={{ display: "inline-block", padding: "10px 14px", borderRadius: "12px", background: m.role === "user" ? "#0070f3" : "#e5e5ea", color: m.role === "user" ? "#fff" : "#000", maxWidth: "80%", textAlign: "left", whiteSpace: "pre-wrap" }}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p style={{ color: "#666", fontSize: "12px", fontStyle: "italic" }}>ヤマトが考えています...</p>}
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ヤマトにメッセージを入力..."
          style={{ flex: 1, padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
        />
        <button type="submit" disabled={loading} style={{ padding: "10px 20px", background: "#0070f3", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          送信
        </button>
      </form>
    </div>
  );
}