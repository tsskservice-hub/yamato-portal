import { marked } from "marked";

// propsの型定義を追加
interface MarkdownTextProps {
  content: string;
}

// 改行を保持しつつ、マークダウンをHTMLに変換する関数
export function MarkdownText({ content }: MarkdownTextProps) {
  // marked.parse を使ってマークダウンを HTML 文字列に変換
  // (breaks: true を設定すると、JSON内の改行もそのまま <br> に反映されます)
  // ※戻り値がstringであることを保証するために型アサーションを使用しています
  const htmlContent = marked.parse(content, { breaks: true }) as string;

  return (
    <div
      // 安全にHTMLを描画するためのプロパティ
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}