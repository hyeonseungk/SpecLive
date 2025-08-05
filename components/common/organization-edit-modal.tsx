"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { showError, showSimpleError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { showSuccess } from "@/lib/success-store";
import supabase from "@/lib/supabase-browser";
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
        showSimpleError("조직 이름을 입력해주세요.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from("organizations")
          .update({ name: name.trim() })
          .eq("id", organization.id);

        if (error) throw error;

        showSuccess(
          t("orgEdit.update_success_title"),
          t("orgEdit.update_success_message")
        );
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Error updating organization:", error);
        showError("조직 수정 중 오류가 발생했습니다.", String(error));
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

        showSuccess(
          t("orgEdit.delete_success_title"),
          t("orgEdit.delete_success_message")
        );
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Error deleting organization:", error);
        showError("조직 삭제 중 오류가 발생했습니다.", String(error));
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
            {mode === "edit" ? "조직 이름 수정" : "조직 삭제"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "edit" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  조직 이름
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="조직 이름을 입력하세요"
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
                  취소
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "수정 중..." : "수정"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                <strong>{organization.name}</strong> 조직을 삭제하시겠습니까?
              </p>
              <p className="text-xs text-red-600">
                ⚠️ 이 작업은 되돌릴 수 없습니다. 조직과 관련된 모든 프로젝트가
                함께 삭제됩니다.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "삭제 중..." : "삭제"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
