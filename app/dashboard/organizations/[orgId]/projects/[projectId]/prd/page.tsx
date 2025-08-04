"use client";

import AiChatModal from "@/components/common/ai-chat-modal";
import { FullScreenLoading } from "@/components/common/full-screen-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSimpleSuccess } from "@/lib/success-store";
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
type Prd = Tables<"prds">;

interface PrdPageProps {
  params: {
    orgId: string;
    projectId: string;
  };
}

export default function PrdPage({ params }: PrdPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  // PRD 관련 상태
  const [prd, setPrd] = useState<Prd | null>(null);
  const [prdContent, setPrdContent] = useState("");
  const [prdLoading, setPrdLoading] = useState(false);
  const [prdSaving, setPrdSaving] = useState(false);

  const t = useGlobalT();
  const { lang } = useLangStore();
  const locale = lang === "ko" ? "ko-KR" : "en-US";

  // AI 채팅 모달 상태
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

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

      // PRD 로드
      await loadPrdForProject(params.projectId);

      setLoading(false);
    };

    loadProjectData();
  }, [params.projectId, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // PRD 로드 함수 (project ID를 직접 받는 버전)
  const loadPrdForProject = async (projectId: string) => {
    setPrdLoading(true);
    try {
      const { data, error } = await supabase
        .from("prds")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setPrd(data);
        setPrdContent(data.contents || "");
      } else {
        setPrdContent("");
      }
    } catch (error) {
      console.error("Error loading PRD:", error);
      showError(t("prd.load_error_title"), t("prd.load_error_desc"));
    } finally {
      setPrdLoading(false);
    }
  };

  /**
   * PRD 저장 함수
   * @param contentOverride  저장할 내용을 명시적으로 전달(옵션). 전달하지 않으면 현재 prdContent state 사용
   */
  const savePrd = async (contentOverride?: string) => {
    if (!project || !user) return;

    setPrdSaving(true);
    try {
      const contentToSave = contentOverride ?? prdContent;
      if (prd) {
        // 기존 PRD 업데이트
        const { error } = await supabase
          .from("prds")
          .update({
            contents: contentToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prd.id);

        if (error) throw error;
      } else {
        // 새 PRD 생성
        const { data: newPrd, error } = await supabase
          .from("prds")
          .insert({
            project_id: project.id,
            contents: contentToSave,
            author_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        setPrd(newPrd);
      }

      showSimpleSuccess(t("prd.save_success"));
    } catch (error) {
      console.error("Error saving PRD:", error);
      showError(t("prd.save_error_title"), t("prd.save_error_desc"));
    } finally {
      setPrdSaving(false);
    }
  };

  // AI 모달에서 호출: 내용 반영 후 즉시 Supabase에 저장
  const handleSavePrdFromAi = async (content: string) => {
    setPrdContent(content);
    await savePrd(content);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loading) {
    return <FullScreenLoading message={t("common.loading")} />;
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
              {t("buttons.back") ?? "Back to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEditPrd = membership?.role === "admin";

  return (
    <div className="p-6">
      <div>
        {/* 헤더 영역 */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{t("project.prd_header")}</h2>
          <p className="text-muted-foreground">{t("project.prd_sub")}</p>
        </div>

        {/* PRD 편집 영역 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("prd.doc_title")}</CardTitle>
              {canEditPrd && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAiChatOpen(true)}
                  >
                    {t("buttons.edit_with_ai")}
                  </Button>
                  <Button onClick={() => savePrd()} disabled={prdSaving}>
                    {prdSaving ? t("buttons.saving") : t("buttons.save")}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {prdLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">{t("prd.loading")}</p>
              </div>
            ) : (
              <div>
                {canEditPrd ? (
                  <textarea
                    value={prdContent}
                    onChange={(e) => setPrdContent(e.target.value)}
                    placeholder={t("project.prd_sub")}
                    className="w-full h-96 p-4 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={prdSaving}
                  />
                ) : (
                  <div className="w-full h-96 p-4 border rounded-md bg-muted/50 overflow-y-auto whitespace-pre-wrap">
                    {prdContent || t("prd.empty")}
                  </div>
                )}

                {prd && prd.updated_at && (
                  <div className="mt-4 text-sm text-muted-foreground text-right">
                    {t("prd.last_updated")}:{" "}
                    {new Date(prd.updated_at).toLocaleString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI 채팅 모달 */}
      <AiChatModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        onSavePrd={handleSavePrdFromAi}
      />
    </div>
  );
}
