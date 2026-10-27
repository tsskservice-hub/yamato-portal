/**
 * @file FeedbackPdfModal.tsx
 * @description AI添削結果の先生用編集・備考（P.S.）追加＆高品質PDF印刷用モーダルコンポーネント
 * 💡 特徴：
 * 1. AIが出力した添削テキストを画面上で先生が手動推敲可能
 * 2. 先生からのメッセージや備考（P.S. / Note from Teacher）を自由に追記可能
 * 3. 縮小／最大化（フルスクリーン）の切り替え対応
 * 4. 印刷用スタイル（改ページ制御・装飾ヘッダー）を含む専用印刷ウィンドウを自動生成
 */
import React, { useState } from "react";

export type FeedbackPdfModalProps = {
  initialContent: string;
  themeColor?: string;
  sectionTitle?: string;
  studentName?: string;
  onClose: () => void;
};

export function FeedbackPdfModal({
  initialContent,
  themeColor = "#06b6d4",
  sectionTitle = "VCE WRITING",
  studentName = "Student",
  onClose,
}: FeedbackPdfModalProps) {
  // 💡 HTMLタグを除去して編集しやすいプレーンテキストに整形
  const cleanInitialText = initialContent
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>?/gm, "");

  const [editablePdfContent, setEditablePdfContent] = useState<string>(cleanInitialText);
  const [teacherNotesTitleInput, setTeacherNotesTitleInput] = useState<string>("P.S.");
  const [teacherNotesInput, setTeacherNotesInput] = useState<string>("よく頑張りました！");
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(false);

  // 💡 印刷プレビューウィンドウの生成と実行
  const handleExecutePdfExport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("ポップアップがブロックされました。ブラウザのポップアップ許可をご確認ください。");
      return;
    }

    const cleanContent = editablePdfContent.trim();
    const sanitizedTitle = teacherNotesTitleInput.trim() || "P.S.";
    const sanitizedNotes = teacherNotesInput.trim();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VCE Japanese Writing Feedback Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              padding: 40px; 
              color: #1e293b; 
              line-height: 1.8; 
            }
            .header { 
              border-bottom: 3px solid ${themeColor}; 
              padding-bottom: 15px; 
              margin-bottom: 25px; 
            }
            h1 { 
              color: ${themeColor}; 
              font-size: 22px; 
              margin: 0 0 6px 0; 
            }
            .meta { 
              font-size: 13px; 
              color: #64748b; 
            }
            .content { 
              font-size: 14px; 
              white-space: pre-wrap; 
              word-break: break-word; 
            }
            .teacher-notes-box {
              margin-top: 40px;
              border: 2px dashed ${themeColor};
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .teacher-notes-title { 
              font-weight: bold; 
              color: ${themeColor}; 
              font-size: 15px; 
              margin-bottom: 8px; 
              display: flex; 
              align-items: center; 
              gap: 6px; 
            }
            .teacher-notes-text { 
              font-size: 14px; 
              color: #1e293b; 
              white-space: pre-wrap; 
            }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌟 VCE Japanese Writing Feedback Report (${sectionTitle})</h1>
            <div class="meta">Student: ${studentName || "Student"} | Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="content">${cleanContent}</div>
          ${
            sanitizedNotes
              ? `
            <div class="teacher-notes-box">
              <div class="teacher-notes-title">✏️ ${sanitizedTitle}</div>
              <div class="teacher-notes-text">${sanitizedNotes}</div>
            </div>
          `
              : ""
          }
          <script>
            window.onload = () => { 
              setTimeout(() => { 
                window.print(); 
              }, 400); 
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div
        className={`bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col transition-all ${
          isPdfFullscreen
            ? "w-screen h-screen rounded-none p-6 sm:p-10"
            : "rounded-2xl p-6 max-w-2xl w-full max-h-[92vh]"
        }`}
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between border-b pb-3 mb-3 shrink-0">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 m-0">
            <span>✏️</span> Edit Feedback & Add P.S. for PDF ({sectionTitle})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
              className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
            >
              {isPdfFullscreen ? "🗗 縮小" : "🗖 最大化"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3 shrink-0">
          PDFに出力する添削内容の修正および、末尾の先生からのコメント（P.S.等）を編集できます。
        </p>

        {/* 添削テキスト編集欄 */}
        <div className={`mb-3 flex flex-col overflow-hidden ${isPdfFullscreen ? "flex-grow" : "h-56"}`}>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Feedback Content (Editable)
          </label>
          <textarea
            value={editablePdfContent}
            onChange={(e) => setEditablePdfContent(e.target.value)}
            className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-slate-50 resize-none font-mono leading-relaxed flex-grow h-full"
          />
        </div>

        {/* 備考タイトル入力 */}
        <div className="mb-3 shrink-0">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Notes Title (Default: P.S.)
          </label>
          <input
            type="text"
            value={teacherNotesTitleInput}
            onChange={(e) => setTeacherNotesTitleInput(e.target.value)}
            placeholder="例: P.S. / 先生からのメッセージ / Note from Teacher"
            className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-slate-50"
          />
        </div>

        {/* 備考本文入力 */}
        <div className="mb-4 shrink-0">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Teacher's Notes / Comments
          </label>
          <textarea
            value={teacherNotesInput}
            onChange={(e) => setTeacherNotesInput(e.target.value)}
            placeholder="例: よく頑張りました！次回は接続詞と敬体の統一に気をつけましょう。"
            rows={3}
            className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 bg-slate-50 resize-none"
          />
        </div>

        {/* アクションボタン */}
        <div className="flex items-center justify-end gap-2 shrink-0 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecutePdfExport}
            style={{ backgroundColor: themeColor }}
            className="px-4 py-2 text-xs font-bold text-white rounded-xl transition shadow-md cursor-pointer hover:opacity-90"
          >
            Generate PDF / Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackPdfModal;