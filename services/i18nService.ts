
export type Language = 'pt' | 'en' | 'es';

export interface Translations {
    [key: string]: {
        [lang in Language]: string;
    };
}

export const translations: Translations = {
    // Sidebar & Navigation
    'Dashboard': { pt: 'Dashboard', en: 'Dashboard', es: 'Tablero' },
    'Extração': { pt: 'Extração', en: 'Extraction', es: 'Extracción' },
    'Laboratório': { pt: 'Laboratório', en: 'Laboratory', es: 'Laboratorio' },
    'Adm. Leads': { pt: 'Adm. Leads', en: 'Leads Admin', es: 'Adm. de Leads' },
    'Enriquecidos': { pt: 'Enriquecidos', en: 'Enriched', es: 'Enriquecidos' },
    'Pipeline': { pt: 'Pipeline', en: 'Pipeline', es: 'Pipeline' },
    'Automação': { pt: 'Automação', en: 'Automation', es: 'Automatización' },
    'Monitor': { pt: 'Monitor', en: 'Monitor', es: 'Monitor' },
    'Faturamento': { pt: 'Faturamento', en: 'Billing', es: 'Facturación' },
    'Branding': { pt: 'Branding', en: 'Branding', es: 'Marca' },
    'Histórico': { pt: 'Histórico', en: 'History', es: 'Historial' },
    'Master': { pt: 'Master', en: 'Master', es: 'Maestro' },
    'Suporte': { pt: 'Suporte', en: 'Support', es: 'Soporte' },
    'Agente Matrix': { pt: 'Agente Matrix', en: 'Agent Matrix', es: 'Agente Matrix' },
    
    // Actions & Buttons
    'Salvar Alterações': { pt: 'Salvar Alterações', en: 'Save Changes', es: 'Guardar Cambios' },
    'Nova Busca': { pt: 'Nova Busca', en: 'New Search', es: 'Nueva Búsqueda' },
    'Parar Varredura': { pt: 'Parar Varredura', en: 'Stop Scanning', es: 'Detener Escaneo' },
    'Iniciar Neural Extraction': { pt: 'Iniciar Neural Extraction', en: 'Start Neural Extraction', es: 'Iniciar Extracción Neural' },
    'Enriquecer': { pt: 'Enriquecer', en: 'Enrich', es: 'Enriquecer' },
    
    // Placeholders & Labels
    'Nome da Plataforma': { pt: 'Nome da Plataforma', en: 'Platform Name', es: 'Nombre de la Plataforma' },
    'Idioma': { pt: 'Idioma', en: 'Language', es: 'Idioma' },
    'Selecione o Idioma': { pt: 'Selecione o Idioma', en: 'Select Language', es: 'Seleccione el Idioma' },
    'Português': { pt: 'Português', en: 'Portuguese', es: 'Portugués' },
    'Inglês': { pt: 'Inglês', en: 'English', es: 'Inglés' },
    'Espanhol': { pt: 'Espanhol', en: 'Spanish', es: 'Español' },
};

export class I18nService {
    private static currentLanguage: Language = 'pt';

    static setLanguage(lang: Language) {
        this.currentLanguage = lang;
        document.documentElement.lang = lang;
    }

    static getLanguage(): Language {
        return this.currentLanguage;
    }

    static t(key: string): string {
        const entry = translations[key];
        if (!entry) return key;
        return entry[this.currentLanguage] || entry['pt'] || key;
    }
}
