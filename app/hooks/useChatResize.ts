/**
 * @file useChatResize.ts
 * @description チャットウィンドウ等の左上ドラッグリサイズ計算用カスタムフック
 * 💡 特徴：
 * 1. 左上（North-West）方向へのマウスドラッグによる幅・高さの追従計算
 * 2. 最小サイズ（幅280px / 高さ380px）によるUI崩れ防止
 * 3. 画面外（ウィンドウ幅・高さ）への突き抜けを自動制限
 * 4. チャット以外のモーダルや分割エディタ等のリサイズにも汎用利用可能
 */
import { useState, useRef, useCallback } from "react";

export type ChatSize = {
  width: number;
  height: number;
};

export type UseChatResizeOptions = {
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidthRatio?: number;  // 画面幅に対する最大比率（デフォルト: 0.95）
  maxHeightRatio?: number; // 画面高さに対する最大比率（デフォルト: 0.90）
};

export function useChatResize(options: UseChatResizeOptions = {}) {
  const {
    initialWidth = 384,
    initialHeight = 540,
    minWidth = 280,
    minHeight = 380,
    maxWidthRatio = 0.95,
    maxHeightRatio = 0.90,
  } = options;

  const [chatSize, setChatSize] = useState<ChatSize>({
    width: initialWidth,
    height: initialHeight,
  });

  const resizingRef = useRef<boolean>(false);
  const startPosRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  }>({
    x: 0,
    y: 0,
    w: initialWidth,
    h: initialHeight,
  });

  const startTopLeftResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: chatSize.width,
        h: chatSize.height,
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!resizingRef.current) return;
        // 左上方向へのドラッグ：マウスが左上に行くほど delta は正となりサイズが拡大
        const deltaX = startPosRef.current.x - moveEvent.clientX;
        const deltaY = startPosRef.current.y - moveEvent.clientY;

        const calculatedWidth = startPosRef.current.w + deltaX;
        const calculatedHeight = startPosRef.current.h + deltaY;

        const maxAllowedWidth = window.innerWidth * maxWidthRatio;
        const maxAllowedHeight = window.innerHeight * maxHeightRatio;

        const newWidth = Math.max(minWidth, Math.min(maxAllowedWidth, calculatedWidth));
        const newHeight = Math.max(minHeight, Math.min(maxAllowedHeight, calculatedHeight));

        setChatSize({ width: newWidth, height: newHeight });
      };

      const onMouseUp = () => {
        resizingRef.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [chatSize.width, chatSize.height, minWidth, minHeight, maxWidthRatio, maxHeightRatio]
  );

  return {
    chatSize,
    setChatSize,
    startTopLeftResize,
  };
}

export default useChatResize;