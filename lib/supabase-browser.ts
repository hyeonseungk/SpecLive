"use client";

import type { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "spec-live-auth-token",
  },
});

// 안정적인 로그아웃 함수
export const signOut = async () => {
  try {
    // 1. Supabase 로그아웃
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase signOut error:", error);
    }

    // 2. 로컬 스토리지 정리
    if (typeof window !== "undefined") {
      // Supabase 관련 데이터 정리
      localStorage.removeItem("spec-live-auth-token");
      localStorage.removeItem("supabase.auth.token");

      // 기타 관련 데이터 정리
      sessionStorage.clear();

      // 쿠키 정리 (도메인에 관계없이)
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie =
          name +
          "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
          window.location.hostname;
        document.cookie =
          name +
          "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." +
          window.location.hostname;
      });
    }

    return { error: null };
  } catch (error) {
    console.error("SignOut error:", error);
    return { error };
  }
};

export default supabase;
