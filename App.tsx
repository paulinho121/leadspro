
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Search, Database, Settings,
  HelpCircle, LogOut, Bell, Menu, X, Sparkles,
  ChevronRight, BrainCircuit, Activity, Globe, Map as MapIcon,
  Zap, ShieldCheck, Rocket, AlertTriangle, ArrowRight, Cpu
} from 'lucide-react';
import LeadDiscovery from './components/LeadDiscovery';
import BentoDashboard from './components/BentoDashboard';
import LeadLab from './components/LeadLab';
import EnrichedLeadsView from './components/EnrichedLeadsView';
import EnrichmentModal from './components/EnrichmentModal';
import WhiteLabelAdmin from './components/WhiteLabelAdmin';
import MasterConsole from './components/MasterConsole';
import LoginPage from './components/LoginPage';
import { DiscoveryService } from './services/discoveryService';
import { EnrichmentService } from './services/enrichmentService';
import { Lead, LeadStatus } from './types';
import { useBranding } from './components/BrandingProvider';
import { supabase } from './lib/supabase';
import { MOCK_LEADS } from './constants';

const App: React.FC = () => {
  const { config, isLoading } = useBranding();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discovery' | 'lab' | 'partner' | 'enriched' | 'master'>('dashboard');
  const [isMaster, setIsMaster] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [showAccountCard, setShowAccountCard] = useState(false);
  const [userName, setUserName] = useState('Administrador');
  const [userTenantId, setUserTenantId] = useState('');

  useEffect(() => {
    const handleAuthCheck = async (currSession: any) => {
      if (currSession?.user) {
        const userEmail = currSession.user.email?.toLowerCase().trim() || '';
        const isMasterByEmail = userEmail === 'paulofernandoautomacao@gmail.com';

        // PRIORIDADE 1: E-mail Fixo (Acesso Imediato)
        if (isMasterByEmail) {
          setIsMaster(true);
          console.log('[Auth] Master Admin detectado via E-MAIL:', userEmail);
        }

        // Carregar nome dos metadados de Auth primeiro (mais rápido)
        const metaName = currSession.user.user_metadata?.full_name;
        if (metaName) setUserName(metaName);

        // PRIORIDADE 2: Banco de Dados (Fallback + Carregar Dados)
        try {
          // Usamos select('*') temporariamente ou listamos colunas de forma segura para evitar 406 
          // caso o esquema no banco tenha sido alterado recentemente
          const { data: profile, error: selectError } = await supabase
            .from('profiles')
            .select('tenant_id, full_name, is_master_admin')
            .eq('id', currSession.user.id)
            .maybeSingle();

          if (selectError) {
            console.error('[Auth] Erro na consulta de perfil (Pode ser o 406):', selectError);
          }

          if (profile) {
            if (profile.full_name) setUserName(profile.full_name);
            const tid = profile.tenant_id || '';
            setUserTenantId(tid);
            console.log('[Auth] Tenant ID carregado:', tid);

            if (profile.is_master_admin || isMasterByEmail) {
              setIsMaster(true);
              console.log('[Auth] Master Admin detectado');
            }
          } else {
            console.warn('[Auth] Perfil não encontrado. Usando fallback de Master se e-mail bater.');
            if (isMasterByEmail) {
              setIsMaster(true);
              setUserTenantId('00000000-0000-0000-0000-000000000000');
            }
          }
        } catch (err) {
          console.error('[Auth] Erro inesperado ao verificar perfil:', err);
        }
      } else {
        setIsMaster(false);
        setUserTenantId('');
      }
    };

    // Check inicial
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) handleAuthCheck(s);
    });

    // Ouvinte de mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) handleAuthCheck(s);
      else setIsMaster(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // SEGURANÇA: Bloqueio de Inspeção e Proteção de Propriedade Intelectual
  // SEGURANÇA: Bloqueio de Inspeção e Proteção de Propriedade Intelectual
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Bloquear Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
      }
      // Bloquear Ctrl+U (Ver código fonte)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
      // Bloquear Ctrl+S (Salvar página)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    console.log('🔒 Proteção de IP Ativada: Sistemas de inspeção desabilitados.');

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sistema de Bootstrap para Provisionamento Automático de Tenant
  useEffect(() => {
    const bootstrap = async () => {
      console.log('--- STARTUP: BOOTSTRAP SYSTEM ---');

      try {
        const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
        let tId = tenants?.[0]?.id;

        if (!tId) {
          console.log('[Bootstrap] Criando Tenant de Demonstração...');
          const { data: nt } = await supabase.from('tenants')
            .insert([{ name: 'Lead Demo', slug: 'demo-' + Math.random().toString(36).slice(2, 5) }])
            .select().single();

          if (nt) {
            await supabase.from('white_label_configs').insert([{
              tenant_id: nt.id,
              platform_name: 'LeadFlow Neural'
            }]);
            window.location.reload();
            return;
          }
        }

        console.log('✅ BOOTSTRAP READY');
        if (config.tenantId !== 'default') {
          fetchLeads();
        }
      } catch (err) {
        console.error('[Bootstrap] Erro:', err);
      }
    };

    bootstrap();
  }, [config.tenantId]);

  const fetchLeads = async () => {
    // 1. Identificar o Tenant Real do Usuário via Session/Profile
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase.from('profiles').select('tenant_id, is_master_admin').eq('id', session.user.id).single();
    const userTenantId = profile?.tenant_id;
    const activeTenantId = userTenantId || (config.tenantId !== 'default' ? config.tenantId : null);

    if (!activeTenantId) {
      console.warn('[Fetch] Nenhum Tenant ID válido encontrado. Ignorando fetch.');
      setLeads([]);
      return;
    }

    let query = supabase.from('leads').select('*');

    // SEGURANÇA: No modo normal, SEMPRE filtrar pelo Tenant ID real do Perfil do usuário
    if (activeTab !== 'master') {
      query = query.eq('tenant_id', activeTenantId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar leads:', error);
    } else if (data) {
      const formattedLeads: Lead[] = data.map(dbLead => ({
        id: dbLead.id,
        name: dbLead.name,
        website: dbLead.website,
        phone: dbLead.phone,
        industry: dbLead.industry,
        location: dbLead.location,
        status: dbLead.status as LeadStatus,
        details: dbLead.details,
        ai_insights: dbLead.ai_insights,
        socialLinks: dbLead.social_links,
        lastUpdated: dbLead.updated_at
      }));

      // AUTO-CLEANUP: Remove duplicatas visuais
      const seen = new Set();
      const uniqueLeads = formattedLeads.filter(lead => {
        const key = lead.name.toLowerCase().trim() + '|' + (lead.location || '').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setLeads(uniqueLeads);
    }
  };

  // Re-fetch leads when changing tabs to ensure correct isolation/context
  useEffect(() => {
    if (activeTab !== 'master') {
      setLeads([]); // Limpa para evitar vazamento visual antes do novo fetch
    }
    fetchLeads();
  }, [activeTab, config.tenantId]);

  const handleAddLeads = async (newLeads: any[]) => {
    // Deduplicação Inteligente: Evita adicionar leads com o mesmo nome que já estão na lista
    const existingNames = new Set(leads.map(l => l.name.toLowerCase().trim()));

    const uniqueNewLeads = newLeads.filter(l => {
      const normalizedName = l.name.toLowerCase().trim();
      if (existingNames.has(normalizedName)) {
        return false; // Já existe
      }
      existingNames.add(normalizedName); // Evita duplicatas dentro do próprio lote novo
      return true;
    });

    if (uniqueNewLeads.length === 0) {
      console.log('[Deduplicação] Nenhum lead novo encontrado neste lote.');
      return;
    }

    // Se o branding ainda não carregou o ID real, tentamos resolver via perfil se possível
    let activeTenantId = (config.tenantId !== 'default' ? config.tenantId : null);

    if (!activeTenantId && session?.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.tenant_id) {
          activeTenantId = profile.tenant_id;
        }
      } catch (err) {
        console.warn('[Tenant] Falha na busca rápida via perfil (406?), tentando fallback via config.');
      }
    }

    // Fallback Final: Se ainda for null e for o Paulo, usa o tenant master
    if (!activeTenantId && session?.user?.email === 'paulofernandoautomacao@gmail.com') {
      activeTenantId = '00000000-0000-0000-0000-000000000000';
    }

    if (!activeTenantId) {
      console.error('Erro Crítico: Tentativa de salvar leads sem um Tenant ID definido.');
      alert('Aguarde a inicialização do sistema ou recarregue a página.');
      return;
    }

    const leadsToSave = uniqueNewLeads.map(l => ({
      tenant_id: activeTenantId,
      name: l.name,
      website: l.website,
      phone: l.phone,
      industry: l.industry,
      location: l.location,
      status: LeadStatus.NEW,
      details: l.details || {}, // Garante que details sejam salvos
      social_links: l.socialLinks || {}
    }));

    const { data, error } = await supabase
      .from('leads')
      .insert(leadsToSave)
      .select();

    if (error) {
      console.error('Erro ao salvar novos leads:', error);
      const localFormatted = uniqueNewLeads.map(l => ({ ...l, id: Math.random().toString(), status: LeadStatus.NEW }));
      setLeads(prev => [...localFormatted, ...prev]);
    } else {
      fetchLeads();
      setActiveTab('lab');
    }
  };

  const stopEnrichmentSignal = React.useRef(false);

  const handleBulkEnrich = async (leadsToEnrich?: Lead[]) => {
    // Se recebeu uma lista específica do LeadLab, usa ela. Senão, pega todos os novos.
    const targets = leadsToEnrich || leads.filter(l => l.status === LeadStatus.NEW);

    if (targets.length === 0) {
      alert('Nenhum lead novo encontrado para enriquecer neste escopo.');
      return;
    }

    setActiveTab('lab');
    setIsEnriching(true);
    stopEnrichmentSignal.current = false;

    try {
      for (const lead of targets) {
        if (stopEnrichmentSignal.current) {
          console.log('Enriquecimento interrompido pelo usuário.');
          break;
        }

        console.log(`[AI] Motor de Enriquecimento Ativado: ${lead.name}`);

        try {
          const { insights, details, socialData } = await EnrichmentService.enrichLead(lead, config.apiKeys);

          await handleEnrichComplete(lead.id, insights, details, socialData);
        } catch (err) {
          console.error(`Erro ao enriquecer ${lead.name}:`, err);
        }
      }
    } finally {
      setIsEnriching(false);
      stopEnrichmentSignal.current = false;
    }
  };

  const handleEnrichComplete = async (id: string, insights: string, details: any, socialData?: any) => {
    const updatePayload: any = {
      status: LeadStatus.ENRICHED,
      ai_insights: insights,
      details: details,
      updated_at: new Date().toISOString()
    };

    if (socialData) {
      if (socialData.website) updatePayload.website = socialData.website;
      updatePayload.social_links = socialData;
    }

    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar enriquecimento:', error);
    } else {
      fetchLeads();
    }
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'dashboard':
        return <BentoDashboard leads={leads} onEnrich={() => setActiveTab('lab')} onNavigate={setActiveTab} />;
      case 'discovery':
        return <LeadDiscovery onResultsFound={handleAddLeads} onStartEnrichment={handleBulkEnrich} />;
      case 'lab':
        return <LeadLab
          leads={leads}
          onEnrich={setSelectedLead}
          onBulkEnrich={handleBulkEnrich}
          isEnriching={isEnriching}
          onStopEnrichment={() => stopEnrichmentSignal.current = true}
        />;
      case 'enriched':
        return <EnrichedLeadsView leads={leads} />;
      case 'partner':
        return <WhiteLabelAdmin initialTab="api" />;
      case 'master':
        return <MasterConsole />;
      default:
        return <BentoDashboard leads={leads} onEnrich={() => setActiveTab('lab')} onNavigate={setActiveTab} />;
    }
  };

  // Verificação de Chaves de API Ausentes
  const missingKeys = !config.apiKeys?.gemini || !config.apiKeys?.serper;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full"></div>
            <Cpu className="text-primary animate-neural relative z-10" size={80} />
          </div>
          <h2 className="text-white font-black tracking-[0.3em] animate-pulse text-sm">INICIALIZANDO MATRIZ NEURAL</h2>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={setSession} />;
  }

  return (
    <div className="h-screen bg-background text-slate-200 flex font-sans selection:bg-primary/30 selection:text-primary overflow-hidden relative">
      {/* Sidebar Mobile Overlay */}
      {!isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
      <aside className={`glass border-r border-white/5 transition-all duration-500 ease-in-out z-50 flex flex-col 
        fixed md:relative inset-y-0 left-0 
        ${!isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full md:translate-x-0 w-80 md:w-24'}`}>

        <div className="p-6 md:p-8 flex items-center gap-4 group cursor-pointer overflow-hidden" onClick={() => setActiveTab('dashboard')}>
          <div className={`bg-primary/20 p-2 rounded-2xl group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-500 shadow-2xl shadow-primary/20 flex items-center justify-center shrink-0 ${config.logoUrl ? 'bg-white/5' : ''}`}>
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Logo"
                className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              />
            ) : (
              <BrainCircuit className="text-primary" size={32} />
            )}
          </div>
          <div className={`transition-all duration-500 ${!isSidebarOpen || (isSidebarOpen && false) ? 'opacity-100' : 'md:opacity-0 md:hidden'}`}>
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none">{config.platformName.split(' ')[0]}<span className="text-primary italic">{config.platformName.split(' ')[1] || 'Pro'}</span></h1>
            <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] mt-1">Matrix v3.2</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 md:py-8 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} expanded={!isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('dashboard'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<Search size={20} />} label="Extração" active={activeTab === 'discovery'} expanded={!isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('discovery'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<Database size={20} />} label="Laboratório" active={activeTab === 'lab'} expanded={!isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('lab'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<Rocket size={20} />} label="Enriquecidos" active={activeTab === 'enriched'} expanded={!isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('enriched'); if (window.innerWidth < 768) setSidebarOpen(true); }} />

          <div className="pt-8 pb-4">
            {(!isSidebarOpen) && <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Sistemas</p>}
            <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mx-4 mb-4"></div>
          </div>

          <NavItem icon={<Activity size={20} />} label="Histórico" expanded={!isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { }} />
          <NavItem icon={<ShieldCheck size={20} />} label="Parceiro" active={activeTab === 'partner'} expanded={!isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('partner'); if (window.innerWidth < 768) setSidebarOpen(true); }} />

          {isMaster && (
            <NavItem icon={<ShieldCheck className="text-primary" size={20} />} label="Master" active={activeTab === 'master'} expanded={!isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('master'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          )}
        </nav>

        <div className="p-4 mt-auto">
          {showAccountCard && (
            <div className="absolute bottom-28 left-4 right-4 animate-fade-in-up z-[70]">
              <div className="glass border border-primary/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>

                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Informações da Conta</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Operador</p>
                    <p className="text-sm font-bold text-white tracking-tight">{userName}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">ID de Monitoramento</p>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-[10px] font-mono text-primary font-bold">
                          #{userTenantId ? userTenantId.split('-')[0].toUpperCase() : '00000000'}
                        </p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setShowAccountCard(false)}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-all border border-white/5"
                    >
                      Fechar Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            onClick={() => setShowAccountCard(!showAccountCard)}
            className={`glass border border-white/5 rounded-[2rem] p-4 md:p-5 premium-card group cursor-pointer relative overflow-hidden transition-all duration-300 hover:border-primary/30 ${showAccountCard ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}
          >
            <div className={`flex items-center gap-4 transition-all duration-500 ${!isSidebarOpen ? 'opacity-100' : 'md:opacity-0'}`}>
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary p-[2px]"
                  style={{ boxShadow: `0 0 15px ${config.colors.primary}4d` }} // 30% opacity
                >
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-bold text-xs md:text-sm text-white uppercase tracking-tighter">
                    {userName.slice(0, 2)}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-black text-white truncate">{userName.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-400 truncate font-mono">Sessão Segura</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  supabase.auth.signOut();
                  setSession(null);
                  setIsMaster(false);
                }}
                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-400 transition-colors shrink-0 group/logout"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 bg-primary text-slate-900 p-2 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 z-[60] md:flex"
        >
          {!isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(6,182,212,0.05)_0%,_transparent_50%)] overflow-hidden">
        <header className="h-20 md:h-24 border-b border-white/5 flex items-center justify-between px-6 md:px-10 relative z-40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 md:gap-6 ml-8 md:ml-0">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'discovery' && 'Extração'}
              {activeTab === 'lab' && 'Laboratório'}
              {activeTab === 'enriched' && 'Comercial'}
              {activeTab === 'partner' && 'Branding'}
              {activeTab === 'master' && 'Master'}
            </h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={() => {
                console.log('[Global Sync] Recarregando leads...');
                fetchLeads();
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 active:scale-95 transition-all group"
            >
              <Zap size={12} className="text-primary group-hover:animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Sync</span>
            </button>
            <button className="relative group p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
              <Bell size={18} className="text-slate-400 group-hover:text-white transition-colors" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-slate-900"></span>
            </button>
          </div>
        </header>

        {/* ALERTA DE CONFIGURAÇÃO PENDENTE */}
        {missingKeys && activeTab !== 'partner' && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 md:px-10 py-3 flex items-center justify-between animate-fade-in-down shrink-0">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-500 shrink-0" size={18} />
              <p className="text-xs text-slate-400 hidden sm:block">Chaves de API pendentes. <span className="text-white font-bold">Configure para extrair.</span></p>
              <p className="text-xs text-white font-bold sm:hidden">Configurar APIs</p>
            </div>
            <button
              onClick={() => setActiveTab('partner')}
              className="bg-yellow-500 text-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-all"
            >
              Setup
            </button>
          </div>
        )}

        <section className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderActiveSection()}
          </div>
        </section>
      </main>

      {/* Overlays */}
      {selectedLead && (
        <EnrichmentModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onEnrichComplete={handleEnrichComplete}
        />
      )}
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expanded: boolean;
  primaryColor: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, expanded, primaryColor, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 relative group ${active
      ? 'bg-primary/10 text-primary'
      : 'text-slate-500 hover:text-white hover:bg-white/5'
      }`}
  >
    <div
      className="transition-all duration-500 group-hover:scale-110"
      style={{ filter: active ? `drop-shadow(0 0 8px ${primaryColor}80)` : 'none' }}
    >
      {icon}
    </div>
    {expanded && (
      <span className={`text-sm font-bold tracking-tight transition-all duration-500 ${active ? 'text-white' : ''}`}>
        {label}
      </span>
    )}
    {active && (
      <div
        className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
        style={{ boxShadow: `0 0 15px ${primaryColor}` }}
      ></div>
    )}
    {!expanded && active && (
      <div
        className="absolute right-2 w-1.5 h-1.5 bg-primary rounded-full"
        style={{ boxShadow: `0 0 10px ${primaryColor}` }}
      ></div>
    )}
  </button>
);

export default App;
