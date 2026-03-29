
import React, { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, 
  Send, 
  Bot, 
  Target, 
  MapPin, 
  DollarSign, 
  Users, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Activity,
  Table as TableIcon,
  MessageSquare,
  Sparkles,
  Command,
  Settings,
  ChevronRight
} from 'lucide-react';
import { toast } from './Toast';
import { DiscoveryService } from '../services/discoveryService';

interface AgentMatrixProps {
  userTenantId: string;
  apiKeys?: any;
  onLeadsCaptured?: (leads: any[]) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTable?: boolean;
  tableData?: any[];
}

export const AgentMatrix: React.FC<AgentMatrixProps> = ({ userTenantId, apiKeys, onLeadsCaptured }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu Agente de Prospecção LeadMatrix. Estou pronto para iniciar a varredura neural do seu mercado. Por favor, preencha os parâmetros abaixo ou diga-me o que deseja buscar.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [params, setParams] = useState({
    nicho: '',
    cidade: '',
    icp: '',
    ticket: ''
  });
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'config' | 'picoclaw'>('chat');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartProspecting = async () => {
    if (!params.nicho || !params.cidade) {
      toast.error('Campos Obrigatórios', 'Por favor, informe no mínimo o Nicho e a Cidade para começar.');
      return;
    }

    setIsProcessing(true);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Iniciar prospecção para ${params.nicho} em ${params.cidade}. ICP: ${params.icp}, Ticket: ${params.ticket}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Call real discovery engine
    try {
      const results = await DiscoveryService.performDeepScan(
        params.nicho, 
        params.cidade, 
        userTenantId, 
        apiKeys
      );

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: results.length > 0 
          ? `Varredura neural concluída. Identifiquei ${results.length} oportunidades de alta conversão em ${params.cidade}. Abaixo está a visão estratégica detalhada:`
          : `Varredura concluída, mas não identifiquei novos leads com os critérios "SNIPER" em ${params.cidade} agora. Deseja ampliar o raio de busca ou tentar um nicho relacionado?`,
        timestamp: new Date(),
        isTable: results.length > 0,
        tableData: results.map(lead => ({
          Empresa: lead.name,
          Segmento: lead.industry || params.nicho,
          Cidade: lead.location || params.cidade,
          Potencial: lead.details?.rating ? `${lead.details.rating}/5.0` : 'ALTO',
          Estrategia: 'Neural'
        }))
      };
      setMessages(prev => [...prev, assistantMsg]);
      toast.success('Protocolo Concluído', `Encontrados ${results.length} leads qualificados.`);

      // Sincronizar com o Laboratório se houver resultados
      if (results.length > 0 && onLeadsCaptured) {
        onLeadsCaptured(results);
      }
    } catch (error: any) {
      console.error('[AgentMatrix] Discovery Error:', error);
      toast.error('Erro no Protocolo', 'Não foi possível completar a varredura neural. Verifique sua conexão ou créditos.');
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Houve uma falha na sincronização neural. Certifique-se de que suas chaves de API estão ativas ou tente novamente em alguns instantes.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulação de resposta da IA
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Estou processando sua solicitação com base nos dados reais do mercado. Deseja que eu execute a varredura automática agora ou que eu refine o perfil do cliente ideal primeiro?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, reply]);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Header Strategist */}
      <div className="glass rounded-[2rem] p-6 border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-2xl border border-primary/30 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            <BrainCircuit className="text-primary animate-neural" size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Agent Matrix</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Agente Inteligente Ativo • Protocolo v4.1</span>
            </div>
          </div>
        </div>

        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveSubTab('chat')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'chat' ? 'bg-primary text-slate-900' : 'text-slate-500 hover:text-white'}`}
          >
            Chat_Neural
          </button>
          <button 
            onClick={() => setActiveSubTab('config')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'config' ? 'bg-primary text-slate-900' : 'text-slate-500 hover:text-white'}`}
          >
            Parameters
          </button>
          <button 
            onClick={() => setActiveSubTab('picoclaw')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'picoclaw' ? 'bg-primary text-slate-900' : 'text-slate-500 hover:text-white'}`}
          >
            PicoClaw_Bridge
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Main Interface: Chat or Config */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {activeSubTab === 'chat' ? (
            <div className="flex-1 glass rounded-[2.5rem] border-white/5 flex flex-col overflow-hidden relative">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[80%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-slate-800 border-white/10' : 'bg-primary/10 border-primary/20'}`}>
                        {msg.role === 'user' ? <Users size={18} className="text-slate-400" /> : <Bot size={18} className="text-primary" />}
                      </div>
                      <div className="space-y-3">
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-slate-900 font-bold' : 'bg-white/5 text-slate-300 border border-white/5'}`}>
                          {msg.content}
                        </div>
                        
                        {msg.isTable && msg.tableData && (
                          <div className="bg-black/50 border border-white/10 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                            <table className="w-full text-[10px] text-left">
                              <thead className="bg-white/5 text-slate-500 font-black uppercase tracking-widest">
                                <tr>
                                  <th className="p-3">Empresa</th>
                                  <th className="p-3">Segmento</th>
                                  <th className="p-3">Potencial</th>
                                  <th className="p-3">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {msg.tableData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 text-white font-bold">{row.Empresa}</td>
                                    <td className="p-3 text-slate-400">{row.Segmento}</td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase">
                                        {row.Potencial}
                                      </span>
                                    </td>
                                    <td className="p-3 text-emerald-500 font-black cursor-pointer hover:underline uppercase">Visualizar</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        <span className="text-[10px] text-slate-600 font-mono block">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Cpu size={18} className="text-primary animate-spin-slow" />
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-white/5 bg-black/20">
                <form onSubmit={handleSendMessage} className="relative group">
                  <input
                    type="text"
                    placeholder="Digite um comando para o Agente... (ex: 'Me sugira 5 abordagens para arquitetos')"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-white outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-slate-600"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="absolute right-3 top-2.5 bottom-2.5 px-4 bg-primary text-slate-900 rounded-xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send size={16} />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          ) : activeSubTab === 'config' ? (
            <div className="flex-1 glass rounded-[2.5rem] border-white/5 p-8 overflow-y-auto space-y-10 custom-scrollbar">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Parametrização Neural</h3>
                <p className="text-slate-500 text-sm">Defina os alvos estratégicos para que o Agente opere em modo sniper.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nicho / Vertical</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-5 text-slate-600 group-focus-within:text-primary transition-colors">
                      <Target size={20} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Ex: Academias, Clínicas..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      value={params.nicho}
                      onChange={(e) => setParams({ ...params, nicho: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cidade / Região</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-5 text-slate-600 group-focus-within:text-primary transition-colors">
                      <MapPin size={20} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Ex: São Paulo, SP"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      value={params.cidade}
                      onChange={(e) => setParams({ ...params, cidade: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Perfil de Cliente (ICP)</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-5 text-slate-600 group-focus-within:text-primary transition-colors">
                      <Users size={20} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Ex: Empresas com +10 funcionários"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      value={params.icp}
                      onChange={(e) => setParams({ ...params, icp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ticket Médio (Venda)</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-5 text-slate-600 group-focus-within:text-primary transition-colors">
                      <DollarSign size={20} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Ex: R$ 5.000,00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      value={params.ticket}
                      onChange={(e) => setParams({ ...params, ticket: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleStartProspecting}
                disabled={isProcessing}
                className="w-full bg-primary hover:bg-primary/90 text-slate-900 py-6 rounded-2xl font-black text-lg uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isProcessing ? <Activity className="animate-spin" /> : <Zap fill="currentColor" />}
                INICIAR PROTOCOLO DE PROSPECÇÃO
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-3">
                  <div className="text-primary"><ShieldCheck size={28} /></div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Filtro Antispam</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">O AGENTE EVITA CONTABILIDADES E DADOS GENÉRICOS AUTOMATICAMENTE.</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-3">
                  <div className="text-secondary"><Sparkles size={28} /></div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Sugestão de Cópia</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">GERA MENSAGENS DE WHATSAPP PERSONALIZADAS PARA CADA LEAD.</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-3">
                  <div className="text-emerald-500"><Activity size={28} /></div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Painel de Dores</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">DETECTA POSSÍVEIS PROBLEMAS NO SEGMENTO PARA ARGUMENTAÇÃO.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 glass rounded-[2.5rem] border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-10 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full group-hover:bg-primary/30 transition-all duration-1000"></div>
                <Cpu className="text-primary w-24 h-24 lg:w-32 lg:h-32 mb-4 animate-neural relative z-10" />
              </div>
              
              <div className="max-w-xl space-y-6">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Gateway PicoClaw</h3>
                <p className="text-slate-400 leading-relaxed">
                  Habilite o controle total do LeadMatrix via agentes externos. O PicoClaw é um framework ultra-leve que permite automações complexas em dispositivos de borda.
                </p>
                
                <div className="bg-black/50 p-6 rounded-3xl border border-white/10 text-left font-mono text-[10px] space-y-2">
                  <div className="text-emerald-500 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    STATUS: READY_FOR_CONNECTION
                  </div>
                  <div className="text-slate-500">
                    ENDPOINT: <span className="text-primary">/api/v1/picoclaw/bridge</span>
                  </div>
                  <div className="text-slate-500">
                    PROTOCOL: <span className="text-secondary">SECURE_WEBSOCKET</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all">
                    Visualizar Docs
                  </button>
                  <button className="flex-1 py-4 bg-primary text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                    Ativar Integração
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info / Activity */}
        <div className="w-full md:w-80 flex flex-col gap-6">
          <div className="glass rounded-[2rem] p-6 border-white/5 space-y-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Neural Activity</h4>
            
            <div className="space-y-4">
              {[
                { label: 'Uptime', value: '99.9%', icon: <Zap size={14} className="text-emerald-500" /> },
                { label: 'Model', value: 'Gemini Pro', icon: <Cpu size={14} className="text-primary" /> },
                { label: 'Response', value: '1.2s', icon: <Activity size={14} className="text-secondary" /> },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    {stat.icon}
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <span className="text-xs font-black text-white font-mono">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Credit Usage</span>
                <span className="text-[9px] font-black text-primary uppercase">Critical</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-gradient-to-r from-primary to-secondary"></div>
              </div>
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border-white/5 flex-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <Settings size={16} className="text-slate-600 hover:text-white cursor-pointer transition-colors" />
            </div>
            
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
              <Command size={24} className="text-primary" />
            </div>

            <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">Quick Commands</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Sugestões baseadas no seu perfil</p>

            <div className="space-y-3">
              {[
                'Sugira abordagens frias',
                'Analise o ticket médio',
                'Gere follow-up WhatsApp',
                'Inicie varredura SP'
              ].map((cmd, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 cursor-pointer group/item transition-all"
                  onClick={() => setInput(cmd)}
                >
                  <span className="text-[10px] text-slate-400 group-hover/item:text-white uppercase font-bold transition-colors">{cmd}</span>
                  <ChevronRight size={14} className="text-slate-700 group-hover/item:text-primary transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentMatrix;
