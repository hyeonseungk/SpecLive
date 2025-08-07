"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { showSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  organization_id: string | null;
  created_at: string | null;
  organizations?: {
    name: string;
  } | null;
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useGlobalT();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [invitation, setInvitation] = useState<any>(null);

  const nonce = searchParams.get("nonce");
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    if (!nonce || !projectId) {
      showError(
        t("invitePage.invalid_link_title"),
        t("invitePage.invalid_link_desc")
      );
      router.push("/");
      return;
    }

    handleInvite();
  }, [nonce, projectId]);

  const checkAuthStatus = async () => {
    try {
      // 먼저 세션을 확인
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        return { user: null, error: sessionError };
      }

      if (session?.user) {
        return { user: session.user, error: null };
      }

      // 세션이 없으면 getUser로 재시도
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      return { user, error: userError };
    } catch (error) {
      console.error("Auth check error:", error);
      return { user: null, error };
    }
  };

  const handleInvite = async () => {
    try {
      setIsLoading(true);

      // 1. Check if invitation exists and is valid
      const { data: invitationData, error: invitationError } = await supabase
        .from("invitation_emails")
        .select("id, project_id, nonce, role, created_at")
        .eq("nonce", nonce!)
        .eq("project_id", projectId!)
        .single();

      if (invitationError) {
        console.error("Invitation lookup error:", invitationError);
        showError(
          t("invitePage.invalid_invitation_title"),
          t("invitePage.invalid_invitation_desc")
        );
        router.push("/");
        return;
      }

      if (!invitationData) {
        console.error("Invitation not found:", { nonce, projectId });
        showError(
          t("invitePage.invalid_invitation_title"),
          t("invitePage.invalid_invitation_desc")
        );
        router.push("/");
        return;
      }

      // 2. Check if invitation is expired (2 days)
      if (!invitationData.created_at) {
        console.error("Invitation has no created_at date");
        showError(
          t("invitePage.invalid_invitation_title"),
          t("invitePage.invalid_invitation_desc")
        );
        router.push("/");
        return;
      }

      const invitationDate = new Date(invitationData.created_at);
      const currentDate = new Date();
      const timeDifference = currentDate.getTime() - invitationDate.getTime();
      const daysDifference = timeDifference / (1000 * 3600 * 24);

      if (daysDifference > 2) {
        console.error("Invitation expired:", {
          created_at: invitationData.created_at,
          daysDifference,
        });
        showError(
          t("invitePage.expired_invitation_title"),
          t("invitePage.expired_invitation_desc")
        );
        router.push("/");
        return;
      }

      setInvitation(invitationData);

      // 2. Check if user is authenticated with improved auth check
      const { user, error: authError } = await checkAuthStatus();

      if (authError || !user) {
        console.log("User not authenticated, redirecting to signup");
        // User is not authenticated, redirect to sign up with invitation data
        const signUpUrl = `/?from=member-invitation&nonce=${nonce}&projectId=${projectId}`;
        router.push(signUpUrl);
        return;
      }

      console.log("User authenticated:", user.id);

      // 3. User is authenticated, load project info
      await loadProjectInfo();
    } catch (error) {
      console.error("Unexpected error in handleInvite:", error);
      showError(
        t("invitePage.failed_process_title"),
        t("invitePage.failed_process_desc")
      );
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          id, 
          name, 
          organization_id, 
          created_at,
          organizations (
            name
          )
        `
        )
        .eq("id", projectId!)
        .single();

      if (error) {
        console.error("Project lookup error:", error);
        showError(
          t("invitePage.failed_load_project_title"),
          t("invitePage.failed_load_project_desc")
        );
        router.push("/");
        return;
      }

      if (!data) {
        console.error("Project not found:", { projectId });
        showError(
          t("invitePage.project_not_found_title"),
          t("invitePage.project_not_found_desc")
        );
        router.push("/");
        return;
      }

      setProject(data);
    } catch (error) {
      console.error("Unexpected error in loadProjectInfo:", error);
      showError(
        t("invitePage.failed_load_project_title"),
        t("invitePage.failed_load_project_desc")
      );
      router.push("/");
    }
  };

  const handleAcceptInvite = async () => {
    setIsProcessing(true);
    try {
      const { user, error: authError } = await checkAuthStatus();

      if (authError) {
        console.error("Auth error in handleAcceptInvite:", authError);
        showError(
          t("invitePage.auth_error_title"),
          t("invitePage.auth_error_desc")
        );
        return;
      }

      if (!user) {
        console.error("User not authenticated in handleAcceptInvite");
        showError(
          t("invitePage.auth_required_title"),
          t("invitePage.auth_required_desc")
        );
        return;
      }

      // 이미 멤버인지 확인
      const { data: existingMembership, error: membershipCheckError } =
        await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", user.id)
          .eq("project_id", projectId!)
          .single();

      if (membershipCheckError && membershipCheckError.code !== "PGRST116") {
        console.error("Membership check error:", membershipCheckError);
        showError(
          t("invitePage.membership_check_error_title"),
          t("invitePage.membership_check_error_desc")
        );
        return;
      }

      if (existingMembership) {
        console.log("User already a member:", { userId: user.id, projectId });
        showSuccess(
          t("invitePage.already_member_title"),
          t("invitePage.already_member_desc")
        );
        if (project?.organization_id) {
          router.push(
            `/dashboard/organizations/${project.organization_id}/projects/${projectId}`
          );
        } else {
          router.push(`/dashboard/organizations/projects/${projectId}`);
        }
        return;
      }

      // 멤버십 추가
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          user_id: user.id,
          project_id: projectId!,
          role: invitation.role || "member",
        });

      if (membershipError) {
        console.error("Membership insert error:", membershipError);
        showError(
          t("invitePage.join_failed_title"),
          t("invitePage.join_failed_desc")
        );
        return;
      }

      // 초대 이메일 업데이트
      const { error: updateError } = await supabase
        .from("invitation_emails")
        .update({ receiver_id: user.id })
        .eq("nonce", nonce!)
        .eq("project_id", projectId!);

      if (updateError) {
        console.error("Invitation update error:", updateError);
        // 멤버십은 추가되었지만 초대 업데이트 실패 - 경고만 표시
        console.warn(
          "Membership added but failed to update invitation:",
          updateError
        );
      }

      console.log("Successfully joined project:", {
        userId: user.id,
        projectId,
      });
      showSuccess(
        t("invitePage.join_success_title"),
        t("invitePage.join_success_desc")
      );
      if (project?.organization_id) {
        router.push(
          `/dashboard/organizations/${project.organization_id}/projects/${projectId}`
        );
      } else {
        router.push(`/dashboard/organizations/projects/${projectId}`);
      }
    } catch (error) {
      console.error("Unexpected error in handleAcceptInvite:", error);
      showError(
        t("invitePage.join_failed_title"),
        t("invitePage.join_failed_desc")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvite = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("invitePage.processing")}</p>
        </div>
      </div>
    );
  }

  if (!project || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t("invitePage.failed_load_info")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {t("invitePage.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {project.name}
              </h3>
              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  {t("invitePage.organization")}{" "}
                  <span className="font-medium">
                    {project.organizations?.name || t("invitePage.unknown")}
                  </span>
                </p>
                <p>
                  {t("invitePage.role")}{" "}
                  <span className="font-medium capitalize">
                    {invitation.role || "member"}
                  </span>
                </p>
                <p>
                  {t("invitePage.created")}{" "}
                  {new Date(project.created_at || "").toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAcceptInvite}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t("invitePage.joining_project")}
                  </>
                ) : (
                  t("invitePage.accept_invitation")
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDeclineInvite}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {t("invitePage.decline")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
