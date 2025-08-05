import { create } from "zustand";

interface ToastState {
  isVisible: boolean;
  message: string;
  type: "success" | "error" | "info";
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  showInfoToast: (message: string) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  isVisible: false,
  message: "",
  type: "success",
  showSuccessToast: (message: string) =>
    set({
      isVisible: true,
      message,
      type: "success",
    }),
  showErrorToast: (message: string) =>
    set({
      isVisible: true,
      message,
      type: "error",
    }),
  showInfoToast: (message: string) =>
    set({
      isVisible: true,
      message,
      type: "info",
    }),
  hideToast: () =>
    set({
      isVisible: false,
      message: "",
      type: "success",
    }),
}));

// 편의를 위한 전역 함수들
export const showSuccessToast = (message: string) => {
  useToastStore.getState().showSuccessToast(message);
};

export const showErrorToast = (message: string) => {
  useToastStore.getState().showErrorToast(message);
};

export const showInfoToast = (message: string) => {
  useToastStore.getState().showInfoToast(message);
};

export const hideToast = () => {
  useToastStore.getState().hideToast();
}; 