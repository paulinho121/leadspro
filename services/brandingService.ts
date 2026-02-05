
import { BrandingConfig, DEFAULT_BRANDING } from '../types/branding';
import { supabase } from '../lib/supabase';

export class BrandingService {
    /**
     * Busca a configuração de branding baseada no hostname ou retorna o padrão
     */
    static async getBrandingForCurrentHost(): Promise<BrandingConfig> {
        const hostname = window.location.hostname;

        try {
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

            // 3. Fallback: Buscar configuração do tenant default (0000...)
            const { data: defaultConfig } = await supabase
                .from('white_label_configs')
                .select('*')
                .eq('tenant_id', '00000000-0000-0000-0000-000000000000')
                .maybeSingle();

            if (defaultConfig) {
                return BrandingService.mapToConfig(defaultConfig, true); // True para indicar fallback/seguro
            }

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
            apiKeys: isSecureFallback ? {} : {
                gemini: data.api_keys?.gemini || '',
                openai: data.api_keys?.openai || '',
                serper: data.api_keys?.serper || ''
            } // Proteção para fallbacks e normalização de nulos
        };
    }

    static applyBranding(config: BrandingConfig) {
        const root = document.documentElement;

        // Set CSS Variables
        root.style.setProperty('--color-primary', config.colors.primary);
        root.style.setProperty('--color-secondary', config.colors.secondary);
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
