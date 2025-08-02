import { create } from "zustand";

interface ErrorState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  showError: (title: string, message: string, onConfirm?: () => void) => void;
  hideError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  isOpen: false,
  title: "",
  message: "",
  onConfirm: undefined,
  showError: (title: string, message: string, onConfirm?: () => void) =>
    set({
      isOpen: true,
      title,
      message,
      onConfirm,
    }),
  hideError: () =>
    set({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: undefined,
    }),
}));

// 편의를 위한 전역 함수들
export const showError = (
  title: string,
  message: string,
  onConfirm?: () => void
) => {
  useErrorStore.getState().showError(title, message, onConfirm);
};

export const showSimpleError = (message: string) => {
  // 다국어 지원을 위해 컴포넌트에서 t() 함수로 제목을 전달하도록 변경
  // 임시로 영어 제목 사용, 실제로는 컴포넌트에서 t("common.error_title")를 전달해야 함
  useErrorStore.getState().showError("Error", message);
};

export const hideError = () => {
  useErrorStore.getState().hideError();
};
