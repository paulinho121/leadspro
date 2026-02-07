
import React, { useState, useEffect } from 'react';
import { Bell, X, Info, AlertTriangle, CheckCircle2, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationsListProps {
    onClose: () => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({ onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            if (data) setNotifications(data);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'billing': return <DollarSign className="text-red-500" size={16} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
            case 'success': return <CheckCircle2 className="text-emerald-500" size={16} />;
            default: return <Info className="text-primary" size={16} />;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="absolute top-20 right-6 md:right-10 w-80 md:w-96 glass-strong rounded-3xl border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Bell className="text-primary" size={18} />
                    </div>
                    <h3 className="text-sm font-black text-white tracking-widest uppercase">Notificações</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="p-10 flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="text-slate-700" size={24} />
                        </div>
                        <p className="text-slate-500 text-xs font-bold">Nenhuma notificação por enquanto.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-4 hover:bg-white/5 transition-all cursor-pointer relative group ${!n.is_read ? 'bg-primary/5' : ''}`}
                                onClick={() => markAsRead(n.id)}
                            >
                                {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                                <div className="flex gap-4">
                                    <div className={`mt-1 p-2 rounded-xl shrink-0 ${n.type === 'billing' ? 'bg-red-500/10' :
                                            n.type === 'warning' ? 'bg-amber-500/10' :
                                                'bg-primary/10'
                                        }`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className={`text-xs font-black uppercase tracking-tight truncate ${!n.is_read ? 'text-white' : 'text-slate-400'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-[9px] font-mono text-slate-500 shrink-0 mt-0.5">
                                                {formatTime(n.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            {n.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                    <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-primary transition-all">
                        Limpar tudo
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationsList;
