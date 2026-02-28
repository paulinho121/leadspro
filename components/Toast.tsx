import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastItemProps {
    toast: ToastMessage;
    onRemove: (id: string) => void;
}

const icons = {
    success: <CheckCircle size={18} className="text-emerald-400 shrink-0" />,
    error: <XCircle size={18} className="text-red-400 shrink-0" />,
    info: <Info size={18} className="text-blue-400 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
};

const borders = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
    warning: 'border-amber-500/30',
};

const glows = {
    success: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    error: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    info: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    warning: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
};

const bars = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
    const duration = toast.duration ?? 4000;

    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), duration);
        return () => clearTimeout(timer);
    }, [toast.id, duration, onRemove]);

    return (
        <div
            className={`relative flex items-start gap-3 p-4 pr-10 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border ${borders[toast.type]} ${glows[toast.type]} min-w-[300px] max-w-[400px] animate-in slide-in-from-right-8 fade-in duration-300 overflow-hidden`}
        >
            {/* Progress bar */}
            <div
                className={`absolute bottom-0 left-0 h-[2px] ${bars[toast.type]} rounded-full`}
                style={{
                    animation: `toast-progress ${duration}ms linear forwards`,
                    transformOrigin: 'left',
                }}
            />

            {icons[toast.type]}

            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
                )}
            </div>

            <button
                onClick={() => onRemove(toast.id)}
                className="absolute top-3 right-3 text-slate-600 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/10"
            >
                <X size={14} />
            </button>
        </div>
    );
};

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onRemove={onRemove} />
                </div>
            ))}
        </div>
    );
};

// Hook global para usar em qualquer lugar via import direto
let _addToast: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export const registerToastFn = (fn: typeof _addToast) => { _addToast = fn; };

export const toast = {
    success: (title: string, message?: string) =>
        _addToast?.({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
        _addToast?.({ type: 'error', title, message }),
    info: (title: string, message?: string) =>
        _addToast?.({ type: 'info', title, message }),
    warning: (title: string, message?: string) =>
        _addToast?.({ type: 'warning', title, message }),
};
