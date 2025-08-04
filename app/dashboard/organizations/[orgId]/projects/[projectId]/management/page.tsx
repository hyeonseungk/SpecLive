"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, showSimpleError } from "@/lib/error-store";
import { showSimpleSuccess } from "@/lib/success-store";
import { useProjectT } from "@/lib/i18n";
import { MemberInviteModal } from "@/components/common/member-invite-modal";

type User = {
  id: string;
  email?: string;
};

type Project = Tables<"projects">;
type Membership = Tables<"memberships">;

interface ManagementPageProps {
  params: {
    orgId: string;
    projectId: string;
  };
}

export default function ManagementPage({ params }: ManagementPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const t = useProjectT();

  const router = useRouter();

  useEffect(() => {
    const loadProjectData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!session?.user) {
        router.push("/");
        return;
      }

      // 프로젝트 정보 가져오기
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.projectId)
        .single();

      if (!projectData) {
        router.push("/dashboard");
        return;
      }

      setProject(projectData);

      // 멤버십 확인
      const { data: membershipData } = await supabase
        .from("memberships")
        .select("*")
        .eq("project_id", params.projectId)
        .eq("user_id", session.user.id)
        .single();

      if (!membershipData) {
        router.push("/dashboard");
        return;
      }

      setMembership(membershipData);

      setLoading(false);
    };

    loadProjectData();
  }, [params.projectId, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    showSimpleSuccess(t("management.invite_success"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project || !membership) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("common.no_access")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")}>
              {t("buttons.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = membership?.role === "admin";

  return (
    <div className="p-6">
      <div>
        {/* 헤더 영역 */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{t("management.header")}</h2>
          <p className="text-muted-foreground">{t("management.sub")}</p>
        </div>

        {/* 관리자 전용 기능 */}
        {isAdmin ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("management.invite_title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("management.invite_sub")}
                </p>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowInviteModal(true)}>
                  {t("management.invite_button")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("management.settings_title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("management.settings_sub")}
                </p>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled>
                  {t("management.settings_button")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("management.notifications_title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("management.notifications_sub")}
                </p>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled>
                  {t("management.notifications_button")}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                {t("management.admin_only_note")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 멤버 초대 모달 */}
      {project && (
        <MemberInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
          project={project}
        />
      )}
    </div>
  );
}
