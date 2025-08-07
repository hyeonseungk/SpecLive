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

interface OrganizationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organization: Tables<"organizations"> | null;
  mode: "edit" | "delete";
}

export default function OrganizationEditModal({
  isOpen,
  onClose,
  onSuccess,
  organization,
  mode,
}: OrganizationEditModalProps) {
  const [name, setName] = useState(organization?.name || "");
  const [loading, setLoading] = useState(false);
  const t = useGlobalT();

  if (!isOpen || !organization) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "edit") {
      if (!name.trim()) {
        showSimpleError(t("orgEdit.name_required"));
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from("organizations")
          .update({ name: name.trim() })
          .eq("id", organization.id);

        if (error) throw error;

        showSuccessToast(t("orgEdit.update_success_message"));
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Error updating organization:", error);
        showError(t("orgEdit.update_error_title"), String(error));
      } finally {
        setLoading(false);
      }
    } else if (mode === "delete") {
      setLoading(true);
      try {
        // 먼저 해당 조직의 모든 프로젝트를 삭제
        const { error: projectsError } = await supabase
          .from("projects")
          .delete()
          .eq("organization_id", organization.id);

        if (projectsError) throw projectsError;

        // 그 다음 조직을 삭제
        const { error: orgError } = await supabase
          .from("organizations")
          .delete()
          .eq("id", organization.id);

        if (orgError) throw orgError;

        showSuccessToast(t("orgEdit.delete_success_message"));
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Error deleting organization:", error);
        showError(t("orgEdit.delete_error_title"), String(error));
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
              ? t("orgEdit.edit_title")
              : t("orgEdit.delete_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "edit" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("orgEdit.name_label")}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("orgEdit.name_placeholder")}
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
                  {t("orgEdit.cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t("orgEdit.updating") : t("orgEdit.update")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t("orgEdit.delete_confirm_message", {
                  orgName: organization.name,
                })}
              </p>
              <p className="text-xs text-red-600">
                {t("orgEdit.delete_warning")}
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  {t("orgEdit.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? t("orgEdit.deleting") : t("orgEdit.delete")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
