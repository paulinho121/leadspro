
import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useStore } from '../store/useStore';
import { PicoClawService } from '../services/picoClawService';

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
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'config' | 'picoclaw' | 'scripts'>('chat');
  const [isCommandsOpen, setIsCommandsOpen] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'SYNCING'>(PicoClawService.getBridgeStatus());
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [suggestedScripts, setSuggestedScripts] = useState<{id: string, title: string, content: string, type: string}[]>([
    {
      id: '1',
      title: 'Abordagem Odonto Sniper (Frio)',
      type: 'WhatsApp',
      content: 'Olá, [Nome do Dono]! Vi que sua clínica em [Bairro] tem tido uma excelente avaliação no Google. Notei um ponto na sua presença digital que pode estar fazendo você perder agendamentos para concorrentes próximos. Faz sentido conversarmos 2 min sobre como resolver isso?'
    }
  ]);
  
  const { creditBalance } = useStore();
  const queryClient = useQueryClient();
  
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

      // Atualizar saldo de créditos imediatamente após o consumo
      queryClient.invalidateQueries({ queryKey: ['wallet', userTenantId] });
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    const userInput = input;
    setInput('');
    setIsProcessing(true);

    try {
      const response = await PicoClawService.chat(userTenantId, userInput, apiKeys);
      
      const reply: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, reply]);
    } catch (error) {
      console.error('[AgentMatrix] Chat integration failed:', error);
      toast.error('Erro de Comunicação', 'Não consegui me conectar com a Matriz Neural agora.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivateBridge = async () => {
    setIsProcessing(true);
    try {
      await PicoClawService.initializeBridge(userTenantId, (status) => {
        setBridgeStatus(status as any);
        if (status === 'CONNECTED') {
          setLastSync(new Date().toLocaleTimeString());
          toast.success('Ponte Ativada', 'O Agente PicoClaw agora tem controle total da Matriz.');
        }
      });
    } catch (error) {
      toast.error('Falha de Conexão', 'Não foi possível estabelecer a ponte neural.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickCommand = (cmd: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: cmd,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);
    
    // Simulação de resposta imediata para comandos rápidos
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Protocolo "${cmd}" reconhecido. Ativando módulos neurais de resposta rápida...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, reply]);
      setIsProcessing(false);
    }, 1000);
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
          <button 
            onClick={() => setActiveSubTab('scripts')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'scripts' ? 'bg-primary text-slate-900' : 'text-slate-500 hover:text-white'}`}
          >
            Scripts_Neural
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
          ) : activeSubTab === 'scripts' ? (
            <div className="flex-1 glass rounded-[2.5rem] border-white/5 p-8 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Script Center</h3>
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase">IA-Generated</div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {suggestedScripts.map(script => (
                  <div key={script.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 hover:border-primary/30 transition-all group animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-bold">{script.title}</h4>
                        <span className="text-[10px] text-slate-500 uppercase font-black">{script.type} Protocol</span>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(script.content);
                          toast.success('Copiado', 'Script copiado para a área de transferência.');
                        }}
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-slate-900 transition-all"
                      >
                        <Command size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 italic leading-relaxed">"{script.content}"</p>
                    <div className="pt-4 border-t border-white/5 flex gap-4">
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                        <Zap size={12} className="text-primary" /> Gatilho: Autoridade
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                        <Target size={12} className="text-secondary" /> Foco: Agendamento
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 glass rounded-[2.5rem] border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-10 group relative overflow-hidden">
              <div className="relative">
                <div className={`absolute inset-0 blur-[80px] rounded-full transition-all duration-1000 ${bridgeStatus === 'CONNECTED' ? 'bg-emerald-500/20' : 'bg-primary/20'}`}></div>
                <Cpu className={`w-24 h-24 lg:w-32 lg:h-32 mb-4 relative z-10 transition-colors ${bridgeStatus === 'CONNECTED' ? 'text-emerald-500 animate-pulse' : 'text-primary'}`} />
              </div>
              
              <div className="max-w-xl space-y-6 relative z-10">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Gateway PicoClaw</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  O PicoClaw está pronto para assumir o controle estratégico. Ative a ponte para permitir que o agente realize automações, enriquecimento e monitoramento de churn de forma autônoma.
                </p>
                
                <div className="bg-black/50 p-6 rounded-3xl border border-white/10 text-left font-mono text-[10px] space-y-2">
                  <div className={`flex items-center gap-2 font-bold ${
                    bridgeStatus === 'CONNECTED' ? 'text-emerald-500' : 
                    bridgeStatus === 'SYNCING' ? 'text-primary animate-pulse' : 'text-slate-500'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      bridgeStatus === 'CONNECTED' ? 'bg-emerald-500' : 
                      bridgeStatus === 'SYNCING' ? 'bg-primary' : 'bg-slate-700'
                    }`}></div>
                    STATUS: {bridgeStatus}
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>ENDPOINT: <span className="text-primary italic">/api/v1/picoclaw/bridge</span></span>
                    {lastSync && <span className="text-[8px]">LAST_SYNC: {lastSync}</span>}
                  </div>
                  <div className="text-slate-500">
                    PROTOCOL: <span className="text-secondary">SECURE_NEURAL_WEBSOCKET</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => setShowDocs(!showDocs)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all"
                  >
                    {showDocs ? 'Ocultar Manifest' : 'Visualizar Docs'}
                  </button>
                  <button 
                    onClick={handleActivateBridge}
                    disabled={bridgeStatus === 'CONNECTED' || isProcessing}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${
                      bridgeStatus === 'CONNECTED' ? 'bg-emerald-500 text-slate-900 shadow-emerald-500/20' : 'bg-primary text-slate-900 shadow-primary/20'
                    }`}
                  >
                    {bridgeStatus === 'CONNECTED' ? 'Ponte Ativa' : bridgeStatus === 'SYNCING' ? 'Sincronizando...' : 'Ativar Integração'}
                  </button>
                </div>
              </div>

              {/* Technical Manifest Overlay */}
              {showDocs && (
                <div className="absolute inset-0 bg-slate-950/95 z-50 p-8 overflow-y-auto animate-in fade-in zoom-in duration-300">
                  <div className="max-w-2xl mx-auto space-y-6 text-left">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <h4 className="text-xl font-black text-white uppercase tracking-widest">Neural Manifest v2.4</h4>
                      <button onClick={() => setShowDocs(false)} className="text-slate-500 hover:text-white">✕</button>
                    </div>
                    <div className="space-y-4 font-mono text-[11px] text-slate-400">
                      <p className="text-primary font-bold"># PicoClaw Agent Protocol</p>
                      <p>O framework PicoClaw opera em camada 7 utilizando WebSockets para push imediato de leads e enriquecimento assíncrono.</p>
                      <div className="bg-black/50 p-4 rounded-xl border border-white/5 space-y-1">
                        <p className="text-emerald-500">GET /api/v1/picoclaw/leads</p>
                        <p className="text-emerald-500">POST /api/v1/picoclaw/enrich</p>
                        <p className="text-secondary">LISTEN agent-command::* (Realtime)</p>
                      </div>
                      <p className="font-bold text-white uppercase">Capacidades Ativas:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Detecção Proativa de Churn via Logs de Atividade</li>
                        <li>Enriquecimento em Massa via Matriz Neural</li>
                        <li>Sincronização de CRM Externa (White Label Ready)</li>
                      </ul>
                    </div>
                    <button 
                      onClick={() => setShowDocs(false)}
                      className="w-full py-4 bg-primary text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest"
                    >
                      Entendido, Fechar Manifest
                    </button>
                  </div>
                </div>
              )}
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
                {creditBalance < 1000 ? (
                  <span className="text-[9px] font-black text-primary uppercase animate-pulse">Critical</span>
                ) : (
                  <span className="text-[9px] font-black text-emerald-500 uppercase">Operational</span>
                )}
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r ${creditBalance < 1000 ? 'from-primary to-rose-500' : 'from-emerald-500 to-primary'}`}
                  style={{ 
                    width: `${Math.min(100, Math.max(5, creditBalance < 1000 ? 85 + (1000 - creditBalance) / 100 : (1 - (creditBalance / 1000000)) * 100))}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className={`glass rounded-[2rem] p-6 border-white/5 flex flex-col relative overflow-hidden group transition-all duration-500 ${isCommandsOpen ? 'flex-1' : 'flex-none'}`}>
            <div className="absolute top-0 right-0 p-4">
              <Settings size={16} className="text-slate-600 hover:text-white cursor-pointer transition-colors" />
            </div>
            
            <div 
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => setIsCommandsOpen(!isCommandsOpen)}
            >
              <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-primary/20 shrink-0">
                <Command size={24} className="text-primary" />
              </div>
              <div>
                <h4 className="text-white font-black uppercase tracking-widest text-sm leading-none mb-1">Quick Commands</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sugestões baseadas no seu perfil</p>
              </div>
            </div>

            {isCommandsOpen && (
              <div className="space-y-3 mt-6 animate-in slide-in-from-top-4 duration-500">
                {[
                  'Sugira abordagens frias',
                  'Analise o ticket médio',
                  'Gere follow-up WhatsApp',
                  'Inicie varredura SP'
                ].map((cmd, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 cursor-pointer group/item transition-all"
                    onClick={() => handleQuickCommand(cmd)}
                  >
                    <span className="text-[10px] text-slate-400 group-hover/item:text-white uppercase font-bold transition-colors">{cmd}</span>
                    <ChevronRight size={14} className="text-slate-700 group-hover/item:text-primary transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentMatrix;
