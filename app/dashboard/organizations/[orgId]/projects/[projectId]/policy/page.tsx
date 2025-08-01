"use client";

import ActorAddModal from "@/components/actor/actor-add-modal";
import ActorDeleteModal from "@/components/actor/actor-delete-modal";
import ActorEditModal from "@/components/actor/actor-edit-modal";
import SortableActorCard from "@/components/actor/sortable-actor-card";
import FeatureAddModal from "@/components/feature/feature-add-modal";
import FeatureDeleteModal from "@/components/feature/feature-delete-modal";
import FeatureEditModal from "@/components/feature/feature-edit-modal";
import SortableFeatureCard from "@/components/feature/sortable-feature-card";
import GlossaryViewModal from "@/components/glossary/glossary-view-modal";
import PolicyAddModal from "@/components/policy/policy-add-modal";
import PolicyEditModal from "@/components/policy/policy-edit-modal";
import SortablePolicyCard from "@/components/policy/sortable-policy-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SortableUsecaseCard from "@/components/usecase/sortable-usecase-card";
import UsecaseAddModal from "@/components/usecase/usecase-add-modal";
import UsecaseDeleteModal from "@/components/usecase/usecase-delete-modal";
import UsecaseEditModal from "@/components/usecase/usecase-edit-modal";
import { showError, showSimpleError } from "@/lib/error-store";
import { useT } from "@/lib/i18n";
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
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email?: string;
};

type Project = Tables<"projects">;
type Membership = Tables<"memberships">;

// 데이터베이스 테이블 타입 사용
type Actor = Tables<"actors">;
type Usecase = Tables<"usecases">;

type Feature = Tables<"features">;

type FeaturePolicy = Tables<"policies"> & {
  sequence?: number;
  policy_links?: {
    id: string;
    url: string;
    type: string;
  }[];
  policy_terms?: {
    glossary_id: string;
    glossaries?: {
      name: string;
    };
  }[];
  connected_features?: {
    id: string;
    name: string;
    usecase: {
      id: string;
      name: string;
      actor_id: string;
      actor: {
        id: string;
        name: string;
      };
    };
  }[];
};

interface PolicyPageProps {
  params: {
    orgId: string;
    projectId: string;
  };
}

