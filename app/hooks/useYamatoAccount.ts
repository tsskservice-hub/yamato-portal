/**
 * @file useYamatoAccount.ts
 * @description ポータル共通 Supabase ユーザーアカウント・クレジット・ニックネーム同期カスタムフック
 * 💡 特徴：
 * 1. Supabase 認証セッションの監視と profiles テーブルからの credits/nickname 自動同期
 * 2. 型安全な文字列検証（getSafeString）による null / 非文字列例外の完全防止
 * 3. 複数端末や別タブでの変更を即時反映する Supabase Realtime 監視
 * 4. F5リロード不要でヘッダーとクレジットを連動させるブラウザ内カスタムイベント（yamato:credits-updated）送受信
 * 5. YamatoChatCommon だけでなく、各種ダッシュボードやエディタページでも汎用利用可能
 */
import { useState, useEffect, useCallback } from "react";
import { useRouteLoaderData } from "@remix-run/react";
import { supabase } from "../lib/supabaseClient";

interface RootLoaderData {
  user?: any;
  credits?: number;
  nickname?: string;
  learningPace?: "steady" | "normal" | "accelerated";
}

export type UseYamatoAccountOptions = {
  propUserId?: string;
  propCredits?: number;
  propNickname?: string;
  propLearningPace?: "steady" | "normal" | "accelerated";
};

// 💡 どんな型が渡されても安全に文字列トリムを返す防御関数
export function getSafeString(val: any): string {
  return typeof val === "string" ? val.trim() : "";
}

export function useYamatoAccount(options: UseYamatoAccountOptions = {}) {
  const {
    propUserId,
    propCredits,
    propNickname,
    propLearningPace,
  } = options;

  const rootData = useRouteLoaderData("root") as RootLoaderData | undefined;

  const effectiveUserId = propUserId ?? rootData?.user?.id;
  const effectiveCredits = propCredits ?? rootData?.credits ?? 0;
  const effectiveLearningPace = propLearningPace ?? rootData?.learningPace ?? "normal";

  const [activeUserId, setActiveUserId] = useState<string | undefined>(effectiveUserId);
  const [currentCredits, setCurrentCredits] = useState<number>(effectiveCredits);
  const [currentNickname, setCurrentNickname] = useState<string>(
    getSafeString(propNickname) || getSafeString(rootData?.nickname) || ""
  );
  const [learningPace, setLearningPace] = useState<"steady" | "normal" | "accelerated">(effectiveLearningPace);

  // props や rootData の変化を追従
  useEffect(() => {
    setActiveUserId(effectiveUserId);
  }, [effectiveUserId]);

  useEffect(() => {
    setCurrentCredits(effectiveCredits);
  }, [effectiveCredits]);

  useEffect(() => {
    const validProp = getSafeString(propNickname);
    const validRoot = getSafeString(rootData?.nickname);
    if (validProp) {
      setCurrentNickname(validProp);
    } else if (validRoot) {
      setCurrentNickname(validRoot);
    }
  }, [propNickname, rootData?.nickname]);

  useEffect(() => {
    if (effectiveLearningPace) {
      setLearningPace(effectiveLearningPace);
    }
  }, [effectiveLearningPace]);

  // 🌟【クレジット即時同期】ブラウザ内全体イベントの受信
  useEffect(() => {
    const handleGlobalCreditUpdate = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        setCurrentCredits(e.detail.credits);
      }
    };
    window.addEventListener("yamato:credits-updated", handleGlobalCreditUpdate);
    return () => window.removeEventListener("yamato:credits-updated", handleGlobalCreditUpdate);
  }, []);

  // Supabase から最新の credits / nickname を再取得する関数
  const refreshUserData = useCallback(async () => {
    if (!activeUserId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, nickname, learning_pace")
        .eq("id", activeUserId)
        .single();

      if (data && !error) {
        if (typeof data.credits === "number") {
          setCurrentCredits(data.credits);
        }
        const validNick = getSafeString(data.nickname);
        if (validNick) {
          setCurrentNickname(validNick);
        }
        if (data.learning_pace) {
          setLearningPace(data.learning_pace);
        }
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err);
    }
  }, [activeUserId]);

  // 初回セッション確認＆認証状態の購読
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isMounted) {
          setActiveUserId(session.user.id);
          const { data: profileData } = await supabase
            .from("profiles")
            .select("credits, nickname, learning_pace")
            .eq("id", session.user.id)
            .single();

          if (profileData && isMounted) {
            if (typeof profileData.credits === "number") {
              setCurrentCredits(profileData.credits);
            }
            const validNick = getSafeString(profileData.nickname);
            if (validNick) {
              setCurrentNickname(validNick);
            }
            if (profileData.learning_pace) {
              setLearningPace(profileData.learning_pace);
            }
          }
        }
      } catch (err) {
        console.error("Session check error in useYamatoAccount:", err);
      }
    }

    if (!activeUserId) {
      checkAuthSession();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        const newUid = session?.user?.id;
        setActiveUserId(newUid);
        if (newUid) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("credits, nickname, learning_pace")
            .eq("id", newUid)
            .single();

          if (profileData && isMounted) {
            if (typeof profileData.credits === "number") {
              setCurrentCredits(profileData.credits);
            }
            const validNick = getSafeString(profileData.nickname);
            if (validNick) {
              setCurrentNickname(validNick);
            }
            if (profileData.learning_pace) {
              setLearningPace(profileData.learning_pace);
            }
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [activeUserId]);

  // 🌟 Supabase Realtime 監視（他端末・Stripe決済・別タブでの変動を即座に同期）
  useEffect(() => {
    if (!activeUserId) return;

    const channel = supabase
      .channel(`account-profile-${activeUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${activeUserId}`,
        },
        (payload: any) => {
          if (payload.new) {
            if (typeof payload.new.credits === "number") {
              setCurrentCredits(payload.new.credits);
            }
            const validNick = getSafeString(payload.new.nickname);
            if (validNick) {
              setCurrentNickname(validNick);
            }
            if (payload.new.learning_pace) {
              setLearningPace(payload.new.learning_pace);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUserId]);

  // 🌟 クレジット消費時にヘッダーと画面を即座に同期させる便利関数
  const deductCredits = useCallback((amount: number) => {
    setCurrentCredits((prev) => {
      const nextCredits = Math.max(0, prev - amount);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("yamato:credits-updated", {
            detail: { credits: nextCredits },
          })
        );
      }
      return nextCredits;
    });
  }, []);

  // 💡 学習ペース更新用関数
  const updateLearningPace = useCallback(async (newLevel: "steady" | "normal" | "accelerated") => {
    setLearningPace(newLevel);
    if (!activeUserId) return;
    try {
      await supabase
        .from("profiles")
        .update({ learning_pace: newLevel })
        .eq("id", activeUserId);
    } catch (err) {
      console.error("学習ペース更新時の通信エラー:", err);
    }
  }, [activeUserId]);

  return {
    activeUserId,
    currentCredits,
    currentNickname,
    learningPace,
    setCurrentNickname,
    refreshUserData,
    deductCredits,
    updateLearningPace,
  };
}

export default useYamatoAccount;