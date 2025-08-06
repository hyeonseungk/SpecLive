"use client";

import { Button } from "@/components/ui/button";
import { showError, showSimpleError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase-browser";
import { showSuccessToast } from "@/lib/toast-store";
import { X } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  projectId,
}: ExportModalProps) {
  const [exportingType, setExportingType] = useState<string | null>(null);
  const t = useGlobalT();
  const exportAsMarkdown = async () => {
    if (!projectId) {
      showSimpleError("프로젝트 ID가 필요합니다.");
      return;
    }

    setExportingType("markdown");
    try {
      // 1. 프로젝트 정보 조회
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // 2. 액터, 유즈케이스, 기능, 정책 데이터 조회
      const { data: actors, error: actorsError } = await supabase
        .from("actors")
        .select("*")
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (actorsError) throw actorsError;

      // 3. 각 액터별로 유즈케이스, 기능, 정책 조회
      let markdownContent = `# ${project.name}\n\n`;

      for (const actor of actors || []) {
        markdownContent += `## ${actor.name}\n\n`;

        // 유즈케이스 조회
        const { data: usecases, error: usecasesError } = await supabase
          .from("usecases")
          .select("*")
          .eq("actor_id", actor.id)
          .order("sequence", { ascending: true });

        if (usecasesError) throw usecasesError;

        for (const usecase of usecases || []) {
          markdownContent += `### ${usecase.name}\n\n`;

          // 기능 조회
          const { data: features, error: featuresError } = await supabase
            .from("features")
            .select("*")
            .eq("usecase_id", usecase.id)
            .order("sequence", { ascending: true });

          if (featuresError) throw featuresError;

          for (const feature of features || []) {
            markdownContent += `#### ${feature.name}\n\n`;

            // 정책 조회
            const { data: featurePolicies, error: policiesError } =
              await supabase
                .from("feature_policies")
                .select(
                  `
                sequence,
                policies (
                  id,
                  contents
                )
              `
                )
                .eq("feature_id", feature.id)
                .order("sequence", { ascending: true });

            if (policiesError) throw policiesError;

            // 정책 내용 추가
            if (featurePolicies && featurePolicies.length > 0) {
              for (const fp of featurePolicies) {
                if (fp.policies) {
                  markdownContent += `- ${fp.policies.contents}\n`;
                }
              }
              markdownContent += "\n";
            } else {
              markdownContent += "\n";
            }
          }
        }
      }

      // 4. 파일 다운로드
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_정책_${
        new Date().toISOString().split("T")[0]
      }.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("마크다운 파일이 성공적으로 다운로드되었습니다.");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      showError("Export 실패", "마크다운 파일 생성 중 오류가 발생했습니다.");
    } finally {
      setExportingType(null);
    }
  };

  const exportAsJson = async () => {
    if (!projectId) {
      showSimpleError("프로젝트 ID가 필요합니다.");
      return;
    }

    setExportingType("json");
    try {
      // 1. 프로젝트 정보 조회
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // 2. 액터, 유즈케이스, 기능, 정책 데이터 조회
      const { data: actors, error: actorsError } = await supabase
        .from("actors")
        .select("*")
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (actorsError) throw actorsError;

      // 3. JSON 구조 생성
      const jsonData = {
        actors: [] as any[],
      };

      for (const actor of actors || []) {
        const actorData = {
          name: actor.name,
          usecases: [] as any[],
        };

        // 유즈케이스 조회
        const { data: usecases, error: usecasesError } = await supabase
          .from("usecases")
          .select("*")
          .eq("actor_id", actor.id)
          .order("sequence", { ascending: true });

        if (usecasesError) throw usecasesError;

        for (const usecase of usecases || []) {
          const usecaseData = {
            name: usecase.name,
            features: [] as any[],
          };

          // 기능 조회
          const { data: features, error: featuresError } = await supabase
            .from("features")
            .select("*")
            .eq("usecase_id", usecase.id)
            .order("sequence", { ascending: true });

          if (featuresError) throw featuresError;

          for (const feature of features || []) {
            const featureData = {
              name: feature.name,
              policies: [] as any[],
            };

            // 정책 조회
            const { data: featurePolicies, error: policiesError } =
              await supabase
                .from("feature_policies")
                .select(
                  `
                sequence,
                policies (
                  id,
                  contents
                )
              `
                )
                .eq("feature_id", feature.id)
                .order("sequence", { ascending: true });

            if (policiesError) throw policiesError;

            // 정책 데이터 추가
            if (featurePolicies && featurePolicies.length > 0) {
              for (const fp of featurePolicies) {
                if (fp.policies) {
                  featureData.policies.push({
                    content: fp.policies.contents,
                  });
                }
              }
            }

            usecaseData.features.push(featureData);
          }

          actorData.usecases.push(usecaseData);
        }

        jsonData.actors.push(actorData);
      }

      // 4. 파일 다운로드
      const jsonContent = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_정책_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("JSON 파일이 성공적으로 다운로드되었습니다.");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      showError("Export 실패", "JSON 파일 생성 중 오류가 발생했습니다.");
    } finally {
      setExportingType(null);
    }
  };

  const exportAsCsv = async () => {
    if (!projectId) {
      showSimpleError("프로젝트 ID가 필요합니다.");
      return;
    }

    setExportingType("csv");
    try {
      // 1. 프로젝트 정보 조회
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // 2. 액터, 유즈케이스, 기능, 정책 데이터 조회
      const { data: actors, error: actorsError } = await supabase
        .from("actors")
        .select("*")
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (actorsError) throw actorsError;

      // 3. CSV 데이터 생성
      const csvRows = ["actor,usecase,feature,policy"];

      for (const actor of actors || []) {
        // 유즈케이스 조회
        const { data: usecases, error: usecasesError } = await supabase
          .from("usecases")
          .select("*")
          .eq("actor_id", actor.id)
          .order("sequence", { ascending: true });

        if (usecasesError) throw usecasesError;

        for (const usecase of usecases || []) {
          // 기능 조회
          const { data: features, error: featuresError } = await supabase
            .from("features")
            .select("*")
            .eq("usecase_id", usecase.id)
            .order("sequence", { ascending: true });

          if (featuresError) throw featuresError;

          for (const feature of features || []) {
            // 정책 조회
            const { data: featurePolicies, error: policiesError } =
              await supabase
                .from("feature_policies")
                .select(
                  `
                sequence,
                policies (
                  id,
                  contents
                )
              `
                )
                .eq("feature_id", feature.id)
                .order("sequence", { ascending: true });

            if (policiesError) throw policiesError;

            // 정책이 있는 경우
            if (featurePolicies && featurePolicies.length > 0) {
              for (const fp of featurePolicies) {
                if (fp.policies) {
                  // CSV에서 쉼표와 따옴표를 처리
                  const actorName = `"${actor.name.replace(/"/g, '""')}"`;
                  const usecaseName = `"${usecase.name.replace(/"/g, '""')}"`;
                  const featureName = `"${feature.name.replace(/"/g, '""')}"`;
                  const policyContent = `"${fp.policies.contents.replace(
                    /"/g,
                    '""'
                  )}"`;

                  csvRows.push(
                    `${actorName},${usecaseName},${featureName},${policyContent}`
                  );
                }
              }
            } else {
              // 정책이 없는 경우 빈 정책으로 추가
              const actorName = `"${actor.name.replace(/"/g, '""')}"`;
              const usecaseName = `"${usecase.name.replace(/"/g, '""')}"`;
              const featureName = `"${feature.name.replace(/"/g, '""')}"`;

              csvRows.push(`${actorName},${usecaseName},${featureName},""`);
            }
          }
        }
      }

      // 4. 파일 다운로드
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_정책_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("CSV 파일이 성공적으로 다운로드되었습니다.");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      showError("Export 실패", "CSV 파일 생성 중 오류가 발생했습니다.");
    } finally {
      setExportingType(null);
    }
  };

  const exportAsText = async () => {
    if (!projectId) {
      showSimpleError("프로젝트 ID가 필요합니다.");
      return;
    }

    setExportingType("text");
    try {
      // 1. 프로젝트 정보 조회
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // 2. 액터, 유즈케이스, 기능, 정책 데이터 조회
      const { data: actors, error: actorsError } = await supabase
        .from("actors")
        .select("*")
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (actorsError) throw actorsError;

      // 3. 텍스트 내용 생성
      let textContent = `${project.name}\n\n`;

      for (let i = 0; i < (actors || []).length; i++) {
        const actor = actors![i];
        textContent += `${i + 1}. ${actor.name}\n`;

        // 유즈케이스 조회
        const { data: usecases, error: usecasesError } = await supabase
          .from("usecases")
          .select("*")
          .eq("actor_id", actor.id)
          .order("sequence", { ascending: true });

        if (usecasesError) throw usecasesError;

        for (let j = 0; j < (usecases || []).length; j++) {
          const usecase = usecases![j];
          textContent += `\t(${j + 1}) ${usecase.name}\n`;

          // 기능 조회
          const { data: features, error: featuresError } = await supabase
            .from("features")
            .select("*")
            .eq("usecase_id", usecase.id)
            .order("sequence", { ascending: true });

          if (featuresError) throw featuresError;

          for (let k = 0; k < (features || []).length; k++) {
            const feature = features![k];
            const featureLetter = String.fromCharCode(65 + k); // A, B, C, ...
            textContent += `\t\t${featureLetter}. ${feature.name}\n`;

            // 정책 조회
            const { data: featurePolicies, error: policiesError } =
              await supabase
                .from("feature_policies")
                .select(
                  `
                sequence,
                policies (
                  id,
                  contents
                )
              `
                )
                .eq("feature_id", feature.id)
                .order("sequence", { ascending: true });

            if (policiesError) throw policiesError;

            // 정책 내용 추가
            if (featurePolicies && featurePolicies.length > 0) {
              for (let l = 0; l < featurePolicies.length; l++) {
                const fp = featurePolicies[l];
                if (fp.policies) {
                  const policyLetter = String.fromCharCode(97 + l); // a, b, c, ...
                  textContent += `\t\t\t${policyLetter}. ${fp.policies.contents}\n`;
                }
              }
            }
          }
        }
      }

      // 4. 파일 다운로드
      const blob = new Blob([textContent], {
        type: "text/plain;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_정책_${
        new Date().toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("텍스트 파일이 성공적으로 다운로드되었습니다.");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      showError("Export 실패", "텍스트 파일 생성 중 오류가 발생했습니다.");
    } finally {
      setExportingType(null);
    }
  };

  const exportAsExcel = async () => {
    if (!projectId) {
      showSimpleError("프로젝트 ID가 필요합니다.");
      return;
    }

    setExportingType("excel");
    try {
      // 1. 프로젝트 정보 조회
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // 2. 액터, 유즈케이스, 기능, 정책 데이터 조회
      const { data: actors, error: actorsError } = await supabase
        .from("actors")
        .select("*")
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (actorsError) throw actorsError;

      // 3. Excel 데이터 생성 (CSV와 동일한 형식)
      const excelData = [["actor", "usecase", "feature", "policy"]];

      for (const actor of actors || []) {
        // 유즈케이스 조회
        const { data: usecases, error: usecasesError } = await supabase
          .from("usecases")
          .select("*")
          .eq("actor_id", actor.id)
          .order("sequence", { ascending: true });

        if (usecasesError) throw usecasesError;

        for (const usecase of usecases || []) {
          // 기능 조회
          const { data: features, error: featuresError } = await supabase
            .from("features")
            .select("*")
            .eq("usecase_id", usecase.id)
            .order("sequence", { ascending: true });

          if (featuresError) throw featuresError;

          for (const feature of features || []) {
            // 정책 조회
            const { data: featurePolicies, error: policiesError } =
              await supabase
                .from("feature_policies")
                .select(
                  `
                sequence,
                policies (
                  id,
                  contents
                )
              `
                )
                .eq("feature_id", feature.id)
                .order("sequence", { ascending: true });

            if (policiesError) throw policiesError;

            // 정책이 있는 경우
            if (featurePolicies && featurePolicies.length > 0) {
              for (const fp of featurePolicies) {
                if (fp.policies) {
                  excelData.push([
                    actor.name,
                    usecase.name,
                    feature.name,
                    fp.policies.contents,
                  ]);
                }
              }
            } else {
              // 정책이 없는 경우 빈 정책으로 추가
              excelData.push([actor.name, usecase.name, feature.name, ""]);
            }
          }
        }
      }

      // 4. Excel 워크북 생성
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // 5. 컬럼 너비 자동 조정
      const colWidths = [
        { wch: Math.max(...excelData.map((row) => (row[0] || "").length)) },
        { wch: Math.max(...excelData.map((row) => (row[1] || "").length)) },
        { wch: Math.max(...excelData.map((row) => (row[2] || "").length)) },
        { wch: Math.max(...excelData.map((row) => (row[3] || "").length)) },
      ];
      worksheet["!cols"] = colWidths;

      // 6. 워크시트를 워크북에 추가
      XLSX.utils.book_append_sheet(workbook, worksheet, "정책");

      // 7. 파일 다운로드
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_정책_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("Excel 파일이 성공적으로 다운로드되었습니다.");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      showError("Export 실패", "Excel 파일 생성 중 오류가 발생했습니다.");
    } finally {
      setExportingType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Export</h3>
          <p className="text-gray-600 text-sm">
            • {t("export.description_part1")}
            <br />• {t("export.description_part2")}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={exportAsMarkdown}
            disabled={exportingType !== null}
          >
            {exportingType === "markdown" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                내보내는 중...
              </div>
            ) : (
              "마크다운 (.md)"
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={exportAsCsv}
            disabled={exportingType !== null}
          >
            {exportingType === "csv" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                내보내는 중...
              </div>
            ) : (
              "CSV (.csv)"
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={exportAsExcel}
            disabled={exportingType !== null}
          >
            {exportingType === "excel" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                내보내는 중...
              </div>
            ) : (
              "엑셀 (.xlsx)"
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={exportAsJson}
            disabled={exportingType !== null}
          >
            {exportingType === "json" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                내보내는 중...
              </div>
            ) : (
              "JSON (.json)"
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={exportAsText}
            disabled={exportingType !== null}
          >
            {exportingType === "text" ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                내보내는 중...
              </div>
            ) : (
              "텍스트 (.txt)"
            )}
          </Button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={exportingType !== null}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}
