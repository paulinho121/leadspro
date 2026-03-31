import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Bell, LayoutDashboard, Search, Database, Rocket, TrendingUp,
  Megaphone, ShieldCheck, Menu, X, LogOut, BrainCircuit, Activity,
  HelpCircle, AlertTriangle, ScrollText, Cpu, ChevronRight, BarChart3,
  Send as SendIcon, CheckCircle, Info, DollarSign as MoneyIcon, Archive, LifeBuoy, MessageCircle, ArrowUpRight, Globe
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TermsModal from './components/TermsModal';
import LeadDiscovery from './components/LeadDiscovery';
import BentoDashboard from './components/BentoDashboard';
import { OptimizedLeadLab } from './components/OptimizedLeadLab';
import EnrichedLeadsView from './components/EnrichedLeadsView';
import EnrichmentModal from './components/EnrichmentModal';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
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
const OAuthOnboarding = lazyWithRetry(() => import('./components/OAuthOnboarding'));
const AutomationView = lazyWithRetry(() => import('./components/AutomationView'));
const ActivityHistory = lazyWithRetry(() => import('./components/ActivityHistory'));
const NotificationsList = lazyWithRetry(() => import('./components/NotificationsList'));
const BillingView = lazyWithRetry(() => import('./components/BillingView'));
const AutomationHealthDashboard = lazyWithRetry(() => import('./components/AutomationHealthDashboard'));
const LeadAdminView = lazyWithRetry(() => import('./components/LeadAdminView'));
const AgentMatrix = lazyWithRetry(() => import('./components/AgentMatrix'));
import { ToastContainer, registerToastFn, toast } from './components/Toast';
import { DiscoveryService } from './services/discoveryService';
import { useTheme } from './components/ThemeProvider';
import { CommunicationService } from './services/communicationService';
import { EnrichmentService } from './services/enrichmentService';
import { SecretService, TenantSecrets } from './services/secretService';
import { ActivityService } from './services/activityService';
import { IntegrationService } from './services/IntegrationService';
import { RevenueService } from './services/revenueService';
import { BillingService } from './services/billingService';
import { QueueService } from './services/queueService';
import { I18nService } from './services/i18nService';
import { Lead, LeadStatus } from './types';
import { useStore } from './store/useStore';
import { useLeads, LEADS_PAGE_SIZE } from './hooks/useLeads';
import { useWallet } from './hooks/useWallet';
import { useBranding } from './components/BrandingProvider';
import { supabase } from './lib/supabase';
import './components/optimized-lab.css';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Header } from './components/layout/Header';

