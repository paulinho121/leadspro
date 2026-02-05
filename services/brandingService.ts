
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
            const { data, error } = await supabase
                .from('white_label_configs')
                .select('*')
                .or(`custom_domain.eq.${hostname},subdomain.eq.${hostname.split('.')[0]}`)
                .maybeSingle();

            if (data) {
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
                    apiKeys: data.api_keys
                };
            }

            // 2. Fallback: Tentar buscar qualquer config existente
            const { data: firstConfig } = await supabase
                .from('white_label_configs')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (firstConfig) {
                return {
                    id: firstConfig.id,
                    tenantId: firstConfig.tenant_id,
                    platformName: firstConfig.platform_name,
                    logoUrl: firstConfig.logo_url,
                    faviconUrl: firstConfig.favicon_url,
                    colors: {
                        primary: firstConfig.primary_color,
                        secondary: firstConfig.secondary_color,
                        accent: firstConfig.accent_color,
                        background: firstConfig.background_color,
                        sidebar: firstConfig.sidebar_color,
                    },
                    apiKeys: {} // SEGURANÇA: Não vazar chaves do admin no fallback
                };
            }

        } catch (err) {
            console.error('[Branding] Erro ao carregar do banco:', err);
        }

        return DEFAULT_BRANDING;
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
