
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Search, Database, Settings,
  HelpCircle, LogOut, Bell, Menu, X, Sparkles,
  ChevronRight, BrainCircuit, Activity, Globe, Map as MapIcon,
  Zap, ShieldCheck, Rocket, AlertTriangle, ArrowRight, Cpu, LifeBuoy, MessageSquare, TrendingUp
} from 'lucide-react';
import LeadDiscovery from './components/LeadDiscovery';
import BentoDashboard from './components/BentoDashboard';
import LeadLab from './components/LeadLab';
import EnrichedLeadsView from './components/EnrichedLeadsView';
import EnrichmentModal from './components/EnrichmentModal';
import WhiteLabelAdmin from './components/WhiteLabelAdmin';
import MasterConsole from './components/MasterConsole';

import PipelineView from './components/PipelineView';
import AutomationView from './components/AutomationView';
import LoginPage from './components/LoginPage';
import ActivityHistory from './components/ActivityHistory';
import NotificationsList from './components/NotificationsList';
import { DiscoveryService } from './services/discoveryService';
import { EnrichmentService } from './services/enrichmentService';
import { SecretService, TenantSecrets } from './services/secretService';
import { ActivityService } from './services/activityService';
import { IntegrationService } from './services/IntegrationService';
import { RevenueService } from './services/revenueService';
import { BillingService } from './services/billingService';
import { QueueService } from './services/queueService';
import { Lead, LeadStatus } from './types';
import { useStore } from './store/useStore';
import { useLeads } from './hooks/useLeads';
import { useWallet } from './hooks/useWallet';
import { useBranding } from './components/BrandingProvider';
import { supabase } from './lib/supabase';
import { Megaphone, Send as SendIcon, CheckCircle, Info, AlertTriangle as AlertIcon, DollarSign as MoneyIcon } from 'lucide-react';

