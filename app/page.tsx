"use client";

import { FullScreenLoading } from "@/components/common/full-screen-loading";
import { LanguageSelector } from "@/components/common/language-selector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { showError, showSimpleError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSuccess } from "@/lib/success-store";
import supabase from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const t = useGlobalT();
  const { lang } = useLangStore();
  const locale = lang === "ko" ? "ko-KR" : "en-US";

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setInitialLoading(false);

      if (session?.user) {
        router.push("/dashboard");
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        router.push("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (password !== passwordConfirm) {
          showError(
            t("auth.password_confirm_error_title"),
            t("auth.password_mismatch")
          );
          setSubmitting(false);
          return;
        }
        if (password.length < 8) {
          showError(t("auth.password_min_error_title"), t("auth.password_min"));
          setSubmitting(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        showSuccess(
          t("auth.signup_complete_title"),
          t("auth.signup_complete_desc"),
          () => {
            setEmail("");
            setPassword("");
            setPasswordConfirm("");
            setIsSignUp(false);
          }
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      let errorMessage = t("common.error_generic");

      if (error instanceof Error) {
        // Supabase 에러 메시지를 다국어로 처리
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = t("auth.invalid_credentials");
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = t("auth.email_not_confirmed");
        } else if (error.message.includes("User already registered")) {
          errorMessage = t("auth.email_already_exists");
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = t("auth.weak_password");
        } else if (error.message.includes("Invalid email")) {
          errorMessage = t("auth.invalid_email");
        } else {
          errorMessage = error.message;
        }
      }

      showSimpleError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return <FullScreenLoading message={t("common.loading")} />;
  }

  return (
    <main className="relative flex items-center justify-center min-h-screen p-4">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/main-background.png"
          alt="Background"
          fill
          style={{ objectFit: "cover" }}
          className="opacity-20 blur-sm"
          priority
        />
      </div>

      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Content */}
      <Card className="relative z-10 w-full max-w-md backdrop-blur-sm bg-white/90">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {t("common.brand")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("home.tagline")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder={t("auth.email_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              {password.length > 0 && password.length < 4 && (
                <div className="text-sm font-medium text-red-600">
                  {t("auth.password_min_short")}
                </div>
              )}
              <Input
                type="password"
                placeholder={t("auth.password_placeholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {isSignUp && (
              <div className="space-y-2">
                {passwordConfirm && (
                  <div
                    className={`text-sm font-medium ${
                      password === passwordConfirm
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {password === passwordConfirm
                      ? t("auth.password_match")
                      : t("auth.password_mismatch")}
                  </div>
                )}
                <Input
                  type="password"
                  placeholder={t("auth.password_confirm_placeholder")}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {isSignUp ? t("auth.sign_up") : t("auth.sign_in")}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
                setPasswordConfirm("");
              }}
              className="text-sm"
            >
              {isSignUp ? t("auth.have_account") : t("auth.no_account")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 로딩 모달 */}
      {submitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-lg font-medium">
                {t("common.processing")}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
