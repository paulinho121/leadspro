
import { GeminiService } from './geminiService';
import { ApiGatewayService } from './apiGatewayService';
import { DiscoveryService } from './discoveryService';
import { Lead } from '../types';
import { BillingService } from './billingService';
import { DataValidationService } from './dataValidationService';
import { AdvancedEnrichmentService } from './advancedEnrichmentService';
import { EnhancedDataService } from './enhancedDataService';
import { DuplicateDetectionService } from './duplicateDetectionService';

export class EnrichmentService {
    /**
     * Enriquece um lead individualmente buscando dados em múltiplas fontes (Versão Avançada)
     */
    static async enrichLead(lead: Lead, apiKeys?: any, tenantId?: string): Promise<{ insights: string, details: any, socialData: any, realEmail?: string, qualityScore?: number, duplicates?: any }> {
        console.log(`[Neural Enrichment] Processing: ${lead.name}`);

        // Enterprise Scaling: Validação de Créditos
        if (tenantId) {
            const hasCredits = await BillingService.useCredits(
                tenantId,
                10,
                'NEURAL_AI',
                `Neural Enrichment: ${lead.name}`
            );
            if (!hasCredits) throw new Error("INSUFFICIENT_CREDITS");
        }

        try {
            // 1. Enriquecimento Avançado com Machine Learning
            const advancedResult = await AdvancedEnrichmentService.advancedEnrichLead(lead, apiKeys, tenantId);
            
            // 2. Enriquecimento Complementar com Novas Fontes
            const enhancedData = await EnhancedDataService.comprehensiveEnrichment(lead, apiKeys);
            
            // 3. Detecção de Duplicatas
            const duplicates = tenantId ? 
                await DuplicateDetectionService.detectDuplicatesForNewLead(lead, tenantId) : 
                [];

            // 4. Dados Governamentais (Se houver CNPJ)
            let officialData: any = {};
            if (lead.socialLinks?.cnpj && lead.socialLinks.cnpj !== 'VERIFICAR') {
                officialData = await DiscoveryService.fetchRealCNPJData(lead.socialLinks.cnpj) || {};
            }

            // 5. Presença Digital (Busca Real Google)
            const socialData = await this.discoverSocialPresence(lead, apiKeys);

            // 5.1. Foto do Local (Fachada)
            let placeImage = lead.details?.placeImage;
            if (!placeImage) {
                placeImage = await this.discoverPlaceImage(lead, apiKeys);
            }

            // 6. Análise Neural via Gemini (Análise Comercial Completa)
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
                        mapSnippet: lead.socialLinks?.map_link || '',
                        partnersFromQsa: officialData.qsa || [], // INJEÇÃO CRÍTICA: IA agora sabe quem procurar
                        enhancedData: enhancedData // Dados avançados para a IA
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

            // 7. Merge de todos os dados enriquecidos
            const enrichedDetails = {
                ...lead.details,
                ...officialData,
                ...socialData,
                ...diagnostic, // WhatsApp, Ads, Instagram status, maturidade, p2c_score, partners, employees_est
                ...enhancedData, // Dados financeiros, tecnológicos, de mercado
                ...advancedResult.lead.details, // Dados do enriquecimento avançado
                ai_score: aiScore,
                p2c_score: diagnostic.p2c_score || (aiScore / 100),
                activity: officialData.activity || lead.industry,
                tradeName: officialData.tradeName || lead.name,
                foundedDate: officialData.foundedDate || 'Não identificado',
                size: officialData.size || officialData.porte || 'Pequeno Porte',
                partners: diagnostic.partners || officialData.qsa || [],
                employee_count: diagnostic.employees_est || 'Sob consulta',
                real_email: socialData.realEmail,
                placeImage: placeImage,
                primaryPhone: socialData.primaryPhone || lead.phone,
                quality_score: advancedResult.qualityScore,
                duplicate_risk: advancedResult.duplicateRisk,
                enrichment_version: '2.0',
                enrichment_timestamp: new Date().toISOString()
            };

            // Atualizar link de WhatsApp se um novo telefone foi descoberto
            const finalWhatsapp = socialData.primaryPhone
                ? `https://wa.me/${socialData.primaryPhone.replace(/\D/g, '')}`
                : lead.socialLinks?.whatsapp;

            return {
                insights,
                details: enrichedDetails,
                socialData: {
                    ...socialData,
                    whatsapp: finalWhatsapp
                },
                realEmail: socialData.realEmail,
                qualityScore: advancedResult.qualityScore,
                duplicates: duplicates.length > 0 ? duplicates : undefined
            };

        } catch (error) {
            console.error('[Enrichment] Erro no enriquecimento avançado:', error);
            throw error;
        }
    }

