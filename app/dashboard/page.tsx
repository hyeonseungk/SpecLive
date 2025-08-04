"use client";

import { FullScreenLoading } from "@/components/common/full-screen-loading";
import { LanguageSelector } from "@/components/common/language-selector";
import { LogoutConfirmModal } from "@/components/common/logout-confirm-modal";
import { OrganizationCreateModal } from "@/components/common/organization-create-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import supabase from "@/lib/supabase-browser";
import type { Tables } from "@/types/database";
import { formatDateWithSuffix } from "@/utils/date-format";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Organization = Tables<"organizations">;

interface OrganizationWithStats extends Organization {
  projectCount: number;
  memberCount: number;
  isOwner: boolean;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showOrgCreateModal, setShowOrgCreateModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const t = useGlobalT();
  const { lang } = useLangStore();
  const locale = lang === "ko" ? "ko-KR" : "en-US";
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!session?.user) {
        router.push("/");
        return;
      }

      await loadUserOrganizations(session.user.id);
    };

    getSession();
  }, [router]);

  const loadUserOrganizations = async (userId: string) => {
    setLoading(true);
    console.log("Loading organizations for userId:", userId);
    try {
      // 1. 사용자가 속한 조직들을 멤버십을 통해 가져오기
      const { data: userMemberships, error: membershipError } = await supabase
        .from("memberships")
        .select(
          `
          *,
          projects (
            *,
            organizations (
              *
            )
          )
        `
        )
        .eq("user_id", userId);

      if (membershipError) throw membershipError;

      // 2. 사용자가 소유한 조직들도 별도로 가져오기
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", userId);

      if (ownedError) throw ownedError;

      console.log("ownedOrgs", ownedOrgs);
      console.log("userMemberships", userMemberships);
      console.log(
        "Expected owner_id in DB:",
        "fe35b4f1-fa60-46b0-a460-9439ddb30598"
      );
      console.log("Current userId:", userId);

      // 조직별로 통계 계산
      const orgMap = new Map<string, OrganizationWithStats>();

      // 멤버십을 통한 조직들 처리
      userMemberships?.forEach((membership) => {
        const project = membership.projects as any;
        if (!project?.organizations) return;

        const org = project.organizations;
        if (!orgMap.has(org.id)) {
          orgMap.set(org.id, {
            ...org,
            projectCount: 0,
            memberCount: 0,
            isOwner: org.owner_id === userId,
          });
        }

        orgMap.get(org.id)!.projectCount++;
      });

      // 소유한 조직들 중 아직 추가되지 않은 것들 추가
      ownedOrgs?.forEach((org) => {
        if (!orgMap.has(org.id)) {
          orgMap.set(org.id, {
            ...org,
            projectCount: 0,
            memberCount: 0,
            isOwner: true,
          });
        }
      });

      // 각 조직의 멤버 수 계산
      for (const [orgId, orgData] of Array.from(orgMap.entries())) {
        // 해당 조직의 모든 프로젝트의 멤버 수 계산
        const { count } = await supabase
          .from("memberships")
          .select("*", { count: "exact", head: true })
          .in(
            "project_id",
            userMemberships
              ?.filter((m) => (m.projects as any)?.organizations?.id === orgId)
              .map((m) => m.project_id) || []
          );

        orgData.memberCount = count || 0;
      }

      const orgList = Array.from(orgMap.values()).sort((a, b) => {
        // 소유자인 조직을 먼저 정렬, 그 다음은 생성일 순
        if (a.isOwner && !b.isOwner) return -1;
        if (!a.isOwner && b.isOwner) return 1;
        return (
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
        );
      });

      setOrganizations(orgList);
    } catch (error) {
      console.error("Error loading user organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await handleSignOut();
  };

  const handleModalSuccess = () => {
    if (user) {
      loadUserOrganizations(user.id);
    }
  };

  if (loading) {
    return <FullScreenLoading message={t("common.loading")} />;
  }

  return (
    <div className="h-full bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t("common.brand")}</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogoutClick}
              className="h-9 w-9"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {organizations.length === 0 ? (
          // 조직이 없는 경우 - 조직 생성을 유도하는 UI
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">
                {t("dashboard.welcome")}
              </h2>
              <p className="text-lg text-muted-foreground mb-2">
                {t("dashboard.intro_line1")}
              </p>
              <p className="text-muted-foreground">
                {t("dashboard.intro_line2")}
              </p>
            </div>

            <Card className="w-full max-w-md">
              <CardContent className="pt-8 pb-8">
                <Button
                  onClick={() => setShowOrgCreateModal(true)}
                  className="w-full mb-6"
                  size="lg"
                >
                  {t("dashboard.create_org_button")}
                </Button>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-3 font-medium">
                    {t("dashboard.after_title")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-left max-w-xs mx-auto">
                    <li>{t("dashboard.after_list.project")}</li>
                    <li>{t("dashboard.after_list.invite")}</li>
                    <li>{t("dashboard.after_list.manage")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // 조직이 있는 경우 - 조직 목록 표시
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">
                {t("dashboard.choose_org_title")}
              </h2>
              <p className="text-muted-foreground">
                {t("dashboard.choose_org_sub_prefix")}
                {organizations.length}
                {t("dashboard.choose_org_sub_suffix")}
              </p>
            </div>

            <div className="mb-6">
              <Button onClick={() => setShowOrgCreateModal(true)}>
                {t("dashboard.create_org_button")}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <Card
                  key={org.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    router.push(`/dashboard/organizations/${org.id}`)
                  }
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                          🏢
                        </div>
                        {org.name}
                      </div>
                      {org.isOwner && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {t("dashboard.owner_badge")}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {t("dashboard.project_label")}: {org.projectCount}
                        {t("dashboard.count_unit")}
                      </span>
                      <span>
                        {t("dashboard.member_label")}: {org.memberCount}
                        {t("dashboard.member_unit")}
                      </span>
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="text-xs text-muted-foreground">
                        {org.created_at &&
                          formatDateWithSuffix(org.created_at, locale)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 조직 생성 모달 */}
      {user && (
        <OrganizationCreateModal
          isOpen={showOrgCreateModal}
          onClose={() => setShowOrgCreateModal(false)}
          onSuccess={handleModalSuccess}
          user={user}
        />
      )}

      {/* 로그아웃 확인 모달 */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
