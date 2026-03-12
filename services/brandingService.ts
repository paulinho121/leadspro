
import { BrandingConfig, DEFAULT_BRANDING } from '../types/branding';
import { supabase } from '../lib/supabase';

export class BrandingService {
    /**
     * Busca a configuração de branding baseada no hostname ou retorna o padrão
     */
    static async getBrandingForCurrentHost(): Promise<BrandingConfig> {
        const hostname = window.location.hostname;

        try {
            // 0. Tentar buscar por parâmetro de URL (ex: ?tenant=slug)
            const urlParams = new URLSearchParams(window.location.search);
            const tenantSlug = urlParams.get('tenant');

            if (tenantSlug) {
                const { data: slugConfig } = await supabase
                    .from('white_label_configs')
                    .select('*')
                    .eq('subdomain', tenantSlug) // Supondo que o slug seja guardado em subdomain ou slug
                    .maybeSingle();
                
                if (!slugConfig) {
                    // Tentar por tenant_id ou slug se houvesse a coluna, mas vamos tentar por subdomain primeiro
                    const { data: tenantBySlug } = await supabase
                        .from('tenants')
                        .select('id')
                        .eq('slug', tenantSlug)
                        .maybeSingle();
                    
                    if (tenantBySlug) {
                        const { data: configByTenant } = await supabase
                            .from('white_label_configs')
                            .select('*')
                            .eq('tenant_id', tenantBySlug.id)
                            .maybeSingle();
                        
                        if (configByTenant) return BrandingService.mapToConfig(configByTenant);
                    }
                } else {
                    return BrandingService.mapToConfig(slugConfig);
                }
            }

            // 1. Tentar buscar por domínio customizado ou subdomínio
            const { data: domainConfig } = await supabase
                .from('white_label_configs')
                .select('*')
                .or(`custom_domain.eq.${hostname},subdomain.eq.${hostname.split('.')[0]}`)
                .maybeSingle();

            if (domainConfig) {
                return BrandingService.mapToConfig(domainConfig);
            }

            // 2. Se não achou por domínio, verificar se temos um usuário logado e buscar pelo tenant dele
            // Isso permite que o dono da empresa veja suas cores mesmo rodando em localhost ou domínio genérico
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                // Buscamos o profile para saber o tenant_id
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tenant_id')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.tenant_id) {
                    const { data: tenantConfig } = await supabase
                        .from('white_label_configs')
                        .select('*')
                        .eq('tenant_id', profile.tenant_id)
                        .maybeSingle();

                    if (tenantConfig) {
                        return BrandingService.mapToConfig(tenantConfig);
                    }
                }
            }

            // 3. Fallback: Se nada for encontrado, usamos o DEFAULT_BRANDING puro
            // Não buscamos do banco aqui para evitar vazamento de contexto 
            // O componente App.tsx deve lidar com o estado 'default'
            return DEFAULT_BRANDING;

        } catch (err) {
            console.error('[Branding] Erro ao carregar do banco:', err);
        }

        return DEFAULT_BRANDING;
    }

    private static mapToConfig(data: any, isSecureFallback = false): BrandingConfig {
        return {
            id: data.id,
            tenantId: data.tenant_id,
            platformName: data.platform_name,
            logoUrl: data.logo_url,
            faviconUrl: data.favicon_url,
            colors: {
                primary: data.primary_color,
                secondary: data.secondary_color,
                accent: data.accent_color,
                background: data.background_color,
                sidebar: data.sidebar_color,
            },
            domain: data.custom_domain,
            subdomain: data.subdomain,
            enabledFeatures: data.enabled_features ? {
                automation: data.enabled_features.automation ?? true,
                discovery: data.enabled_features.discovery ?? true,
                lab: data.enabled_features.lab ?? true,
                pipeline: data.enabled_features.pipeline ?? true,
                billing: data.enabled_features.billing ?? true,
                enriched: data.enabled_features.enriched ?? true,
                monitor: data.enabled_features.monitor ?? true,
                leadAdmin: data.enabled_features.leadAdmin ?? true,
            } : DEFAULT_BRANDING.enabledFeatures
        };
    }

    static applyBranding(config: BrandingConfig) {
        const root = document.documentElement;

        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
        };

        // Set CSS Variables
        root.style.setProperty('--color-primary', config.colors.primary);
        root.style.setProperty('--color-primary-rgb', hexToRgb(config.colors.primary));
        root.style.setProperty('--color-secondary', config.colors.secondary);
        root.style.setProperty('--color-secondary-rgb', hexToRgb(config.colors.secondary));
        root.style.setProperty('--color-accent', config.colors.accent);
        root.style.setProperty('--color-background', config.colors.background);
        root.style.setProperty('--color-sidebar', config.colors.sidebar);

        // Update Page Title
        document.title = config.platformName;

        // Update Favicon (if provided)
        if (config.faviconUrl) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = config.faviconUrl;
        }
    }
}
