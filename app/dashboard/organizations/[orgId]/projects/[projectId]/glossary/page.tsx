"use client";

import GlossaryAddModal from "@/components/glossary/glossary-add-modal";
import GlossaryAiRecommendationModal from "@/components/glossary/glossary-ai-recommendation-modal";
import GlossaryEditModal from "@/components/glossary/glossary-edit-modal";
import SortableGlossaryCard from "@/components/glossary/sortable-glossary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showError } from "@/lib/error-store";
import { useProjectT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSimpleSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email?: string;
};

type Project = Tables<"projects">;
type Membership = Tables<"memberships">;

interface GlossaryPageProps {
  params: {
    orgId: string;
    projectId: string;
  };
}

export default function GlossaryPage({ params }: GlossaryPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  // 용어 관련 상태
  const [glossaries, setGlossaries] = useState<Tables<"glossaries">[]>([]);
  const [glossariesLoading, setGlossariesLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "updated_at" | "updated_at_old" | "sequence"
  >("sequence");

  // 용어 추가 모달 상태
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  // 용어 편집 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGlossary, setEditingGlossary] =
    useState<Tables<"glossaries"> | null>(null);

  // AI 추천 모달 상태
  const [showAiRecommendationModal, setShowAiRecommendationModal] =
    useState(false);

  // 추가: 다국어 지원 훅
  const t = useProjectT();
  const { lang } = useLangStore();
  const locale = lang === "ko" ? "ko-KR" : "en-US";

  const router = useRouter();

  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

      // 용어 로드
      await loadGlossariesForProject(params.projectId);

      setLoading(false);
    };

    loadProjectData();
  }, [params.projectId, router]);

  // 해시태그로 스크롤 처리 함수
  const scrollToGlossaryByHash = (hash?: string) => {
    if (glossaries.length === 0) {
      console.log("스크롤 시도: 용어 목록이 비어있음");
      return;
    }

    let targetHash = hash || window.location.hash.replace("#", "");
    if (!targetHash) {
      console.log("스크롤 시도: 해시가 없음");
      return;
    }

    console.log("원본 해시:", targetHash);

    // URL 인코딩된 해시 디코딩
    try {
      targetHash = decodeURIComponent(targetHash);
      console.log("디코딩된 해시:", targetHash);
    } catch (error) {
      console.warn("해시 디코딩 실패:", error);
    }

    // 해시에 해당하는 용어 찾기
    const targetGlossary = glossaries.find((g) => {
      const glossaryHash = g.name.toLowerCase().replace(/\s+/g, "-");
      console.log(
        `용어 비교: "${glossaryHash}" === "${targetHash.toLowerCase()}"`
      );
      return glossaryHash === targetHash.toLowerCase();
    });

    console.log("찾은 용어:", targetGlossary?.name);

    if (targetGlossary) {
      // 약간의 지연 후 스크롤 (DOM 렌더링 완료 대기)
      setTimeout(() => {
        const element = document.getElementById(
          `glossary-${targetGlossary.id}`
        );
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          // 스크롤 후 강조 효과
          element.classList.add("ring-2", "ring-primary", "ring-opacity-50");
          setTimeout(() => {
            element.classList.remove(
              "ring-2",
              "ring-primary",
              "ring-opacity-50"
            );
          }, 3000);
        }
      }, 300); // 시간을 좀 더 늘림
    }
  };

  // 용어 로드 완료 후 해시 처리
  useEffect(() => {
    if (glossaries.length > 0) {
      scrollToGlossaryByHash();
    }
  }, [glossaries]);

  // 해시 변경 감지 (같은 페이지에서 해시만 변경될 때)
  useEffect(() => {
    const handleHashChange = () => {
      scrollToGlossaryByHash();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [glossaries]);

  // 용어 로드 함수 (project ID를 직접 받는 버전)
  const loadGlossariesForProject = async (projectId: string) => {
    setGlossariesLoading(true);
    try {
      const { data, error } = await supabase
        .from("glossaries")
        .select(
          `
          *,
          glossary_links (
            url
          )
        `
        )
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (error) throw error;

      setGlossaries(data || []);
    } catch (error) {
      console.error("Error loading glossaries:", error);
      showError(t("glossary.load_error_title"), t("glossary.load_error_desc"));
    } finally {
      setGlossariesLoading(false);
    }
  };

  // 모달 닫기 및 폼 리셋
  const handleCloseGlossaryModal = () => {
    setShowGlossaryModal(false);
  };

  // AI 추천 모달 핸들러
  const handleOpenAiModal = () => {
    setShowAiRecommendationModal(true);
  };

  const handleCloseAiModal = () => {
    setShowAiRecommendationModal(false);
  };

  // 편집 모달 열기
  const handleEditGlossary = (glossary: Tables<"glossaries">) => {
    setEditingGlossary(glossary);
    setShowEditModal(true);
  };

  // 편집 모달 닫기
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingGlossary(null);
  };

  // URL 복사 함수
  const copyGlossaryUrl = async (glossary: Tables<"glossaries">) => {
    const glossaryHash = glossary.name.toLowerCase().replace(/\s+/g, "-");
    const currentUrl = window.location.href.split("#")[0]; // 기존 해시 제거
    const urlWithHash = `${currentUrl}#${encodeURIComponent(glossaryHash)}`;

    try {
      await navigator.clipboard.writeText(urlWithHash);
      showSimpleSuccess(t("glossary.url_copied"));
    } catch (error) {
      console.error("URL 복사 실패:", error);
      showError(
        t("glossary.url_copy_error_title"),
        t("glossary.url_copy_error_desc")
      );
    }
  };

  // 드래그 엔드 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = glossaries.findIndex((item) => item.id === active.id);
      const newIndex = glossaries.findIndex((item) => item.id === over?.id);

      // 로컬 상태를 시퀀스와 함께 한 번에 업데이트
      const newGlossaries = arrayMove(glossaries, oldIndex, newIndex).map(
        (glossary, index) => ({
          ...glossary,
          sequence: index + 1,
        })
      );

      setGlossaries(newGlossaries);

      // 백그라운드에서 Supabase 업데이트 (UI 블로킹 없이)
      try {
        // 배치 업데이트를 위한 Promise 배열
        const updatePromises = newGlossaries.map((glossary, index) =>
          supabase
            .from("glossaries")
            .update({ sequence: index + 1 })
            .eq("id", glossary.id)
        );

        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Error updating sequence:", error);
        showError(
          t("glossary.sequence_error_title"),
          t("glossary.sequence_error_desc")
        );
        // 에러 발생 시 원래 상태로 복원
        loadGlossariesForProject(params.projectId);
      }
    }
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

  // 필터링된 용어 목록
  const filteredGlossaries = glossaries.filter(
    (glossary) =>
      glossary.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      glossary.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (glossary.examples &&
        glossary.examples.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 정렬
  const sortedGlossaries = [...filteredGlossaries].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "updated_at") {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    } else if (sortBy === "updated_at_old") {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return aTime - bTime;
    } else if (sortBy === "sequence") {
      return a.sequence - b.sequence;
    } else {
      return 0;
    }
  });

  return (
    <div className="h-full flex flex-col">
      {/* 고정 영역: 헤더와 검색 바 */}
      <div className="flex-shrink-0 p-6 pb-0">
        {/* 헤더 영역 */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{t("glossary.header")}</h2>
          <p className="text-muted-foreground">{t("glossary.sub")}</p>
        </div>

        {/* 뷰 선택, 개수 표시, 검색, 정렬 */}
        <div className="flex items-center justify-between mb-4">
          {/* 좌측: 개수 표시 */}
          <div className="flex items-center gap-4">
            {/* 용어 개수 */}
            {glossaries.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("glossary.total_prefix")}
                {glossaries.length}
                {t("glossary.total_suffix")}
              </p>
            )}

            {/* 검색창 */}
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder={t("glossary.search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* 정렬 선택 */}
            <div className="w-40">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-between w-full text-base h-10 px-4"
                  >
                    {sortBy === "updated_at" && t("glossary.sort_newest")}
                    {sortBy === "updated_at_old" && t("glossary.sort_oldest")}
                    {sortBy === "name" && t("glossary.sort_name")}
                    {sortBy === "sequence" && t("glossary.sort_sequence")}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => setSortBy("sequence")}
                    className="text-base py-2"
                  >
                    {t("glossary.sort_sequence")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("updated_at")}
                    className="text-base py-2"
                  >
                    {t("glossary.sort_newest")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("updated_at_old")}
                    className="text-base py-2"
                  >
                    {t("glossary.sort_oldest")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("name")}
                    className="text-base py-2"
                  >
                    {t("glossary.sort_name")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 우측: 버튼들 */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenAiModal}>
              {t("glossary.ai_recommendation")}
            </Button>
            <Button onClick={() => setShowGlossaryModal(true)}>
              {t("glossary.add_term_button")}
            </Button>
          </div>
        </div>
      </div>

      {/* 스크롤 영역: 용어 카드들 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* 필터링된 용어 목록 */}
        {glossariesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">{t("glossary.loading")}</p>
          </div>
        ) : sortedGlossaries.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center text-muted-foreground">
                <p className="mb-4">
                  {searchTerm
                    ? t("glossary.no_results")
                    : t("glossary.no_terms")}
                </p>
                {!searchTerm && (
                  <p className="text-sm mb-6">{t("glossary.first_term_sub")}</p>
                )}
                {!searchTerm && (
                  <Button onClick={() => setShowGlossaryModal(true)}>
                    {t("glossary.first_term_button")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedGlossaries.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sortedGlossaries.map((glossary) => (
                  <SortableGlossaryCard
                    key={glossary.id}
                    glossary={glossary}
                    onEdit={handleEditGlossary}
                    onCopyUrl={copyGlossaryUrl}
                    showSequence={sortBy === "sequence"}
                    t={t}
                    locale={locale}
                    membership={membership}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 용어 추가 모달 */}
      {showGlossaryModal && (
        <GlossaryAddModal
          projectId={project.id}
          userId={user!.id}
          onClose={handleCloseGlossaryModal}
          onGlossaryAdded={(glossaryWithLinks) =>
            setGlossaries((prev) => [glossaryWithLinks, ...prev])
          }
        />
      )}

      {/* 용어 편집 모달 */}
      {showEditModal && editingGlossary && (
        <GlossaryEditModal
          glossary={editingGlossary}
          projectId={project.id}
          onClose={handleCloseEditModal}
          onGlossaryUpdated={(glossaryWithLinks) => {
            setGlossaries((prev) =>
              prev.map((g) =>
                g.id === glossaryWithLinks.id ? glossaryWithLinks : g
              )
            );
          }}
          onGlossaryDeleted={(glossaryId, deletedSequence) => {
            setGlossaries((prev) =>
              prev
                .filter((g) => g.id !== glossaryId)
                .map((g) => ({
                  ...g,
                  sequence:
                    g.sequence > deletedSequence ? g.sequence - 1 : g.sequence,
                }))
            );
          }}
        />
      )}

      {/* AI 용어 추천 모달 */}
      {showAiRecommendationModal && (
        <GlossaryAiRecommendationModal
          projectId={project.id}
          userId={user!.id}
          onClose={handleCloseAiModal}
          onTermsAdded={(newGlossaries) =>
            setGlossaries((prev) => [...newGlossaries, ...prev])
          }
        />
      )}
    </div>
  );
}
