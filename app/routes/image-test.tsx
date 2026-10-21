/**
 * @file image-test.tsx
 * @description 画像生成AI（gemini-3.1-flash-lite-image）の最小限単体テスト画面
 */
import { useState } from "react";

export default function ImageTestPage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setImageUrl("");
    try {
      const res = await fetch("http://127.0.0.1:8787/api/test-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      // 💡 as any を追加して unknown 型エラーを解消
      const data = (await res.json()) as any;
      if (data.success && data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        alert("Error: " + JSON.stringify(data.error));
      }
    } catch (e: any) {
      alert("Network Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>🎨 画像生成AI 最小限テスト</h1>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
        Supabaseやクレジットの依存を排除し、Vertex AI のみで画像生成をテストする画面です。
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="プロンプトを入力 (例: An engaging educational diagram of Japanese schools)"
          style={{ flex: 1, padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "bold", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          {loading ? "生成中..." : "画像を生成"}
        </button>
      </div>

      {imageUrl && (
        <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ marginTop: 0, fontSize: "16px", color: "#1e293b" }}>生成された画像:</h3>
          <img src={imageUrl} alt="Generated AI" style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #cbd5e1", display: "block" }} />
        </div>
      )}
    </div>
  );
}