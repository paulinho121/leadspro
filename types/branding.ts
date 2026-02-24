
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
    platformName: 'LeadPro',
    logoUrl: 'https://paulinho121.github.io/leadspro/logo.png',
    colors: {
        primary: '#22c55e', // Verde Neon inspirado na nova logo
        secondary: '#0f172a', // Navy profundo
        accent: '#4ade80', // Verde claro
        background: '#020617', // Fundo ultra dark (Deep Navy)
        sidebar: 'rgba(2, 6, 23, 0.95)',
    }
};
