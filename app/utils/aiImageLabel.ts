/**
 * @file aiImageLabel.ts
 * @description ヤマトが描いた絵（画像生成 AI）に「AI-generated · AI Yamato」の見えるラベルを焼き込む
 *
 * - 先生や保護者が、課題などで見たときにひと目で AI 生成だと分かるようにする（FAQ で説明している）
 * - ラベルは絵の「下に足す」のではなく「絵の下端に重ねる」。単純に切り取ると絵の一部も欠けるので、消しにくい
 * - 画像そのものに焼き込むので、拡大表示・保存・スクリーンショットにもラベルが残る
 * - 失敗したとき（読み込めない画像など）は元の画像をそのまま返す。チャットの表示は止めない
 */

export const AI_IMAGE_LABEL = 'AI-generated · AI Yamato · jptutoraiyamato.com';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

/** 画像（data URL または URL）にラベルを焼き込んだ PNG の data URL を返す */
export async function addAiGeneratedLabel(src: string): Promise<string> {
  if (typeof document === 'undefined' || !src) return src;
  try {
    const img = await loadImage(src);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return src;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;

    ctx.drawImage(img, 0, 0, width, height);

    // 絵の大きさに合わせて文字の大きさを決める（小さすぎず、絵を隠しすぎない）
    const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.035));
    const bandHeight = Math.round(fontSize * 1.9);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, height - bandHeight, width, bandHeight);

    ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 幅が足りないときは、サイト名を外した短いラベルにする
    const full = AI_IMAGE_LABEL;
    const short = 'AI-generated · AI Yamato';
    const text = ctx.measureText(full).width <= width * 0.94 ? full : short;
    ctx.fillText(text, width / 2, height - bandHeight / 2, width * 0.94);

    return canvas.toDataURL('image/png');
  } catch {
    return src;
  }
}
