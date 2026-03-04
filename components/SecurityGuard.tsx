
import React, { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { toast } from './Toast';

// Lista de Banimento Imediato (Auto-Kick)
const BAN_LIST_EMAILS = ['alejandroeduardobrasharriot@gmail.com'];
const BAN_LIST_IDS = ['25b90f34-644b-4c1a-8148-dd88e647f441'];

const SecurityGuard: React.FC = () => {
    const { activeTab, userTenantId } = useStore();
    const lastLogTime = useRef<number>(0);

    useEffect(() => {
        let isDevOrMaster = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        const preventDevTools = (e: KeyboardEvent) => {
            if (isDevOrMaster) return;

            // Bloqueia F12
            if (e.key === 'F12') {
                e.preventDefault();
                toast.error('Sistema Protegido', 'Navegação bloqueada pelo protocolo de segurança Neural e LGPD.');
            }
            // Bloqueia Ctrl+Shift+I / J / C (Painel de Console e Inspecionar)
            if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
                e.preventDefault();
                toast.error('Sistema Protegido', 'Ferramentas de desenvolvedor desativadas.');
            }
            // Bloqueia Ctrl+U (Ver código-fonte)
            if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
            }
        };

        const preventContextMenu = (e: MouseEvent) => {
            if (isDevOrMaster) return;

            // Permite clicar com botão direito apenas em inputs/textareas para opções de Copiar/Colar normais
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }
            e.preventDefault();
        };

        document.addEventListener('keydown', preventDevTools);
        document.addEventListener('contextmenu', preventContextMenu);

        // Libera secretamente o Inspecionar se no meio do uso detectarmos que a conta atual tem permissão Master
        const checkMaster = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('is_master_admin').eq('id', session.user.id).maybeSingle();
                if (profile?.is_master_admin) {
                    isDevOrMaster = true;
                }
            }
        };
        checkMaster();

        return () => {
            document.removeEventListener('keydown', preventDevTools);
            document.removeEventListener('contextmenu', preventContextMenu);
        };
    }, []);

    useEffect(() => {
        const checkSecurity = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const isBanned = BAN_LIST_EMAILS.includes(session.user.email || '') ||
                BAN_LIST_IDS.includes(session.user.id);

            // 1. AUTO-BAN: Deslogar e expulsar imediatamente usuários da lista negra
            if (isBanned) {
                console.error("[Security] ALVO BANIDO DETECTADO. Iniciando protocolo de expulsão...");

                // Tenta registrar o log antes de matar a sessão
                try {
                    await supabase.from('activity_logs').insert([{
                        tenant_id: userTenantId || '00000000-0000-0000-0000-000000000000',
                        user_id: session.user.id,
                        action: 'AUTO_BAN_KICK',
                        details: `Expulsão automática do sistema: ${session.user.email}. Tentativa de acesso bloqueada.`
                    }]);
                } catch (e) { }

                // Matar a sessão no Supabase
                await supabase.auth.signOut();

                // Limpar cache e alertar
                window.localStorage.clear();
                alert("CONEXÃO ENCERRADA: Sua conta foi suspensa por violação dos termos de segurança.");
                window.location.href = '/login';
                return;
            }

            // 2. Proteção Adicional para aba Master (Auditada)
            if (activeTab === 'master') {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_master_admin')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (!profile?.is_master_admin) {
                    try {
                        await supabase.from('activity_logs').insert([{
                            tenant_id: userTenantId || '00000000-0000-0000-0000-000000000000',
                            user_id: session.user.id,
                            action: 'INTRUSION_ATTEMPT',
                            details: `Tentativa de acesso não autorizado à aba MASTER via console/manipulação de estado.`
                        }]);
                    } catch (e) { }

                    toast.error("Acesso Negado", "Sua credencial não possui permissão master.");
                    useStore.getState().setActiveTab('dashboard');
                }
            }
        };

        checkSecurity();
    }, [activeTab, userTenantId]);

    return null;
};

export default SecurityGuard;
