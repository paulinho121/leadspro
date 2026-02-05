
import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrandingConfig, DEFAULT_BRANDING } from '../types/branding';
import { BrandingService } from '../services/brandingService';

interface BrandingContextType {
    config: BrandingConfig;
    isLoading: boolean;
    refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
    config: DEFAULT_BRANDING,
    isLoading: true,
    refreshBranding: async () => { },
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const [isLoading, setIsLoading] = useState(false);

    const loadBranding = async () => {
        setIsLoading(true);

        // Timeout de segurança de 5 segundos
        const timeout = setTimeout(() => {
            console.warn('[Branding] Timeout atingido, forçando carregamento padrão.');
            setIsLoading(false);
        }, 5000);

        try {
            const branding = await BrandingService.getBrandingForCurrentHost();
            setConfig(branding);
            BrandingService.applyBranding(branding);
        } catch (error) {
            console.error('Failed to load branding:', error);
        } finally {
            clearTimeout(timeout);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBranding();
    }, []);

    return (
        <BrandingContext.Provider value={{ config, isLoading, refreshBranding: loadBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};
