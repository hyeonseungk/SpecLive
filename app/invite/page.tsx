"use client";

import { showError } from "@/lib/error-store";
import { showSuccess } from "@/lib/success-store";
import supabase from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const nonce = searchParams.get("nonce");
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    if (!nonce || !projectId) {
      showError(
        "Invalid invitation link",
        "The invitation link is missing required parameters."
      );
      router.push("/");
      return;
    }

    handleInvite();
  }, [nonce, projectId]);

  const handleInvite = async () => {
    try {
      setIsProcessing(true);

      // 1. Check if invitation exists and is valid
      const { data: invitation, error: invitationError } = await supabase
        .from("invitation_emails")
        .select("id, project_id, nonce, role, created_at")
        .eq("nonce", nonce!)
        .eq("project_id", projectId!)
        .single();

      if (invitationError || !invitation) {
        showError(
          "Invalid or expired invitation",
          "The invitation link is no longer valid or has expired."
        );
        router.push("/");
        return;
      }

      // 2. Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError);
        showError("Authentication error", "Failed to authenticate user.");
        router.push("/");
        return;
      }

      if (!user) {
        // User is not authenticated, redirect to sign up with invitation data
        const signUpUrl = `/auth/signup?nonce=${nonce}&projectId=${projectId}`;
        router.push(signUpUrl);
        return;
      }

      // 3. User is authenticated, add them to the project
      await addUserToProject(user.id, projectId!, invitation.role || "member");
    } catch (error) {
      console.error("Error handling invite:", error);
      showError(
        "Failed to process invitation",
        "An error occurred while processing the invitation."
      );
      router.push("/");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const addUserToProject = async (
    userId: string,
    projectId: string,
    role: string = "member"
  ) => {
    try {
      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .single();

      if (existingMembership) {
        showSuccess(
          "You are already a member of this project",
          "You have already joined this project."
        );
        router.push(`/dashboard/organizations/projects/${projectId}`);
        return;
      }

      // Add user to project with specified role
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          user_id: userId,
          project_id: projectId,
          role: role,
        });

      if (membershipError) {
        throw membershipError;
      }

      // Update invitation email with receiver_id
      await supabase
        .from("invitation_emails")
        .update({ receiver_id: userId })
        .eq("nonce", nonce!)
        .eq("project_id", projectId);

      showSuccess(
        "Successfully joined the project!",
        "You have been added to the project successfully."
      );
      router.push(`/dashboard/organizations/projects/${projectId}`);
    } catch (error) {
      console.error("Error adding user to project:", error);
      showError(
        "Failed to join project",
        "An error occurred while adding you to the project."
      );
      router.push("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing invitation...</p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Joining project...</p>
        </div>
      </div>
    );
  }

  return null;
}
