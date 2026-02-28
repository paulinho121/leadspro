
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Handle,
    Position,
    Panel,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Zap, Brain, MessageSquare, Target, Plus,
    Settings, Activity, Cpu, Webhook, Trash2,
    Save, Play, X, ChevronRight, Sparkles, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';

const nodeStyles = "glass-strong border border-white/10 rounded-3xl p-6 min-w-[260px] shadow-2xl relative overflow-hidden transition-all duration-500";

// --- CUSTOM NODES ---

const TriggerNode = ({ data, selected }: { data: any, selected: boolean }) => (
    <div className={`${nodeStyles} ${selected ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-amber-500/20'} bg-amber-500/[0.03] backdrop-blur-3xl group/node`}>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-amber-500 border-2 border-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
        <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg">
                <Zap size={22} className={selected ? 'animate-pulse' : ''} />
            </div>
            <div>
                <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-[0.4em] block mb-1 font-mono">Input_Vector</span>
                <h4 className="text-white font-black uppercase text-sm italic tracking-tighter">{data.label}</h4>
            </div>
        </div>
        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest leading-none">Status: Esperando Sinal</span>
        </div>
    </div>
);

const BrainNode = ({ data, selected }: { data: any, selected: boolean }) => (
    <div className={`${nodeStyles} ${selected ? 'border-primary/60 ring-2 ring-primary/20' : 'border-primary/20'} bg-primary/[0.03] backdrop-blur-3xl group/node font-mono`}>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary border-2 border-slate-900 shadow-[0_0_10px_var(--color-primary)]" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary border-2 border-slate-900 shadow-[0_0_10px_var(--color-primary)]" />
        <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                <Brain size={22} className={selected ? 'scale-110' : ''} />
            </div>
            <div>
                <span className="text-[8px] font-black text-primary/60 uppercase tracking-[0.4em] block mb-1">Neural_Blade_v2</span>
                <h4 className="text-white font-black uppercase text-sm italic tracking-tighter">{data.label}</h4>
            </div>
        </div>
        <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-primary/20 text-[7px] font-black text-primary rounded-md border border-primary/20 italic">PRECISION_SDR</span>
        </div>
    </div>
);

const ActionNode = ({ data, selected }: { data: any, selected: boolean }) => (
    <div className={`${nodeStyles} ${selected ? 'border-emerald-500/60 ring-2 ring-emerald-500/20' : 'border-emerald-500/20'} bg-emerald-500/[0.03] backdrop-blur-3xl group/node`}>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
        <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-lg">
                <MessageSquare size={22} />
            </div>
            <div>
                <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.4em] block mb-1 font-mono">Output_Command</span>
                <h4 className="text-white font-black uppercase text-sm italic tracking-tighter">{data.label}</h4>
            </div>
        </div>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic opacity-60">Execução Automática_Ok</p>
    </div>
);

const nodeTypes = {
    triggerNode: TriggerNode,
    brainNode: BrainNode,
    actionNode: ActionNode,
};

// --- MAIN BUILDER ---

