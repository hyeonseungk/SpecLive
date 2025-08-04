"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useErrorStore } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { useSuccessStore } from "@/lib/success-store";
import supabase from "@/lib/supabase-browser";
import type { Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

type Organization = Tables<"organizations">;

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  organizationId?: string; // 조직이 미리 선택된 경우
}

export function ProjectCreateModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  organizationId,
}: ProjectCreateModalProps) {
  const [projectName, setProjectName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const { showError } = useErrorStore();
  const { showSuccess } = useSuccessStore();
  const t = useGlobalT();

  // 조직 목록 로드 (organizationId가 없는 경우에만)
  useEffect(() => {
    if (isOpen) {
      if (organizationId) {
        // 조직이 미리 선택된 경우
        setSelectedOrgId(organizationId);
      } else {
        // 조직을 선택해야 하는 경우
        loadOrganizations();
      }
    }
  }, [isOpen, organizationId]);

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrganizations(orgs || []);

      // 첫 번째 조직을 기본 선택
      if (orgs && orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (error) {
      console.error("Organizations loading error:", error);
      showError(
        t("projectCreate.org_load_error_title"),
        t("projectCreate.org_load_error_message")
      );
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      showError(
        t("projectCreate.input_error_title"),
        t("projectCreate.input_name_required")
      );
      return;
    }

    const targetOrgId = organizationId || selectedOrgId;
    if (!targetOrgId) {
      showError(
        t("projectCreate.select_error_title"),
        t("projectCreate.select_org_required")
      );
      return;
    }

    setIsLoading(true);

    try {
      // 프로젝트 생성
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          organization_id: targetOrgId,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 프로젝트 생성자를 관리자로 멤버십 생성
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: "admin",
        });

      if (membershipError) throw membershipError;

      showSuccess(
        t("projectCreate.success_title"),
        t("projectCreate.success_message", { project: projectName })
      );

      setProjectName("");
      setSelectedOrgId("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Project creation error:", error);
      showError(
        t("projectCreate.failure_title"),
        t("projectCreate.failure_message")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setProjectName("");
      setSelectedOrgId("");
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("projectCreate.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("projectCreate.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {!organizationId && (
            <div>
              <label
                htmlFor="organization-select"
                className="text-sm font-medium mb-2 block"
              >
                {t("projectCreate.org_select_label")}
              </label>
              {isLoadingOrgs ? (
                <div className="text-sm text-muted-foreground">
                  {t("projectCreate.org_select_loading")}
                </div>
              ) : organizations.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t("projectCreate.org_select_no_orgs")}
                </div>
              ) : (
                <select
                  id="organization-select"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {t("projectCreate.org_select_placeholder")}
                  </option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="project-name"
              className="text-sm font-medium mb-2 block"
            >
              {t("projectCreate.name_label")}
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t("projectCreate.name_placeholder")}
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            {t("buttons.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !projectName.trim() ||
              (!organizationId &&
                (!selectedOrgId || organizations.length === 0))
            }
          >
            {isLoading
              ? t("projectCreate.creating")
              : t("projectCreate.create")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
