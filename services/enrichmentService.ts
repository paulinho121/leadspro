
import { GeminiService } from './geminiService';
import { ApiGatewayService } from './apiGatewayService';
import { DiscoveryService } from './discoveryService';
import { Lead } from '../types';

export class EnrichmentService {
    /**
     * Enriquece um lead individualmente buscando dados em múltiplas fontes
     */
    static async enrichLead(lead: Lead, apiKeys?: any): Promise<{ insights: string, details: any, socialData: any, realEmail?: string }> {
        console.log(`[Neural Enrichment] Processing: ${lead.name}`);

        // 1. Dados Governamentais (Se houver CNPJ)
        let officialData: any = {};
        if (lead.socialLinks?.cnpj && lead.socialLinks.cnpj !== 'VERIFICAR') {
            officialData = await DiscoveryService.fetchRealCNPJData(lead.socialLinks.cnpj) || {};
        }

        // 2. Presença Digital (Busca Real Google)
        const socialData = await this.discoverSocialPresence(lead, apiKeys);

        // 3. Análise Neural via Gemini (Análise Comercial Completa)
        let insights = '';
        let aiScore = 50;
        let diagnostic: any = {};

        try {
            // Chamada Real para Análise Comercial Consolidada
            diagnostic = await ApiGatewayService.callApi<any>(
                'gemini-1.5-flash',
                'analyze-commercial',
                {
                    leadName: lead.name,
                    industry: lead.industry,
                    location: lead.location,
                    website: lead.website || socialData.website,
                    instagram: socialData.instagram,
                    facebook: socialData.facebook,
                    phone: lead.phone,
                    mapSnippet: lead.socialLinks?.map_link || ''
                },
                { apiKeys, ttl: 86400 }
            );

            insights = diagnostic.strategic_insight || '';
            aiScore = (diagnostic.commercial_score || 5) * 10; // Normalizar para escala 1-100

        } catch (error) {
            console.warn('[Enrichment] IA indisponível, usando fallback local.', error);
            insights = `A empresa ${lead.name} aparenta ter presença ativa em ${lead.location}. Recomendamos abordagem direta.`;
            aiScore = 75;
        }

        const enrichedDetails = {
            ...lead.details,
            ...officialData,
            ...socialData,
            ...diagnostic, // WhatsApp, Ads, Instagram status, maturidade e p2c_score
            ai_score: aiScore,
            p2c_score: diagnostic.p2c_score || (aiScore / 100), // Fallback baseado no aiScore
            activity: officialData.activity || lead.industry,
            tradeName: officialData.tradeName || lead.name,
            foundedDate: officialData.foundedDate || 'Não identificado',
            size: officialData.size || 'Pequeno Porte',
            real_email: socialData.realEmail
        };

        return {
            insights,
            details: enrichedDetails,
            socialData, // Exportar explicitamente para atualizar coluna social_links
            realEmail: socialData.realEmail
        };
    }

    private static async discoverSocialPresence(lead: Lead, apiKeys?: any) {
        try {
            const hasKey = apiKeys?.serper || import.meta.env.VITE_SERPER_API_KEY;
            if (!hasKey) return { instagram: '', facebook: '', linkedin: '', website: lead.website || '', realEmail: '' };

            console.log(`[Neural Social Discovery] Deep search for: ${lead.name}`);

            // 1. Encontrar Website primeiro (se não houver)
            let website = lead.website || '';
            if (!website) {
                const webSearch: any = await ApiGatewayService.callApi(
                    'google-search',
                    'search',
                    { q: `${lead.name} ${lead.location} site oficial`, num: 3 },
                    { apiKeys, ttl: 86400 * 30 }
                );
                website = webSearch.organic?.find((r: any) => {
                    const l = r.link || '';
                    return !l.includes('instagram.com') && !l.includes('facebook.com') && !l.includes('linkedin.com') && !l.includes('yelp') && !l.includes('tripadvisor');
                })?.link || '';
            }

            // 2. BUSCA MULTI-DORK (Específica para Redes Sociais)
            // Usamos o domínio do site (se existir) para vinculação forte
            const domain = website ? new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', '') : '';

            const queries = [
                { type: 'instagram', q: domain ? `site:instagram.com "${domain}"` : `site:instagram.com "${lead.name}" "${lead.location}"` },
                { type: 'facebook', q: domain ? `site:facebook.com "${domain}"` : `site:facebook.com "${lead.name}" "${lead.location}"` },
                { type: 'email', q: `"${lead.name}" "${lead.location}" (email OR contato OR "@")` }
            ];

            // Executar buscas em paralelo para performance
            const searchPromises = queries.map(query =>
                ApiGatewayService.callApi('google-search', 'search', { q: query.q, num: 5 }, { apiKeys, ttl: 86400 * 7 })
            );

            const [instaResults, fbResults, emailResults]: any = await Promise.all(searchPromises);

            // 3. VALIDAÇÃO NEURAL DOS LINKS (Evita falsos positivos como Sage Networks)
            const allSnippets = [
                ...(instaResults.organic || []),
                ...(fbResults.organic || []),
                ...(emailResults.organic || [])
            ].map(r => `Link: ${r.link} | Título: ${r.title} | Snippet: ${r.snippet}`).join('\n');

            const validationPrompt = `Você é um detetive digital. Analise os resultados de busca e identifique as redes sociais REAIS da empresa abaixo:
            EMPRESA ALVO: ${lead.name}
            LOCALIZAÇÃO: ${lead.location}
            SITE OFICIAL: ${website}

            RESULTADOS DE BUSCA:
            ${allSnippets}

            REGRAS:
            - Ignore resultados de empresas com nomes parecidos mas cidades diferentes.
            - O Instagram deve refletir o negócio (ex: vila_mosquito). Ignore se for de um concorrente ou agência.
            - Extraia o e-mail se houver.

            RETORNE APENAS JSON:
            {
              "instagram": "URL completa ou null",
              "facebook": "URL completa ou null",
              "realEmail": "email ou null"
            }`;

            try {
                const validatedData = await ApiGatewayService.callApi<any>(
                    'gemini-1.5-flash',
                    'custom-prompt',
                    { prompt: validationPrompt },
                    { apiKeys, ttl: 86400 }
                );

                // Se a IA retornar como string (acontece às vezes), tentamos parsear
                const finalData = typeof validatedData === 'string'
                    ? JSON.parse(validatedData.replace(/```json|```/g, '').trim())
                    : validatedData;

                return {
                    instagram: finalData.instagram || '',
                    facebook: finalData.facebook || '',
                    linkedin: '',
                    website: website,
                    realEmail: finalData.realEmail || ''
                };

            } catch (err) {
                console.warn('[Social Validation] IA falhou na validação, usando extrator básico.', err);
                const findInsta = instaResults.organic?.find((r: any) => r.link?.includes('instagram.com'))?.link;
                const findFB = fbResults.organic?.find((r: any) => r.link?.includes('facebook.com'))?.link;

                return {
                    instagram: findInsta || '',
                    facebook: findFB || '',
                    linkedin: '',
                    website: website,
                    realEmail: ''
                };
            }
        } catch (e) {
            console.warn('Erro na busca social real:', e);
        }

        return {
            instagram: '',
            facebook: '',
            linkedin: '',
            website: lead.website || '',
            realEmail: ''
        };
    }
}
