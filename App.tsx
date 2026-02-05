
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Search, Database, Settings,
  HelpCircle, LogOut, Bell, Menu, X, Sparkles,
  ChevronRight, BrainCircuit, Activity, Globe, Map as MapIcon,
  Zap, ShieldCheck, Rocket, AlertTriangle, ArrowRight
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

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        // Verificação dupla: Perfil + E-mail Master Fixo para segurança máxima
        const isMasterEmail = session.user.email === 'paulofernandoautomacao@gmail.com';

        const { data: profile } = await supabase.from('profiles').select('is_master_admin').eq('id', session.user.id).single();
        if (profile?.is_master_admin || isMasterEmail) setIsMaster(true);
      }
    };
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        supabase.from('profiles').select('is_master_admin').eq('id', session.user.id).single().then(({ data }) => {
          if (data?.is_master_admin) setIsMaster(true);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // SEGURANÇA: Desabilitar Inspeção (F12, Clic Direito, Atalhos)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
      }
      // Ctrl+U (Ver código fonte)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

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

        // Se temos usuário mas ele não tem tenant_id no profile, vamos vincular ao tenant principal
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
          if (!profile?.tenant_id && tId) {
            console.log('[Bootstrap] Vinculando usuário ao tenant:', tId);
            await supabase.from('profiles').update({ tenant_id: tId }).eq('id', session.user.id);
          }
        }

        console.log('✅ TENANT ATIVO:', tId);
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
    if (!config.tenantId || config.tenantId === 'default') return;

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', config.tenantId)
      .order('created_at', { ascending: false });

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
        aiInsights: dbLead.ai_insights,
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
    let activeTenantId = config.tenantId;
    if (activeTenantId === 'default' && session?.user) {
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
      if (profile?.tenant_id) activeTenantId = profile.tenant_id;
    }

    if (activeTenantId === 'default') {
      console.warn('Proteção: Tenant ID ainda é default. Salvando apenas localmente.');
      const localFormatted = uniqueNewLeads.map(l => ({ ...l, id: Math.random().toString(), status: LeadStatus.NEW }));
      setLeads(prev => [...localFormatted, ...prev]);
      setActiveTab('lab');
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
        return <BentoDashboard leads={leads} onEnrich={() => setActiveTab('lab')} />;
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
        return <BentoDashboard leads={leads} onEnrich={() => setActiveTab('lab')} />;
    }
  };

  // Verificação de Chaves de API Ausentes
  const missingKeys = !config.apiKeys?.gemini || !config.apiKeys?.serper;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="text-primary animate-pulse" size={64} />
          <h2 className="text-white font-bold tracking-widest animate-pulse">CARREGANDO MATRIZ NEURAL...</h2>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={setSession} />;
  }

  return (
    <div className="h-screen bg-background text-slate-200 flex font-sans selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Sidebar */}
      <aside className={`glass border-r border-white/5 transition-all duration-500 ease-in-out z-50 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-24'}`}>
        <div className="p-8 flex items-center gap-4 group cursor-pointer overflow-hidden" onClick={() => setActiveTab('dashboard')}>
          <div className={`bg-primary/20 p-2 rounded-2xl group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-500 shadow-2xl shadow-primary/20 flex items-center justify-center ${config.logoUrl ? 'bg-white/5' : ''}`}>
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
          {isSidebarOpen && (
            <div className="transition-all duration-500">
              <h1 className="text-2xl font-black text-white tracking-tighter leading-none">{config.platformName.split(' ')[0]}<span className="text-primary italic">{config.platformName.split(' ')[1] || 'Pro'}</span></h1>
              <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] mt-1">Matrix v3.2</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard Principal" active={activeTab === 'dashboard'} expanded={isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Search size={20} />} label="Extração em Massa" active={activeTab === 'discovery'} expanded={isSidebarOpen} onClick={() => setActiveTab('discovery')} />
          <NavItem icon={<Database size={20} />} label="Laboratório de Leads" active={activeTab === 'lab'} expanded={isSidebarOpen} onClick={() => setActiveTab('lab')} />
          <NavItem icon={<Rocket size={20} />} label="Leads Enriquecidos" active={activeTab === 'enriched'} expanded={isSidebarOpen} onClick={() => setActiveTab('enriched')} />

          <div className="pt-8 pb-4">
            {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Sistemas e IA</p>}
            <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mx-4 mb-4"></div>
          </div>

          <NavItem icon={<Activity size={20} />} label="Histórico Neural" expanded={isSidebarOpen} onClick={() => { }} />
          <NavItem icon={<ShieldCheck size={20} />} label="Painel do Parceiro" active={activeTab === 'partner'} expanded={isSidebarOpen} onClick={() => setActiveTab('partner')} />

          {isMaster && (
            <NavItem icon={<ShieldCheck className="text-primary" size={20} />} label="Painel Master" active={activeTab === 'master'} expanded={isSidebarOpen} onClick={() => setActiveTab('master')} />
          )}
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass border border-white/5 rounded-[2rem] p-5 premium-card group cursor-pointer relative overflow-hidden transition-all duration-300 hover:border-primary/30">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[50px] -mr-10 -mt-10 rounded-full group-hover:bg-primary/10 transition-colors"></div>

            <div className={`flex items-center gap-4 transition-all duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 scale-90'}`}>
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-[2px] shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-bold text-sm text-white">
                    {session?.user?.email?.slice(0, 2).toUpperCase() || 'AD'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-black text-white truncate drop-shadow-md">Admin {config.platformName.split(' ')[0]}</p>
                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold uppercase">PRO</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate font-mono flex items-center gap-1.5">
                  <Activity size={10} className="text-emerald-500" />
                  Sessão Segura
                </p>
              </div>

              <LogOut size={16} className="text-slate-500 hover:text-red-400 cursor-pointer transition-all hover:scale-110" onClick={() => supabase.auth.signOut()} />
            </div>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 bg-primary text-slate-900 p-1.5 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 z-[60]"
        >
          {isSidebarOpen ? <X size={12} /> : <Menu size={12} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(6,182,212,0.05)_0%,_transparent_50%)]">
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-10 relative z-40 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
              {activeTab === 'dashboard' && 'Visão Operacional'}
              {activeTab === 'discovery' && 'Extração Geolocalizada'}
              {activeTab === 'lab' && 'Laboratório de Leads'}
              {activeTab === 'enriched' && 'Gestão Comercial'}
              {activeTab === 'partner' && 'Partner Admin Console'}
              {activeTab === 'master' && 'Master Control Console'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
              <Zap size={14} className="text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync: <span className="text-emerald-500">Online</span></span>
            </div>
            <button className="relative group p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
              <Bell size={20} className="text-slate-400 group-hover:text-white transition-colors" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-slate-900 group-hover:scale-150 transition-all"></span>
            </button>
          </div>
        </header>

        {/* ALERTA DE CONFIGURAÇÃO PENDENTE */}
        {missingKeys && activeTab !== 'partner' && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-10 py-4 flex items-center justify-between animate-fade-in-down">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="text-yellow-500" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Configuração de API Necessária</h4>
                <p className="text-xs text-slate-400">Para utilizar a extração e IA, você precisa configurar suas chaves de API.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('partner')}
              className="bg-yellow-500 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:scale-105 transition-all flex items-center gap-2"
            >
              Configurar Agora <ArrowRight size={14} />
            </button>
          </div>
        )}

        <section className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-10">
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
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, expanded, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 relative group ${active
      ? 'bg-primary/10 text-primary'
      : 'text-slate-500 hover:text-white hover:bg-white/5'
      }`}
  >
    <div className={`transition-all duration-500 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    {expanded && (
      <span className={`text-sm font-bold tracking-tight transition-all duration-500 ${active ? 'text-white' : ''}`}>
        {label}
      </span>
    )}
    {active && (
      <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
    )}
    {!expanded && active && (
      <div className="absolute right-2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
    )}
  </button>
);

export default App;
