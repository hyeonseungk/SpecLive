import { showSuccessToast } from "@/lib/toast-store";
import { useCallback } from "react";

export const useSuccessHandler = () => {
  const handleSuccess = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      showSuccessToast(message);
    },
    []
  );

  const handleSimpleSuccess = useCallback((message: string) => {
    showSuccessToast(message);
  }, []);

  return {
    handleSuccess,
    handleSimpleSuccess,
    showSuccessToast,
  };
};

// 전역에서 사용할 수 있는 성공 핸들러
export const globalSuccessHandler = (
  title: string,
  message: string,
  onConfirm?: () => void
) => {
  showSuccessToast(message);
};
