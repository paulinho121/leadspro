
import React, { useEffect, useState } from 'react';
import { ShieldAlert, Terminal, Lock, Cpu } from 'lucide-react';

const SecurityGuard: React.FC = () => {
    const [isBreached, setIsBreached] = useState(false);

    useEffect(() => {
        // 1. Mensagem para Desenvolvedores no Console
        const showDevMessage = () => {
            console.clear();
            console.log(
                "%c🚀 LEADFLOW PRO - NEURAL MATRIX v3.5",
                "color: #f97316; font-size: 30px; font-weight: bold; text-shadow: 0 0 10px rgba(249, 115, 22, 0.5);"
            );
            console.log(
                "%cPropriedade Intelectual Protegida. Se você é um desenvolvedor e precisa de acesso para integrações, entre em contato com nosso suporte técnico.",
                "color: #94a3b8; font-size: 14px; font-weight: 500;"
            );
            console.log(
                "%cContact: labwpplus@gmail.com | API Documentation: /docs",
                "color: #f97316; font-size: 12px;"
            );
            console.log(
                "%c------------------------------------------------------------",
                "color: #334155;"
            );
        };

        // 2. Bloqueio de Teclas (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S)
        const handleKeyDown = (e: KeyboardEvent) => {
            // Bloquear F12
            if (e.keyCode === 123) {
                e.preventDefault();
                setIsBreached(true);
                return false;
            }

            // Bloquear Ctrl+Shift+I (Inspect)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
                e.preventDefault();
                setIsBreached(true);
                return false;
            }

            // Bloquear Ctrl+Shift+J (Console)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
                e.preventDefault();
                setIsBreached(true);
                return false;
            }

            // Bloquear Ctrl+U (View Source)
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                setIsBreached(true);
                return false;
            }

            // Bloquear Ctrl+S (Save Page)
            if (e.ctrlKey && e.keyCode === 83) {
                e.preventDefault();
                setIsBreached(true);
                return false;
            }
        };

        // 3. Bloqueio de Botão Direito
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        // 4. Detecção de DevTools via Debugger e Diferença de Janela
        const detectDevTools = () => {
            const threshold = 160;
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;

            if (widthThreshold || heightThreshold) {
                setIsBreached(true);
            } else {
                // Se a janela for fechada, podemos opcionalmente restaurar (mas o user quer "escondendo tudo")
                // No entanto, vamos manter o estado breached se ele já tentou abrir.
            }
        };

        // 5. Anti-Debugging Loop (Debugger Trap)
        // Isso pausa a execução se o DevTools estiver aberto, tornando-o inútil
        const debugTrap = setInterval(() => {
            // debugger; // Descomente para máxima chatice, mas pode atrapalhar o dev legítimo em ambiente local
            if (isBreached) {
                showDevMessage();
            }
        }, 1000);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('resize', detectDevTools);

        // Check inicial
        showDevMessage();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('resize', detectDevTools);
            clearInterval(debugTrap);
        };
    }, []);

    if (!isBreached) return null;

    return (
        <div className="fixed inset-0 z-[999999] bg-[#020617] flex items-center justify-center p-6 backdrop-blur-3xl">
            <div className="max-w-xl w-full">
                <div className="glass-strong border border-primary/20 rounded-[2.5rem] p-12 relative overflow-hidden group">
                    {/* Background effects */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-neural"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/30 mb-8 animate-bounce shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                            <ShieldAlert size={48} className="text-primary" />
                        </div>

                        <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">
                            MODO DE SEGURANÇA <span className="text-primary">ATIVADO</span>
                        </h2>

                        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                            Detectamos uma tentativa de acesso não autorizado à estrutura neural do sistema.
                            Para proteger nossa propriedade intelectual, o acesso visual foi suspenso.
                        </p>

                        <div className="grid grid-cols-2 gap-4 w-full mb-8">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center">
                                <Lock size={24} className="text-primary mb-2" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Matrix Lock</span>
                                <span className="text-xs font-bold text-white mt-1">E2E Secure</span>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center">
                                <Cpu size={24} className="text-blue-400 mb-2" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Neural ID</span>
                                <span className="text-xs font-bold text-white mt-1">IP Protected</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 w-full">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                            >
                                <Terminal size={18} /> Renovar Conexão Neural
                            </button>

                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                                Dificuldades técnicas? Contate labwpplus@gmail.com
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityGuard;