const App: React.FC = () => {
  const { config, isLoading: brandingLoading } = useBranding();
  const { theme } = useTheme();

  // Zustand Store
  const {
    activeTab, setActiveTab,
    isSidebarOpen, setSidebarOpen,
    userTenantId, setUserTenantId,
    tenantPlan, setTenantPlan,
    creditBalance,
    toasts, addToast, removeToast,
  } = useStore();

  // Registra o singleton de toast para uso global
  useEffect(() => { registerToastFn(addToast); }, [addToast]);

  const [isMaster, setIsMaster] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState('Administrador');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSupport, setShowSupport] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
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

  const effectiveTenantId = userTenantId;

  // Função para enriquecer lead individual
  const handleEnrichLead = React.useCallback(async (lead: Lead) => {
    // Usa saldo real
    const currentBalance = creditBalance;
    
    console.log('[App] handleEnrichLead chamado:', { 
      leadId: lead.id, 
      currentBalance,
      effectiveTenantId
    });
    
    if (currentBalance < 10) {
      toast.error('Créditos Insuficientes', 'Você precisa de pelo menos 10 créditos para enriquecer um lead.');
      return;
    }
    
    setSelectedLead(lead);
  }, [creditBalance, effectiveTenantId]);

  // Função para parar enriquecimento
  const handleStopEnrichment = React.useCallback(() => {
    console.log('[App] handleStopEnrichment chamado');
    stopEnrichmentSignal.current = true;
    setIsEnriching(false);
  }, []);

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

  // Front-end Background Worker: Processamento da Fila de Mensagens
  useEffect(() => {
    if (!session?.user || !userTenantId) return;

    console.log('[Worker] Simulador de Background ativado...');

    // Processar imediatamente ao carregar
    CommunicationService.processMessageQueue();

    // Agendar processamento a cada 30 segundos enquanto o usuário estiver logado
    const interval = setInterval(() => {
      console.log('[Worker] Modo de Recuperação: Ciclo de processamento reduzido...');
      CommunicationService.processMessageQueue();
    }, 300000); // Aumentado para 5 minutos para aliviar o Disk IO

    return () => clearInterval(interval);
  }, [session, userTenantId]);

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

            // Buscar Plano do Tenant
            if (tid) {
              supabase
                .from('tenants')
                .select('plan')
                .eq('id', tid)
                .single()
                .then(({ data: tenantData }) => {
                  if (tenantData?.plan) {
                    setTenantPlan(tenantData.plan as any);
                  }
                });
            }

            // Verificação silenciosa de bônus inicial: só exibe mensagem em caso de sucesso
            supabase.rpc('claim_initial_credits').then(({ data, error }) => {
              if (data && (data as any).success) {
                toast.success('🎉 Bônus Iniciais Recebidos!', 'Você ganhou 500 créditos LeadPro para testar a extração Neural.');
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
        setShowLogin(false); // Reset login view when authenticated
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

  // Bootstrap (Melhorado para lidar com RLS)
  useEffect(() => {
    const bootstrap = async () => {
      // Se já temos uma sessão, não precisamos fazer bootstrap de tenant demo
      if (session?.user) return;

      try {
        // Usamos white_label_configs que tem permissão SELECT anon
        const { data: configs } = await supabase.from('white_label_configs').select('tenant_id').limit(1);

        if (!configs || configs.length === 0) {
          console.log('[Bootstrap] Nenhuma configuração detectada. Inicializando ambiente...');
          const { data: nt, error: tenantErr } = await supabase.from('tenants')
            .insert([{ name: 'LeadPRO Enterprise', slug: 'admin-' + Math.random().toString(36).slice(2, 5) }])
            .select().single();

          if (nt && !tenantErr) {
            await supabase.from('white_label_configs').insert([{
              tenant_id: nt.id,
              platform_name: 'LeadFlow Neural'
            }]);
            window.location.reload();
          }
        }
      } catch (err) {
        console.warn('[Bootstrap] Erro na verificação silenciosa:', err);
      }
    };
    bootstrap();
  }, [config.tenantId, session]);

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

    if (error) {
      console.error('[Database] Erro ao salvar leads:', error);
      toast.error('Falha ao salvar leads', `Erro do banco: ${error.message}`);
      return;
    }

    if (data) {
      toast.success(`${uniqueNewLeads.length} leads capturados!`, 'Acesse o Laboratório para enriquecimento neural.');
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
      const lead = leads.find(l => l.id === leadId);
      let defaultValue = 5000; // Valor base

      if (lead?.details?.size) {
        const size = lead.details.size.toLowerCase();
        if (size.includes('grande')) defaultValue = 50000;
        else if (size.includes('médio') || size.includes('media')) defaultValue = 15000;
      }

      await RevenueService.createDeal(userTenantId, leadId, undefined, defaultValue);
      toast.success('Lead convertido!', `Oportunidade de R$ ${defaultValue.toLocaleString()} adicionada.`);
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
      // Valor fixo de 2.000 para conversão em lote se não houver lógica melhor
      await RevenueService.createBulkDeals(userTenantId, leadIds, undefined, 2000);
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
          userTenantId={effectiveTenantId}
        />;
      case 'lab':
        return <OptimizedLeadLab
          leads={deferredLeads}
          onEnrich={handleEnrichLead}
          onBulkEnrich={handleBulkEnrich}
          isEnriching={isEnriching}
          onStopEnrichment={handleStopEnrichment}
          onDelete={handleDeleteLead}
          onBulkDelete={handleBulkDelete}
          onConvertToDeal={handleConvertToDeal}
          onParkLead={handleParkLead}
          onDiscardLead={handleDiscardLead}
          userTenantId={effectiveTenantId}
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
          userTenantId={effectiveTenantId}
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
          userTenantId={effectiveTenantId}
        /></Suspense>;
      case 'partner':
        return <Suspense fallback={<LazyFallback />}><WhiteLabelAdmin initialTab="api" isMaster={isMaster} /></Suspense>;
      case 'master':
        return <Suspense fallback={<LazyFallback />}><MasterConsole onlineUsers={onlineUsers} /></Suspense>;
      case 'history':
        return <Suspense fallback={<LazyFallback />}><ActivityHistory tenantId={effectiveTenantId} isMaster={isMaster} /></Suspense>;
      case 'pipeline':
        return <Suspense fallback={<LazyFallback />}><PipelineView tenantId={effectiveTenantId} userId={session?.user?.id} apiKeys={tenantSecrets} /></Suspense>;
      case 'automation':
        return <Suspense fallback={<LazyFallback />}><AutomationView tenantId={effectiveTenantId} apiKeys={tenantSecrets} creditBalance={creditBalance} /></Suspense>;
      case 'monitor':
        return <Suspense fallback={<LazyFallback />}><AutomationHealthDashboard tenantId={effectiveTenantId} isMaster={isMaster} /></Suspense>;
      case 'billing':
        return <Suspense fallback={<LazyFallback />}><BillingView tenantId={effectiveTenantId} tenantPlan={tenantPlan} /></Suspense>;
      case 'agent':
        return <Suspense fallback={<LazyFallback />}><AgentMatrix userTenantId={effectiveTenantId} apiKeys={tenantSecrets} onLeadsCaptured={handleAddLeads} /></Suspense>;
      case 'landing':
        return <LandingPage onGoToLogin={() => setActiveTab('dashboard')} />;
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
    if (showLogin || isRecovering) {
      return <LoginPage onLoginSuccess={setSession} isRecoveringPassword={isRecovering} onPasswordReset={() => setIsRecovering(false)} />;
    }
    return <LandingPage onGoToLogin={() => setShowLogin(true)} />;
  }

  const needsOnboarding = session?.user && !session.user.user_metadata?.company_name;

  if (needsOnboarding) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
          <Cpu className="text-primary animate-spin mb-4" size={40} />
          <p className="text-slate-400 uppercase tracking-widest text-xs font-bold">Iniciando protocolo de segurança...</p>
        </div>
      }>
        <OAuthOnboarding
          session={session}
          tenantId={userTenantId}
          onComplete={async () => {
            const { data: { session: newSession } } = await supabase.auth.refreshSession();
            setSession(newSession);
            window.location.reload();
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className={`h-screen bg-background text-slate-900 dark:text-slate-200 flex font-sans selection:bg-primary/30 selection:text-primary overflow-hidden relative ${theme}`}>
      <SecurityGuard />
      {/* Sidebar Mobile Overlay - Only show when sidebar IS open on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isMaster={isMaster} 
        userName={userName} 
        unreadCount={unreadCount} 
        showSupport={showSupport} 
        setShowSupport={setShowSupport} 
        onSignOut={() => {
          supabase.auth.signOut();
          setSession(null);
          setIsMaster(false);
        }} 
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-background">
        {/* Subtle Ambient Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-[0.07] pointer-events-none blur-[120px] rounded-full"
          style={{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }}
        ></div>
        <Header 
          userName={userName} 
          unreadCount={unreadCount} 
          showNotifications={showNotifications} 
          setShowNotifications={setShowNotifications} 
        />



        <section className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar pb-24 md:pb-10 no-scrollbar">
          <div className="max-w-7xl mx-auto min-h-full flex flex-col">

            {/* LeadLab: sempre montado, visível apenas na aba 'lab' */}
            <div
              className={`flex-1 ${activeTab === 'lab' ? 'animate-page-enter' : 'hidden'}`}
              aria-hidden={activeTab !== 'lab'}
            >
              <OptimizedLeadLab
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

export default App;
