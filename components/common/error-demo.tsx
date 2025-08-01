"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showError, showSimpleError } from "@/lib/error-store";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { useT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";

export function ErrorDemo() {
  const { handleError, handleAsyncError } = useErrorHandler();
  const t = useT();
  const { locale } = useLangStore();

  const simulateApiError = async () => {
    throw new Error(t("errorDemo.api_unreachable"));
  };

  const handleSimpleError = () => {
    showSimpleError(t("errorDemo.simple_message"));
  };

  const handleDetailedError = () => {
    const detailedMsg = t("errorDemo.detailed_message").replace(
      "{time}",
      new Date().toLocaleString(locale)
    );
    showError(t("errorDemo.detailed_title"), detailedMsg, () => {
      console.log("Error modal confirmed");
    });
  };

  const handleAsyncErrorDemo = async () => {
    const result = await handleAsyncError(
      simulateApiError,
      t("errorDemo.async_error_toast")
    );

    if (result === null) {
      console.log("Async error occurred, returned null");
    }
  };

  const handleManualError = () => {
    try {
      throw new Error(t("errorDemo.manual_error_thrown"));
    } catch (error) {
      handleError(error, t("errorDemo.manual_error_title"));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>{t("errorDemo.card_title")}</CardTitle>
        <CardDescription>{t("errorDemo.card_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={handleSimpleError}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">
              {t("errorDemo.simple_btn_title")}
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              {t("errorDemo.simple_btn_sub")}
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={handleDetailedError}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">상세한 에러</span>
            <span className="text-sm text-muted-foreground mt-1">
              showError() 콜백 포함
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={handleAsyncErrorDemo}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">비동기 에러</span>
            <span className="text-sm text-muted-foreground mt-1">
              handleAsyncError() 사용
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={handleManualError}
            className="h-auto p-4 flex flex-col items-start"
          >
            <span className="font-semibold">수동 에러 처리</span>
            <span className="text-sm text-muted-foreground mt-1">
              try-catch + handleError()
            </span>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">📝 사용법</h4>
          <div className="text-sm space-y-2">
            <div>
              <code className="bg-background px-2 py-1 rounded">
                showSimpleError(message)
              </code>
              <span className="ml-2 text-muted-foreground">
                - 간단한 에러 메시지
              </span>
            </div>
            <div>
              <code className="bg-background px-2 py-1 rounded">
                showError(title, message, onConfirm?)
              </code>
              <span className="ml-2 text-muted-foreground">
                - 상세한 에러 정보
              </span>
            </div>
            <div>
              <code className="bg-background px-2 py-1 rounded">
                useErrorHandler()
              </code>
              <span className="ml-2 text-muted-foreground">
                - 컴포넌트에서 훅 사용
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
