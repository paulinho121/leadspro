
import { create } from 'zustand';

interface AppState {
    // UI State
    activeTab: 'dashboard' | 'discovery' | 'lab' | 'partner' | 'enriched' | 'master' | 'history' | 'pipeline' | 'automation';
    isSidebarOpen: boolean;

    // Account State
    userTenantId: string;
    creditBalance: number;

    // Actions
    setActiveTab: (tab: AppState['activeTab']) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setUserTenantId: (id: string) => void;
    setCreditBalance: (balance: number) => void;
    consumeCredits: (amount: number) => void;
}

export const useStore = create<AppState>((set) => ({
    activeTab: 'dashboard',
    isSidebarOpen: true,
    userTenantId: '',
    creditBalance: 0,

    setActiveTab: (tab) => set({ activeTab: tab }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (open) => set({ isSidebarOpen: open }),
    setUserTenantId: (id) => set({ userTenantId: id }),
    setCreditBalance: (balance) => set({ creditBalance: balance }),
    consumeCredits: (amount) => set((state) => ({ creditBalance: Math.max(0, state.creditBalance - amount) })),
}));