export default function PolicyPage({ params }: PolicyPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useT();
  const { locale } = useLangStore();

  // 액터와 유즈케이스 상태
  const [actors, setActors] = useState<Actor[]>([]);
  const [usecases, setUsecases] = useState<Usecase[]>([]);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selectedUsecase, setSelectedUsecase] = useState<Usecase | null>(null);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [actorDropdownOpen, setActorDropdownOpen] = useState(false);
  const [usecaseDropdownOpen, setUsecaseDropdownOpen] = useState(false);

  // 액터 추가 모달 상태
  const [showActorModal, setShowActorModal] = useState(false);
  const [actorName, setActorName] = useState("");
  const [actorSaving, setActorSaving] = useState(false);

  // 액터 편집 모달 상태
  const [showEditActorModal, setShowEditActorModal] = useState(false);
  const [editingActor, setEditingActor] = useState<Actor | null>(null);
  const [editActorName, setEditActorName] = useState("");
  const [editActorSaving, setEditActorSaving] = useState(false);

  // 액터 삭제 확인 모달 상태
  const [showDeleteActorModal, setShowDeleteActorModal] = useState(false);
  const [deletingActor, setDeletingActor] = useState<Actor | null>(null);
  const [actorDeleting, setActorDeleting] = useState(false);

  // 유즈케이스 추가 모달 상태
  const [showUsecaseModal, setShowUsecaseModal] = useState(false);
  const [usecaseName, setUsecaseName] = useState("");
  const [usecaseSaving, setUsecaseSaving] = useState(false);

  // 유즈케이스 편집 모달 상태
  const [showEditUsecaseModal, setShowEditUsecaseModal] = useState(false);
  const [editingUsecase, setEditingUsecase] = useState<Usecase | null>(null);
  const [editUsecaseName, setEditUsecaseName] = useState("");
  const [editUsecaseSaving, setEditUsecaseSaving] = useState(false);

  // 유즈케이스 삭제 모달 상태
  const [showDeleteUsecaseModal, setShowDeleteUsecaseModal] = useState(false);
  const [deletingUsecase, setDeletingUsecase] = useState<Usecase | null>(null);
  const [usecaseDeleting, setUsecaseDeleting] = useState(false);

  // 기능 추가 모달 상태
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const [featureSaving, setFeatureSaving] = useState(false);

  // 기능 편집 모달 상태
  const [showEditFeatureModal, setShowEditFeatureModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [editFeatureName, setEditFeatureName] = useState("");
  const [editFeatureSaving, setEditFeatureSaving] = useState(false);

  // 기능 삭제 확인 모달 상태
  const [showDeleteFeatureModal, setShowDeleteFeatureModal] = useState(false);
  const [deletingFeature, setDeletingFeature] = useState<Feature | null>(null);
  const [featureDeleting, setFeatureDeleting] = useState(false);

  // 정책 추가 모달 상태
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyContents, setPolicyContents] = useState("");
  const [contextLinks, setContextLinks] = useState<string[]>([""]);
  const [generalLinks, setGeneralLinks] = useState<string[]>([""]);
  const [selectedGlossaryIds, setSelectedGlossaryIds] = useState<string[]>([]);
  const [glossarySearchTerm, setGlossarySearchTerm] = useState("");
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [featureSearchTerm, setFeatureSearchTerm] = useState("");
  const [policySaving, setPolicySaving] = useState(false);

  // 정책 편집 모달 상태
  const [showEditPolicyModal, setShowEditPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<FeaturePolicy | null>(
    null
  );
  const [editPolicyContents, setEditPolicyContents] = useState("");
  const [editContextLinks, setEditContextLinks] = useState<string[]>([""]);
  const [editGeneralLinks, setEditGeneralLinks] = useState<string[]>([""]);
  const [editSelectedGlossaryIds, setEditSelectedGlossaryIds] = useState<
    string[]
  >([]);
  const [editGlossarySearchTerm, setEditGlossarySearchTerm] = useState("");
  const [editSelectedFeatureIds, setEditSelectedFeatureIds] = useState<
    string[]
  >([]);
  const [editFeatureSearchTerm, setEditFeatureSearchTerm] = useState("");
  const [editPolicySaving, setEditPolicySaving] = useState(false);

  const [deletingPolicy, setDeletingPolicy] = useState<FeaturePolicy | null>(
    null
  );
  // 기능과 정책 관련 상태
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [featurePolicies, setFeaturePolicies] = useState<FeaturePolicy[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // 기능 목록 검색 상태
  const [featureListSearchTerm, setFeatureListSearchTerm] = useState("");

  // 정책 목록 검색 상태
  const [policyListSearchTerm, setPolicyListSearchTerm] = useState("");

  // 용어 관련 상태
  const [glossaries, setGlossaries] = useState<Tables<"glossaries">[]>([]);
  const [glossariesLoading, setGlossariesLoading] = useState(false);
  // glossary view modal state
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [viewingGlossaryId, setViewingGlossaryId] = useState<string | null>(
    null
  );

  // 모든 기능 관련 상태 (정책 모달용)
  const [allFeatures, setAllFeatures] = useState<
    (Feature & {
      usecase: { name: string; actor: { name: string } };
    })[]
  >([]);
  const [allFeaturesLoading, setAllFeaturesLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 액터 추가 모달 포커스
  useEffect(() => {
    if (showActorModal) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const input = document.querySelector(
            "#add-actor-name-input"
          ) as HTMLInputElement;
          if (input) {
            input.focus();
          }
        });
      });
    }
  }, [showActorModal]);

  // 액터 편집 모달이 열릴 때 input에 포커스
  useEffect(() => {
    if (showEditActorModal) {
      // requestAnimationFrame을 두 번 사용해서 DOM 렌더링이 완전히 끝난 후 실행
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const input = document.querySelector(
            "#edit-actor-name-input"
          ) as HTMLInputElement;
          if (input) {
            input.focus();
            input.select();
          }
        });
      });
    }
  }, [showEditActorModal]);

  // 유즈케이스 편집 모달 포커스
  useEffect(() => {
    if (showEditUsecaseModal) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const input = document.querySelector(
            "#edit-usecase-name-input"
          ) as HTMLInputElement;
          if (input) {
            input.focus();
            input.select();
          }
        });
      });
    }
  }, [showEditUsecaseModal]);

  // URL query parameter 업데이트 함수
  const updateURL = (
    actorId?: string,
    usecaseId?: string,
    featureId?: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (actorId) {
      params.set("actorId", actorId);
    } else {
      params.delete("actorId");
    }

    if (usecaseId) {
      params.set("usecaseId", usecaseId);
    } else {
      params.delete("usecaseId");
    }

    if (featureId) {
      params.set("featureId", featureId);
    } else {
      params.delete("featureId");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  };

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

      // 액터, 용어, 모든 기능 로드
      await loadActorsForProject(params.projectId);
      await loadGlossariesForProject(params.projectId);
      await loadAllFeaturesForProject(params.projectId);

      setLoading(false);
    };

    loadProjectData();
  }, [params.projectId, router]);

  // 액터 로드 함수
  const loadActorsForProject = async (projectId: string) => {
    setActorsLoading(true);
    try {
      const { data, error } = await supabase
        .from("actors")
        .select("*")
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (error) throw error;

      setActors(data || []);

      // URL parameter에서 선택할 액터 확인
      const urlActorId = searchParams.get("actorId");
      let actorToSelect = null;

      if (data && data.length > 0) {
        if (urlActorId) {
          // URL에 actorId가 있으면 해당 액터 찾기
          actorToSelect =
            data.find((actor) => actor.id === urlActorId) || data[0];
        } else {
          // URL에 actorId가 없으면 첫 번째 액터 선택
          actorToSelect = data[0];
        }

        setSelectedActor(actorToSelect);
        await loadUsecasesForActor(actorToSelect.id);
      }
    } catch (error) {
      console.error("Error loading actors:", error);
      showError(t("actor.load_error_title"), t("actor.load_error_desc"));
    } finally {
      setActorsLoading(false);
    }
  };

  // 유즈케이스 로드 함수
  const loadUsecasesForActor = async (actorId: string) => {
    try {
      const { data, error } = await supabase
        .from("usecases")
        .select("*")
        .eq("actor_id", actorId)
        .order("sequence", { ascending: true });

      if (error) throw error;

      setUsecases(data || []);

      // URL parameter에서 선택할 유즈케이스 확인
      const urlUsecaseId = searchParams.get("usecaseId");
      let usecaseToSelect = null;

      if (data && data.length > 0) {
        if (urlUsecaseId) {
          // URL에 usecaseId가 있으면 해당 유즈케이스 찾기
          usecaseToSelect =
            data.find((usecase) => usecase.id === urlUsecaseId) || data[0];
        } else {
          // URL에 usecaseId가 없으면 첫 번째 유즈케이스 선택
          usecaseToSelect = data[0];
        }
        setSelectedUsecase(usecaseToSelect);
        updateURL(actorId, usecaseToSelect.id);
        // 선택된 유즈케이스의 기능들 로드
        await loadFeaturesForUsecase(usecaseToSelect.id, actorId);
      } else {
        setSelectedUsecase(null);
        updateURL(actorId); // usecaseId 제거
        // 유즈케이스가 없으면 기능과 정책도 초기화
        setFeatures([]);
        setSelectedFeature(null);
        setFeaturePolicies([]);
      }
    } catch (error) {
      console.error("Error loading usecases:", error);
      showError(t("usecase.load_error_title"), t("usecase.load_error_desc"));
    }
  };

  // 기능 로드 함수
  const loadFeaturesForUsecase = async (
    usecaseId: string,
    actorId: string | undefined
  ) => {
    setFeaturesLoading(true);
    try {
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .eq("usecase_id", usecaseId)
        .order("sequence", { ascending: true });

      if (error) throw error;

      setFeatures(data || []);

      // featureId URL 파라미터 확인 → 우선 선택, 없으면 sequence 가장 작은 것
      if (data && data.length > 0) {
        const urlFeatureId = searchParams.get("featureId");
        let featureToSelect: Feature | null = null;
        if (urlFeatureId) {
          featureToSelect = data.find((f) => f.id === urlFeatureId) || null;
        }
        if (!featureToSelect) featureToSelect = data[0];

        setSelectedFeature(featureToSelect);
        updateURL(actorId, usecaseId, featureToSelect.id);
        await loadPoliciesForTheFeature(featureToSelect.id);
      } else {
        setSelectedFeature(null);
        setFeaturePolicies([]);
        updateURL(actorId, usecaseId); // featureId 제거
      }
    } catch (error) {
      console.error("Error loading features:", error);
      // 임시로 showError 대신 console.error만 사용 (나중에 다국어 추가)
      // showError('기능 로드 실패', '기능을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setFeaturesLoading(false);
    }
  };

  // 정책 로드 함수
  const loadPoliciesForTheFeature = async (featureId: string) => {
    setPoliciesLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_policies")
        .select(
          `
          sequence,
          policies (
            id,
            contents,
            author_id,
            created_at,
            updated_at,
            project_id,
            policy_links (
              id,
              url,
              type
            ),
            policy_terms (
              glossary_id,
              glossaries (
                name
              )
            )
          )
        `
        )
        .eq("feature_id", featureId)
        .order("sequence", { ascending: true });

      if (error) throw error;

      // 조인된 정책 데이터 추출 (sequence 포함)
      const policies =
        data
          ?.map((item) => ({
            ...item.policies,
            sequence: item.sequence,
          }))
          .filter(Boolean) || [];

      // 각 정책에 연결된 기능들 정보 가져오기
      const policiesWithFeatures = await Promise.all(
        policies.map(async (policy) => {
          if (!policy) return policy;

          const { data: featureData, error: featureError } = await supabase
            .from("feature_policies")
            .select(
              `
              features (
                id,
                name,
                usecase_id,
                usecase:usecases (
                  id,
                  name,
                  actor_id,
                  actor:actors (
                    id,
                    name
                  )
                )
              )
            `
            )
            .eq("policy_id", policy.id!);

          if (featureError) {
            console.error("Error loading connected features:", featureError);
            return policy;
          }

          const connectedFeatures =
            featureData
              ?.map((item) => ({
                id: item.features?.id || "",
                name: item.features?.name || "",
                usecase: {
                  id: item.features?.usecase?.id || "",
                  name: item.features?.usecase?.name || "",
                  actor_id:
                    item.features?.usecase?.actor_id ||
                    item.features?.usecase?.actor?.id ||
                    "",
                  actor: {
                    id:
                      item.features?.usecase?.actor?.id ||
                      item.features?.usecase?.actor_id ||
                      "",
                    name: item.features?.usecase?.actor?.name || "",
                  },
                },
              }))
              .filter((feature) => feature.name) || [];

          return {
            ...policy,
            connected_features: connectedFeatures,
          };
        })
      );

      setFeaturePolicies(policiesWithFeatures as FeaturePolicy[]);
    } catch (error) {
      console.error("Error loading feature policies:", error);
      // 임시로 showError 대신 console.error만 사용 (나중에 다국어 추가)
      // showError('정책 로드 실패', '정책을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setPoliciesLoading(false);
    }
  };

  // 액터 선택 핸들러
  const handleActorSelect = async (actor: Actor) => {
    setSelectedActor(actor);
    setSelectedUsecase(null);
    // 액터 변경 시 기능과 정책도 초기화
    setFeatures([]);
    setSelectedFeature(null);
    setFeaturePolicies([]);
    // 액터 변경 시 URL 업데이트 (usecaseId는 제거)
    updateURL(actor.id);
    await loadUsecasesForActor(actor.id);
  };

  // 유즈케이스 선택 핸들러
  const handleUsecaseSelect = async (usecase: Usecase) => {
    setSelectedUsecase(usecase);
    // 유즈케이스 선택 시 URL 업데이트
    updateURL(selectedActor?.id, usecase.id);
    // 선택된 유즈케이스의 기능들 로드
    await loadFeaturesForUsecase(usecase.id, selectedActor?.id);
  };

  // 기능 선택 핸들러
  const handleFeatureSelect = async (feature: Feature) => {
    setSelectedFeature(feature);
    updateURL(selectedActor?.id, selectedUsecase?.id, feature.id);
    await loadPoliciesForTheFeature(feature.id);
  };

  // 용어 로드 함수
  const loadGlossariesForProject = async (projectId: string) => {
    setGlossariesLoading(true);
    try {
      const { data, error } = await supabase
        .from("glossaries")
        .select("*")
        .eq("project_id", projectId)
        .order("name", { ascending: true });

      if (error) throw error;

      setGlossaries(data || []);
    } catch (error) {
      console.error("Error loading glossaries:", error);
      showError("용어 로드 실패", "용어를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setGlossariesLoading(false);
    }
  };

  // 모든 기능 로드 함수 (정책 모달용)
  const loadAllFeaturesForProject = async (projectId: string) => {
    setAllFeaturesLoading(true);
    try {
      const { data, error } = await supabase
        .from("features")
        .select(
          `
          *,
          usecase:usecases (
            name,
            actor:actors (
              name
            )
          )
        `
        )
        .eq("usecase.actor.project_id", projectId)
        .order("sequence", { ascending: true });

      if (error) throw error;

      // 타입 변환 및 필터링
      const featuresWithHierarchy =
        data
          ?.map((feature) => ({
            ...feature,
            usecase: {
              name: feature.usecase?.name || "",
              actor: {
                name: feature.usecase?.actor?.name || "",
              },
            },
          }))
          .filter(
            (feature) => feature.usecase.name && feature.usecase.actor.name
          ) || [];

      setAllFeatures(featuresWithHierarchy);
    } catch (error) {
      console.error("Error loading all features:", error);
      showError("기능 로드 실패", "기능을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setAllFeaturesLoading(false);
    }
  };

  // 액터 추가 함수
  const addActor = async () => {
    if (!project || !user) return;
    if (!actorName.trim()) {
      showSimpleError(t("actor.name_required"));
      return;
    }

    setActorSaving(true);
    try {
      // Determine next sequence value
      const { data: maxSequenceData, error: maxSequenceError } = await supabase
        .from("actors")
        .select("sequence")
        .eq("project_id", project.id)
        .order("sequence", { ascending: false })
        .limit(1);
      if (maxSequenceError) throw maxSequenceError;
      const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1;
      const { data: actor, error } = await supabase
        .from("actors")
        .insert({
          project_id: project.id,
          name: actorName.trim(),
          author_id: user.id,
          sequence: nextSequence,
        })
        .select()
        .single();

      if (error) throw error;

      setActors((prev) => [...prev, actor]);
      setActorName("");
      setShowActorModal(false);

      // 첫 번째 액터라면 자동 선택
      if (actors.length === 0) {
        setSelectedActor(actor);
        setUsecases([]);
        setSelectedUsecase(null);
        updateURL(actor.id);
      }

      showSimpleSuccess(t("actor.add_success"));
    } catch (error) {
      console.error("Error adding actor:", error);
      showError(t("actor.add_error_title"), t("actor.add_error_desc"));
    } finally {
      setActorSaving(false);
    }
  };

  // 액터 편집 함수
  const handleEditActor = (actor: Actor) => {
    setActorDropdownOpen(false); // 드롭다운 닫기
    setEditingActor(actor);
    setEditActorName(actor.name);
    setShowEditActorModal(true);
  };

  const updateActor = async () => {
    if (!editingActor || !user) return;
    if (!editActorName.trim()) {
      showSimpleError("액터 이름을 입력해주세요.");
      return;
    }

    setEditActorSaving(true);
    try {
      const { data: updatedActor, error } = await supabase
        .from("actors")
        .update({
          name: editActorName.trim(),
        })
        .eq("id", editingActor.id)
        .select()
        .single();

      if (error) throw error;

      // 액터 목록 업데이트
      setActors((prev) =>
        prev.map((actor) =>
          actor.id === editingActor.id ? updatedActor : actor
        )
      );

      // 선택된 액터가 편집된 액터라면 업데이트
      if (selectedActor?.id === editingActor.id) {
        setSelectedActor(updatedActor);
      }

      setShowEditActorModal(false);
      setEditingActor(null);
      setEditActorName("");

      showSimpleSuccess("액터가 성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("Error updating actor:", error);
      showError("액터 수정 실패", "액터를 수정하는 중 오류가 발생했습니다.");
    } finally {
      setEditActorSaving(false);
    }
  };

  // 액터 삭제 함수
  const handleDeleteActor = (actor: Actor) => {
    setActorDropdownOpen(false); // 드롭다운 닫기
    setDeletingActor(actor);
    setShowDeleteActorModal(true);
  };

  const deleteActor = async () => {
    if (!deletingActor || !user) return;

    setActorDeleting(true);
    try {
      // 1. 액터에 속한 모든 유즈케이스의 기능들의 정책들을 먼저 삭제
      const { data: usecasesData, error: usecasesError } = await supabase
        .from("usecases")
        .select("id")
        .eq("actor_id", deletingActor.id);

      if (usecasesError) throw usecasesError;

      if (usecasesData && usecasesData.length > 0) {
        const usecaseIds = usecasesData.map((uc) => uc.id);

        // 기능들 조회
        const { data: featuresData, error: featuresError } = await supabase
          .from("features")
          .select("id")
          .in("usecase_id", usecaseIds);

        if (featuresError) throw featuresError;

        if (featuresData && featuresData.length > 0) {
          const featureIds = featuresData.map((f) => f.id);

          // 정책-용어 관계 삭제
          const { error: policyTermsError } = await supabase
            .from("policy_terms")
            .delete()
            .in("policy_id", featureIds);

          if (policyTermsError) throw policyTermsError;

          // 정책 링크 삭제
          const { error: policyLinksError } = await supabase
            .from("policy_links")
            .delete()
            .in("policy_id", featureIds);

          if (policyLinksError) throw policyLinksError;

          // 정책들 삭제
          const { error: policiesError } = await supabase
            .from("policies")
            .delete()
            .in("feature_id", featureIds);

          if (policiesError) throw policiesError;

          // 기능들 삭제
          const { error: featuresDeleteError } = await supabase
            .from("features")
            .delete()
            .in("id", featureIds);

          if (featuresDeleteError) throw featuresDeleteError;
        }

        // 유즈케이스들 삭제
        const { error: usecasesDeleteError } = await supabase
          .from("usecases")
          .delete()
          .in("id", usecaseIds);

        if (usecasesDeleteError) throw usecasesDeleteError;
      }

      // 2. 액터 삭제
      const { error: actorDeleteError } = await supabase
        .from("actors")
        .delete()
        .eq("id", deletingActor.id);

      if (actorDeleteError) throw actorDeleteError;

      // 3. 상태 업데이트
      setActors((prev) =>
        prev.filter((actor) => actor.id !== deletingActor.id)
      );

      // 삭제된 액터가 선택된 액터라면 선택 해제
      if (selectedActor?.id === deletingActor.id) {
        setSelectedActor(null);
        setSelectedUsecase(null);
        setUsecases([]);
        setFeatures([]);
        setSelectedFeature(null);
        setFeaturePolicies([]);
        updateURL();
      }

      setShowDeleteActorModal(false);
      setDeletingActor(null);

      showSimpleSuccess("액터가 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting actor:", error);
      showError("액터 삭제 실패", "액터를 삭제하는 중 오류가 발생했습니다.");
    } finally {
      setActorDeleting(false);
    }
  };

  // 유즈케이스 편집 함수
  const handleEditUsecase = (usecase: Usecase) => {
    setEditingUsecase(usecase);
    setEditUsecaseName(usecase.name);
    setShowEditUsecaseModal(true);
  };

  const updateUsecase = async () => {
    if (!editingUsecase || !user) return;
    if (!editUsecaseName.trim()) {
      showSimpleError("유즈케이스 이름을 입력해주세요.");
      return;
    }

    setEditUsecaseSaving(true);
    try {
      const { data: updatedUsecase, error } = await supabase
        .from("usecases")
        .update({ name: editUsecaseName.trim() })
        .eq("id", editingUsecase.id)
        .select()
        .single();

      if (error) throw error;

      setUsecases((prev) =>
        prev.map((uc) => (uc.id === editingUsecase.id ? updatedUsecase : uc))
      );
      if (selectedUsecase?.id === editingUsecase.id) {
        setSelectedUsecase(updatedUsecase);
      }

      setShowEditUsecaseModal(false);
      setEditingUsecase(null);
      setEditUsecaseName("");
      showSimpleSuccess("유즈케이스가 성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("Error updating usecase:", error);
      showError(
        "유즈케이스 수정 실패",
        "유즈케이스를 수정하는 중 오류가 발생했습니다."
      );
    } finally {
      setEditUsecaseSaving(false);
    }
  };

  // 유즈케이스 삭제 함수
  const handleDeleteUsecase = (usecase: Usecase) => {
    setDeletingUsecase(usecase);
    setShowDeleteUsecaseModal(true);
  };

  const deleteUsecase = async () => {
    if (!deletingUsecase || !user) return;
    setUsecaseDeleting(true);
    try {
      // 1. 삭제할 유즈케이스의 sequence 값 저장
      const deletedSequence = deletingUsecase.sequence || 0;

      // 2. 기능들 조회
      const { data: featuresData, error: featuresError } = await supabase
        .from("features")
        .select("id")
        .eq("usecase_id", deletingUsecase.id);

      if (featuresError) throw featuresError;

      if (featuresData && featuresData.length > 0) {
        const featureIds = featuresData.map((f) => f.id);

        // 정책-용어 관계 삭제
        await supabase
          .from("policy_terms")
          .delete()
          .in("policy_id", featureIds);
        await supabase
          .from("policy_links")
          .delete()
          .in("policy_id", featureIds);
        await supabase.from("policies").delete().in("feature_id", featureIds);
        await supabase
          .from("feature_policies")
          .delete()
          .in("feature_id", featureIds);
        // 기능 삭제
        await supabase.from("features").delete().in("id", featureIds);
      }

      // 3. 유즈케이스 삭제
      await supabase.from("usecases").delete().eq("id", deletingUsecase.id);

      // 4. 삭제된 유즈케이스보다 큰 sequence를 가진 유즈케이스들의 sequence를 -1씩 조정
      const { data: higherSequenceUsecases, error: updateError } =
        await supabase
          .from("usecases")
          .select("id, sequence")
          .eq("actor_id", selectedActor!.id)
          .gt("sequence", deletedSequence)
          .order("sequence", { ascending: true });

      if (updateError) throw updateError;

      // 5. sequence 업데이트 (배치 처리)
      if (higherSequenceUsecases && higherSequenceUsecases.length > 0) {
        const updatePromises = higherSequenceUsecases.map((usecase) =>
          supabase
            .from("usecases")
            .update({ sequence: (usecase.sequence || 0) - 1 })
            .eq("id", usecase.id)
        );

        await Promise.all(updatePromises);
      }

      // 6. 목록에서 제거하고 sequence 재정렬
      const updatedUsecases = usecases
        .filter((uc) => uc.id !== deletingUsecase.id)
        .map((uc) => ({
          ...uc,
          sequence:
            (uc.sequence || 0) > deletedSequence
              ? (uc.sequence || 0) - 1
              : uc.sequence || 0,
        }));

      setUsecases(updatedUsecases);

      // 7. 현재 선택된 유즈케이스가 삭제되었다면 다른 유즈케이스 선택
      if (selectedUsecase?.id === deletingUsecase.id) {
        if (updatedUsecases.length > 0) {
          // 첫 번째 유즈케이스 선택
          setSelectedUsecase(updatedUsecases[0]);
          updateURL(selectedActor?.id, updatedUsecases[0].id);
          await loadFeaturesForUsecase(
            updatedUsecases[0].id,
            selectedActor?.id
          );
        } else {
          // 유즈케이스가 없으면 선택 해제
          setSelectedUsecase(null);
          setFeatures([]);
          setSelectedFeature(null);
          setFeaturePolicies([]);
          updateURL(selectedActor?.id);
        }
      }

      setShowDeleteUsecaseModal(false);
      setDeletingUsecase(null);
      showSimpleSuccess("유즈케이스가 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting usecase:", error);
      showError(
        "유즈케이스 삭제 실패",
        "유즈케이스를 삭제하는 중 오류가 발생했습니다."
      );
    } finally {
      setUsecaseDeleting(false);
    }
  };

  // 유즈케이스 추가 함수
  const addUsecase = async () => {
    if (!selectedActor || !user) return;
    if (!usecaseName.trim()) {
      showSimpleError(t("usecase.name_required"));
      return;
    }

    setUsecaseSaving(true);
    try {
      // 현재 액터에서 가장 높은 sequence 값 가져오기
      const { data: maxSequenceData, error: maxSequenceError } = await supabase
        .from("usecases")
        .select("sequence")
        .eq("actor_id", selectedActor.id)
        .order("sequence", { ascending: false })
        .limit(1);

      if (maxSequenceError) throw maxSequenceError;

      const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1;

      const { data: usecase, error } = await supabase
        .from("usecases")
        .insert({
          actor_id: selectedActor.id,
          name: usecaseName.trim(),
          author_id: user.id,
          sequence: nextSequence,
        })
        .select()
        .single();

      if (error) throw error;

      setUsecases((prev) => [...prev, usecase]);
      setUsecaseName("");
      setShowUsecaseModal(false);

      // 첫 번째 유즈케이스라면 자동 선택
      if (usecases.length === 0) {
        setSelectedUsecase(usecase);
        updateURL(selectedActor?.id, usecase.id);
      }

      showSimpleSuccess(t("usecase.add_success"));
    } catch (error) {
      console.error("Error adding usecase:", error);
      showError(t("usecase.add_error_title"), t("usecase.add_error_desc"));
    } finally {
      setUsecaseSaving(false);
    }
  };

  // 기능 추가 함수
  const addFeature = async () => {
    if (!selectedUsecase || !user) return;
    if (!featureName.trim()) {
      showSimpleError("기능 이름을 입력해주세요.");
      return;
    }

    setFeatureSaving(true);
    try {
      // 1. 현재 유즈케이스의 최대 sequence 값 조회
      const { data: maxSequenceData, error: maxSequenceError } = await supabase
        .from("features")
        .select("sequence")
        .eq("usecase_id", selectedUsecase.id)
        .order("sequence", { ascending: false })
        .limit(1);

      if (maxSequenceError) throw maxSequenceError;

      // 다음 sequence 값 계산 (최대값 + 1부터 시작)
      const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1;

      // 2. 기능 추가 (sequence 값 포함)
      const { data: feature, error } = await supabase
        .from("features")
        .insert({
          usecase_id: selectedUsecase.id,
          name: featureName.trim(),
          author_id: user.id,
          sequence: nextSequence,
        })
        .select()
        .single();

      if (error) throw error;

      setFeatures((prev) =>
        [...prev, feature].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      );
      setFeatureName("");
      setShowFeatureModal(false);

      // 첫 번째 기능이라면 자동 선택
      if (features.length === 0) {
        setSelectedFeature(feature);
        await loadPoliciesForTheFeature(feature.id);
      }

      showSimpleSuccess("기능이 성공적으로 추가되었습니다.");
    } catch (error) {
      console.error("Error adding feature:", error);
      showError("기능 추가 실패", "기능을 추가하는 중 오류가 발생했습니다.");
    } finally {
      setFeatureSaving(false);
    }
  };

  // 기능 편집 모달 열기
  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
    setEditFeatureName(feature.name);
    setShowEditFeatureModal(true);
  };

  // 기능 편집 함수
  const updateFeature = async () => {
    if (!editingFeature || !user) return;
    if (!editFeatureName.trim()) {
      showSimpleError("기능 이름을 입력해주세요.");
      return;
    }

    setEditFeatureSaving(true);
    try {
      const { data: updatedFeature, error } = await supabase
        .from("features")
        .update({
          name: editFeatureName.trim(),
        })
        .eq("id", editingFeature.id)
        .select()
        .single();

      if (error) throw error;

      // 목록에서 업데이트
      setFeatures((prev) =>
        prev.map((f) => (f.id === editingFeature.id ? updatedFeature : f))
      );

      // 현재 선택된 기능이라면 업데이트
      if (selectedFeature?.id === editingFeature.id) {
        setSelectedFeature(updatedFeature);
      }

      setShowEditFeatureModal(false);
      setEditingFeature(null);
      setEditFeatureName("");

      showSimpleSuccess("기능이 성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("Error updating feature:", error);
      showError("기능 수정 실패", "기능을 수정하는 중 오류가 발생했습니다.");
    } finally {
      setEditFeatureSaving(false);
    }
  };

  // 기능 삭제 확인 모달 열기
  const handleDeleteFeature = (feature: Feature) => {
    setDeletingFeature(feature);
    setShowDeleteFeatureModal(true);
  };

  // 링크 관리 함수들
  const addLinkField = (type: "context" | "general") => {
    if (type === "context") {
      setContextLinks((prev) => [...prev, ""]);
    } else {
      setGeneralLinks((prev) => [...prev, ""]);
    }
  };

  const removeLinkField = (type: "context" | "general", index: number) => {
    if (type === "context") {
      setContextLinks((prev) => prev.filter((_, i) => i !== index));
    } else {
      setGeneralLinks((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateLinkField = (
    type: "context" | "general",
    index: number,
    value: string
  ) => {
    if (type === "context") {
      setContextLinks((prev) =>
        prev.map((link, i) => (i === index ? value : link))
      );
    } else {
      setGeneralLinks((prev) =>
        prev.map((link, i) => (i === index ? value : link))
      );
    }
  };

  // 용어 선택 관리 함수들
  const handleGlossaryToggle = (glossaryId: string) => {
    setSelectedGlossaryIds((prev) =>
      prev.includes(glossaryId)
        ? prev.filter((id) => id !== glossaryId)
        : [...prev, glossaryId]
    );
  };

  // 기능 선택 관리 함수들
  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  // 정책 추가 함수
  const addPolicy = async () => {
    if (!user) return;
    if (!policyContents.trim()) {
      showSimpleError("정책 내용을 입력해주세요.");
      return;
    }

    // 모달에서 체크박스로 선택된 기능들만 기준으로 체크
    if (selectedFeatureIds.length === 0) {
      showSimpleError("정책은 최소 1개의 기능과 연결되어야 합니다.");
      return;
    }

    setPolicySaving(true);
    try {
      // 1. 정책 추가
      const { data: policy, error: policyError } = await supabase
        .from("policies")
        .insert({
          project_id: project!.id,
          contents: policyContents.trim(),
          author_id: user.id,
        })
        .select()
        .single();

      if (policyError) throw policyError;

      // 2. 기능-정책 관계 추가 (모달에서 선택된 기능들만)
      if (selectedFeatureIds.length > 0) {
        // 각 기능별로 현재 최대 sequence 값을 조회하고 새로운 sequence 할당
        for (const featureId of selectedFeatureIds) {
          const { data: maxSequenceData, error: maxSequenceError } =
            await supabase
              .from("feature_policies")
              .select("sequence")
              .eq("feature_id", featureId)
              .order("sequence", { ascending: false })
              .limit(1);

          if (maxSequenceError) throw maxSequenceError;

          const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1;

          const { error: featurePolicyError } = await supabase
            .from("feature_policies")
            .insert({
              feature_id: featureId,
              policy_id: policy.id,
              sequence: nextSequence,
            });

          if (featurePolicyError) throw featurePolicyError;
        }
      }

      // 3. 컨텍스트 링크 추가
      const validContextLinks = contextLinks.filter((link) => link.trim());
      if (validContextLinks.length > 0) {
        const { error: contextLinksError } = await supabase
          .from("policy_links")
          .insert(
            validContextLinks.map((url) => ({
              policy_id: policy.id,
              url: url.trim(),
              type: "context" as const,
            }))
          );

        if (contextLinksError) throw contextLinksError;
      }

      // 4. 일반 링크 추가
      const validGeneralLinks = generalLinks.filter((link) => link.trim());
      if (validGeneralLinks.length > 0) {
        const { error: generalLinksError } = await supabase
          .from("policy_links")
          .insert(
            validGeneralLinks.map((url) => ({
              policy_id: policy.id,
              url: url.trim(),
              type: "general" as const,
            }))
          );

        if (generalLinksError) throw generalLinksError;
      }

      // 5. 용어 연결 추가
      if (selectedGlossaryIds.length > 0) {
        const { error: policyTermsError } = await supabase
          .from("policy_terms")
          .insert(
            selectedGlossaryIds.map((glossaryId) => ({
              policy_id: policy.id,
              glossary_id: glossaryId,
            }))
          );

        if (policyTermsError) throw policyTermsError;
      }

      // 6. 정책 목록 새로고침 (현재 선택된 기능이 있는 경우에만)
      if (selectedFeature && selectedFeature.id) {
        await loadPoliciesForTheFeature(selectedFeature.id);
      }

      // 7. 모달 초기화 및 닫기
      setPolicyContents("");
      setContextLinks([""]);
      setGeneralLinks([""]);
      setSelectedGlossaryIds([]);
      setGlossarySearchTerm("");
      setSelectedFeatureIds([]);
      setFeatureSearchTerm("");
      setShowPolicyModal(false);

      showSimpleSuccess("정책이 성공적으로 추가되었습니다.");
    } catch (error) {
      console.error("Error adding policy:", error);
      showError("정책 추가 실패", "정책을 추가하는 중 오류가 발생했습니다.");
    } finally {
      setPolicySaving(false);
    }
  };

  // 기능 삭제 함수
  const deleteFeature = async () => {
    if (!deletingFeature || !user) return;

    setFeatureDeleting(true);
    try {
      // 1. 삭제할 기능의 sequence 값 저장
      const deletedSequence = deletingFeature.sequence || 0;

      // 2. 기능에 연결된 정책 관계 삭제 (feature_policies 테이블)
      const { error: deletePoliciesError } = await supabase
        .from("feature_policies")
        .delete()
        .eq("feature_id", deletingFeature.id);

      if (deletePoliciesError) throw deletePoliciesError;

      // 3. 기능 자체 삭제
      const { error: deleteFeatureError } = await supabase
        .from("features")
        .delete()
        .eq("id", deletingFeature.id);

      if (deleteFeatureError) throw deleteFeatureError;

      // 4. 삭제된 기능보다 큰 sequence를 가진 기능들의 sequence를 -1씩 조정
      const { data: higherSequenceFeatures, error: updateError } =
        await supabase
          .from("features")
          .select("id, sequence")
          .eq("usecase_id", selectedUsecase!.id)
          .gt("sequence", deletedSequence)
          .order("sequence", { ascending: true });

      if (updateError) throw updateError;

      // 5. sequence 업데이트 (배치 처리)
      if (higherSequenceFeatures && higherSequenceFeatures.length > 0) {
        const updatePromises = higherSequenceFeatures.map((feature) =>
          supabase
            .from("features")
            .update({ sequence: (feature.sequence || 0) - 1 })
            .eq("id", feature.id)
        );

        await Promise.all(updatePromises);
      }

      // 6. 목록에서 제거하고 sequence 재정렬
      const updatedFeatures = features
        .filter((f) => f.id !== deletingFeature.id)
        .map((f) => ({
          ...f,
          sequence:
            (f.sequence || 0) > deletedSequence
              ? (f.sequence || 0) - 1
              : f.sequence || 0,
        }));

      setFeatures(updatedFeatures);

      // 7. 현재 선택된 기능이 삭제되었다면 다른 기능 선택
      if (selectedFeature?.id === deletingFeature.id) {
        if (updatedFeatures.length > 0) {
          // 첫 번째 기능 선택
          setSelectedFeature(updatedFeatures[0]);
          await loadPoliciesForTheFeature(updatedFeatures[0].id);
        } else {
          // 기능이 없으면 선택 해제
          setSelectedFeature(null);
          setFeaturePolicies([]);
        }
      }

      setShowDeleteFeatureModal(false);
      setDeletingFeature(null);

      showSimpleSuccess("기능이 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting feature:", error);
      showError("기능 삭제 실패", "기능을 삭제하는 중 오류가 발생했습니다.");
    } finally {
      setFeatureDeleting(false);
    }
  };

  // 정책 편집 모달 열기
  const handleEditPolicy = async (policy: FeaturePolicy) => {
    setEditingPolicy(policy);
    setEditPolicyContents(policy.contents);

    // 기존 링크들 불러오기
    if (policy.policy_links) {
      const contextLinks = policy.policy_links
        .filter((link) => link.type === "context")
        .map((link) => link.url);
      const generalLinks = policy.policy_links
        .filter((link) => link.type === "general")
        .map((link) => link.url);

      setEditContextLinks(contextLinks.length > 0 ? contextLinks : [""]);
      setEditGeneralLinks(generalLinks.length > 0 ? generalLinks : [""]);
    } else {
      setEditContextLinks([""]);
      setEditGeneralLinks([""]);
    }

    // 기존 연결된 용어들 불러오기
    if (policy.policy_terms) {
      setEditSelectedGlossaryIds(
        policy.policy_terms.map((term) => term.glossary_id)
      );
    } else {
      setEditSelectedGlossaryIds([]);
    }

    // 기존 연결된 기능들 불러오기
    if (policy.connected_features) {
      setEditSelectedFeatureIds(
        policy.connected_features.map((feature) => feature.id)
      );
    } else {
      setEditSelectedFeatureIds([]);
    }

    setEditGlossarySearchTerm("");
    setEditFeatureSearchTerm("");
    setShowEditPolicyModal(true);
  };

  // 정책 수정 함수
  const updatePolicy = async () => {
    if (!editingPolicy || !user) return;
    if (!editPolicyContents.trim()) {
      showSimpleError("정책 내용을 입력해주세요.");
      return;
    }
    if (editSelectedFeatureIds.length === 0) {
      showSimpleError("정책은 최소 1개의 기능과 연결되어야 합니다.");
      return;
    }

    setEditPolicySaving(true);
    try {
      // 1. 정책 내용 업데이트
      const { error: policyError } = await supabase
        .from("policies")
        .update({
          contents: editPolicyContents.trim(),
        })
        .eq("id", editingPolicy.id);

      if (policyError) throw policyError;

      // 2. 기존 링크들 삭제 후 새로 추가
      const { error: deleteLinkError } = await supabase
        .from("policy_links")
        .delete()
        .eq("policy_id", editingPolicy.id);

      if (deleteLinkError) throw deleteLinkError;

      // 3. 컨텍스트 링크 추가
      const validContextLinks = editContextLinks.filter((link) => link.trim());
      if (validContextLinks.length > 0) {
        const { error: contextLinksError } = await supabase
          .from("policy_links")
          .insert(
            validContextLinks.map((url) => ({
              policy_id: editingPolicy.id,
              url: url.trim(),
              type: "context" as const,
            }))
          );

        if (contextLinksError) throw contextLinksError;
      }

      // 4. 일반 링크 추가
      const validGeneralLinks = editGeneralLinks.filter((link) => link.trim());
      if (validGeneralLinks.length > 0) {
        const { error: generalLinksError } = await supabase
          .from("policy_links")
          .insert(
            validGeneralLinks.map((url) => ({
              policy_id: editingPolicy.id,
              url: url.trim(),
              type: "general" as const,
            }))
          );

        if (generalLinksError) throw generalLinksError;
      }

      // 5. 기존 용어 연결 삭제 후 새로 추가
      const { error: deleteTermsError } = await supabase
        .from("policy_terms")
        .delete()
        .eq("policy_id", editingPolicy.id);

      if (deleteTermsError) throw deleteTermsError;

      if (editSelectedGlossaryIds.length > 0) {
        const { error: policyTermsError } = await supabase
          .from("policy_terms")
          .insert(
            editSelectedGlossaryIds.map((glossaryId) => ({
              policy_id: editingPolicy.id,
              glossary_id: glossaryId,
            }))
          );

        if (policyTermsError) throw policyTermsError;
      }

      // 6. 기존 기능 연결 삭제 후 새로 추가
      const { error: deleteFeaturePoliciesError } = await supabase
        .from("feature_policies")
        .delete()
        .eq("policy_id", editingPolicy.id);

      if (deleteFeaturePoliciesError) throw deleteFeaturePoliciesError;

      // 각 기능별로 현재 최대 sequence 값을 조회하고 새로운 sequence 할당
      for (const featureId of editSelectedFeatureIds) {
        const { data: maxSequenceData, error: maxSequenceError } =
          await supabase
            .from("feature_policies")
            .select("sequence")
            .eq("feature_id", featureId)
            .order("sequence", { ascending: false })
            .limit(1);

        if (maxSequenceError) throw maxSequenceError;

        const nextSequence = (maxSequenceData?.[0]?.sequence || 0) + 1;

        const { error: featurePolicyError } = await supabase
          .from("feature_policies")
          .insert({
            feature_id: featureId,
            policy_id: editingPolicy.id,
            sequence: nextSequence,
          });

        if (featurePolicyError) throw featurePolicyError;
      }

      // 7. 정책 목록 새로고침
      if (selectedFeature && selectedFeature.id) {
        await loadPoliciesForTheFeature(selectedFeature.id);
      }

      // 8. 모달 초기화 및 닫기
      setShowEditPolicyModal(false);
      setEditingPolicy(null);
      setEditPolicyContents("");
      setEditContextLinks([""]);
      setEditGeneralLinks([""]);
      setEditSelectedGlossaryIds([]);
      setEditGlossarySearchTerm("");
      setEditSelectedFeatureIds([]);
      setEditFeatureSearchTerm("");

      showSimpleSuccess("정책이 성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("Error updating policy:", error);
      showError("정책 수정 실패", "정책을 수정하는 중 오류가 발생했습니다.");
    } finally {
      setEditPolicySaving(false);
    }
  };

  // 정책 삭제 함수
  const deletePolicy = async (policyParam?: FeaturePolicy) => {
    const targetPolicy = policyParam ?? deletingPolicy;
    if (!targetPolicy || !user) return;

    try {
      // 1. 정책에 연결된 링크들 삭제
      const { error: deleteLinksError } = await supabase
        .from("policy_links")
        .delete()
        .eq("policy_id", targetPolicy.id);

      if (deleteLinksError) throw deleteLinksError;

      // 2. 정책에 연결된 용어 관계 삭제
      const { error: deleteTermsError } = await supabase
        .from("policy_terms")
        .delete()
        .eq("policy_id", targetPolicy.id);

      if (deleteTermsError) throw deleteTermsError;

      // 3. 정책에 연결된 기능 관계 삭제
      const { error: deleteFeaturePoliciesError } = await supabase
        .from("feature_policies")
        .delete()
        .eq("policy_id", targetPolicy.id);

      if (deleteFeaturePoliciesError) throw deleteFeaturePoliciesError;

      // 4. 정책 자체 삭제
      const { error: deletePolicyError } = await supabase
        .from("policies")
        .delete()
        .eq("id", targetPolicy.id);

      if (deletePolicyError) throw deletePolicyError;

      // 5. 정책 목록 새로고침
      if (selectedFeature && selectedFeature.id) {
        await loadPoliciesForTheFeature(selectedFeature.id);
      }

      setDeletingPolicy(null);

      showSimpleSuccess("정책이 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting policy:", error);
      showError("정책 삭제 실패", "정책을 삭제하는 중 오류가 발생했습니다.");
    } finally {
    }
  };

  // 편집용 링크 관리 함수들
  const addEditLinkField = (type: "context" | "general") => {
    if (type === "context") {
      setEditContextLinks((prev) => [...prev, ""]);
    } else {
      setEditGeneralLinks((prev) => [...prev, ""]);
    }
  };

  const removeEditLinkField = (type: "context" | "general", index: number) => {
    if (type === "context") {
      setEditContextLinks((prev) => prev.filter((_, i) => i !== index));
    } else {
      setEditGeneralLinks((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateEditLinkField = (
    type: "context" | "general",
    index: number,
    value: string
  ) => {
    if (type === "context") {
      setEditContextLinks((prev) =>
        prev.map((link, i) => (i === index ? value : link))
      );
    } else {
      setEditGeneralLinks((prev) =>
        prev.map((link, i) => (i === index ? value : link))
      );
    }
  };

  // 편집용 용어 선택 관리 함수들
  const handleEditGlossaryToggle = (glossaryId: string) => {
    setEditSelectedGlossaryIds((prev) =>
      prev.includes(glossaryId)
        ? prev.filter((id) => id !== glossaryId)
        : [...prev, glossaryId]
    );
  };

  // 편집용 기능 선택 관리 함수들
  const handleEditFeatureToggle = (featureId: string) => {
    setEditSelectedFeatureIds((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  // 드래그 엔드 핸들러 (유즈케이스 순서 변경)
  const handleUsecaseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!selectedActor || !over || active.id === over.id) return;

    const oldIndex = usecases.findIndex((item) => item.id === active.id);
    const newIndex = usecases.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 로컬 상태를 시퀀스와 함께 한 번에 업데이트
    const newUsecases = arrayMove(usecases, oldIndex, newIndex).map(
      (usecase, index) => ({
        ...usecase,
        sequence: index + 1,
      })
    );

    setUsecases(newUsecases);

    // 백그라운드에서 Supabase 업데이트 (UI 블로킹 없이)
    try {
      // 배치 업데이트를 위한 Promise 배열
      const updatePromises = newUsecases.map((usecase, index) =>
        supabase
          .from("usecases")
          .update({ sequence: index + 1 })
          .eq("id", usecase.id)
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error updating usecase sequence:", error);
      showError(
        "유즈케이스 순서 변경 실패",
        "유즈케이스 순서를 변경하는 중 오류가 발생했습니다."
      );
      // 에러 발생 시 원래 상태로 복원
      if (selectedActor) {
        await loadUsecasesForActor(selectedActor.id);
      }
    }
  };

  // 드래그 엔드 핸들러 (기능 순서 변경)
  const handleFeatureDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!selectedUsecase || !over || active.id === over.id) return;

    const oldIndex = features.findIndex((item) => item.id === active.id);
    const newIndex = features.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 로컬 상태를 시퀀스와 함께 한 번에 업데이트
    const newFeatures = arrayMove(features, oldIndex, newIndex).map(
      (feature, index) => ({
        ...feature,
        sequence: index + 1,
      })
    );

    setFeatures(newFeatures);

    // 백그라운드에서 Supabase 업데이트 (UI 블로킹 없이)
    try {
      // 배치 업데이트를 위한 Promise 배열
      const updatePromises = newFeatures.map((feature, index) =>
        supabase
          .from("features")
          .update({ sequence: index + 1 })
          .eq("id", feature.id)
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error updating feature sequence:", error);
      showError(
        "기능 순서 변경 실패",
        "기능 순서를 변경하는 중 오류가 발생했습니다."
      );
      // 에러 발생 시 원래 상태로 복원
      if (selectedUsecase) {
        await loadFeaturesForUsecase(selectedUsecase.id, selectedActor?.id);
      }
    }
  };

  // 드래그 엔드 핸들러 (정책 순서 변경)
  const handlePolicyDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!selectedFeature || !over || active.id === over.id) return;

    const oldIndex = featurePolicies.findIndex((item) => item.id === active.id);
    const newIndex = featurePolicies.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 로컬 상태를 시퀀스와 함께 한 번에 업데이트
    const newPolicies = arrayMove(featurePolicies, oldIndex, newIndex).map(
      (policy, index) => ({
        ...policy,
        sequence: index + 1,
      })
    );

    setFeaturePolicies(newPolicies);

    // 백그라운드에서 Supabase 업데이트 (UI 블로킹 없이)
    try {
      // 배치 업데이트를 위한 Promise 배열
      const updatePromises = newPolicies.map((policy, index) =>
        supabase
          .from("feature_policies")
          .update({ sequence: index + 1 })
          .eq("feature_id", selectedFeature.id)
          .eq("policy_id", policy.id!)
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error updating policy sequence:", error);
      showError(
        "정책 순서 변경 실패",
        "정책 순서를 변경하는 중 오류가 발생했습니다."
      );
      // 에러 발생 시 원래 상태로 복원
      if (selectedFeature) {
        await loadPoliciesForTheFeature(selectedFeature.id);
      }
    }
  };

  // 기능 목록 필터링
  const filteredFeatureList = features.filter((feature) => {
    if (!featureListSearchTerm.trim()) return true;
    const searchTerm = featureListSearchTerm.toLowerCase().trim();
    return feature.name.toLowerCase().includes(searchTerm);
  });

  // 정책 목록 필터링
  const filteredPolicyList = featurePolicies.filter((policy) => {
    if (!policyListSearchTerm.trim()) return true;
    const searchTerm = policyListSearchTerm.toLowerCase().trim();

    // 정책 내용으로 검색
    const contentMatches = policy.contents.toLowerCase().includes(searchTerm);

    // 연결된 용어 이름으로 검색
    const termMatches =
      policy.policy_terms?.some((term) =>
        term.glossaries?.name.toLowerCase().includes(searchTerm)
      ) || false;

    return contentMatches || termMatches;
  });

  // Add handleActorDragEnd next to other drag handlers
  /**
   * 드래그 엔드 핸들러 (액터 순서 변경)
   */
  const handleActorDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!project || !over || active.id === over.id) return;
    const oldIndex = actors.findIndex((item) => item.id === active.id);
    const newIndex = actors.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // Update local sequence
    const newActors = arrayMove(actors, oldIndex, newIndex).map(
      (actor, idx) => ({
        ...actor,
        sequence: idx + 1,
      })
    );
    setActors(newActors);
    // Persist to Supabase
    try {
      const updatePromises = newActors.map((actor, idx) =>
        supabase
          .from("actors")
          .update({ sequence: idx + 1 })
          .eq("id", actor.id)
      );
      await Promise.all(updatePromises);
    } catch (err) {
      console.error("Error updating actor sequence:", err);
      showError(
        "액터 순서 변경 실패",
        "액터 순서를 변경하는 중 오류가 발생했습니다."
      );
      await loadActorsForProject(params.projectId);
    }
  };

  // Scroll to the selected feature card and highlight it when selection changes (mimicking glossary page)
  useEffect(() => {
    if (!selectedFeature) return;
    // Delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById(`feature-${selectedFeature.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // highlight effect
        element.classList.add("ring-2", "ring-primary", "ring-opacity-50");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "ring-opacity-50");
        }, 3000);
      }
    }, 300);
  }, [selectedFeature]);

  // Scroll to the policy card if policyId exists in URL
  useEffect(() => {
    const policyId = searchParams.get("policyId");
    if (!policyId) return;
    if (featurePolicies.length === 0) return;
    setTimeout(() => {
      const el = document.getElementById(`policy-${policyId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // highlight effect
        el.classList.add("ring-2", "ring-primary", "ring-opacity-50");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-opacity-50");
        }, 3000);
      }
    }, 600);
  }, [featurePolicies, searchParams]);

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

  return (
    <div className="h-full flex flex-col">
      {/* 고정 영역: 헤더와 액터/유즈케이스 선택 */}
      <div className="flex-shrink-0 p-6 pb-0">
        {/* 헤더 영역 */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{t("policy.header")}</h2>
          <p className="text-muted-foreground">{t("policy.sub")}</p>
        </div>

        {/* 액터 및 유즈케이스 선택 영역 */}
        <div className="mb-6 p-6 bg-gray-200 rounded-lg">
          <div className="flex flex-col gap-2">
            {/* 액터 선택 */}
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-800">
                {t("actor.label")}
              </span>
              {membership?.role === "admin" && actors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActorModal(true)}
                  className="text-sm px-3 py-1"
                >
                  {t("actor.add_new_button")}
                </Button>
              )}
            </div>
            {actors.length === 0 ? (
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowActorModal(true)}
                disabled={membership?.role !== "admin"}
                className="text-base px-4 py-2 self-start"
              >
                {t("actor.add_button")}
              </Button>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleActorDragEnd}
              >
                <SortableContext
                  items={actors.map((actor) => actor.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex flex-wrap gap-2">
                    {actors
                      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                      .map((actor) => (
                        <SortableActorCard
                          key={actor.id}
                          actor={actor}
                          onSelect={handleActorSelect}
                          onEdit={handleEditActor}
                          onDelete={handleDeleteActor}
                          isSelected={selectedActor?.id === actor.id}
                          membership={membership}
                        />
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {/* 유즈케이스 선택 */}
            {selectedActor && (
              <div className="flex flex-col gap-2 mt-8">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-800">
                    {t("usecase.label")}
                  </span>
                  {usecases.length > 0 && membership?.role === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUsecaseModal(true)}
                      className="text-sm px-3 py-1"
                    >
                      {t("usecase.add_new_button")}
                    </Button>
                  )}
                </div>
                {usecases.length === 0 ? (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setShowUsecaseModal(true)}
                    disabled={membership?.role !== "admin"}
                    className="text-base px-4 py-2 self-start"
                  >
                    {t("usecase.add_button")}
                  </Button>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleUsecaseDragEnd}
                  >
                    <SortableContext
                      items={usecases.map((uc) => uc.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="flex flex-wrap gap-2">
                        {usecases
                          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                          .map((usecase) => (
                            <SortableUsecaseCard
                              key={usecase.id}
                              actor={selectedActor}
                              usecase={usecase}
                              onSelect={handleUsecaseSelect}
                              onEdit={handleEditUsecase}
                              onDelete={handleDeleteUsecase}
                              isSelected={selectedUsecase?.id === usecase.id}
                              membership={membership}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 스크롤 영역: 기능과 정책 영역 */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto min-h-0">
        {/* 기능과 정책 섹션 */}
        {selectedActor && selectedUsecase && (
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">기능 및 정책</h3>
              <p className="text-muted-foreground text-sm">
                {selectedUsecase.name} 유즈케이스의 기능들과 각 기능의 정책을
                관리합니다.
              </p>
            </div>

            <div className="flex-1 grid grid-cols-4 gap-6 min-h-0">
              {/* 좌측: 기능 목록 (1/3) */}
              <div className="col-span-1 bg-gray-200 rounded-lg p-4 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h4 className="font-medium">기능</h4>
                  {membership?.role === "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowFeatureModal(true)}
                    >
                      + 추가
                    </Button>
                  )}
                </div>

                {/* 기능 검색창 */}
                <div className="mb-3 flex-shrink-0">
                  <input
                    type="text"
                    value={featureListSearchTerm}
                    onChange={(e) => setFeatureListSearchTerm(e.target.value)}
                    placeholder="기능 이름으로 검색..."
                    className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={featuresLoading}
                  />
                  {featureListSearchTerm && (
                    <p className="text-xs text-gray-500 mt-1">
                      {featureListSearchTerm} 검색 결과:{" "}
                      {filteredFeatureList.length}개
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {featuresLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : features.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8">
                      <p>아직 기능이</p>
                      <p>없습니다</p>
                    </div>
                  ) : filteredFeatureList.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-8">
                      <p>검색 결과가</p>
                      <p>없습니다</p>
                      {featureListSearchTerm && (
                        <button
                          onClick={() => setFeatureListSearchTerm("")}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          검색어 초기화
                        </button>
                      )}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleFeatureDragEnd}
                    >
                      <SortableContext
                        items={filteredFeatureList.map((f) => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 pr-2">
                          {filteredFeatureList.map((feature) => (
                            <SortableFeatureCard
                              key={feature.id}
                              actor={selectedActor!}
                              usecase={selectedUsecase!}
                              feature={feature}
                              onSelect={handleFeatureSelect}
                              onEdit={handleEditFeature}
                              onDelete={handleDeleteFeature}
                              isSelected={selectedFeature?.id === feature.id}
                              membership={membership}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>

              {/* 우측: 정책 목록 (2/3) */}
              <div className="col-span-3 bg-gray-200 rounded-lg p-4 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h4 className="font-medium">
                    {selectedFeature ? `${selectedFeature.name} 정책` : "정책"}
                  </h4>
                  {selectedFeature && membership?.role === "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // 현재 선택된 기능을 자동으로 포함
                        if (selectedFeature) {
                          setSelectedFeatureIds([selectedFeature.id]);
                        }
                        setShowPolicyModal(true);
                      }}
                    >
                      + 정책 추가
                    </Button>
                  )}
                </div>

                {/* 정책 검색창 */}
                {selectedActor &&
                  selectedUsecase &&
                  selectedFeature &&
                  featurePolicies.length > 0 && (
                    <div className="mb-3 flex-shrink-0">
                      <input
                        type="text"
                        value={policyListSearchTerm}
                        onChange={(e) =>
                          setPolicyListSearchTerm(e.target.value)
                        }
                        placeholder="정책 내용이나 연결된 용어로 검색..."
                        className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={policiesLoading}
                      />
                      {policyListSearchTerm && (
                        <p className="text-xs text-gray-500 mt-1">
                          {policyListSearchTerm} 검색 결과:{" "}
                          {filteredPolicyList.length}개
                        </p>
                      )}
                    </div>
                  )}

                <div className="flex-1 overflow-y-auto min-h-0">
                  {!selectedFeature ? (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-gray-500">기능을 선택해주세요</p>
                    </div>
                  ) : policiesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : featurePolicies.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p>아직 정책이 없습니다</p>
                      {membership?.role === "admin" && (
                        <p className="text-sm mt-2">
                          첫 번째 정책을 추가해보세요
                        </p>
                      )}
                    </div>
                  ) : filteredPolicyList.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p>검색 결과가 없습니다</p>
                      {policyListSearchTerm && (
                        <button
                          onClick={() => setPolicyListSearchTerm("")}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          검색어 초기화
                        </button>
                      )}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handlePolicyDragEnd}
                    >
                      <SortableContext
                        items={filteredPolicyList.map((p) => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4 pr-2">
                          {filteredPolicyList.map((policy) => (
                            <SortablePolicyCard
                              key={policy.id}
                              actor={selectedActor}
                              usecase={selectedUsecase}
                              feature={selectedFeature}
                              policy={policy}
                              onEdit={handleEditPolicy}
                              membership={membership}
                              onGlossaryClick={async (gid) => {
                                setViewingGlossaryId(gid);
                                setShowGlossaryModal(true);
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 액터 추가 모달 */}
      <ActorAddModal
        isOpen={showActorModal}
        onClose={() => {
          setShowActorModal(false);
          setActorName("");
        }}
        actorName={actorName}
        setActorName={setActorName}
        onAdd={addActor}
        saving={actorSaving}
      />

      {/* 액터 편집 모달 */}
      <ActorEditModal
        isOpen={
          showEditActorModal && !!editingActor && membership?.role === "admin"
        }
        onClose={() => {
          setShowEditActorModal(false);
          setEditingActor(null);
          setEditActorName("");
        }}
        editActorName={editActorName}
        setEditActorName={setEditActorName}
        onUpdate={updateActor}
        saving={editActorSaving}
      />

      {/* 액터 삭제 모달 */}
      <ActorDeleteModal
        isOpen={
          showDeleteActorModal &&
          !!deletingActor &&
          membership?.role === "admin"
        }
        actorName={deletingActor?.name ?? ""}
        onClose={() => {
          setShowDeleteActorModal(false);
          setDeletingActor(null);
        }}
        onDelete={deleteActor}
        deleting={actorDeleting}
      />

      {/* 유즈케이스 추가 모달 */}
      <UsecaseAddModal
        isOpen={showUsecaseModal}
        onClose={() => {
          setShowUsecaseModal(false);
          setUsecaseName("");
        }}
        usecaseName={usecaseName}
        setUsecaseName={setUsecaseName}
        onAdd={addUsecase}
        saving={usecaseSaving}
        selectedActorName={selectedActor?.name}
      />

      {/* 기능 추가 모달 */}
      <FeatureAddModal
        isOpen={showFeatureModal}
        featureName={featureName}
        setFeatureName={setFeatureName}
        onClose={() => {
          setShowFeatureModal(false);
          setFeatureName("");
        }}
        onAdd={addFeature}
        saving={featureSaving}
        selectedUsecaseName={selectedUsecase?.name}
      />

      <FeatureEditModal
        isOpen={showEditFeatureModal && !!editingFeature}
        featureName={editFeatureName}
        setFeatureName={setEditFeatureName}
        onClose={() => {
          setShowEditFeatureModal(false);
          setEditingFeature(null);
          setEditFeatureName("");
        }}
        onUpdate={updateFeature}
        saving={editFeatureSaving}
        selectedUsecaseName={selectedUsecase?.name}
      />

      <FeatureDeleteModal
        isOpen={showDeleteFeatureModal && !!deletingFeature}
        featureName={deletingFeature?.name ?? ""}
        onClose={() => {
          setShowDeleteFeatureModal(false);
          setDeletingFeature(null);
        }}
        onDelete={deleteFeature}
        deleting={featureDeleting}
      />

      <PolicyAddModal
        isOpen={showPolicyModal}
        onClose={() => {
          setShowPolicyModal(false);
          setPolicyContents("");
          setContextLinks([""]);
          setGeneralLinks([""]);
          setSelectedGlossaryIds([]);
          setGlossarySearchTerm("");
          setSelectedFeatureIds([]);
          setFeatureSearchTerm("");
        }}
        policyContents={policyContents}
        setPolicyContents={setPolicyContents}
        policySaving={policySaving}
        onAdd={addPolicy}
        contextLinks={contextLinks}
        generalLinks={generalLinks}
        addLinkField={addLinkField}
        removeLinkField={removeLinkField}
        updateLinkField={updateLinkField}
        glossariesLoading={glossariesLoading}
        glossaries={glossaries}
        glossarySearchTerm={glossarySearchTerm}
        setGlossarySearchTerm={setGlossarySearchTerm}
        selectedGlossaryIds={selectedGlossaryIds}
        handleGlossaryToggle={handleGlossaryToggle}
        allFeaturesLoading={allFeaturesLoading}
        allFeatures={allFeatures}
        featureSearchTerm={featureSearchTerm}
        setFeatureSearchTerm={setFeatureSearchTerm}
        selectedFeatureIds={selectedFeatureIds}
        handleFeatureToggle={handleFeatureToggle}
      />

      <PolicyEditModal
        isOpen={
          showEditPolicyModal && !!editingPolicy && membership?.role === "admin"
        }
        editingPolicy={editingPolicy}
        onClose={() => {
          setShowEditPolicyModal(false);
          setEditingPolicy(null);
          setEditPolicyContents("");
          setEditContextLinks([""]);
          setEditGeneralLinks([""]);
          setEditSelectedGlossaryIds([]);
          setEditGlossarySearchTerm("");
          setEditSelectedFeatureIds([]);
          setEditFeatureSearchTerm("");
        }}
        onUpdate={updatePolicy}
        onDelete={(policy) => {
          setShowEditPolicyModal(false);
          deletePolicy(policy as any);
        }}
        policySaving={editPolicySaving}
        policyContents={editPolicyContents}
        setPolicyContents={setEditPolicyContents}
        allFeaturesLoading={allFeaturesLoading}
        allFeatures={allFeatures}
        featureSearchTerm={editFeatureSearchTerm}
        setFeatureSearchTerm={setEditFeatureSearchTerm}
        selectedFeatureIds={editSelectedFeatureIds}
        handleFeatureToggle={handleEditFeatureToggle}
        editFeatureSearchTerm={editFeatureSearchTerm}
        setEditFeatureSearchTerm={setEditFeatureSearchTerm}
        editSelectedFeatureIds={editSelectedFeatureIds}
        handleEditFeatureToggle={handleEditFeatureToggle}
        addLinkField={addEditLinkField}
        removeLinkField={removeEditLinkField}
        updateLinkField={updateEditLinkField}
        editContextLinks={editContextLinks}
        editGeneralLinks={editGeneralLinks}
        addEditLinkField={addEditLinkField}
        removeEditLinkField={removeEditLinkField}
        updateEditLinkField={updateEditLinkField}
        glossariesLoading={glossariesLoading}
        glossaries={glossaries}
        glossarySearchTerm={editGlossarySearchTerm}
        setGlossarySearchTerm={setEditGlossarySearchTerm}
        selectedGlossaryIds={editSelectedGlossaryIds}
        handleGlossaryToggle={handleEditGlossaryToggle}
        editGlossarySearchTerm={editGlossarySearchTerm}
        setEditGlossarySearchTerm={setEditGlossarySearchTerm}
        editSelectedGlossaryIds={editSelectedGlossaryIds}
        handleEditGlossaryToggle={handleEditGlossaryToggle}
      />

      {/* 유즈케이스 편집 모달 */}
      <UsecaseEditModal
        isOpen={
          showEditUsecaseModal &&
          !!editingUsecase &&
          membership?.role === "admin"
        }
        usecaseName={editUsecaseName}
        setUsecaseName={setEditUsecaseName}
        onClose={() => {
          setShowEditUsecaseModal(false);
          setEditingUsecase(null);
          setEditUsecaseName("");
        }}
        onUpdate={updateUsecase}
        saving={editUsecaseSaving}
      />

      <GlossaryViewModal
        isOpen={showGlossaryModal}
        glossaryId={viewingGlossaryId}
        onClose={() => {
          setShowGlossaryModal(false);
          setViewingGlossaryId(null);
        }}
      />

      <UsecaseDeleteModal
        isOpen={
          showDeleteUsecaseModal &&
          !!deletingUsecase &&
          membership?.role === "admin"
        }
        usecaseName={deletingUsecase?.name ?? ""}
        onClose={() => {
          setShowDeleteUsecaseModal(false);
          setDeletingUsecase(null);
        }}
        onDelete={deleteUsecase}
        deleting={usecaseDeleting}
      />
    </div>
  );
}
