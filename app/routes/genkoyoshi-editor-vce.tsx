/**
 * @file genkoyoshi-editor-vce.tsx
 * @description 原稿用紙エディター（PageLayoutのrefによる認証モーダル制御 & 高機能AIチャットウィジェット統合・型エラー修正版）
 */
import React, { useState, useEffect, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import { Link, useNavigate, useRouteLoaderData } from "@remix-run/react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";

type Item =
  | { type: "num"; value: string }
  | { type: "char"; value: string }
  | { type: "co"; main: string; sub: string };

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

// 💡 機能ごとの消費クレジット定義
const FEATURE_COSTS = {
  textAi: 2,         // 通常のテキストチャット
  imageAi: 4,        // 画像付きチャット（1枚）または画像生成AI
  multiImageAi: 6,   // 画像付きチャット（2枚）
};

// ページトップへ戻るボタン（右下のフローティングエリアに統合）
function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="bg-slate-800 hover:bg-slate-700 text-white w-10 h-10 rounded-full shadow-lg transition cursor-pointer text-xs font-bold flex items-center justify-center"
      title="ページトップへ戻る"
    >
      ▲
    </button>
  );
}

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

export default function GenkoyoshiEditor() {
  const navigate = useNavigate();

  // 💡 PageLayout の ref 参照用（認証モーダル制御）
  const layoutRef = useRef<PageLayoutRef>(null);

  // 💡 root.tsx からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [format, setFormat] = useState<string>("400");
  const [title, setTitle] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isClient, setIsClient] = useState<boolean>(false);

  // 💡 rootData から初期値を安全に連動
  const [user, setUser] = useState<any>(rootData?.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? 10);
  const [nickname, setNickname] = useState<string>(rootData?.nickname ?? "");

  // 🤖 AIチューター常駐窓用のステート
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const characterName = "原稿用紙エディタ for VCE";
  const initialGreeting = "Hello, my friend! 🌟 Are you studying hard today? Let's master correct Genkoyoshi usage and stay well prepared for your SACs and End of Year Exam! 📝✨";
  const appType = "genkoyoshi-editor-vce";
  const systemPrompt = "";

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialGreeting,
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("normal");

  // ★追加: フォントサイズ用のステート
  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // ★追加: 画像選択・プレビューおよび Visual Aid チェックの状態管理
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [internalImagePreview, setInternalImagePreview] = useState<string | null>(null);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  const activeImagePreview = internalImagePreview;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 💡 rootData が更新された場合にステートを同期
  useEffect(() => {
    if (rootData) {
      if (rootData.user !== undefined) setUser(rootData.user);
      if (rootData.credits !== undefined) setCredits(rootData.credits);
      if (rootData.nickname !== undefined) setNickname(rootData.nickname);
    }
  }, [rootData]);

  // 💡 Fetch user credits & profile from Supabase if needed
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, nickname, learning_pace')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setCredits((data as any).credits ?? 10);
        if ((data as any).nickname) {
          setNickname((data as any).nickname);
        }
        if ((data as any).learning_pace) {
          setTutorLevel((data as any).learning_pace);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  // 💡 Auth and session handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUserCredits = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (data && !error && typeof data.credits === 'number') {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error("Failed to refresh credits:", err);
    }
  };

  const handlePaceChange = async (newLevel: "steady" | "normal" | "accelerated") => {
    setTutorLevel(newLevel);
    if (!user?.id) return;

    try {
      await supabase
        .from("profiles")
        .update({ learning_pace: newLevel })
        .eq("id", user.id);
    } catch (err) {
      console.error("学習ペース更新時の通信エラー:", err);
    }
  };

  const toggleAiFullscreen = async () => {
    if (!aiChatRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await aiChatRef.current.requestFullscreen();
        setIsAiFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsAiFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsAiFullscreen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        setIsAiFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getFontSizeClass = () => {
    switch (chatFontSize) {
      case 'sm': return 'text-xs';
      case 'base': return 'text-sm';
      case 'lg': return 'text-base';
      case 'xl': return 'text-lg';
      default: return 'text-sm';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInternalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isPunctuation = (char: string): boolean => {
    return ["、", "。", "，", "．", "！", "？", "」", "』", "）", "〕", "］", "｝", "』", "〉", "》"].includes(char);
  };

  const isHalfWidthDigit = (char: string): boolean => {
    return /^[0-9]$/.test(char);
  };

  const parseTextToItems = (inputText: string): Item[] => {
    const chars = Array.from(inputText);
    const items: Item[] = [];
    let i = 0;
    while (i < chars.length) {
      const c1 = chars[i];
      if (isHalfWidthDigit(c1) && i + 1 < chars.length && isHalfWidthDigit(chars[i + 1])) {
        items.push({ type: "num", value: c1 + chars[i + 1] });
        i += 2;
      } else {
        items.push({ type: "char", value: c1 });
        i += 1;
      }
    }
    return items;
  };

  const createEmptyCell = (): Item => ({ type: "char", value: "" });

  const padRowToLength = (row: Item[], colsPerLine: number = 20): Item[] => {
    const padded = [...row];
    while (padded.length < colsPerLine) {
      padded.push(createEmptyCell());
    }
    return padded;
  };

  const generatePages = (): Item[][][] => {
    const colsPerLine = 20;
    const maxRows = format === "400" ? 20 : 10;
    const paragraphs = text.split("\n");
    const contentLines: Item[][] = [];

    for (const p of paragraphs) {
      const parsedItems = parseTextToItems(p);
      if (parsedItems.length > 0) {
        const first = parsedItems[0];
        if (!(first.type === "char" && first.value === " ")) {
          parsedItems.unshift({ type: "char", value: " " });
        }
      }

      let currentLineItems: Item[] = [];
      let i = 0;
      while (i < parsedItems.length) {
        const item = parsedItems[i];

        if (currentLineItems.length === colsPerLine) {
          contentLines.push(padRowToLength(currentLineItems, colsPerLine));
          currentLineItems = [];
        }

        if (
          currentLineItems.length === 0 &&
          item.type === "char" &&
          isPunctuation(item.value) &&
          contentLines.length > 0
        ) {
          const prevLine = contentLines[contentLines.length - 1];
          if (prevLine.length > 0) {
            const lastItem = prevLine[prevLine.length - 1];
            if (lastItem.type === "co") {
              prevLine[prevLine.length - 1] = {
                type: "co",
                main: lastItem.main,
                sub: lastItem.sub + item.value,
              };
            } else if (lastItem.type === "char") {
              prevLine[prevLine.length - 1] = {
                type: "co",
                main: lastItem.value,
                sub: item.value,
              };
            }
            i++;
            continue;
          }
        }

        currentLineItems.push(item);
        i++;
      }
      if (currentLineItems.length > 0) {
        contentLines.push(padRowToLength(currentLineItems, colsPerLine));
      }
    }

    const allPagesLines: Item[][][] = [];
    let currentPageLines: Item[][] = [];

    const row0: Item[] = Array.from({ length: colsPerLine }, createEmptyCell);
    if (title) {
      const titleItems = parseTextToItems(title);
      for (let idx = 0; idx < titleItems.length && 3 + idx < colsPerLine; idx++) {
        row0[3 + idx] = titleItems[idx];
      }
    }
    currentPageLines.push(row0);

    const row1: Item[] = Array.from({ length: colsPerLine }, createEmptyCell);
    if (name) {
      const nameItems = parseTextToItems(name);
      let startIndex = colsPerLine - 1 - nameItems.length;
      if (startIndex < 0) startIndex = 0;
      for (let idx = 0; idx < nameItems.length && startIndex + idx < colsPerLine - 1; idx++) {
        row1[startIndex + idx] = nameItems[idx];
      }
    }
    currentPageLines.push(row1);

    let contentIndex = 0;
    while (contentIndex < contentLines.length) {
      if (currentPageLines.length >= maxRows) {
        allPagesLines.push(currentPageLines);
        currentPageLines = [];
      }
      currentPageLines.push(contentLines[contentIndex]);
      contentIndex++;
    }

    if (currentPageLines.length > 0) {
      allPagesLines.push(currentPageLines);
    }

    return allPagesLines.map((pageLines) => {
      const paddedPage = [...pageLines];
      while (paddedPage.length < maxRows) {
        paddedPage.push(Array.from({ length: colsPerLine }, createEmptyCell));
      }
      return paddedPage;
    });
  };

  const pages = isClient ? generatePages() : [];
  const charCount = text.replace(/\n/g, "").length;

  const clearAll = () => {
    setTitle("");
    setName("");
    setText("");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // 💡 AIチャット送信処理
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!tutorInput.trim() && !activeImagePreview) || isTutorLoading) return;

    // 未ログインガード：layoutRef 経由で認証モーダルを起動（引数に "signin" を指定）
    if (!user) {
      alert("お話しするには、無料サインアップまたはログインが必要です！");
      if (layoutRef.current?.openAuthModal) {
        layoutRef.current.openAuthModal("signin");
      }
      return;
    }

    if (credits <= 0) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() || "Please check this photo." },
        {
          role: "assistant",
          content: `🌟 **[Zero Credits Remaining]**\n\nHello, my friend! It looks like your credit balance has reached zero. To continue our learning journey together, please top up your credits! 📚✨`
        }
      ]);
      setTutorInput("");
      return;
    }

    const hasImage = Boolean(activeImagePreview);
    const needsVisual = requestVisualAid;
    const requiredCost = (hasImage || needsVisual) ? FEATURE_COSTS.imageAi : FEATURE_COSTS.textAi;

    if (credits < requiredCost) {
      setTutorMessages((prev) => [
        ...prev,
        { role: "user", content: tutorInput.trim() || "Please check this photo.", imageUrl: activeImagePreview || undefined },
        {
          role: "assistant",
          content: `⚠️ **[Insufficient Credits]**\n\nMy friend, your current balance (${credits} credits) is not enough for this request (requires ${requiredCost} credits). 🪙`
        }
      ]);
      setTutorInput("");
      return;
    }

    const userMsg = tutorInput.trim() || (hasImage ? "Please check this attached photo." : "");
    const imageBase64 = activeImagePreview;

    setTutorInput("");
    setSelectedImage(null);
    setInternalImagePreview(null);
    setRequestVisualAid(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const newMessages: ChatMessage[] = [
      ...tutorMessages,
      { role: "user", content: userMsg, imageUrl: imageBase64 || undefined },
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid for Japanese language learners explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      const apiBaseUrl = isLocal ? "http://localhost:8787" : "https://api.jptutoraiyamato.com";

      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: nickname || (user?.email ? user.email.split('@')[0] : "Student"),
          appType: appType,
          systemPrompt: systemPrompt,
          visualPrompt: visualPrompt,
          requestVisualAid: needsVisual,
          imageBase64: imageBase64,
          userId: user.id,
        }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`サーバーからの応答がJSONではありません: ${responseText.slice(0, 100)}`);
      }

      if (!response.ok) {
        if (response.status === 402) {
          setIsTutorLoading(false);
          const errorCode = data?.error;
          if (errorCode === "ZERO_CREDITS") {
            setTutorMessages([
              ...newMessages,
              { role: "assistant", content: `🌟 **[Zero Credits Remaining]**\n\nHello, my friend! Please top up your credits to continue!` }
            ]);
            await refreshUserCredits();
            return;
          } else if (errorCode === "PARTIAL_SHORTAGE") {
            setTutorMessages([
              ...newMessages,
              { role: "assistant", content: `⚠️ **[Insufficient Credits]**\n\nMy friend, standard text chat (2 credits) is available, but this action requires more credits.` }
            ]);
            await refreshUserCredits();
            return;
          }
        }
        throw new Error(data?.error || `APIエラー (${response.status})`);
      }

      const replyText = data.reply || "I'm sorry, I couldn't generate a response.";
      const imageUrl = data.imageUrl;
      const sanitizedReply = sanitizeAiOutput(replyText);

      setIsTutorLoading(false);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: sanitizedReply, imageUrl: imageUrl }
      ]);

      await refreshUserCredits();

    } catch (err: any) {
      console.error(err);
      setIsTutorLoading(false);
      setTutorMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, an error occurred: ${err.message || "Communication error"}` },
      ]);
    }
  };

  return (
    <PageLayout 
      ref={layoutRef}
      user={user} 
      credits={credits} 
      nickname={nickname}
      breadcrumbTitle="Genkoyoshi Editor for VCE"
    >
      <div className="genko-editor-root flex flex-col min-h-screen">
        <style>{`
          :root {
            --cell-size: 41px;
            --line-gap: 8px;
          }

          .genko-editor-root {
            font-family: sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f6f9;
            color: #333;
            position: relative;
          }

          .genko-container {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }

          .genko-editor-pane {
            flex: 1;
            min-width: 300px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .genko-preview-pane {
            flex: 1.5;
            min-width: 350px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
          }

          .genko-control-group {
            margin-bottom: 15px;
          }

          .genko-control-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 0.9rem;
          }

          .genko-control-group input[type="text"],
          .genko-control-group textarea,
          .genko-control-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 1rem;
          }

          .genko-control-group textarea {
            height: 150px;
            resize: vertical;
          }

          .genko-btn-container {
            display: flex;
            gap: 10px;
            margin-top: 20px;
          }

          .genko-btn-container button {
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }

          .genko-btn-print {
            background-color: #0066cc;
            color: #fff;
            flex: 1;
          }

          .genko-btn-print:hover {
            background-color: #0052a3;
          }

          .genko-btn-clear {
            background-color: #e0e0e0;
            color: #333;
          }

          .genko-btn-clear:hover {
            background-color: #d0d0d0;
          }

          .genko-stats {
            margin-top: 10px;
            font-size: 0.85rem;
            color: #555;
          }

          .genko-sheet {
            background: #fff;
            border: 1px solid #ccc;
            padding: 30px;
            box-sizing: border-box;
            display: inline-block;
            min-width: 100%;
            margin-bottom: 20px;
          }

          .genko-grid {
            display: flex;
            flex-direction: column;
            gap: var(--line-gap);
          }

          .genko-row {
            display: flex;
            gap: 0;
          }

          .genko-cell {
            width: var(--cell-size);
            height: var(--cell-size);
            border: 1px solid #999;
            box-sizing: border-box;
            display: flex;
            align-items: flex-end;    
            justify-content: center;    
            padding-bottom: 2mm;        
            font-size: 1.35rem;         
            line-height: 1;
            position: relative;
            background-color: #fff;
          }

          .genko-cell::after {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border: 1px dotted #ffcccc;
            pointer-events: none;
          }

          .co-cell {
            justify-content: flex-end; 
            padding-right: 2px;
          }

          .co-wrapper {
            display: flex;
            align-items: flex-end;     
            font-size: 1.35rem;         
            line-height: 1;
            transform: translateX(3mm); 
          }

          .co-main {
            display: inline-block;
          }

          .co-sub {
            display: inline-block;
            font-size: 1.35rem;         
          }

          .num-cell {
            justify-content: center;
            align-items: flex-end;
            padding-bottom: 2mm;
          }

          .num-pair {
            display: inline-flex;
            font-size: 1.2rem;
            letter-spacing: -0.5px;
            line-height: 1;
          }

          @page {
            size: B4 portrait;
            margin: 10mm;
          }

          @media print {
            body, .genko-editor-root {
              background: none !important;
              padding: 0 !important;
            }
            header,
            footer,
            .genko-editor-pane,
            .genko-btn-container,
            aside {
              display: none !important;
            }
            .genko-preview-pane {
              box-shadow: none !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            .genko-sheet {
              border: none !important;
              margin: 0 !important;
              page-break-after: always;
            }
          }
        `}</style>

        <div className="genko-container mt-6">
          <div className="genko-editor-pane">
            <div className="genko-control-group">
              <label htmlFor="format">用紙フォーマット</label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="400">400字詰め（20字×20行）</option>
                <option value="200">200字詰め（20字×10行）</option>
              </select>
            </div>

            <div className="genko-control-group">
              <label htmlFor="titleInput">題名（タイトル）</label>
              <input
                type="text"
                id="titleInput"
                placeholder="例：日本のアニメについて"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="genko-control-group">
              <label htmlFor="nameInput">氏名</label>
              <input
                type="text"
                id="nameInput"
                placeholder="例：山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="genko-control-group">
              <label htmlFor="textInput">本文</label>
              <textarea
                id="textInput"
                placeholder="ここに文を書いてください。"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="genko-stats">文字数: {charCount}字</div>

            <div className="genko-btn-container">
              <button className="genko-btn-print" onClick={handlePrint}>
                印刷する / PDF保存
              </button>
              <button className="genko-btn-clear" onClick={clearAll}>
                消す
              </button>
            </div>
          </div>

          <div className="genko-preview-pane">
            <div>
              {isClient &&
                pages.map((pageRows, pageIdx) => (
                  <div key={pageIdx} className="genko-sheet">
                    <div className="genko-grid">
                      {pageRows.map((rowItems, rowIdx) => (
                        <div key={rowIdx} className="genko-row">
                          {rowItems.map((item, colIdx) => {
                            if (item.type === "co") {
                              return (
                                <div key={colIdx} className="genko-cell co-cell">
                                  <div className="co-wrapper">
                                    <span className="co-main">{item.main}</span>
                                    <span className="co-sub">{item.sub}</span>
                                  </div>
                                </div>
                              );
                            } else if (item.type === "num") {
                              return (
                                <div key={colIdx} className="genko-cell num-cell">
                                  <span className="num-pair">{item.value}</span>
                                </div>
                              );
                            } else if (item.type === "char") {
                              return (
                                <div key={colIdx} className="genko-cell">
                                  {item.value}
                                </div>
                              );
                            }
                            return <div key={colIdx} className="genko-cell"></div>;
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* 🤖 右下常駐・上戻りボタン & AIチューター常駐窓の統合エリア */}
        <aside aria-label="AI Tutor and Scroll" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
          <ScrollTopButton />

          {!isAiTutorOpen ? (
            <button
              type="button"
              onClick={() => setIsAiTutorOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm relative"
            >
              <span>🤖</span>
              <span>{characterName}</span>
              {activeImagePreview && (
                <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse"></span>
              )}
              {user && credits < FEATURE_COSTS.textAi && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] font-bold flex items-center justify-center text-white">
                  !
                </span>
              )}
            </button>
          ) : (
            <div
              ref={aiChatRef}
              className={`bg-white border-2 border-blue-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
                isAiFullscreen
                  ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                  : "w-80 sm:w-96 h-[560px] min-w-[280px] min-h-[380px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
              }`}
            >
              <div className="w-full h-full flex flex-col">
                {/* ヘッダー */}
                <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5 m-0">
                      <span className={isTutorLoading ? "inline-block animate-spin" : "inline-block"}>🤖</span> {characterName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleAiFullscreen}
                      className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
                    >
                      {isAiFullscreen ? "🗗 縮小" : "🗖 最大化"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (document.fullscreenElement) {
                          document.exitFullscreen().catch(() => {});
                        }
                        setIsAiTutorOpen(false);
                        setIsAiFullscreen(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* クレジット残高表示セクション */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-amber-800">Credits Balance</span>
                  {user ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${credits >= FEATURE_COSTS.textAi ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      🪙 {credits} credits
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      🔒 Guest
                    </span>
                  )}
                </div>

                {/* 学習ペース選択UI */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 mb-2 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-blue-900">Learning Pace</span>
                  <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-blue-200">
                    {(["steady", "normal", "accelerated"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handlePaceChange(level)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition cursor-pointer ${
                          tutorLevel === level
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-blue-700"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* フォントサイズ変更UI */}
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 mb-3 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-slate-700">Font Size</span>
                  <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                    {(
                      [
                        { key: 'sm', label: '小' },
                        { key: 'base', label: '中' },
                        { key: 'lg', label: '大' },
                        { key: 'xl', label: '特大' },
                      ] as const
                    ).map((size) => (
                      <button
                        key={size.key}
                        type="button"
                        onClick={() => setChatFontSize(size.key)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                          chatFontSize === size.key
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-blue-700"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 未ログイン時のガード画面（layoutRef.current.openAuthModal("signin") を連動） */}
                {!user ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-grow mb-3 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="text-3xl">🔒</div>
                    <h4 className="font-bold text-sm text-slate-800">Sign Up Required to Chat</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Please sign up or log in to chat with {characterName} and receive welcome credits!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAiTutorOpen(false);
                        if (layoutRef.current?.openAuthModal) {
                          layoutRef.current.openAuthModal("signin");
                        }
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      Sign In / Sign Up Now
                    </button>
                  </div>
                ) : (
                  <>
                    {/* チャット履歴エリア */}
                    <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3 ${getFontSizeClass()}`}>
                      {tutorMessages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[95%] p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                              msg.role === "user"
                                ? "bg-blue-600 text-white rounded-br-xs"
                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                            }`}
                          >
                            {msg.role === "user" ? (
                              <div>
                                {msg.content}
                                {msg.imageUrl && (
                                  <div className="mt-2">
                                    <img
                                      src={msg.imageUrl}
                                      alt="User Upload"
                                      className="rounded-lg max-h-36 object-cover cursor-pointer hover:opacity-90"
                                      onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                                {msg.imageUrl && (
                                  <div className="mt-2">
                                    <img
                                      src={msg.imageUrl}
                                      alt="AI Generated Visual Aid"
                                      className="rounded-lg border border-slate-200 max-h-48 object-contain w-full bg-white cursor-pointer hover:opacity-90"
                                      onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isTutorLoading && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 italic bg-white/80 border border-slate-200 p-2 rounded-xl w-fit shadow-xs">
                          <span className="inline-block animate-spin text-sm">🤖</span>
                          <span>Yamato is thinking & generating visual aid...</span>
                        </div>
                      )}
                    </div>

                    {/* 添付画像のプレビューバー */}
                    {activeImagePreview && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs mb-2 shrink-0">
                        <img src={activeImagePreview} alt="Preview" className="w-8 h-8 object-cover rounded border" />
                        <span className="truncate flex-grow text-blue-900 font-medium">Answer photo attached</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setInternalImagePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-red-600 hover:text-red-800 font-bold px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* 入力フォーム */}
                    <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-slate-300"
                        >
                          <span>📷</span>
                          <span>{activeImagePreview ? "Change Photo" : "Upload Photo"}</span>
                        </button>

                        <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={requestVisualAid}
                            onChange={(e) => setRequestVisualAid(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span>Visual Aid</span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tutorInput}
                          onChange={(e) => setTutorInput(e.target.value)}
                          placeholder={activeImagePreview ? "Ask feedback for photo..." : "Ask Yamato anything..."}
                          disabled={isTutorLoading}
                          className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                        />
                        <button
                          type="submit"
                          disabled={isTutorLoading || (!tutorInput.trim() && !activeImagePreview)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          Send
                        </button>
                      </div>
                      {/* 消費クレジット案内 */}
                      <div className="text-[10px] text-slate-400 px-1 text-left">
                        💡 Text: {FEATURE_COSTS.textAi} cr / 1 Photo: {FEATURE_COSTS.imageAi} cr / Visual Aid: {FEATURE_COSTS.imageAi} cr
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 画像拡大表示モーダル */}
      {modalImageSrc && (
        <div
          className="fixed inset-0 z-[2147483648] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalImageSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setModalImageSrc(null)}
              className="absolute -top-10 right-0 text-white text-sm font-bold bg-black/50 px-3 py-1 rounded-full hover:bg-black/80 transition cursor-pointer"
            >
              ✕ Close
            </button>
            <img
              src={modalImageSrc}
              alt="Enlarged View"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
}