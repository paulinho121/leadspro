import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Bell, LayoutDashboard, Search, Database, Rocket, TrendingUp,
  Megaphone, ShieldCheck, Menu, X, LogOut, BrainCircuit, Activity,
  HelpCircle, AlertTriangle, ScrollText, Cpu, ChevronRight, BarChart3,
  Send as SendIcon, CheckCircle, Info, DollarSign as MoneyIcon, Archive, LifeBuoy, MessageCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TermsModal from './components/TermsModal';
import LeadDiscovery from './components/LeadDiscovery';
import BentoDashboard from './components/BentoDashboard';
import LeadLab from './components/LeadLab';
import EnrichedLeadsView from './components/EnrichedLeadsView';
import EnrichmentModal from './components/EnrichmentModal';
import LoginPage from './components/LoginPage';
import SecurityGuard from './components/SecurityGuard';
// Heavy components loaded lazily to avoid blocking first-paint
// Helper para carregamento resiliente de módulos (evita erro de cache em novas versões)
const lazyWithRetry = (importFn: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await importFn();
      window.localStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.localStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Resolve com uma promessa que nunca termina para evitar erro no React.lazy 
        // enquanto a página está recarregando
        return new Promise(() => { });
      }
      throw error;
    }
  });

const WhiteLabelAdmin = lazyWithRetry(() => import('./components/WhiteLabelAdmin'));
const MasterConsole = lazyWithRetry(() => import('./components/MasterConsole'));
const PipelineView = lazyWithRetry(() => import('./components/PipelineView'));
const AutomationView = lazyWithRetry(() => import('./components/AutomationView'));
const ActivityHistory = lazyWithRetry(() => import('./components/ActivityHistory'));
const NotificationsList = lazyWithRetry(() => import('./components/NotificationsList'));
const BillingView = lazyWithRetry(() => import('./components/BillingView'));
const AutomationHealthDashboard = lazyWithRetry(() => import('./components/AutomationHealthDashboard'));
const LeadAdminView = lazyWithRetry(() => import('./components/LeadAdminView'));
import { ToastContainer, registerToastFn, toast } from './components/Toast';
import { DiscoveryService } from './services/discoveryService';
import { CommunicationService } from './services/communicationService';
import { EnrichmentService } from './services/enrichmentService';
import { SecretService, TenantSecrets } from './services/secretService';
import { ActivityService } from './services/activityService';
import { IntegrationService } from './services/IntegrationService';
import { RevenueService } from './services/revenueService';
import { BillingService } from './services/billingService';
import { QueueService } from './services/queueService';
import { Lead, LeadStatus } from './types';
import { useStore } from './store/useStore';
import { useLeads, LEADS_PAGE_SIZE } from './hooks/useLeads';
import { useWallet } from './hooks/useWallet';
import { useBranding } from './components/BrandingProvider';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const { config, isLoading: brandingLoading } = useBranding();

  // Zustand Store
  const {
    activeTab, setActiveTab,
    isSidebarOpen, setSidebarOpen,
    userTenantId, setUserTenantId,
    creditBalance,
    toasts, addToast, removeToast,
  } = useStore();

  // Registra o singleton de toast para uso global
  useEffect(() => { registerToastFn(addToast); }, [addToast]);

  const [isMaster, setIsMaster] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [showAccountCard, setShowAccountCard] = useState(false);
  const [userName, setUserName] = useState('Administrador');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSupport, setShowSupport] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '', category: 'technical' });
  const [tenantSecrets, setTenantSecrets] = useState<TenantSecrets>({});
  // Paginação de leads — carrega em blocos de 250
  const [leadsLimit, setLeadsLimit] = useState(LEADS_PAGE_SIZE);

  // React Query Hooks (Optimized)
  const { data: leadsData, refetch: refetchLeads, isLoading: leadsLoading } = useLeads(userTenantId, activeTab, leadsLimit);
  const leads = leadsData?.leads ?? [];
  const leadsTotalCount = leadsData?.totalCount ?? 0;
  const hasMoreLeads = leadsTotalCount > leads.length;

  const handleLoadMoreLeads = React.useCallback(() => {
    setLeadsLimit(prev => prev + LEADS_PAGE_SIZE);
  }, []);
  const { data: walletBalance } = useWallet(userTenantId);

  const deferredLeads = React.useDeferredValue(leads);
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  // Leads filtrados pela busca (Neural Optimization)
  const filteredLeads = React.useMemo(() => {
    if (!deferredSearchTerm) return deferredLeads;
    const s = deferredSearchTerm.toLowerCase();
    return deferredLeads.filter(l => {
      const name = (l.name || '').toLowerCase();
      const industry = (l.industry || '').toLowerCase();
      const location = (l.location || '').toLowerCase();
      const website = (l.website || '').toLowerCase();
      return name.includes(s) || industry.includes(s) || location.includes(s) || website.includes(s);
    });
  }, [deferredLeads, deferredSearchTerm]);

  // Função auxiliar para logar atividades (Stable Reference)
  const logActivity = React.useCallback(async (action: string, details: string) => {
    if (!userTenantId || !session?.user) return;
    try {
      await supabase.from('activity_logs').insert([{
        tenant_id: userTenantId,
        user_id: session.user.id,
        action,
        details
      }]);
    } catch (err) { }
  }, [userTenantId, session]);

  // Buscar contagem de notificações não lidas
  useEffect(() => {
    if (!userTenantId) return;



    if (!session?.user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [session, userTenantId]);

  // Sincronização em Tempo Real de Leads (Debounced)
  useEffect(() => {
    if (!session?.user || !userTenantId) return;

    let timeout: any;
    const debouncedRefetch = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => refetchLeads(), 1000); // Debounce de 1s para evitar spam
    };

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
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [session, userTenantId, refetchLeads]);

  // Sistema de Presença
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
        const metaName = currSession.user.user_metadata?.full_name;
        if (metaName) setUserName(metaName);

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

            // Verificação silenciosa de bônus inicial: só exibe mensagem em caso de sucesso
            supabase.rpc('claim_initial_credits').then(({ data, error }) => {
              if (data && (data as any).success) {
                toast.success('🎉 Bônus Iniciais Recebidos!', 'Você ganhou 1000 créditos LeadPro para testar a extração Neural.');
              }
              if (error) console.log('[Neural Gateway] Bonus check:', error.message);
            });

            if (profile.is_master_admin) {
              setIsMaster(true);
            }
          }
        } catch (err) { }
      } else {
        setIsMaster(false);
        setUserTenantId('');
      }
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) handleAuthCheck(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) {
        handleAuthCheck(s);
        if (event === 'SIGNED_IN') {
          ActivityService.log(userTenantId, s.user.id, 'LOGIN', 'Usuário autenticado.');
        }
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovering(true);
        }
      } else {
        setIsMaster(false);
        setIsRecovering(false);
        setTenantSecrets({});
        SecretService.clearCache();
      }
    });

    return () => subscription.unsubscribe();
  }, [userTenantId]);

  // Sidebar responsive check
  useEffect(() => {
    if (window.innerWidth < 768 && isSidebarOpen) {
      setSidebarOpen(false);
    }
  }, []);

  // Secrets loading
  useEffect(() => {
    if (userTenantId && userTenantId !== 'default') {
      SecretService.getTenantSecrets(userTenantId).then(secrets => {
        if (secrets) setTenantSecrets(secrets);
      });
    }
  }, [userTenantId]);

  // Bootstrap
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
        if (!tenants?.[0]?.id) {
          const { data: nt } = await supabase.from('tenants')
            .insert([{ name: 'Lead Demo', slug: 'demo-' + Math.random().toString(36).slice(2, 5) }])
            .select().single();
          if (nt) {
            await supabase.from('white_label_configs').insert([{
              tenant_id: nt.id,
              platform_name: 'LeadFlow Neural'
            }]);
            window.location.reload();
          }
        }
      } catch (err) { }
    };
    bootstrap();
  }, [config.tenantId]);

  // Message Queue Worker
  useEffect(() => {
    if (!session?.user || !userTenantId) return;
    CommunicationService.processMessageQueue();
    const workerInterval = setInterval(() => {
      CommunicationService.processMessageQueue();
    }, 30000);
    return () => clearInterval(workerInterval);
  }, [session, userTenantId]);

  // Lead Logic Handlers (Memoized)
  const handleAddLeads = React.useCallback(async (newLeads: any[]) => {
    const existingNames = new Set(leads.map(l => (l.name || '').toLowerCase().trim()));
    const uniqueNewLeads = newLeads.filter(l => {
      const normalizedName = (l.name || '').toLowerCase().trim();
      if (existingNames.has(normalizedName)) return false;
      existingNames.add(normalizedName);
      return true;
    });

    if (uniqueNewLeads.length === 0) return;

    let activeTenantId = userTenantId || config.tenantId;
    if (!activeTenantId) return;

    const leadsToSave = uniqueNewLeads.map(l => ({
      tenant_id: activeTenantId,
      name: l.name,
      website: l.website,
      phone: l.phone,
      industry: l.industry,
      location: l.location,
      status: LeadStatus.NEW,
      details: l.details || {},
      social_links: l.socialLinks || {}
    }));

    const { data, error } = await supabase.from('leads').insert(leadsToSave).select();
    if (!error) {
      refetchLeads();
      setActiveTab('lab');
      return data;
    }
  }, [leads, userTenantId, config.tenantId, refetchLeads, setActiveTab]);

  const handleEnrichComplete = React.useCallback(async (id: string, insights: string, details: any, socialData?: any) => {
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

    const { error } = await supabase.from('leads').update(updatePayload).eq('id', id);
    if (!error) {
      if (userTenantId) {
        IntegrationService.triggerWebhooks(userTenantId, 'lead.enriched', {
          id,
          ...updatePayload,
          lead_name: leads.find(l => l.id === id)?.name
        });
      }
      refetchLeads();
    }
  }, [leads, userTenantId, refetchLeads]);

  const stopEnrichmentSignal = React.useRef(false);

  const handleBulkEnrich = React.useCallback(async (leadsToEnrich?: Lead[]) => {
    const targets = leadsToEnrich || leads.filter(l => l.status === LeadStatus.NEW);
    if (targets.length === 0) return;

    // if (targets.length > 5 && userTenantId) {
    //   try {
    //     await QueueService.submitTask(userTenantId, 'ENRICH_BATCH', {
    //       leads_ids: targets.map(l => l.id),
    //       total_count: targets.length
    //     });
    //     toast.success(`${targets.length} leads em processamento`, 'Lote enviado para a fila neural.');
    //     return;
    //   } catch (err) { }
    // }

    setActiveTab('lab');
    setIsEnriching(true);
    stopEnrichmentSignal.current = false;

    try {
      for (const lead of targets) {
        if (stopEnrichmentSignal.current) break;
        try {
          // Permite cancelar imediatamente o carregamento visual e prosseguir para a finalização
          let abortCheckerId: any = null;
          const abortPromise = new Promise<never>((_, reject) => {
            abortCheckerId = setInterval(() => {
              if (stopEnrichmentSignal.current) {
                clearInterval(abortCheckerId);
                reject(new Error("ENRICHMENT_STOPPED_BY_USER"));
              }
            }, 200);
          });

          const enrichmentPromise = EnrichmentService.enrichLead(lead, tenantSecrets, userTenantId);
          const result: any = await Promise.race([enrichmentPromise, abortPromise]);

          clearInterval(abortCheckerId);

          if (!stopEnrichmentSignal.current && result) {
            await handleEnrichComplete(lead.id, result.insights, result.details, result.socialData);
          }
        } catch (err: any) {
          if (err.message === "ENRICHMENT_STOPPED_BY_USER") {
            break;
          }
          if (err.message === "INSUFFICIENT_CREDITS") {
            toast.error("Créditos Insuficientes", "Seu saldo é inferior a 10 créditos. Recarregue no Painel de Faturamento para continuar o enriquecimento.");
            break;
          }
          console.warn('[Enrichment] Erro no lead:', lead.id, err);
        }
      }
    } finally {
      setIsEnriching(false);
      if (leadsToEnrich && targets.length === 1) setActiveTab('enriched');
    }
  }, [leads, userTenantId, tenantSecrets, handleEnrichComplete, setActiveTab]);

  const handleDeleteLead = React.useCallback(async (leadId: string) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (!error) {
        if (session?.user && userTenantId) ActivityService.log(userTenantId, session.user.id, 'LEAD_DELETE', leadId);
        refetchLeads();
      }
    } catch (err) { }
  }, [session, userTenantId, refetchLeads]);

  const handleBulkDelete = React.useCallback(async (leadIds: string[]) => {
    try {
      const { error } = await supabase.from('leads').delete().in('id', leadIds);
      if (!error) {
        if (session?.user && userTenantId) ActivityService.log(userTenantId, session.user.id, 'LEAD_BULK_DELETE', `${leadIds.length}`);
        refetchLeads();
      }
    } catch (err) { }
  }, [session, userTenantId, refetchLeads]);

  const handleConvertToDeal = React.useCallback(async (leadId: string) => {
    if (!userTenantId) return;
    try {
      await RevenueService.createDeal(userTenantId, leadId);
      toast.success('Lead convertido!', 'Oportunidade adicionada ao Pipeline.');
      setActiveTab('pipeline');
    } catch (err: any) {
      console.error('[Revenue] Fail to convert:', err);
      if (err.message?.includes('unique constraint') || err.code === '23505') {
        toast.error('Lead duplicado', 'Este lead já existe no seu Pipeline.');
        setActiveTab('pipeline');
      } else {
        toast.error('Falha na conversão', 'Ocorreu um erro ao mover o lead para o pipeline.');
      }
    }
  }, [userTenantId, setActiveTab]);

  const handleParkLead = React.useCallback(async (leadId: string) => {
    if (!userTenantId) return;
    try {
      await supabase.from('leads').update({ status: LeadStatus.PARKED }).eq('id', leadId).eq('tenant_id', userTenantId);
      refetchLeads();
    } catch (err: any) {
      toast.error('Erro ao pausar lead', err.message);
    }
  }, [userTenantId, refetchLeads]);

  const handleDiscardLead = React.useCallback(async (leadId: string) => {
    if (!userTenantId) return;
    try {
      await supabase.from('leads').update({ status: LeadStatus.DISCARDED }).eq('id', leadId).eq('tenant_id', userTenantId);
      refetchLeads();
    } catch (err: any) {
      toast.error('Erro ao descartar lead', err.message);
    }
  }, [userTenantId, refetchLeads]);

  const handleBulkConvertToDeal = React.useCallback(async (leadIds: string[]) => {
    if (!userTenantId || leadIds.length === 0) return;
    try {
      await RevenueService.createBulkDeals(userTenantId, leadIds);
      toast.success(`${leadIds.length} leads convertidos!`, 'Oportunidades adicionadas ao Pipeline.');
      setActiveTab('pipeline');
    } catch (err: any) {
      console.error('[Revenue] Fail to bulk convert:', err);
      toast.error('Falha na conversão em lote', 'Alguns leads podem já estar no pipeline.');
      setActiveTab('pipeline');
    }
  }, [userTenantId, setActiveTab]);

  const handleSendTicket = async () => {
    if (!supportForm.subject || !supportForm.message) return;
    setIsSubmittingTicket(true);
    try {
      await supabase.from('support_tickets').insert([{
        tenant_id: userTenantId,
        user_id: session.user.id,
        subject: supportForm.subject,
        message: supportForm.message,
        category: supportForm.category
      }]);
      toast.success('Suporte enviado!', 'Seu relato foi registrado com sucesso.');
      setSupportForm({ subject: '', message: '', category: 'technical' });
      setShowSupport(false);
    } catch (err) { } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Fallback minimalista para lazy components
  const LazyFallback = () => (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <Cpu className="text-primary animate-spin" size={32} />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Carregando módulo...</span>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'dashboard':
        return <BentoDashboard leads={filteredLeads} onEnrich={() => setActiveTab('lab')} onNavigate={setActiveTab} />;
      case 'discovery':
        return <LeadDiscovery
          onResultsFound={handleAddLeads}
          onStartEnrichment={handleBulkEnrich}
          apiKeys={tenantSecrets}
          existingLeads={leads}
          creditBalance={creditBalance}
          onNavigate={setActiveTab}
          userTenantId={userTenantId}
        />;
      case 'lab':
        return <LeadLab
          leads={filteredLeads}
          onEnrich={(lead) => handleBulkEnrich([lead])}
          onBulkEnrich={handleBulkEnrich}
          isEnriching={isEnriching}
          onStopEnrichment={() => { stopEnrichmentSignal.current = true; setIsEnriching(false); }}
          onDelete={handleDeleteLead}
          onBulkDelete={handleBulkDelete}
          onConvertToDeal={handleConvertToDeal}
          onParkLead={handleParkLead}
          onDiscardLead={handleDiscardLead}
          userTenantId={userTenantId}
          creditBalance={creditBalance}
          onNavigate={setActiveTab}
          hasMoreLeads={hasMoreLeads}
          totalCount={leadsTotalCount}
          onLoadMore={handleLoadMoreLeads}
        />;
      case 'enriched':
        return <EnrichedLeadsView
          leads={filteredLeads}
          onConvertToDeal={handleConvertToDeal}
          onBulkConvertToDeal={handleBulkConvertToDeal}
          userTenantId={userTenantId}
        />;
      case 'leadAdmin':
        return <Suspense fallback={<LazyFallback />}><LeadAdminView
          leads={leads}
          onRefetch={refetchLeads}
          onRestoreToLab={async (id) => {
            await supabase.from('leads').update({ status: LeadStatus.NEW }).eq('id', id).eq('tenant_id', userTenantId);
            refetchLeads();
            toast.success('Restaurado!', 'Lead de volta ao Laboratório.');
          }}
          onPermanentDelete={handleDeleteLead}
          onConvertToDeal={handleConvertToDeal}
          userTenantId={userTenantId}
        /></Suspense>;
      case 'partner':
        return <Suspense fallback={<LazyFallback />}><WhiteLabelAdmin initialTab="api" isMaster={isMaster} /></Suspense>;
      case 'master':
        return <Suspense fallback={<LazyFallback />}><MasterConsole onlineUsers={onlineUsers} /></Suspense>;
      case 'history':
        return <Suspense fallback={<LazyFallback />}><ActivityHistory tenantId={userTenantId} isMaster={isMaster} /></Suspense>;
      case 'pipeline':
        return <Suspense fallback={<LazyFallback />}><PipelineView tenantId={userTenantId} userId={session?.user?.id} apiKeys={tenantSecrets} /></Suspense>;
      case 'automation':
        return <Suspense fallback={<LazyFallback />}><AutomationView tenantId={userTenantId} apiKeys={tenantSecrets} /></Suspense>;
      case 'monitor':
        return <Suspense fallback={<LazyFallback />}><AutomationHealthDashboard tenantId={userTenantId} isMaster={isMaster} /></Suspense>;
      case 'billing':
        return <Suspense fallback={<LazyFallback />}><BillingView tenantId={userTenantId} /></Suspense>;
      default:
        return <BentoDashboard leads={filteredLeads} onEnrich={() => setActiveTab('lab')} onNavigate={setActiveTab as any} />;
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

  if (!session || isRecovering) {
    return <LoginPage onLoginSuccess={setSession} isRecoveringPassword={isRecovering} onPasswordReset={() => setIsRecovering(false)} />;
  }

  return (
    <div className="h-screen bg-background text-slate-200 flex font-sans selection:bg-primary/30 selection:text-primary overflow-hidden relative">
      <SecurityGuard />
      {/* Sidebar Mobile Overlay - Only show when sidebar IS open on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`glass border-r border-white/5 transition-all duration-500 ease-in-out z-[100] flex flex-col 
        fixed md:relative inset-y-0 left-0 
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-72 md:w-20'}`}>

        <div className="p-6 flex items-center gap-4 group cursor-pointer overflow-hidden" onClick={() => setActiveTab('dashboard')}>
          <div className="bg-primary/10 p-2 rounded-2xl group-hover:scale-110 group-hover:bg-primary/20 border border-primary/20 transition-all duration-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] flex items-center justify-center shrink-0">
            <BrainCircuit className="text-primary" size={30} />
          </div>
          <div className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 flex-1' : 'opacity-0 md:hidden invisible w-0'}`}>
            <h1 className="text-[22px] font-black tracking-wider leading-none uppercase italic text-white drop-shadow-lg">
              LeadMatrix
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('dashboard'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<Search size={20} />} label="Extração" active={activeTab === 'discovery'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('discovery'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<Database size={20} />} label="Laboratório" active={activeTab === 'lab'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('lab'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<Archive size={20} />} label="Adm. Leads" active={activeTab === 'leadAdmin'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('leadAdmin'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<Rocket size={20} />} label="Enriquecidos" active={activeTab === 'enriched'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('enriched'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<TrendingUp size={20} />} label="Pipeline" active={activeTab === 'pipeline'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('pipeline'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<Megaphone size={20} />} label="Automação" active={activeTab === 'automation'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('automation'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<BarChart3 size={20} />} label="Monitor" active={activeTab === 'monitor'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('monitor'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
          <NavItem icon={<MoneyIcon size={20} />} label="Faturamento" active={activeTab === 'billing'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('billing'); if (window.innerWidth < 768) setSidebarOpen(false); }} />


          <div className="pt-8 pb-4">
            {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Sistemas</p>}
            <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mx-4 mb-4"></div>
          </div>

          <NavItem icon={<ShieldCheck size={20} />} label="Branding" active={activeTab === 'partner'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('partner'); if (window.innerWidth < 768) setSidebarOpen(false); }} />

          {isMaster && (
            <>
              <NavItem icon={<Activity size={20} />} label="Histórico" active={activeTab === 'history'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('history'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
              <NavItem icon={<ShieldCheck className="text-primary" size={20} />} label="Master" active={activeTab === 'master'} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => { setActiveTab('master'); if (window.innerWidth < 768) setSidebarOpen(false); }} />
            </>
          )}

          <div className="pt-2">
            <NavItem icon={<LifeBuoy size={20} className="text-primary" />} label="Suporte" active={showSupport} expanded={isSidebarOpen} primaryColor={config.colors.primary} onClick={() => setShowSupport(true)} />
          </div>
        </nav>

        <div className="p-4 mt-auto">
          {showAccountCard && (
            <div
              className={`fixed z-[100] animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-left-4 duration-300`}
              style={{
                bottom: '88px',
                left: window.innerWidth < 768 ? '8px' : (isSidebarOpen ? '296px' : '88px'),
                right: window.innerWidth < 768 ? '8px' : 'auto',
                width: window.innerWidth < 768 ? 'auto' : '320px'
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
          className="absolute -right-3 top-24 bg-primary text-slate-900 p-2 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 z-[110] flex"
        >
          {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around z-50 md:hidden pb-safe px-4">
        <MobileNavItem icon={<LayoutDashboard size={22} />} label="Home" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} />
        <MobileNavItem icon={<Search size={22} />} label="Busca" active={activeTab === 'discovery'} onClick={() => { setActiveTab('discovery'); setSidebarOpen(false); }} />
        <MobileNavItem icon={<Database size={22} />} label="Lab" active={activeTab === 'lab'} onClick={() => { setActiveTab('lab'); setSidebarOpen(false); }} />
        <MobileNavItem icon={<TrendingUp size={22} />} label="Vendas" active={activeTab === 'pipeline'} onClick={() => { setActiveTab('pipeline'); setSidebarOpen(false); }} />
        <MobileNavItem icon={<Menu size={22} />} label="Menu" active={isSidebarOpen} onClick={() => setSidebarOpen(!isSidebarOpen)} />
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 bg-white/5 rounded-2xl md:hidden text-slate-300 active:scale-95 transition-all"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'discovery' && 'Extração'}
              {activeTab === 'lab' && 'Laboratório'}
              {activeTab === 'enriched' && 'Comercial'}
              {activeTab === 'leadAdmin' && 'Adm. Leads'}
              {activeTab === 'partner' && 'Branding'}
              {activeTab === 'master' && 'Master'}
              {activeTab === 'history' && 'Logs'}
            </h2>
          </div>

          {/* Premium Wallet & Status Group */}
          <div className="hidden md:flex items-center gap-4">
            <div
              onClick={() => setActiveTab('billing')}
              className="flex items-center gap-4 px-4 py-2 bg-primary/10 rounded-2xl border border-primary/20 transition-all group/wallet cursor-pointer hover:bg-primary/20 shadow-lg shadow-primary/5 active:scale-95"
            >
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Matrix Balance</span>
                <span className="text-[7px] text-primary/60 font-bold uppercase tracking-widest leading-none">Créditos Ativos</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-white/5">
                <MoneyIcon size={14} className="text-primary animate-pulse" />
                <span className="text-sm font-black text-white">$ {creditBalance.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-2xl">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{userName.split(' ')[0].toUpperCase()}</span>
                <span className="text-[7px] text-emerald-500/60 font-bold uppercase tracking-[0.2em]">Conectado</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Compact wallet button for mobile */}
            <button
              onClick={() => setActiveTab('billing')}
              className="flex md:hidden items-center gap-1.5 px-3 py-2 bg-primary/10 rounded-xl border border-primary/20 active:scale-95 transition-all"
            >
              <MoneyIcon size={14} className="text-primary" />
              <span className="text-xs font-black text-white">{creditBalance.toLocaleString()}</span>
            </button>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative group p-2.5 rounded-xl transition-all border ${showNotifications ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
              <Bell size={18} className={showNotifications ? 'text-primary' : 'text-slate-400'} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-slate-950 animate-pulse shadow-lg" />
              )}
            </button>
          </div>
        </header>



        <section className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar pb-24 md:pb-10 no-scrollbar">
          <div className="max-w-7xl mx-auto min-h-full flex flex-col">

            {/* LeadLab: sempre montado, visível apenas na aba 'lab' */}
            <div
              className={`flex-1 ${activeTab === 'lab' ? 'animate-page-enter' : 'hidden'}`}
              aria-hidden={activeTab !== 'lab'}
            >
              <LeadLab
                leads={filteredLeads}
                onEnrich={setSelectedLead}
                onBulkEnrich={handleBulkEnrich}
                isEnriching={isEnriching}
                onStopEnrichment={() => stopEnrichmentSignal.current = true}
                onDelete={handleDeleteLead}
                onBulkDelete={handleBulkDelete}
                onConvertToDeal={handleConvertToDeal}
                onParkLead={handleParkLead}
                onDiscardLead={handleDiscardLead}
                userTenantId={userTenantId}
                hasMoreLeads={hasMoreLeads}
                totalCount={leadsTotalCount}
                onLoadMore={handleLoadMoreLeads}
              />
            </div>

            {/* Demais abas: montam/desmontam normalmente */}
            <div key={activeTab} className={`flex-1 ${activeTab !== 'lab' ? 'animate-page-enter' : 'hidden'}`}>
              {renderActiveSection()}
            </div>

            {/* Footer Corporativo */}
            <footer className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 pb-10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Matrix Node Online</span>
                </div>
                <button
                  onClick={() => setShowTerms(true)}
                  className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  <ScrollText size={12} /> Termos & Privacidade (LGPD)
                </button>
              </div>
              <div className="text-[10px] font-mono text-slate-700 uppercase tracking-widest flex items-center gap-4">
                <span>© 2026 {config.platformName}</span>
                <span className="hidden md:inline text-slate-800">|</span>
                <span>v3.5.2-Neural</span>
              </div>
            </footer>
          </div>
        </section>
      </main>

      {/* Overlays */}
      {showNotifications && (
        <Suspense fallback={null}>
          <NotificationsList
            onClose={() => setShowNotifications(false)}
            tenantId={userTenantId}
          />
        </Suspense>
      )}
      {
        selectedLead && (
          <EnrichmentModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onEnrichComplete={handleEnrichComplete}
          />
        )
      }
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Modal de Suporte */}
      {showSupport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass w-full max-w-lg rounded-[2.5rem] border border-primary/20 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-primary/5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <LifeBuoy className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-black text-xl uppercase italic">Central de Suporte</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fale diretamente com nossa equipe</p>
                </div>
              </div>
              <button onClick={() => setShowSupport(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <a
                href="https://wa.me/5585988171944?text=Olá,%20gostaria%20de%20suporte"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-5 bg-emerald-500 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <MessageCircle size={20} className="group-hover:rotate-12 transition-transform" />
                Falar com Paulo Fernando (WhatsApp)
              </a>

              <div className="relative flex items-center justify-center">
                <span className="absolute bg-slate-900 px-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] backdrop-blur-sm">Ou abra um chamado interno</span>
                <div className="w-full h-[1px] bg-white/5"></div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Assunto / Tópico</label>
                <input
                  type="text"
                  placeholder="Ex: Dúvida sobre extração, Erro no sistema..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-primary/50 transition-all font-bold"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Categoria</label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-primary/50 transition-all font-bold appearance-none"
                    value={supportForm.category}
                    onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}
                  >
                    <option value="technical">🔧 Suporte Técnico</option>
                    <option value="billing">💰 Financeiro / Faturamento</option>
                    <option value="feature">💡 Sugestão de Melhoria</option>
                    <option value="other">❓ Outros Assuntos</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight size={16} className="text-slate-500 rotate-90" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Mensagem</label>
                <textarea
                  placeholder="Descreva seu problema ou dúvida em detalhes..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-primary/50 transition-all min-h-[150px] resize-none"
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                />
              </div>

              <button
                onClick={handleSendTicket}
                disabled={isSubmittingTicket || !supportForm.subject || !supportForm.message}
                className="w-full py-5 bg-primary text-slate-900 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isSubmittingTicket ? 'ENVIANDO RELATO...' : 'ENVIAR CHAMADO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5585988171944?text=Olá,%20gostaria%20de%20suporte"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 md:bottom-10 right-6 z-[120] bg-emerald-500 text-slate-900 p-4 rounded-full shadow-2xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all group flex items-center justify-center"
        title="Fale Conosco"
      >
        <MessageCircle size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-black uppercase tracking-widest text-[10px] ml-0 group-hover:ml-3">
          Fale Conosco
        </span>
      </a>
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
    title={!expanded ? label : undefined}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 relative group ${active
      ? 'bg-primary/10 text-primary'
      : 'text-slate-500 hover:text-white hover:bg-white/5'
      }`}
  >
    <div
      className="transition-all duration-500 group-hover:scale-110 relative"
      style={{ filter: active ? `drop-shadow(0 0 8px ${primaryColor}80)` : 'none' }}
    >
      {icon}
      {active && !expanded && (
        <span
          className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: primaryColor, boxShadow: `0 0 6px ${primaryColor}` }}
        />
      )}
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
