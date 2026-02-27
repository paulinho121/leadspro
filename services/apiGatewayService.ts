import { BrandingConfig } from '../types/branding';
import { supabase } from '../lib/supabase';

interface RequestOptions {
    useCache?: boolean;
    ttl?: number; // seconds
    priority?: 'high' | 'normal' | 'low';
    retries?: number;
}

export class ApiGatewayService {
    private static cache = new Map<string, { data: any, expiry: number }>();
    private static requestQueue: Array<() => Promise<any>> = [];
    private static isProcessingQueue = false;

    /**
     * Centralized proxy call with caching, rate limiting and backoff
     */
    static async callApi<T>(
        apiName: string,
        endpoint: string,
        payload: any,
        options: RequestOptions & { tenantId?: string, apiKeys?: any } = {}
    ): Promise<T> {
        const { useCache = true, ttl = 3600, retries = 3, tenantId, apiKeys } = options;
        const cacheKey = `${apiName}:${endpoint}:${JSON.stringify(payload)}`;

        if (useCache) {
            const cached = this.cache.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                return cached.data;
            }
        }

        const result = await this.executeWithRetry<T>(async () => {
            console.log(`[Neural Gateway] Connecting to ${apiName} Live Engine...`);

            if (apiName === 'maps') {
                return await this.callSerperMaps(payload, apiKeys?.serper);
            }

            if (apiName === 'google-search') {
                return await this.callSerperSearch(payload, apiKeys?.serper);
            }

            if (apiName === 'gemini' || apiName === 'gemini-1.5-flash') {
                // Forçar o uso do modelo 1.5-flash que é o mais estável e rápido para este caso
                const model = 'gemini-1.5-flash';
                return await this.callGeminiReal(endpoint, payload, apiKeys?.gemini, model);
            }

            if (apiName === 'hunter') {
                return await this.callHunter(payload, apiKeys?.hunter);
            }

            return await this.mockRealApiCall(apiName, endpoint, payload);
        }, retries);

        if (useCache) {
            this.cache.set(cacheKey, {
                data: result,
                expiry: Date.now() + (ttl * 1000)
            });
        }

