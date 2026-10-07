import { create } from 'zustand';

interface LayoutState {
  isNavVisible: boolean;
  setIsNavVisible: (visible: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isNavVisible: true,
  setIsNavVisible: (visible) => set({ isNavVisible: visible }),
}));
