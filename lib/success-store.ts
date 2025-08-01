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
  useSuccessStore.getState().showSuccess("성공", message);
};

export const hideSuccess = () => {
  useSuccessStore.getState().hideSuccess();
};
