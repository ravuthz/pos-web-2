import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BranchState {
  selectedBranchId: number | null;
  branches: { id: number; name: string }[];
  setSelectedBranch: (id: number | null) => void;
  setBranches: (branches: { id: number; name: string }[]) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      branches: [],
      setSelectedBranch: (id) => set({ selectedBranchId: id }),
      setBranches: (branches) => set({ branches })
    }),
    {
      name: 'branch-storage'
    }
  )
);