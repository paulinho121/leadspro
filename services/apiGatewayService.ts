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
                const model = apiName === 'gemini' ? 'gemini-pro' : 'gemini-1.5-flash';
                return await this.callGeminiReal(endpoint, payload, apiKeys?.gemini, model);
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
        if (!apiKey) throw new Error("SERPER_API_KEY_MISSING");

        const response = await fetch('https://google.serper.dev/maps', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: payload.q })
        });

        if (!response.ok) throw new Error(`Serper Error: ${response.statusText}`);
        return await response.json();
    }

    private static async callSerperSearch(payload: any, apiKey: string) {
        if (!apiKey) throw new Error("SERPER_API_KEY_MISSING");

        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: payload.q, num: 5 })
        });

        if (!response.ok) throw new Error(`Serper Search Error: ${response.statusText}`);
        return await response.json();
    }

    private static async callGeminiReal(endpoint: string, payload: any, apiKey: string, model: string = 'gemini-1.5-flash') {
        if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");

        // Forçar lowercase para evitar erros de case-sensitivity da API
        const safeModel = model.toLowerCase();
        const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`;

        const prompt = endpoint === 'analyze-website'
            ? `Analise a empresa ${payload.leadName} no nicho ${payload.industry}. Site: ${payload.website}. Gere 3 insights de vendas curtos.`
            : `Dê uma nota de 1 a 100 para este lead: ${JSON.stringify(payload.leadData)}. Retorne apenas o número.`;

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) throw new Error(`Gemini Error: ${response.statusText} (${response.status})`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (endpoint === 'score-lead') return { score: parseInt(text.replace(/\D/g, '')) || 70 };
        return text;
    }

    private static async executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
        let lastError: any;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
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

            console.log(`[Usage Log] API: ${apiName}, Status: ${status} [REGISTRO OK]`);
        } catch (err) {
            console.error('[Usage Log] Falha ao registrar:', err);
        }
    }
}
