import { create } from 'zustand';

export const useLoadingStore = create((set) => ({
  isOpen: false,
  title: 'Loading',
  message: 'Please wait...',
  progress: null, // null for indeterminate, 0-100 for determinate

  show: (message = 'Please wait...', title = 'Loading', progress = null) => {
    set({ isOpen: true, message, title, progress });
  },

  hide: () => {
    set({ isOpen: false });
  },

  setProgress: (progress) => {
    set(() => {
      // Clamp progress between 0 and 100 if it is a number
      const nextProgress = typeof progress === 'number'
        ? Math.min(100, Math.max(0, progress))
        : progress;
      return { progress: nextProgress };
    });
  },

  setMessage: (message) => {
    set({ message });
  },

  setTitle: (title) => {
    set({ title });
  },
}));
