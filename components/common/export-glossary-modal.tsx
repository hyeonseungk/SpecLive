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

      // 2. 용어 데이터 조회
      const { data: glossaries, error: glossariesError } = await supabase
        .from("glossaries")
        .select(
          `
          *,
          glossary_links (url)
        `
        )
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (glossariesError) throw glossariesError;

      // 3. 마크다운 내용 생성
      let markdownContent = `# ${project.name} - 용어집\n\n`;

      if (glossaries && glossaries.length > 0) {
        for (const glossary of glossaries) {
          markdownContent += `## ${glossary.name}\n\n`;

          if (glossary.definition) {
            markdownContent += `**정의:** ${glossary.definition}\n\n`;
          }

          if (glossary.examples) {
            markdownContent += `**예시:** ${glossary.examples}\n\n`;
          }

          if (glossary.glossary_links && glossary.glossary_links.length > 0) {
            markdownContent += `**관련 링크:**\n`;
            glossary.glossary_links.forEach((link: any) => {
              markdownContent += `- ${link.url}\n`;
            });
            markdownContent += `\n`;
          }

          markdownContent += `---\n\n`;
        }
      } else {
        markdownContent += "등록된 용어가 없습니다.\n\n";
      }

      // 4. 파일 다운로드
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_용어집.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("마크다운 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Error exporting as markdown:", error);
      showError(
        "내보내기 실패",
        "마크다운 파일을 생성하는 중 오류가 발생했습니다."
      );
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

      // 2. 용어 데이터 조회
      const { data: glossaries, error: glossariesError } = await supabase
        .from("glossaries")
        .select(
          `
          *,
          glossary_links (url)
        `
        )
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (glossariesError) throw glossariesError;

      // 3. JSON 데이터 구성
      const exportData = {
        project: {
          id: project.id,
          name: project.name,
          created_at: project.created_at,
        },
        glossaries: glossaries || [],
        exported_at: new Date().toISOString(),
      };

      // 4. 파일 다운로드
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_용어집.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("JSON 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Error exporting as JSON:", error);
      showError(
        "내보내기 실패",
        "JSON 파일을 생성하는 중 오류가 발생했습니다."
      );
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

      // 2. 용어 데이터 조회
      const { data: glossaries, error: glossariesError } = await supabase
        .from("glossaries")
        .select(
          `
          *,
          glossary_links (url)
        `
        )
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (glossariesError) throw glossariesError;

      // 3. CSV 데이터 구성
      const csvData = [
        ["용어명", "정의", "예시", "관련 링크", "순서", "생성일", "수정일"],
      ];

      if (glossaries && glossaries.length > 0) {
        for (const glossary of glossaries) {
          const links =
            glossary.glossary_links?.map((link: any) => link.url).join("; ") ||
            "";

          csvData.push([
            glossary.name,
            glossary.definition || "",
            glossary.examples || "",
            links,
            glossary.sequence?.toString() || "",
            glossary.created_at || "",
            glossary.updated_at || "",
          ]);
        }
      }

      // 4. CSV 문자열 생성
      const csvContent = csvData
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      // 5. 파일 다운로드
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_용어집.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("CSV 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Error exporting as CSV:", error);
      showError("내보내기 실패", "CSV 파일을 생성하는 중 오류가 발생했습니다.");
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

      // 2. 용어 데이터 조회
      const { data: glossaries, error: glossariesError } = await supabase
        .from("glossaries")
        .select(
          `
          *,
          glossary_links (url)
        `
        )
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (glossariesError) throw glossariesError;

      // 3. 텍스트 내용 생성
      let textContent = `${project.name} - 용어집\n`;
      textContent += "=".repeat(project.name.length + 10) + "\n\n";

      if (glossaries && glossaries.length > 0) {
        for (const glossary of glossaries) {
          textContent += `${glossary.name}\n`;
          textContent += "-".repeat(glossary.name.length) + "\n\n";

          if (glossary.definition) {
            textContent += `정의: ${glossary.definition}\n\n`;
          }

          if (glossary.examples) {
            textContent += `예시: ${glossary.examples}\n\n`;
          }

          if (glossary.glossary_links && glossary.glossary_links.length > 0) {
            textContent += `관련 링크:\n`;
            glossary.glossary_links.forEach((link: any) => {
              textContent += `- ${link.url}\n`;
            });
            textContent += `\n`;
          }

          textContent += "\n";
        }
      } else {
        textContent += "등록된 용어가 없습니다.\n\n";
      }

      // 4. 파일 다운로드
      const blob = new Blob([textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_용어집.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("텍스트 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Error exporting as text:", error);
      showError(
        "내보내기 실패",
        "텍스트 파일을 생성하는 중 오류가 발생했습니다."
      );
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

      // 2. 용어 데이터 조회
      const { data: glossaries, error: glossariesError } = await supabase
        .from("glossaries")
        .select(
          `
          *,
          glossary_links (url)
        `
        )
        .eq("project_id", projectId)
        .order("sequence", { ascending: true });

      if (glossariesError) throw glossariesError;

      // 3. Excel 데이터 구성
      const excelData = [
        ["용어명", "정의", "예시", "관련 링크", "순서", "생성일", "수정일"],
      ];

      if (glossaries && glossaries.length > 0) {
        for (const glossary of glossaries) {
          const links =
            glossary.glossary_links?.map((link: any) => link.url).join("; ") ||
            "";

          excelData.push([
            glossary.name,
            glossary.definition || "",
            glossary.examples || "",
            links,
            glossary.sequence || 0,
            glossary.created_at || "",
            glossary.updated_at || "",
          ]);
        }
      }

      // 4. Excel 워크북 생성
      const wb = XLSX.utils.book();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // 5. 열 너비 자동 조정
      const colWidths = [
        { wch: 20 }, // 용어명
        { wch: 50 }, // 정의
        { wch: 50 }, // 예시
        { wch: 50 }, // 관련 링크
        { wch: 10 }, // 순서
        { wch: 20 }, // 생성일
        { wch: 20 }, // 수정일
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "용어집");

      // 6. 파일 다운로드
      XLSX.writeFile(wb, `${project.name}_용어집.xlsx`);

      showSuccessToast("Excel 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Error exporting as Excel:", error);
      showError(
        "내보내기 실패",
        "Excel 파일을 생성하는 중 오류가 발생했습니다."
      );
    } finally {
      setExportingType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold mb-2">Export</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 text-sm">
            • 용어명, 정의, 예시, 관련 링크를 포함하여 내보냅니다.
            <br />• 순서대로 정렬된 용어 목록을 다운로드합니다.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={exportAsMarkdown}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            Markdown (.md)
            {exportingType === "markdown" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsJson}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            JSON (.json)
            {exportingType === "json" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsCsv}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            CSV (.csv)
            {exportingType === "csv" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsText}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            Text (.txt)
            {exportingType === "text" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsExcel}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            Excel (.xlsx)
            {exportingType === "excel" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
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
