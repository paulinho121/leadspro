
export interface BrandingConfig {
    id: string;
    tenantId: string;
    platformName: string;
    logoUrl: string;
    faviconUrl?: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        sidebar: string;
    };
    domain?: string;
    subdomain?: string;
    customScripts?: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
    id: 'default',
    tenantId: 'default',
    platformName: 'LeadMatrix',
    logoUrl: '',
    colors: {
        primary: '#f97316', // Laranja do "Pro" e do ícone de pulso
        secondary: '#0f172a', // Navy profundo do "Lead"
        accent: '#fb923c', // Laranja claro para realces
        background: '#020617', // Fundo ultra dark (Deep Navy)
        sidebar: 'rgba(2, 6, 23, 0.95)',
    }
};
