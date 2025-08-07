"use client";

import { MemberInviteModal } from "@/components/common/member-invite-modal";
import { MemberRemoveModal } from "@/components/common/member-remove-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { showSuccess } from "@/lib/success-store";
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
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(
    null
  );
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [isRemovingLoading, setIsRemovingLoading] = useState(false);
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

  // 관리자 수 계산
  const adminCount = projectMembers.filter(
    (member) => member.role === "admin"
  ).length;

  // 멤버 역할 변경 핸들러
  const handleRoleChange = async (
    memberId: string,
    newRole: "admin" | "member"
  ) => {
    if (updatingMember) return; // 이미 업데이트 중이면 무시

    try {
      setUpdatingMember(memberId);

      // 마지막 관리자 보호 로직
      if (newRole === "member") {
        const targetMember = projectMembers.find((m) => m.id === memberId);
        if (targetMember?.role === "admin" && adminCount === 1) {
          showError(
            t("common.error_title"),
            t("management.cannot_demote_last_admin")
          );
          return;
        }
      }

      const { error } = await supabase
        .from("memberships")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) {
        throw error;
      }

      // 로컬 상태 업데이트
      setProjectMembers((prev) =>
        prev.map((member) =>
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );

      showSuccess(
        t("common.success_title"),
        t("management.role_updated_successfully")
      );
    } catch (error) {
      console.error("Failed to update member role:", error);
      showError(t("common.error_title"), t("management.failed_to_update_role"));
    } finally {
      setUpdatingMember(null);
    }
  };

  // 멤버 제거 모달 열기 핸들러
  const handleRemoveMemberClick = (member: ProjectMember) => {
    // 마지막 관리자 보호 로직
    if (member.role === "admin" && adminCount === 1) {
      showError(
        t("common.error_title"),
        t("management.cannot_remove_last_admin")
      );
      return;
    }

    setRemovingMember(member);
    setShowRemoveModal(true);
  };

  // 멤버 제거 확인 핸들러
  const handleRemoveMemberConfirm = async () => {
    if (!removingMember) return;

    try {
      setIsRemovingLoading(true);

      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", removingMember.id);

      if (error) {
        throw error;
      }

      // 로컬 상태 업데이트
      setProjectMembers((prev) =>
        prev.filter((member) => member.id !== removingMember.id)
      );

      showSuccess(
        t("common.success_title"),
        t("management.member_removed_successfully")
      );
    } catch (error) {
      console.error("Failed to remove member:", error);
      showError(
        t("common.error_title"),
        t("management.failed_to_remove_member")
      );
    } finally {
      setIsRemovingLoading(false);
      setRemovingMember(null);
      setShowRemoveModal(false);
    }
  };

  // 멤버 제거 모달 닫기 핸들러
  const handleRemoveModalClose = () => {
    setShowRemoveModal(false);
    setRemovingMember(null);
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
    <div className="h-full flex flex-col p-6 bg-background">
      <div className="flex-1">
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
                  {projectMembers.map((member) => {
                    const isLastAdmin =
                      member.role === "admin" && adminCount === 1;
                    const isUpdating = updatingMember === member.id;
                    const isRemoving = removingMember?.id === member.id;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{member.email}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Select
                            value={member.role}
                            disabled={isUpdating || isRemoving || isLastAdmin}
                            onValueChange={(value: "admin" | "member") =>
                              handleRoleChange(member.id, value)
                            }
                          >
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
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUpdating || isRemoving || isLastAdmin}
                            onClick={() => handleRemoveMemberClick(member)}
                          >
                            {t("management.remove_member")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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

        {/* 멤버 제거 모달 */}
        {removingMember && (
          <MemberRemoveModal
            isOpen={showRemoveModal}
            onClose={handleRemoveModalClose}
            onConfirm={handleRemoveMemberConfirm}
            memberEmail={removingMember.email || ""}
            isLoading={isRemovingLoading}
          />
        )}
      </div>
    </div>
  );
}
