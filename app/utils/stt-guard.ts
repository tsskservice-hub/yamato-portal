/**
 * @file stt-guard.ts
 * @description 文字起こし（Whisper / gpt-4o-transcribe）が「生徒が言っていない文」を作ってしまったかどうか
 *
 * 文字起こしの AI は、ほとんど音がないとき（雑音・息の音だけ）に、
 *   ・手がかりとして渡した文（質問や場面の説明）をそのまま書く
 *   ・動画の字幕でよく見る文（「ご視聴ありがとうございました」など）を作る
 * ことがある。こういう文は、生徒の発言として表示したり、AI に送ったり、フィードバックに使ったりしない。
 */

/** よく作られてしまう文（生徒が口頭試験の練習で言うことはまずない） */
const KNOWN_HALLUCINATIONS = [
  /ご視聴(いただき)?ありがとうございました/,
  /チャンネル登録/,
  /高評価/,
  /字幕/,
  /オーストラリアの高校生が/,
  /VCE日本語の口頭試験の練習/,
];

const normalize = (s: string) => s.replace(/<[^>]*>/g, "").replace(/[\s、。，．,.!?！？「」『』…・ー〜~]/g, "");

/**
 * 生徒が言っていない文の可能性が高ければ true
 * @param transcript 文字起こしの結果
 * @param prompt 文字起こしに手がかりとして渡した文（試験官の質問など）。それと同じなら「質問がそのまま返ってきた」とみなす
 */
export function isLikelyHallucination(transcript: string, prompt?: string): boolean {
  const t = normalize(transcript || "");
  if (!t) return false;
  if (KNOWN_HALLUCINATIONS.some((re) => re.test(transcript))) return true;
  if (prompt) {
    const p = normalize(prompt);
    // 手がかりの文と同じ（または手がかりの文がそっくり入っている）→ 雑音から手がかりを書いただけ
    if (p.length >= 6 && (t === p || t.includes(p))) return true;
  }
  return false;
}
