"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { LanguageSelector } from "@/components/common/language-selector";
import { OrganizationSelector } from "@/components/common/organization-selector";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";

type Organization = Tables<"organizations">;

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const t = useT();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!session?.user) {
        router.push("/");
        return;
      }

      // 조직 정보 가져오기
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      setOrganization(orgData);
      setLoading(false);
    };

    loadData();
  }, [orgId, router]);

  const handleOrgChange = (newOrgId: string | null) => {
    if (newOrgId) {
      router.push(`/dashboard/organizations/${newOrgId}`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="h-full bg-background">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 공통 헤더 */}
      <header className="border-b flex-shrink-0">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{t("common.brand")}</h1>
            {user && (
              <OrganizationSelector
                user={user}
                selectedOrgId={orgId}
                onOrgChange={handleOrgChange}
                onOrgCreated={() => {}}
              />
            )}
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <LanguageSelector />
            <Button variant="outline" onClick={handleSignOut}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
