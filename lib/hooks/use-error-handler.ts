import { showError, showSimpleError } from "@/lib/error-store";
import { useCallback } from "react";

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, customMessage?: string) => {
    if (error instanceof Error) {
      showSimpleError(
        customMessage ? `${customMessage}: ${error.message}` : error.message
      );
    } else {
      showSimpleError(customMessage || "An unknown error has occurred.");
    }
  }, []);

  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      errorMessage?: string
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, errorMessage);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
    showError,
    showSimpleError,
  };
};

// 전역에서 사용할 수 있는 에러 핸들러
export const globalErrorHandler = (error: unknown, customMessage?: string) => {
  if (error instanceof Error) {
    showSimpleError(
      customMessage ? `${customMessage}: ${error.message}` : error.message
    );
  } else {
    showSimpleError(customMessage || "An unknown error has occurred.");
  }
};
