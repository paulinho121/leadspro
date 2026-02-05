
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
    apiKeys?: {
        gemini?: string;
        openai?: string;
        deepseek?: string;
        serper?: string;
        maps?: string;
    };
}

export const DEFAULT_BRANDING: BrandingConfig = {
    id: 'default',
    tenantId: 'default',
    platformName: 'LeadFlow Neural',
    logoUrl: '',
    colors: {
        primary: '#06b6d4', // cyan-500
        secondary: '#3b82f6', // blue-500
        accent: '#06b6d4',
        background: '#0f172a',
        sidebar: 'rgba(30, 41, 59, 0.7)',
    }
};
