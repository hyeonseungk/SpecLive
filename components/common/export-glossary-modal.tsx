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
      showSimpleError(t("export.project_id_required"));
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
          markdownContent += `# ${glossary.name}\n`;

          if (glossary.definition) {
            markdownContent += `## ${glossary.definition}\n`;
          }

          if (glossary.examples) {
            markdownContent += `### ex) ${glossary.examples}\n`;
          }

          if (glossary.glossary_links && glossary.glossary_links.length > 0) {
            markdownContent += `**관련 링크:**\n`;
            glossary.glossary_links.forEach((link: any) => {
              markdownContent += `- ${link.url}\n`;
            });
            markdownContent += `\n`;
          }

          markdownContent += `\n`;
        }
      } else {
        markdownContent += "등록된 용어가 없습니다.\n\n";
      }

      // 4. 파일 다운로드
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_${t("export.filename_glossary")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast(t("export.success_glossary_markdown"));
    } catch (error) {
      console.error("Error exporting as markdown:", error);
      showError(t("export.error_title"), t("export.error_glossary_markdown"));
    } finally {
      setExportingType(null);
    }
  };

  const exportAsJson = async () => {
    if (!projectId) {
      showSimpleError(t("export.project_id_required"));
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
        terms: (glossaries || []).map((glossary) => ({
          name: glossary.name,
          definition: glossary.definition || "",
          example: glossary.examples || "",
        })),
      };

      // 4. 파일 다운로드
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_${t("export.filename_glossary")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast(t("export.success_glossary_json"));
    } catch (error) {
      console.error("Error exporting as JSON:", error);
      showError(t("export.error_title"), t("export.error_glossary_json"));
    } finally {
      setExportingType(null);
    }
  };

  const exportAsCsv = async () => {
    if (!projectId) {
      showSimpleError(t("export.project_id_required"));
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
      const csvData = [["term", "definition", "example"]];

      if (glossaries && glossaries.length > 0) {
        for (const glossary of glossaries) {
          csvData.push([
            glossary.name,
            glossary.definition || "",
            glossary.examples || "",
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
      a.download = `${project.name}_${t("export.filename_glossary")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast(t("export.success_glossary_csv"));
    } catch (error) {
      console.error("Error exporting as CSV:", error);
      showError(t("export.error_title"), t("export.error_glossary_csv"));
    } finally {
      setExportingType(null);
    }
  };

  const exportAsText = async () => {
    if (!projectId) {
      showSimpleError(t("export.project_id_required"));
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
      let textContent = "";

      if (glossaries && glossaries.length > 0) {
        for (let i = 0; i < glossaries.length; i++) {
          const glossary = glossaries[i];
          textContent += `${i + 1}. ${glossary.name}\n`;

          if (glossary.definition) {
            textContent += `${glossary.definition}\n`;
          }

          if (glossary.examples) {
            textContent += `ex. ${glossary.examples}\n`;
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
      a.download = `${project.name}_${t("export.filename_glossary")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast(t("export.success_glossary_text"));
    } catch (error) {
      console.error("Error exporting as text:", error);
      showError(t("export.error_title"), t("export.error_glossary_text"));
    } finally {
      setExportingType(null);
    }
  };

  const exportAsExcel = async () => {
    if (!projectId) {
      showSimpleError(t("export.project_id_required"));
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
      const excelData = [["term", "definition", "example"]];

      if (glossaries && glossaries.length > 0) {
        for (const glossary of glossaries) {
          excelData.push([
            glossary.name,
            glossary.definition || "",
            glossary.examples || "",
          ]);
        }
      }

      // 4. Excel 워크북 생성
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // 5. 빈 셀들을 완전히 제거
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      const newRange = {
        s: { r: 0, c: 0 },
        e: { r: excelData.length - 1, c: 2 },
      };

      // 기존 셀 데이터를 새 범위에 맞게 복사
      const newWorksheet: any = {};
      for (let r = 0; r <= newRange.e.r; r++) {
        for (let c = 0; c <= newRange.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const originalCellAddress = XLSX.utils.encode_cell({ r, c });
          if (worksheet[originalCellAddress]) {
            newWorksheet[cellAddress] = worksheet[originalCellAddress];
          }
        }
      }

      // 새 워크시트로 교체
      Object.assign(worksheet, newWorksheet);
      worksheet["!ref"] = XLSX.utils.encode_range(newRange);

      // 6. 컬럼 너비 자동 조정
      const colWidths = [
        { wch: Math.max(...excelData.map((row) => (row[0] || "").length)) },
        { wch: Math.max(...excelData.map((row) => (row[1] || "").length)) },
        { wch: Math.max(...excelData.map((row) => (row[2] || "").length)) },
      ];
      worksheet["!cols"] = colWidths;

      // 6. 워크시트를 워크북에 추가
      XLSX.utils.book_append_sheet(workbook, worksheet, "용어집");

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
      a.download = `${project.name}_${t("export.filename_glossary")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast(t("export.success_glossary_excel"));
    } catch (error) {
      console.error("Error exporting as Excel:", error);
      showError(t("export.error_title"), t("export.error_glossary_excel"));
    } finally {
      setExportingType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold mb-2">{t("export.title")}</h3>
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
            • {t("export.description_glossary_part1")}
            <br />• {t("export.description_glossary_part2")}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={exportAsMarkdown}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            {t("export.format_markdown")}
            {exportingType === "markdown" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsCsv}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            {t("export.format_csv")}
            {exportingType === "csv" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsExcel}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            {t("export.format_excel")}
            {exportingType === "excel" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsJson}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            {t("export.format_json")}
            {exportingType === "json" && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Button>

          <Button
            onClick={exportAsText}
            disabled={exportingType !== null}
            className="w-full justify-start"
            variant="outline"
          >
            {t("export.format_text")}
            {exportingType === "text" && (
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
            {t("export.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
