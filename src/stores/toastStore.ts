import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, severity?: Toast['severity']) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, severity = 'success') => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, severity }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
