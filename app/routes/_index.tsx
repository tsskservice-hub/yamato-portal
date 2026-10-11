export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "40px" }}>
      <h1>yamato-portal (Remix + Cloudflare Pages)</h1>
      <p>🚀 テストページが正常に動作しています！</p>
      <ul style={{ marginTop: "20px" }}>
        <li>フレームワーク: Remix v2 (Vite統合)</li>
        <li>デプロイ先: Cloudflare Pages</li>
      </ul>
    </div>
  );
}