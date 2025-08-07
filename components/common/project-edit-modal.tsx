"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { showError, showSimpleError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import supabase from "@/lib/supabase-browser";
import { showSuccessToast } from "@/lib/toast-store";
import type { Tables } from "@/types/database";
import { useState } from "react";

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project:
    | (Tables<"projects"> & {
        memberships: Tables<"memberships">[];
      })
    | null;
  mode: "edit" | "delete";
}

export default function ProjectEditModal({
  isOpen,
  onClose,
  onSuccess,
  project,
  mode,
}: ProjectEditModalProps) {
  const [name, setName] = useState(project?.name || "");
  const [loading, setLoading] = useState(false);
  const t = useGlobalT();

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "edit") {
      if (!name.trim()) {
        showSimpleError(t("projectEdit.name_required"));
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from("projects")
          .update({ name: name.trim() })
          .eq("id", project.id);

        if (error) throw error;

        showSuccessToast(t("projectEdit.update_success_message"));
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Error updating project:", error);
        showError(t("projectEdit.update_error_title"), String(error));
      } finally {
        setLoading(false);
      }
    } else if (mode === "delete") {
      setLoading(true);
      try {
        // 먼저 해당 프로젝트의 모든 멤버십을 삭제
        const { error: membershipsError } = await supabase
          .from("memberships")
          .delete()
          .eq("project_id", project.id);

        if (membershipsError) throw membershipsError;

        // 그 다음 프로젝트를 삭제
        const { error: projectError } = await supabase
          .from("projects")
          .delete()
          .eq("id", project.id);

        if (projectError) throw projectError;

        showSuccessToast(t("projectEdit.delete_success_message"));
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Error deleting project:", error);
        showError(t("projectEdit.delete_error_title"), String(error));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>
            {mode === "edit"
              ? t("projectEdit.edit_title")
              : t("projectEdit.delete_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "edit" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("projectEdit.name_label")}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("projectEdit.name_placeholder")}
                  disabled={loading}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  {t("projectEdit.cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? t("projectEdit.updating")
                    : t("projectEdit.update")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t("projectEdit.delete_confirm_message", {
                  projectName: project.name,
                })}
              </p>
              <p className="text-xs text-red-600">
                {t("projectEdit.delete_warning")}
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  {t("projectEdit.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? t("projectEdit.deleting")
                    : t("projectEdit.delete")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
