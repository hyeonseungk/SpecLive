import { create } from "zustand";

interface SuccessState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  showSuccess: (title: string, message: string, onConfirm?: () => void) => void;
  hideSuccess: () => void;
}

export const useSuccessStore = create<SuccessState>((set) => ({
  isOpen: false,
  title: "",
  message: "",
  onConfirm: undefined,
  showSuccess: (title: string, message: string, onConfirm?: () => void) =>
    set({
      isOpen: true,
      title,
      message,
      onConfirm,
    }),
  hideSuccess: () =>
    set({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: undefined,
    }),
}));

// 편의를 위한 전역 함수들
export const showSuccess = (
  title: string,
  message: string,
  onConfirm?: () => void
) => {
  useSuccessStore.getState().showSuccess(title, message, onConfirm);
};

export const showSimpleSuccess = (message: string) => {
  // 다국어 지원을 위해 컴포넌트에서 t() 함수로 제목을 전달하도록 변경
  // 임시로 영어 제목 사용, 실제로는 컴포넌트에서 t("common.success_title")를 전달해야 함
  useSuccessStore.getState().showSuccess("Success", message);
};

export const hideSuccess = () => {
  useSuccessStore.getState().hideSuccess();
};
