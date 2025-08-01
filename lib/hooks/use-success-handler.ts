import { useCallback } from "react";
import { showSuccess, showSimpleSuccess } from "@/lib/success-store";

export const useSuccessHandler = () => {
  const handleSuccess = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      showSuccess(title, message, onConfirm);
    },
    []
  );

  const handleSimpleSuccess = useCallback((message: string) => {
    showSimpleSuccess(message);
  }, []);

  return {
    handleSuccess,
    handleSimpleSuccess,
    showSuccess,
    showSimpleSuccess,
  };
};

// 전역에서 사용할 수 있는 성공 핸들러
export const globalSuccessHandler = (
  title: string,
  message: string,
  onConfirm?: () => void
) => {
  showSuccess(title, message, onConfirm);
};
