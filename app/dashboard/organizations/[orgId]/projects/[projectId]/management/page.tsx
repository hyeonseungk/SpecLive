"use client";

import { MemberInviteModal } from "@/components/common/member-invite-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email?: string;
};

type Project = Tables<"projects">;
type Membership = Tables<"memberships">;

interface ProjectMember {
  id: string;
  user_id: string;
  project_id: string;
  role: "admin" | "member";
  created_at: string;
  email?: string;
}

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
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const t = useGlobalT();

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

      // 프로젝트 멤버 목록 가져오기
      const { data: membersData } = await supabase
        .from("memberships")
        .select(
          `
          id,
          user_id,
          project_id,
          role,
          created_at
        `
        )
        .eq("project_id", params.projectId);

      if (membersData) {
        // 사용자 ID 목록 추출
        const userIds = membersData
          .map((member) => member.user_id)
          .filter((id) => id !== null) as string[];

        // Edge Function을 통해 사용자 이메일 가져오기
        let userEmails: Record<string, string> = {};

        if (userIds.length > 0) {
          try {
            console.log(
              "Calling get-user-emails function with userIds:",
              userIds
            );

            const { data: emailsData, error } = await supabase.functions.invoke(
              "get-user-emails",
              {
                body: { userIds },
              }
            );

            console.log("Edge function response:", { emailsData, error });

            if (!error && emailsData?.userEmails) {
              userEmails = emailsData.userEmails;
              console.log("Successfully got user emails:", userEmails);
            } else {
              console.log("Failed to get user emails:", error);
              // Edge Function 실패 시 user_id를 그대로 사용
              userIds.forEach((userId) => {
                userEmails[userId] = userId;
              });
            }
          } catch (error) {
            console.error("Failed to fetch user emails:", error);
            // 예외 발생 시 user_id를 그대로 사용
            userIds.forEach((userId) => {
              userEmails[userId] = userId;
            });
          }
        }

        // 멤버 정보와 이메일 결합
        const membersWithEmails = membersData.map((member) => {
          // Edge Function에서 가져온 이메일 사용
          const emailFromFunction = userEmails[member.user_id || ""];
          let displayEmail = emailFromFunction || member.user_id || "Unknown";

          // user_id가 이메일 형태가 아닌 경우 더 보기 좋게 표시
          if (displayEmail && !displayEmail.includes("@")) {
            displayEmail = `사용자 ID: ${displayEmail}`;
          }

          return {
            ...member,
            email: displayEmail,
          };
        });

        setProjectMembers(membersWithEmails as ProjectMember[]);
      }

      setLoading(false);
    };

    loadProjectData();
  }, [params.projectId, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleInviteClick = () => {
    setShowInviteModal(true);
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("management.invite_title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("management.invite_sub")}
                </p>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInviteClick}>
                  {t("management.invite_button")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("management.members_title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("management.members_sub")}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{member.email}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Select value={member.role} disabled>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              {t("management.role_member")}
                            </SelectItem>
                            <SelectItem value="admin">
                              {t("management.role_admin")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" disabled>
                          {t("management.remove_member")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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

        {/* 초대 모달 */}
        {project && user && (
          <MemberInviteModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            projectId={project.id}
            projectName={project.name}
            senderId={user.id}
          />
        )}
      </div>
    </div>
  );
}
