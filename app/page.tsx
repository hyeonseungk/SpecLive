"use client";

import { FullScreenLoading } from "@/components/common/full-screen-loading";
import { LanguageSelector } from "@/components/common/language-selector";
import { OnboardingModal } from "@/components/common/onboarding-modal";
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
import supabase from "@/lib/supabase-browser";
import { showSuccessToast } from "@/lib/toast-store";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useGlobalT();
  const { lang } = useLangStore();
  const locale = lang;

  // Check for invitation parameters
  const from = searchParams.get("from");
  const nonce = searchParams.get("nonce");
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setInitialLoading(false);

      if (session?.user) {
        // Check if this is an invitation link
        if (from === "member-invitation" && nonce && projectId) {
          console.log(
            "getSession redirect to invite:",
            `/invite?nonce=${nonce}&projectId=${projectId}`
          );
          console.log("getSession URL params:", { from, nonce, projectId });
          router.push(`/invite?nonce=${nonce}&projectId=${projectId}`);
        } else {
          console.log("getSession redirect to dashboard");
          router.push("/dashboard");
        }
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Check if this is an invitation link
        if (from === "member-invitation" && nonce && projectId) {
          console.log(
            "onAuthStateChange redirect to invite:",
            `/invite?nonce=${nonce}&projectId=${projectId}`
          );
          console.log("onAuthStateChange URL params:", {
            from,
            nonce,
            projectId,
          });
          router.push(`/invite?nonce=${nonce}&projectId=${projectId}`);
        } else {
          console.log("onAuthStateChange redirect to dashboard");
          router.push("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, from, nonce, projectId]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Sign in error:", error);
      let errorMessage = t("common.error_generic");

      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = t("auth.invalid_credentials");
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = t("auth.email_not_confirmed");
        } else {
          errorMessage = error.message;
        }
      }

      showSimpleError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Password validation
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

      // Check if this is an invitation link for email redirect
      let emailRedirectUrl = `${window.location.origin}/dashboard`;
      if (from === "member-invitation" && nonce && projectId) {
        emailRedirectUrl = `${window.location.origin}/invite?nonce=${nonce}&projectId=${projectId}`;
      }

      console.log("SignUp emailRedirectUrl:", emailRedirectUrl);
      console.log("SignUp URL params:", { from, nonce, projectId });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailRedirectUrl,
        },
      });
      if (error) throw error;

      console.log("SignUp result:", { data, error });
      console.log("SignUp session:", data.session);
      console.log("SignUp user:", data.user);

      showSuccessToast(t("auth.signup_complete_desc"));
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setIsSignUp(false);
    } catch (error: any) {
      console.error("Sign up error:", error);
      let errorMessage = t("common.error_generic");

      if (error instanceof Error) {
        if (error.message.includes("User already registered")) {
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

  const handleAuth = async (e: React.FormEvent) => {
    if (isSignUp) {
      await handleSignUp(e);
    } else {
      await handleSignIn(e);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      // Check if this is an invitation link
      let redirectUrl = `${window.location.origin}/dashboard`;
      if (from === "member-invitation" && nonce && projectId) {
        redirectUrl = `${window.location.origin}/invite?nonce=${nonce}&projectId=${projectId}`;
      }

      console.log("Google OAuth redirectUrl:", redirectUrl);
      console.log("URL params:", { from, nonce, projectId });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google sign in error:", error);
      showSimpleError(error.message);
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
          {/* 온보딩 버튼 */}
          <div className="flex justify-end">
            <Button
              variant="link"
              onClick={() => setShowOnboarding(true)}
              className="text-sm text-blue-600 hover:text-blue-800 p-0 h-auto"
            >
              {t("home.what_is_service")}
            </Button>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Image
              src="/images/logo/logo.png"
              alt="SpecLive Logo"
              width={48}
              height={48}
              className="rounded-full"
            />
            <CardTitle className="text-2xl text-center">
              {t("common.brand")}
            </CardTitle>
          </div>
          <CardDescription className="text-center">
            {t("home.tagline_1")}
            <br />
            {t("home.tagline_2")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 구글 로그인 버튼 */}
          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("auth.sign_in_with_google")}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  {t("auth.or")}
                </span>
              </div>
            </div>

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

      {/* 온보딩 모달 */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </main>
  );
}