const VisualWorkflowBuilder = ({ tenantId }: { tenantId: string }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [workflowName, setWorkflowName] = useState('Estratégia Neural Principal');
    const [isSaving, setIsSaving] = useState(false);
    const [openPanel, setOpenPanel] = useState<'variables' | 'conditions' | null>(null);

    // Carregar workflow inicial do banco
    useEffect(() => {
        const loadWorkflow = async () => {
            const { data } = await supabase
                .from('visual_workflows')
                .select('*')
                .eq('tenant_id', tenantId)
                .limit(1)
                .single();

            if (data) {
                setWorkflowName(data.name);
                setNodes(data.nodes || []);
                setEdges(data.edges || []);
            } else {
                // Nodes padrão se não houver nada salvo
                setNodes([
                    { id: '1', type: 'triggerNode', position: { x: 100, y: 100 }, data: { label: 'Webhook: Novo Lead' } },
                    { id: '2', type: 'brainNode', position: { x: 450, y: 100 }, data: { label: 'Classificador de Intenção' } },
                    { id: '3', type: 'actionNode', position: { x: 800, y: 100 }, data: { label: 'Responder WhatsApp' } },
                ]);
            }
        };
        if (tenantId) loadWorkflow();
    }, [tenantId, setNodes, setEdges]);

    const onConnect = useCallback((params: Connection | Edge) => {
        setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--color-primary)', strokeWidth: 2 } }, eds));
    }, [setEdges]);

    const onNodeClick = (_: any, node: Node) => {
        setSelectedNode(node);
    };

    const addNode = (type: 'triggerNode' | 'brainNode' | 'actionNode') => {
        const id = `${nodes.length + 1}`;
        const newNode: Node = {
            id,
            type,
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            data: { label: type === 'triggerNode' ? 'Novo Gatilho' : type === 'brainNode' ? 'Análise Neural' : 'Nova Ação' },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const deleteSelected = () => {
        if (selectedNode) {
            setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
            setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
            setSelectedNode(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('visual_workflows')
                .upsert({
                    tenant_id: tenantId,
                    name: workflowName,
                    nodes,
                    edges,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id, name' });

            if (error) throw error;
            toast.success('Workflow implantado!', 'Fluxo Neural salvo com sucesso.');
        } catch (err) {
            console.error('Erro ao salvar workflow:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const updateNodeLabel = (label: string) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, label } };
                }
                return node;
            })
        );
        setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, label } } : null);
    };

    const updateNodeData = (key: string, value: any) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, [key]: value } };
                }
                return node;
            })
        );
        setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
    };

    const insertVariable = (variable: string) => {
        const current = selectedNode?.data?.label || '';
        updateNodeLabel(current + ' ' + variable);
    };

    const DYNAMIC_VARIABLES = [
        { tag: '{name}', label: 'Nome', desc: 'Nome do lead/empresa' },
        { tag: '{phone}', label: 'Telefone', desc: 'Número de WhatsApp' },
        { tag: '{email}', label: 'Email', desc: 'Endereço de e-mail' },
        { tag: '{industry}', label: 'Setor', desc: 'Segmento de atuação' },
        { tag: '{city}', label: 'Cidade', desc: 'Localização do lead' },
        { tag: '{insights}', label: 'Insights IA', desc: 'Análise gerada pela IA' },
    ];


    return (
        <div className="h-[800px] w-full bg-slate-950/30 rounded-[3.5rem] border border-white/5 relative overflow-hidden group shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-fade-in flex">

            {/* CANVAS AREA */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    snapToGrid
                    snapGrid={[20, 20]}
                    className="bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.03)_1px,transparent_0)] bg-[length:40px_40px]"
                >
                    <Background color="#111" gap={40} />
                    <Controls className="bg-slate-900 border-white/10 fill-white !shadow-2xl" />

                    {/* Header HUD */}
                    <Panel position="top-left" className="m-8 flex flex-col gap-6 w-[350px]">
                        <div className="p-8 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group/hud">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover/hud:bg-primary/10 transition-all"></div>

                            <div className="flex items-center gap-3 mb-3">
                                <Activity className="text-primary animate-pulse" size={14} />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Arquitetura_Studio_v1.5</span>
                            </div>

                            <input
                                value={workflowName}
                                onChange={e => setWorkflowName(e.target.value)}
                                className="bg-transparent border-none text-2xl font-black text-white italic tracking-tighter uppercase focus:outline-none w-full"
                            />
                            <p className="text-[10px] text-slate-600 font-mono mt-2 font-bold uppercase tracking-widest">Sincronização Neural Ativa</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-4 bg-primary text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                            >
                                <Save size={16} /> {isSaving ? 'Gravando...' : 'Implantar Fluxo'}
                            </button>
                            <button className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 rounded-2xl transition-all shadow-xl">
                                <Play size={20} className="fill-current" />
                            </button>
                        </div>
                    </Panel>

                    {/* Node Palette (Bottom Left) */}
                    <Panel position="bottom-left" className="m-8">
                        <div className="flex gap-3 p-3 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                            <button onClick={() => addNode('triggerNode')} className="p-4 bg-amber-500/10 text-amber-500 hover:bg-amber-500 border border-amber-500/20 hover:text-slate-900 rounded-2xl transition-all group flex flex-col items-center gap-1">
                                <Zap size={18} />
                                <span className="text-[8px] font-black uppercase">Gatilho</span>
                            </button>
                            <button onClick={() => addNode('brainNode')} className="p-4 bg-primary/10 text-primary hover:bg-primary border border-primary/20 hover:text-slate-900 rounded-2xl transition-all group flex flex-col items-center gap-1">
                                <Brain size={18} />
                                <span className="text-[8px] font-black uppercase">Cérebro</span>
                            </button>
                            <button onClick={() => addNode('actionNode')} className="p-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 border border-emerald-500/20 hover:text-slate-900 rounded-2xl transition-all group flex flex-col items-center gap-1">
                                <MessageSquare size={18} />
                                <span className="text-[8px] font-black uppercase">Ação</span>
                            </button>
                        </div>
                    </Panel>
                </ReactFlow>
            </div>

            {/* PROPERTIES SIDEBAR */}
            <div className={`w-[400px] bg-slate-900/80 backdrop-blur-3xl border-l border-white/10 p-10 flex flex-col transition-all duration-700 ${selectedNode ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 absolute right-0'}`}>
                {selectedNode ? (
                    <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl border ${selectedNode.type === 'triggerNode' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : selectedNode.type === 'brainNode' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                    {selectedNode.type === 'triggerNode' ? <Zap size={24} /> : selectedNode.type === 'brainNode' ? <Brain size={24} /> : <MessageSquare size={24} />}
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Parâmetros</h4>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{selectedNode.type}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedNode(null)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">Nome do Componente</label>
                                <input
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/40 transition-all font-bold text-sm tracking-tight"
                                    value={selectedNode.data.label}
                                    onChange={e => updateNodeLabel(e.target.value)}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4 italic">Configurações Avançadas</label>
                                <div className="space-y-3">
                                    {/* Variáveis Dinâmicas */}
                                    <div className="rounded-2xl border border-white/5 overflow-hidden">
                                        <button
                                            onClick={() => setOpenPanel(openPanel === 'variables' ? null : 'variables')}
                                            className="w-full p-4 bg-white/[0.02] flex items-center justify-between group/opt hover:bg-white/[0.04] transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Settings size={16} className="text-slate-600 group-hover/opt:text-primary transition-colors" />
                                                <span className="text-xs font-bold text-slate-400">Variáveis Dinâmicas</span>
                                            </div>
                                            <ChevronRight size={14} className={`text-slate-700 transition-transform duration-300 ${openPanel === 'variables' ? 'rotate-90' : ''}`} />
                                        </button>
                                        {openPanel === 'variables' && (
                                            <div className="p-4 bg-black/20 border-t border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Clique para inserir no nome do componente</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {DYNAMIC_VARIABLES.map(v => (
                                                        <button
                                                            key={v.tag}
                                                            onClick={() => insertVariable(v.tag)}
                                                            title={v.desc}
                                                            className="group/var p-3 bg-white/[0.03] hover:bg-primary/10 border border-white/5 hover:border-primary/30 rounded-xl text-left transition-all"
                                                        >
                                                            <span className="block text-[10px] font-black text-primary/80 group-hover/var:text-primary font-mono">{v.tag}</span>
                                                            <span className="block text-[9px] text-slate-600 mt-0.5">{v.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Condições Lógicas */}
                                    <div className="rounded-2xl border border-white/5 overflow-hidden">
                                        <button
                                            onClick={() => setOpenPanel(openPanel === 'conditions' ? null : 'conditions')}
                                            className="w-full p-4 bg-white/[0.02] flex items-center justify-between group/opt hover:bg-white/[0.04] transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Filter size={16} className="text-slate-600 group-hover/opt:text-primary transition-colors" />
                                                <span className="text-xs font-bold text-slate-400">Condições Lógicas</span>
                                            </div>
                                            <ChevronRight size={14} className={`text-slate-700 transition-transform duration-300 ${openPanel === 'conditions' ? 'rotate-90' : ''}`} />
                                        </button>
                                        {openPanel === 'conditions' && (
                                            <div className="p-4 bg-black/20 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Intenção do Lead</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['positive', 'negative', 'neutral', 'question'].map(intent => (
                                                            <button
                                                                key={intent}
                                                                onClick={() => updateNodeData('condition_intent', intent)}
                                                                className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${selectedNode?.data?.condition_intent === intent
                                                                    ? 'bg-primary/20 border-primary/40 text-primary'
                                                                    : 'bg-white/[0.02] border-white/5 text-slate-500 hover:border-white/20'
                                                                    }`}
                                                            >
                                                                {intent === 'positive' ? '✅ Positiva' : intent === 'negative' ? '❌ Negativa' : intent === 'neutral' ? '➖ Neutro' : '❓ Dúvida'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Executar Somente Se</label>
                                                    <select
                                                        value={selectedNode?.data?.condition_only || 'always'}
                                                        onChange={e => updateNodeData('condition_only', e.target.value)}
                                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:border-primary/40"
                                                    >
                                                        <option value="always">Sempre executar</option>
                                                        <option value="first_contact">Primeiro contato</option>
                                                        <option value="no_reply_48h">Sem resposta 48h</option>
                                                        <option value="has_email">Lead tem email</option>
                                                        <option value="has_phone">Lead tem telefone</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10">
                                <button
                                    onClick={deleteSelected}
                                    className="w-full py-5 bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-red-500/0 hover:border-red-500/20 flex items-center justify-center gap-3 italic"
                                >
                                    <Trash2 size={18} /> Remover do Ecossistema
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto pt-20">
                            <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <Sparkles size={16} className="text-primary" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">IA Insight</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed italic">Este componente processa dados em tempo real usando o motor neural v5.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 italic">
                        <Target size={48} className="text-slate-700 mb-6" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Matrix_Awaiting_Node_Selection</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Error boundary wrapper for ReactFlow
const FlowWrapper = (props: any) => (
    <ReactFlowProvider>
        <VisualWorkflowBuilder {...props} />
    </ReactFlowProvider>
);

export default FlowWrapper;
