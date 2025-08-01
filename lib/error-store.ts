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
  useErrorStore.getState().showError("오류", message);
};

export const hideError = () => {
  useErrorStore.getState().hideError();
};
