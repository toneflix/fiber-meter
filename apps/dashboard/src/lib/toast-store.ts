import { create } from 'zustand';

type ToastKind = 'success' | 'error';
export type Toast = { id: number; kind: ToastKind; message: string };

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = ++counter;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
      3500,
    );
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push({ kind: 'success', message }),
  error: (message: string) => useToastStore.getState().push({ kind: 'error', message }),
};
