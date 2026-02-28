
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ToastMessage } from '../components/Toast';

interface AppState {
    // UI State (persisted)
    activeTab: 'dashboard' | 'discovery' | 'lab' | 'partner' | 'enriched' | 'master' | 'history' | 'pipeline' | 'automation' | 'billing' | 'monitor';
    isSidebarOpen: boolean;

    // Account State
    userTenantId: string;
    creditBalance: number;

    // Toast System
    toasts: ToastMessage[];
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;

    // Actions
    setActiveTab: (tab: AppState['activeTab']) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setUserTenantId: (id: string) => void;
    setCreditBalance: (balance: number) => void;
    consumeCredits: (amount: number) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            activeTab: 'dashboard',
            isSidebarOpen: true,
            userTenantId: '',
            creditBalance: 0,
            toasts: [],

            addToast: (toast) =>
                set((state) => ({
                    toasts: [
                        ...state.toasts,
                        { ...toast, id: Math.random().toString(36).slice(2) }
                    ].slice(-5), // max 5 toasts simultâneos
                })),

            removeToast: (id) =>
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                })),

            setActiveTab: (tab) => set({ activeTab: tab }),
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
            setSidebarOpen: (open) => set({ isSidebarOpen: open }),
            setUserTenantId: (id) => set({ userTenantId: id }),
            setCreditBalance: (balance) => set({ creditBalance: balance }),
            consumeCredits: (amount) =>
                set((state) => ({ creditBalance: Math.max(0, state.creditBalance - amount) })),
        }),
        {
            name: 'leadflow-ui-v1',
            // Só persistir preferências de UI — nunca dados sensíveis
            partialize: (state) => ({
                activeTab: state.activeTab,
                isSidebarOpen: state.isSidebarOpen,
            }),
        }
    )
);
