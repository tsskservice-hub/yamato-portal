/**
 * @file app/components/lessons/EduGenkoyoshiCanvas.tsx
 * @description ライティング課題用のデジタル原稿用紙（ペン・消しゴム・取り消し・全消去、画像書き出し）
 *              ペン（筆圧対応）・指・マウスで書ける。書き出した画像はそのままAIの読み取りに使う。
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

type Tool = "pen" | "eraser";
interface Point {
  x: number;
  y: number;
  pressure: number;
}
interface Stroke {
  tool: Tool;
  points: Point[];
}

export interface GenkoyoshiCanvasHandle {
  /** ペンで何か書かれているか（空のまま提出してクレジットを使わないためのチェック） */
  hasInk: () => boolean;
  /** 原稿用紙のマス目ごと JPEG の data URL として書き出す */
  exportImage: () => string;
  clear: () => void;
}

// 原稿用紙の論理サイズ（内部解像度）。表示は CSS で縮小する
const COLS = 12;
const ROWS = 8;
const CELL = 90;
const PADDING = 30;
const WIDTH = COLS * CELL + PADDING * 2; // 1140
const HEIGHT = ROWS * CELL + PADDING * 2; // 780
const GRID_COLOR = "#e5a3a3";
const INK_COLOR = "#1e293b";
const ERASER_WIDTH = 30;

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(PADDING, PADDING, COLS * CELL, ROWS * CELL);
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(PADDING + c * CELL, PADDING);
    ctx.lineTo(PADDING + c * CELL, PADDING + ROWS * CELL);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING + r * CELL);
    ctx.lineTo(PADDING + COLS * CELL, PADDING + r * CELL);
    ctx.stroke();
  }
  ctx.restore();
}

function penWidth(pressure: number) {
  // マウスなど筆圧がない端末は pressure=0.5 として扱う
  return 3 + pressure * 5;
}

function drawSegment(ctx: CanvasRenderingContext2D, tool: Tool, from: Point, to: Point) {
  ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = INK_COLOR;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = tool === "eraser" ? ERASER_WIDTH : penWidth(to.pressure);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (pts.length === 0) return;
  if (pts.length === 1) {
    drawSegment(ctx, stroke.tool, pts[0], { ...pts[0], x: pts[0].x + 0.1 });
    return;
  }
  for (let i = 1; i < pts.length; i++) drawSegment(ctx, stroke.tool, pts[i - 1], pts[i]);
}

export const EduGenkoyoshiCanvas = forwardRef<GenkoyoshiCanvasHandle>(function EduGenkoyoshiCanvas(
  _props,
  ref
) {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const activePointerRef = useRef<number | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [strokeCount, setStrokeCount] = useState(0); // ボタンの有効/無効表示用

  useEffect(() => {
    const ctx = gridCanvasRef.current?.getContext("2d");
    if (ctx) drawGrid(ctx);
  }, []);

  const redrawInk = useCallback(() => {
    const canvas = inkCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    strokesRef.current.forEach((s) => drawStroke(ctx, s));
  }, []);

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * WIDTH) / rect.width,
      y: ((e.clientY - rect.top) * HEIGHT) / rect.height,
      pressure: e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== null) return; // マルチタッチは無視
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    activePointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    const stroke: Stroke = { tool, points: [toCanvasPoint(e)] };
    currentStrokeRef.current = stroke;
    const ctx = inkCanvasRef.current?.getContext("2d");
    if (ctx) drawStroke(ctx, stroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== e.pointerId || !currentStrokeRef.current) return;
    e.preventDefault();
    const stroke = currentStrokeRef.current;
    const prev = stroke.points[stroke.points.length - 1];
    const next = toCanvasPoint(e);
    stroke.points.push(next);
    const ctx = inkCanvasRef.current?.getContext("2d");
    if (ctx) drawSegment(ctx, stroke.tool, prev, next);
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
      setStrokeCount(strokesRef.current.length);
    }
  };

  const undo = () => {
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redrawInk();
  };

  const clear = useCallback(() => {
    strokesRef.current = [];
    setStrokeCount(0);
    redrawInk();
  }, [redrawInk]);

  useImperativeHandle(
    ref,
    () => ({
      hasInk: () => strokesRef.current.some((s) => s.tool === "pen" && s.points.length > 0),
      exportImage: () => {
        const out = document.createElement("canvas");
        out.width = WIDTH;
        out.height = HEIGHT;
        const ctx = out.getContext("2d");
        if (!ctx || !inkCanvasRef.current) return "";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        drawGrid(ctx);
        ctx.drawImage(inkCanvasRef.current, 0, 0);
        return out.toDataURL("image/jpeg", 0.9);
      },
      clear,
    }),
    [clear]
  );

  const toolButton = (value: Tool, label: string, icon: string) => (
    <button
      type="button"
      onClick={() => setTool(value)}
      aria-pressed={tool === value}
      className={`py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
        tool === value
          ? "bg-orange-500 text-white shadow"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolButton("pen", "Pen", "✏️")}
        {toolButton("eraser", "Eraser", "🧽")}
        <button
          type="button"
          onClick={undo}
          disabled={strokeCount === 0}
          className="py-2 px-4 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          ↩️ Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={strokeCount === 0}
          className="py-2 px-4 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          🗑️ Clear
        </button>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <canvas ref={gridCanvasRef} width={WIDTH} height={HEIGHT} className="absolute inset-0 w-full h-full" />
        <canvas
          ref={inkCanvasRef}
          width={WIDTH}
          height={HEIGHT}
          className={`absolute inset-0 w-full h-full ${tool === "eraser" ? "cursor-cell" : "cursor-crosshair"}`}
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label="Digital genkoyoshi writing area"
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Write from left to right, one character per square. A stylus or your finger works best; writing with a mouse is hard.
      </p>
    </div>
  );
});

export default EduGenkoyoshiCanvas;