    /**
     * Enriquecimento em lote com otimização (Versão Avançada)
     */
    static async batchEnrichLeads(leads: Lead[], apiKeys?: any, tenantId?: string): Promise<any[]> {
        console.log(`[Neural Enrichment] Batch processing ${leads.length} leads`);

        try {
            // Usar o serviço avançado de batch
            const advancedResults = await AdvancedEnrichmentService.batchEnrichLeads(leads, apiKeys, tenantId);
            
            // Enriquecer cada resultado com dados complementares
            const enrichedResults = await Promise.all(
                advancedResults.map(async (result) => {
                    const enhancedData = await EnhancedDataService.comprehensiveEnrichment(result.lead, apiKeys);
                    
                    return {
                        ...result,
                        enhancedData,
                        enrichment_version: '2.0'
                    };
                })
            );

            return enrichedResults;

        } catch (error) {
            console.error('[Nerichment] Erro no batch enrichment:', error);
            throw error;
        }
    }

    private static async discoverSocialPresence(lead: Lead, apiKeys?: any) {
        try {
            const hasKey = apiKeys?.serper || import.meta.env.VITE_SERPER_API_KEY;
            if (!hasKey) return { instagram: '', facebook: '', linkedin: '', website: lead.website || '', realEmail: '' };

            console.log(`[Neural Social Discovery] Deep search for: ${lead.name}`);

            // 1. Website Discovery (Base para vinculação)
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

            // 2. BUSCA MULTI-DORK (Específica para Redes Sociais e Link in Bio)
            const domain = website ? new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', '') : '';

            const queries = [
                { type: 'instagram', q: domain ? `site:instagram.com "${domain}"` : `site:instagram.com "${lead.name}" "${lead.location}"` },
                { type: 'facebook', q: domain ? `site:facebook.com "${domain}"` : `site:facebook.com "${lead.name}" "${lead.location}"` },
                { type: 'linkedin', q: domain ? `site:linkedin.com/company "${domain}"` : `site:linkedin.com/company "${lead.name}" "${lead.location}"` },
                { type: 'linkinbio', q: `site:linktr.ee OR site:beacons.ai OR site:msha.ke OR site:taplink.at "${lead.name}"` },
                { type: 'whatsapp_target', q: `"${lead.name}" "${lead.location}" "wa.me/" OR "api.whatsapp.com/send"` }
            ];

            const searchPromises = queries.map(query =>
                ApiGatewayService.callApi('google-search', 'search', { q: query.q, num: 5 }, { apiKeys, ttl: 86400 * 7 })
            );

            const [instaResults, fbResults, linkedinResults, linktreeResults, whatsappResults]: any = await Promise.all(searchPromises);

            // 3. EXTRAÇÃO DE WHATSAPP DO LINKTREE (Deep Scraping de Meta-dados)
            let bioLinkWhatsApp = '';
            const allBioLinks = linktreeResults.organic || [];
            if (allBioLinks.length > 0) {
                console.log(`[Deep Bio] Potential Link-in-Bio found: ${allBioLinks[0].link}`);
                // Tentamos encontrar o padrão wa.me diretamente no snippet do Linktree
                const bioSnippet = allBioLinks.map((r: any) => r.snippet).join(' ');
                const waMatch = bioSnippet.match(/wa\.me\/(\d+)/i) || bioSnippet.match(/send\?phone=(\d+)/i);
                if (waMatch) {
                    bioLinkWhatsApp = waMatch[1];
                    console.log(`%c[Deep Bio] WhatsApp extracted from Linktree/Beacons: ${bioLinkWhatsApp}`, 'color: #f59e0b; font-weight: bold;');
                }
            }

            // 4. COMBINAR SNIPPETS PARA VALIDAÇÃO NEURAL
            const allSnippets = [
                ...(instaResults.organic || []),
                ...(fbResults.organic || []),
                ...(linkedinResults.organic || []),
                ...(linktreeResults.organic || []),
                ...(whatsappResults.organic || [])
            ].map(r => `Link: ${r.link} | Título: ${r.title} | Snippet: ${r.snippet}`).join('\n');

            // 5. HUNTER.IO INTEGRATION
            let hunterEmails: string[] = [];
            if (domain && !['facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com'].includes(domain)) {
                try {
                    const hunterData: any = await ApiGatewayService.callApi('hunter', 'domain-search', { domain }, { apiKeys });
                    hunterEmails = hunterData.data?.emails?.map((e: any) => `${e.value} (${e.position || 'Contato'})`) || [];
                    console.log(`[Neural Hunter] Found ${hunterEmails.length} emails via Hunter.io`);
                } catch (err) {
                    console.warn('[Neural Hunter] Hunter.io lookup failed.', err);
                }
            }

            const validationPrompt = `Você é um detetive digital especialista em OSINT. Analise os resultados de busca e identifique as informações reais da empresa:
            EMPRESA: ${lead.name}
            LOCAL: ${lead.location}
            SITE: ${website}
            WHATSAPP_DA_BIO: ${bioLinkWhatsApp || 'Não detectado diretamente'}
            EMAILS_HUNTER: ${hunterEmails.join(', ')}

            RESULTADOS DE BUSCA:
            ${allSnippets}

            REGRAS DE OURO:
            - Extraia o WHATSAPP se houver "wa.me/" ou "api.whatsapp.com".
            - Linktrees e Beacons são fontes ALTAMENTE confiáveis de contato direto.
            - O WhatsApp deve ter prioridade sobre o telefone fixo do Google Maps.
            - Extraia o e-mail real de contato.

            RETORNE APENAS JSON:
            {
              "instagram": "URL",
              "facebook": "URL",
              "linkedin": "URL",
              "realEmail": "email",
              "realPhones": [], // Lista de todos os WhatsApps/Celulares encontrados (formato 55119...)
              "primaryPhone": "O telefone mais provável de ser o WhatsApp do dono"
            }`;

            try {
                const validatedData = await ApiGatewayService.callApi<any>(
                    'gemini-1.5-flash',
                    'custom-prompt',
                    { prompt: validationPrompt },
                    { apiKeys, ttl: 86400 }
                );

                const finalData = typeof validatedData === 'string'
                    ? JSON.parse(validatedData.replace(/```json|```/g, '').trim())
                    : validatedData;

                return {
                    instagram: finalData.instagram || '',
                    facebook: finalData.facebook || '',
                    linkedin: finalData.linkedin || '',
                    website: website,
                    realEmail: finalData.realEmail || '',
                    realPhones: finalData.realPhones || [],
                    primaryPhone: finalData.primaryPhone || bioLinkWhatsApp || '',
                    hunterEmails: hunterEmails
                };

            } catch (err) {
                console.warn('[Social Validation] IA falhou, usando extrator básico.', err);
                return {
                    instagram: instaResults.organic?.[0]?.link || '',
                    facebook: fbResults.organic?.[0]?.link || '',
                    linkedin: linkedinResults.organic?.[0]?.link || '',
                    website: website,
                    realEmail: '',
                    primaryPhone: bioLinkWhatsApp || '',
                    hunterEmails: hunterEmails
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
            realEmail: '',
            hunterEmails: []
        };
    }

    private static async discoverPlaceImage(lead: Lead, apiKeys?: any): Promise<string | undefined> {
        try {
            console.log(`[Neural Image Discovery] Searching facade for: ${lead.name}`);
            const response: any = await ApiGatewayService.callApi(
                'maps',
                'search',
                { q: `${lead.name} ${lead.location}`, page: 1 },
                { apiKeys, ttl: 86400 * 30 }
            );

            if (response && response.places && response.places.length > 0) {
                // Tenta encontrar o lugar mais relevante que tenha uma imagem
                const place = response.places[0];
                return place.thumbnailUrl;
            }
        } catch (error) {
            console.warn('[Image Discovery] Falha ao buscar imagem do local:', error);
        }
        return undefined;
    }
}