        this.logUsage(apiName, endpoint, 200, tenantId);
        return result as T;
    }

    private static async callSerperMaps(payload: any, apiKey: string) {
        const key = apiKey?.trim();
        if (!key) throw new Error("SERPER_API_KEY_MISSING");

        const body = {
            q: payload.q,
            page: payload.page || 1
        };

        console.log(`[Neural Gateway] Payload SERPER MAPS:`, JSON.stringify(body));

        const response = await fetch('https://google.serper.dev/maps', {
            method: 'POST',
            headers: {
                'X-API-KEY': key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Serper Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return await response.json();
    }

    private static async callSerperSearch(payload: any, apiKey: string) {
        const key = apiKey?.trim();
        if (!key) throw new Error("SERPER_API_KEY_MISSING");

        const body = {
            q: payload.q,
            num: payload.num || 10,
            page: payload.page || 1,
            gl: 'br', // Forçar resultados do Brasil
            hl: 'pt-br'
        };

        console.log(`[Neural Gateway] Payload SERPER SEARCH:`, JSON.stringify(body));

        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Serper Search Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        return await response.json();
    }

    private static async callGeminiReal(endpoint: string, payload: any, apiKey: string, model: string = 'gemini-1.5-flash') {
        if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

        const safeModel = model.toLowerCase();
        const baseUrl = `https://generativelanguage.googleapis.com/v1/models/${safeModel}:generateContent?key=${apiKey}`;

        const prompt = endpoint === 'analyze-website'
            ? `Analise a empresa ${payload.leadName} no nicho ${payload.industry}. Site: ${payload.website}. Gere 3 insights de vendas curtos e diretos em português.`
            : endpoint === 'analyze-commercial'
                ? `Você é um analista de inteligência comercial especializado em negócios locais.
                  Com base nos dados fornecidos abaixo, analise a empresa e retorne um JSON estruturado.
                  
                  DADOS DA EMPRESA:
                  Nome: ${payload.leadName}
                  Categoria: ${payload.industry}
                  Cidade/Estado: ${payload.location}
                  Website: ${payload.website}
                  Instagram: ${payload.instagram}
                  Facebook: ${payload.facebook}
                  Google Maps/Avaliações: ${payload.mapSnippet}
                  Sócios Oficiais (QSA): ${JSON.stringify(payload.partnersFromQsa)}

                  MISSÃO CRÍTICA:
                  Você deve identificar os DECISORES (Donos, Sócios ou Gerentes). 
                  Se nomes foram fornecidos no QSA, use-os como base de busca.
                  Tente encontrar os contatos DIRETOS (não o telefone da recepção).

                  CRITÉRIOS:
                  - O campo "whatsapp_status": "Confirmado", "Provável" ou "Não identificado".
                  - O campo "ads_status": "Ativo" se houver indício de tráfego pago.
                  - O campo "partners": Use os nomes do QSA + outros decisores encontrados na web.
                  - O campo "partners_contacts": Priorize o WHATSAPP ou EMAIL PESSOAL dos sócios listados.
                  - O campo "employees_est": Estimativa baseada no porte da empresa.
                  - O campo "strategic_insight": Uma frase curta de como o dono deve ser abordado.

                  RETORNE APENAS JSON:
                  {
                    "whatsapp_status": "",
                    "ads_status": "",
                    "instagram_status": "",
                    "digital_maturity": "",
                    "partners": [],
                    "partners_contacts": [],
                    "employees_est": "",
                    "p2c_score": 0.0,
                    "commercial_score": 0,
                    "strategic_insight": ""
                  }`
                : endpoint === 'custom-prompt'
                    ? payload.prompt
                    : `Dê uma nota de 1 a 100 para este lead baseado no potencial de vendas (B2B): ${JSON.stringify(payload.leadData)}. Retorne apenas o número puro.`;

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            // Fallback para v1beta se v1 falhar, ou tentativa com -latest
            if (response.status === 404 && !model.includes('latest')) {
                console.warn(`[Neural Gateway] Model ${model} not found in V1, trying -latest in v1beta...`);
                return this.callGeminiReal(endpoint, payload, apiKey, `${model}-latest`);
            }
            const errorBody = await response.text();
            throw new Error(`Gemini Error: ${response.statusText} (${response.status}) - ${errorBody}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Limpar o texto caso a IA retorne markdown
        const cleanJson = text.replace(/```json|```/g, '').trim();

        if (endpoint === 'score-lead') return { score: parseInt(text.replace(/\D/g, '')) || 70 };
        if (endpoint === 'analyze-commercial') {
            try {
                return JSON.parse(cleanJson);
            } catch (e) {
                console.error("[Neural Gateway] Falha ao parsear JSON comercial:", e);
                return { commercial_score: 5, strategic_insight: "Não foi possível gerar análise detalhada." };
            }
        }
        return text;
    }

    private static async callHunter(payload: any, apiKey: string) {
        const key = apiKey?.trim() || import.meta.env.VITE_HUNTER_API_KEY;
        if (!key) throw new Error("HUNTER_API_KEY_MISSING");

        const { domain } = payload;
        if (!domain) return { data: { emails: [] } };

        const baseUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${key}`;

        console.log(`[Neural Gateway] Connecting to Hunter.io for domain: ${domain}`);

        const response = await fetch(baseUrl);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Hunter Error: ${response.status} - ${errorBody}`);
        }

        return await response.json();
    }

    private static async executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
        let lastError: any;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Se for erro 400 (Bad Request), o Serper está rejeitando o payload. 
                // Não repetimos para evitar queimar créditos ou saturar logs com erro de configuração.
                const errorStr = String(error.message || '');
                if (errorStr.includes('400')) {
                    console.error('[Neural Gateway] Erro Crítico 400 Detectado. Abortando retentativas.');
                    console.error('[Neural Gateway] Detalhes do erro 400:', errorStr); // Log full error for diagnosis
                    throw error;
                }

                if (i < maxRetries) {
                    const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                    console.warn(`[Neural Gateway] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }

    private static async mockRealApiCall(apiName: string, endpoint: string, payload: any): Promise<any> {
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
            success: true,
            data: `Mock response from ${apiName} for ${endpoint}`,
            timestamp: new Date().toISOString()
        };
    }

    private static async logUsage(apiName: string, endpoint: string, status: number, tenantId?: string) {
        if (!tenantId || tenantId === 'default') return;

        try {
            await supabase.from('api_usage_logs').insert([{
                tenant_id: tenantId,
                api_name: apiName,
                endpoint: endpoint,
                status_code: status,
                created_at: new Date().toISOString()
            }]);

            console.log(`[Usage Log] API: ${apiName}, Status: ${status}`);
        } catch (err) {
            // Silenciar erros de log para não poluir o console principal
        }
    }
}