const App: React.FC = () => {
  const { config, isLoading: brandingLoading } = useBranding();

  // Zustand Store
  const {
    activeTab, setActiveTab,
    isSidebarOpen, setSidebarOpen,
    userTenantId, setUserTenantId,
    creditBalance
  } = useStore();

  const [isMaster, setIsMaster] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [showAccountCard, setShowAccountCard] = useState(false);
  const [userName, setUserName] = useState('Administrador');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSupport, setShowSupport] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '', category: 'technical' });
  const [tenantSecrets, setTenantSecrets] = useState<TenantSecrets>({});

  // React Query Hooks
  const { data: leads = [], refetch: refetchLeads, isLoading: leadsLoading } = useLeads(userTenantId, activeTab);
  const { data: walletBalance } = useWallet(userTenantId);

  // Leads filtrados pela busca
  const filteredLeads = React.useMemo(() => {
    if (!searchTerm) return leads;
    const s = searchTerm.toLowerCase();
    return leads.filter(l => {
      const name = (l.name || '').toLowerCase();
      const industry = (l.industry || '').toLowerCase();
      const location = (l.location || '').toLowerCase();
      const website = (l.website || '').toLowerCase();
      return name.includes(s) || industry.includes(s) || location.includes(s) || website.includes(s);
    });
  }, [leads, searchTerm]);

  // Função auxiliar para logar atividades
  const logActivity = async (action: string, details: string) => {
    if (!userTenantId || !session?.user) return;

    try {
      await supabase.from('activity_logs').insert([{
        tenant_id: userTenantId,
        user_id: session.user.id,
        action,
        details
      }]);
    } catch (err) {
      console.error('Falha ao registrar log:', err);
    }
  };

  // Buscar contagem de notificações não lidas
  useEffect(() => {
    if (!session?.user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Inscrever para novas notificações
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [session]);

  // Sincronização em Tempo Real de Leads
  useEffect(() => {
    if (!session?.user || !userTenantId) return;

    console.log('[Realtime] Ativando sincronização neural de leads...');

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${userTenantId}`
        },
        (payload) => {
          console.log('[Realtime] Mudança detectada nos leads:', payload.eventType);
          refetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, userTenantId]);

  // Sistema de Presença (Online Status)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined: ', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left: ', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: session.user.id,
            name: userName,
            email: session.user.email,
            online_at: new Date().toISOString(),
            tenant_id: userTenantId
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, userName, userTenantId]);

  useEffect(() => {
    const handleAuthCheck = async (currSession: any) => {
      if (currSession?.user) {
        // Carregar nome dos metadados de Auth primeiro (mais rápido)
        const metaName = currSession.user.user_metadata?.full_name;
        if (metaName) setUserName(metaName);

        // Banco de Dados (Fonte da Verdade)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, full_name, is_master_admin')
            .eq('id', currSession.user.id)
            .maybeSingle();

          if (profile) {
            if (profile.full_name) setUserName(profile.full_name);
            const tid = profile.tenant_id || '';
            setUserTenantId(tid);
            console.log('[Auth] Tenant ID carregado:', tid);

            if (profile.is_master_admin) {
              setIsMaster(true);
              console.log('[Auth] Master Admin detectado via perfil DB');
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) {
        handleAuthCheck(s);
        if (event === 'SIGNED_IN') {
          ActivityService.log(userTenantId, s.user.id, 'LOGIN', 'Usuário autenticado com sucesso.');
        }
      } else {
        setIsMaster(false);
        setTenantSecrets({}); // Limpar segredos no logout
        SecretService.clearCache();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Busca de Segredos após carregamento do Tenant
  useEffect(() => {
    if (userTenantId && userTenantId !== 'default') {
      SecretService.getTenantSecrets(userTenantId).then(secrets => {
        if (secrets) setTenantSecrets(secrets);
      });
    }
  }, [userTenantId, activeTab]);

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
      } catch (err) {
        console.error('[Bootstrap] Erro:', err);
      }
    };

    bootstrap();
  }, [config.tenantId]);


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

    // PRIORIDADE MÁXIMA: Usar o Tenant ID do perfil carregado no estado
    let activeTenantId = userTenantId;

    // Se ainda não carregou, tentamos buscar na hora via perfil (fail-safe)
    if (!activeTenantId && session?.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id, is_master_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.tenant_id) {
          activeTenantId = profile.tenant_id;
        } else if (profile?.is_master_admin) {
          activeTenantId = '00000000-0000-0000-0000-000000000000';
        }
      } catch (err) {
        console.warn('[Tenant] Falha na busca rápida via perfil');
      }
    }

    // Se ainda assim for null, e o branding tiver algo que NÃO seja o padrão, usamos como última opção
    if (!activeTenantId && config.tenantId && config.tenantId !== 'default' && config.tenantId !== '00000000-0000-0000-0000-000000000000') {
      activeTenantId = config.tenantId;
    }

    if (!activeTenantId) {
      console.error('Erro Crítico: Tentativa de salvar leads sem um Tenant ID definido.');
      alert('Aguarde a inicialização da sua conta ou recarregue a página.');
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
    } else {
      refetchLeads();
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

    // Enterprise Logic: Se forem muitos leads, enviar para a fila em background
    if (targets.length > 5 && userTenantId) {
      try {
        await QueueService.submitTask(userTenantId, 'ENRICH_BATCH', {
          leads_ids: targets.map(l => l.id),
          total_count: targets.length
        });
        alert(`🚀 Lote de ${targets.length} leads enviado para processamento neural em segundo plano. Você será notificado quando terminar.`);
        return;
      } catch (err) {
        console.error('Erro ao enviar para fila:', err);
      }
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
          const { insights, details, socialData } = await EnrichmentService.enrichLead(lead, tenantSecrets, userTenantId);
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

    if (details.p2c_score) {
      updatePayload.p2c_score = details.p2c_score;
    }

    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar enriquecimento:', error);
    } else {
      // 🚀 Disparar integrações externas (Webhooks/CRMs)
      if (userTenantId) {
        IntegrationService.triggerWebhooks(userTenantId, 'lead.enriched', {
          id,
          ...updatePayload,
          lead_name: leads.find(l => l.id === id)?.name
        });
      }
      refetchLeads();
    }
  };

  const handleSendTicket = async () => {
    if (!supportForm.subject || !supportForm.message) {
      alert('Por favor, preencha o assunto e a mensagem.');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      // Todos os envios viram tickets de suporte direcionados ao Master
      const { error } = await supabase.from('support_tickets').insert([{
        tenant_id: userTenantId,
        user_id: session.user.id,
        subject: supportForm.subject,
        message: supportForm.message,
        category: supportForm.category
      }]);

      if (error) throw error;

      alert('Seu relato foi enviado com sucesso para nossa equipe técnica!');
      setSupportForm({ subject: '', message: '', category: 'technical' });
      setShowSupport(false);
      logActivity('TICKET_CREATED', `Assunto: ${supportForm.subject}`);
    } catch (err: any) {
      console.error('Erro ao processar suporte:', err);
      alert('Falha ao processar: ' + err.message);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      const sessionUser = (await supabase.auth.getSession()).data.session?.user;
      if (sessionUser && userTenantId) {
        ActivityService.log(userTenantId, sessionUser.id, 'LEAD_DELETE', `Lead ${leadId} excluído.`);
      }

    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      refetchLeads(); // Revert on error
      alert('Erro ao excluir lead. Tente novamente.');
    }
  };

  const handleBulkDelete = async (leadIds: string[]) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (error) throw error;

      const sessionUser = (await supabase.auth.getSession()).data.session?.user;
      if (sessionUser && userTenantId) {
        ActivityService.log(userTenantId, sessionUser.id, 'LEAD_BULK_DELETE', `${leadIds.length} leads excluídos.`);
      }
    } catch (err) {
      console.error('Erro na exclusão em massa:', err);
      refetchLeads(); // Revert
      alert('Erro ao excluir leads.');
    }
  };

  const handleConvertToDeal = async (leadId: string) => {
    if (!userTenantId) return;
    try {
      await RevenueService.createDeal(userTenantId, leadId, undefined, 1000); // 1000 como valor demo
      alert('Lead convertido em oportunidade com sucesso!');
      setActiveTab('pipeline');
    } catch (err) {
      console.error('Erro ao converter lead:', err);
      alert('Falha ao converter lead.');
    }
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'dashboard':
        return <BentoDashboard leads={filteredLeads} onEnrich={() => setActiveTab('lab')} onNavigate={setActiveTab} />;
      case 'discovery':
        return <LeadDiscovery onResultsFound={handleAddLeads} onStartEnrichment={handleBulkEnrich} apiKeys={tenantSecrets} />;
      case 'lab':
        return <LeadLab
          leads={filteredLeads}
          onEnrich={setSelectedLead}
          onBulkEnrich={handleBulkEnrich}
          isEnriching={isEnriching}
          onStopEnrichment={() => stopEnrichmentSignal.current = true}
          onDelete={handleDeleteLead}
          onBulkDelete={handleBulkDelete}
          onConvertToDeal={handleConvertToDeal}
          userTenantId={userTenantId}
        />;
      case 'enriched':
        return <EnrichedLeadsView leads={filteredLeads} onConvertToDeal={handleConvertToDeal} />;
      case 'partner':
        return <WhiteLabelAdmin initialTab="api" />;
      case 'master':
        return <MasterConsole onlineUsers={onlineUsers} />;
      case 'history':
        return <ActivityHistory tenantId={userTenantId} isMaster={isMaster} />;

      case 'pipeline':
        return <PipelineView tenantId={userTenantId} userId={session?.user?.id} apiKeys={tenantSecrets} />;
      case 'automation':
        return <AutomationView tenantId={userTenantId} apiKeys={tenantSecrets} />;
      default:
        return <BentoDashboard leads={filteredLeads} onEnrich={() => setActiveTab('lab')} onNavigate={setActiveTab} />;
    }
  };

  // Verificação de Chaves de API Ausentes
  const missingKeys = !tenantSecrets?.serper || (!tenantSecrets?.gemini && !tenantSecrets?.openai);

  if (brandingLoading) {
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
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-72 md:w-20'}`}>

        <div className="p-6 flex items-center gap-4 group cursor-pointer overflow-hidden" onClick={() => setActiveTab('dashboard')}>
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
          <div className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden invisible'}`}>
            <h1 className="text-xl font-black tracking-tighter leading-none flex items-center">
              <span className="text-white">Lead</span>
              <span className="text-primary">Pro</span>
            </h1>
            <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] mt-1">Matrix v3.5</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('dashboard'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<Search size={20} />} label="Extração" active={activeTab === 'discovery'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('discovery'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<Database size={20} />} label="Laboratório" active={activeTab === 'lab'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('lab'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<Rocket size={20} />} label="Enriquecidos" active={activeTab === 'enriched'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('enriched'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<TrendingUp size={20} />} label="Pipeline" active={activeTab === 'pipeline'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('pipeline'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
          <NavItem icon={<Megaphone size={20} />} label="Automação" active={activeTab === 'automation'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('automation'); if (window.innerWidth < 768) setSidebarOpen(true); }} />


          <div className="pt-8 pb-4">
            {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Sistemas</p>}
            <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mx-4 mb-4"></div>
          </div>

          <NavItem icon={<ShieldCheck size={20} />} label="Branding" active={activeTab === 'partner'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('partner'); if (window.innerWidth < 768) setSidebarOpen(true); }} />

          {isMaster && (
            <>
              <NavItem icon={<Activity size={20} />} label="Histórico" active={activeTab === 'history'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('history'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
              <NavItem icon={<ShieldCheck className="text-primary" size={20} />} label="Master" active={activeTab === 'master'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('master'); if (window.innerWidth < 768) setSidebarOpen(true); }} />
            </>
          )}
        </nav>

        <div className="p-4 mt-auto">
          {showAccountCard && (
            <div
              className={`fixed z-[100] animate-in fade-in slide-in-from-left-4 duration-300`}
              style={{
                bottom: '80px',
                left: isSidebarOpen ? '296px' : '88px',
                width: '320px'
              }}
            >
              <div className="glass-strong border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group backdrop-blur-3xl">
                {/* Background Decor */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-all duration-500"></div>

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Sessão do Operador</h3>
                  <button onClick={() => setShowAccountCard(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="text-xl font-black text-primary uppercase">{userName.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Identidade</p>
                      <p className="text-base font-bold text-white tracking-tight">{userName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-wider">Online</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">ID Neural</p>
                      <p className="text-[10px] font-mono text-primary font-bold">
                        #{userTenantId ? userTenantId.split('-')[0].toUpperCase() : 'DE-ROOT'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      supabase.auth.signOut();
                      setSession(null);
                      setIsMaster(false);
                    }}
                    className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-red-500/20 flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} /> Encerrar Conexão
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            onClick={() => setShowAccountCard(!showAccountCard)}
            className={`glass-strong border border-white/5 rounded-[2rem] p-4 premium-card group cursor-pointer relative overflow-hidden transition-all duration-300 hover:border-primary/30 ${showAccountCard ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}
          >
            <div className={`flex items-center gap-4 transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'justify-center'}`}>
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-2xl bg-primary p-[2px]"
                  style={{ boxShadow: `0 0 15px ${config.colors.primary}4d` }}
                >
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-bold text-xs text-white uppercase tracking-tighter">
                    {userName.slice(0, 2)}
                  </div>
                </div>
                {!isSidebarOpen && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse"></div>
                )}
              </div>

              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                  <p className="text-sm font-black text-white truncate">{userName.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400 truncate font-mono">Sessão Ativa</p>
                </div>
              )}

              {isSidebarOpen && (
                <div className="p-2 text-slate-500 group-hover:text-primary transition-colors">
                  <ChevronRight size={14} className={`transition-transform duration-300 ${showAccountCard ? 'rotate-90' : ''}`} />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 bg-primary text-slate-900 p-2 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 z-[60] flex"
        >
          {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around z-50 md:hidden pb-safe">
        <MobileNavItem icon={<LayoutDashboard size={20} />} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<Search size={20} />} label="Busca" active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')} />
        <MobileNavItem icon={<Database size={20} />} label="Lab" active={activeTab === 'lab'} onClick={() => setActiveTab('lab')} />
        <MobileNavItem icon={<TrendingUp size={20} />} label="Vendas" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} />
        <MobileNavItem icon={<Menu size={20} />} label="Menu" active={isSidebarOpen} onClick={() => setSidebarOpen(true)} />
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-slate-950">
        {/* Subtle Ambient Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-[0.07] pointer-events-none blur-[120px] rounded-full"
          style={{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }}
        ></div>
        <header className="h-16 md:h-24 border-b border-white/5 flex items-center justify-between px-4 md:px-10 relative z-40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Hamburger for mobile - if we want more options */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 bg-white/5 rounded-xl md:hidden text-slate-400"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'discovery' && 'Extração'}
              {activeTab === 'lab' && 'Laboratório'}
              {activeTab === 'enriched' && 'Comercial'}
              {activeTab === 'partner' && 'Branding'}
              {activeTab === 'master' && 'Master'}
              {activeTab === 'history' && 'Logs'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {/* Neural Wallet Status - Minimal on mobile */}
            <div className="flex items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 bg-primary/10 rounded-xl border border-primary/20 transition-all">
              <MoneyIcon size={12} className="text-primary animate-pulse" />
              <span className="text-xs font-black text-white">{creditBalance.toLocaleString()}</span>
            </div>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative group p-2 rounded-xl transition-all border ${showNotifications ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5'}`}
            >
              <Bell size={16} className={showNotifications ? 'text-primary' : 'text-slate-400'} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-slate-950 animate-pulse" />
              )}
            </button>
          </div>
        </header>

        {/* ALERTA DE CONFIGURAÇÃO PENDENTE */}
        {missingKeys && activeTab !== 'partner' && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 md:px-10 py-2.5 flex items-center justify-between animate-fade-in-down shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-500 shrink-0" size={14} />
              <p className="text-[10px] text-white font-bold">Configuração Pendente</p>
            </div>
            <button
              onClick={() => setActiveTab('partner')}
              className="bg-white/10 text-white px-2 py-1 rounded-md text-[9px] font-black uppercase"
            >
              Fix
            </button>
          </div>
        )}

        <section className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar pb-24 md:pb-10 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderActiveSection()}
          </div>
        </section>
      </main>

      {/* Overlays */}
      {
        selectedLead && (
          <EnrichmentModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onEnrichComplete={handleEnrichComplete}
          />
        )
      }
    </div >
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
    {active && expanded && (
      <div
        className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
        style={{ boxShadow: `0 0 15px ${primaryColor}` }}
      ></div>
    )}
  </button>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active-scale ${active ? 'text-primary' : 'text-slate-500'}`}
  >
    <div className={`transition-all duration-300 ${active ? 'scale-110' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
    {active && <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_4px_10px_var(--color-primary)] animate-in slide-in-from-top-1" />}
  </button>
);

export default App;
