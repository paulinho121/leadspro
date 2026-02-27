
import { ApiGatewayService } from './apiGatewayService';
import { Lead, LeadStatus } from '../types';
import { BillingService } from './billingService';

export class DiscoveryService {
    private static businessAdjectives = ['Inovação', 'Premium', 'Soluções', 'Group', 'Matrix', 'Advanced', 'Global', 'Digital', 'Elite', 'Prime', 'Smart', 'Nexus'];
    private static businessSuffixes = ['LTDA', 'SA', 'EIRELI', 'ME', 'Consultoria', 'Serviços', 'Tech', 'Hub'];

    /**
     * Realiza uma varredura profunda focada em fontes geolocalizadas e Redes Sociais
     */
    static async performDeepScan(keyword: string, location: string, tenantId?: string, apiKeys?: any, page: number = 1): Promise<Lead[]> {
        console.log(`[Neural Discovery] Calling Live Engine for: ${keyword} "${location}" (Pág: ${page})`);

        try {
            // Enterprise Scaling: Validação de Créditos
            if (tenantId) {
                const hasCredits = await BillingService.useCredits(
                    tenantId,
                    5,
                    'serper',
                    `Neural Discovery: ${keyword} em ${location} (Pág: ${page})`
                );
                if (!hasCredits) throw new Error("INSUFFICIENT_CREDITS");
            }

            const response: any = await ApiGatewayService.callApi(
                'maps',
                'search',
                { q: `${keyword} "${location}"`, page: page },
                { ttl: 3600, tenantId, apiKeys }
            );

            if (response && response.places) {
                return response.places.map((place: any): Lead => {
                    const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
                    let cleanPhone = (place.phoneNumber || '').replace(/\D/g, '');
                    // Se o número começar com 55 e tiver mais de 10 dígitos, assume que o DDI já está lá
                    const whatsappLink = cleanPhone
                        ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}`
                        : null;

                    return {
                        id: place.cid || Math.random().toString(36).substr(2, 9),
                        name: place.title,
                        website: place.website || '',
                        phone: place.phoneNumber || `(11) 9${phoneSuffix}`,
                        industry: keyword,
                        location: location,
                        status: LeadStatus.NEW,
                        lastUpdated: new Date().toISOString(),
                        details: {
                            address: place.address,
                            tradeName: place.title,
                            rating: place.rating,
                            reviews: place.ratingCount,
                            placeImage: place.thumbnailUrl
                        },
                        socialLinks: {
                            map_link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title + ' ' + place.address)}`,
                            cnpj: 'VERIFICAR',
                            whatsapp: whatsappLink
                        }
                    };
                });
            }
        } catch (error) {
            console.error('[Neural Discovery] Erro durante deep scan:', error);
            throw error; // Propagate error to trigger UI modal
        }

        return [];
    }

    /**
     * Realiza uma busca por CNPJ baseada em filtros de Localidade e Atividade
     */
    static async performCNPJScan(keyword: string, location: string, tenantId?: string, apiKeys?: any, page: number = 1): Promise<Lead[]> {
        console.log(`[CNPJ] Iniciando busca governamental para: ${keyword} em ${location} (Pág: ${page})`);

        // 1. Detectar se o keyword é um CNPJ individual (para o modo ENRICH)
        const cleanCnpjInput = keyword.replace(/\D/g, '');
        if (cleanCnpjInput.length === 14) {
            console.log(`[CNPJ] Detetado CNPJ individual: ${cleanCnpjInput}. Buscando dados reais...`);
            const realData = await this.fetchRealCNPJData(cleanCnpjInput);
            if (realData && realData.nome) {
                return [{
                    id: `cnpj-${cleanCnpjInput}`,
                    name: realData.nome,
                    website: realData.site || '',
                    phone: realData.telefone || '',
                    industry: realData.atividade_principal?.[0]?.text || keyword,
                    location: `${realData.municipio}, ${realData.uf}`,
                    status: LeadStatus.NEW,
                    lastUpdated: new Date().toISOString(),
                    details: {
                        tradeName: realData.fantasia || realData.nome,
                        legalName: realData.nome,
                        activity: realData.atividade_principal?.[0]?.text,
                        foundedDate: realData.abertura,
                        size: realData.porte,
                        address: `${realData.logradouro}, ${realData.numero} - ${realData.bairro}, ${realData.municipio} - ${realData.uf}`,
                        cnpj: cleanCnpjInput
                    },
                    socialLinks: {
                        cnpj: cleanCnpjInput,
                        whatsapp: realData.telefone ? `https://wa.me/55${realData.telefone.replace(/\D/g, '')}` : undefined
                    }
                }];
            }
        }

        // 2. BUSCA MASSIVA (Por CNAE ou Palavra-chave)
        try {
            // Ampliamos a busca para múltiplos diretórios grandes de CNPJ
            // Removendo aspas da keyword para permitir correspondências mais flexíveis (ex: CNAE parcial ou nome)
            const query = `(site:cnpj.biz OR site:econodata.com.br OR site:casadosdados.com.br OR site:cnpj.rocks) ${keyword} ${location} CNPJ`;

            let searchResponse: any = await ApiGatewayService.callApi(
                'google-search',
                'search',
                { q: query, page: page, num: 20 },
                { tenantId, apiKeys }
            );

            // Enterprise Scaling: Validação de Créditos para CNPJ Massivo
            if (tenantId) {
                const hasCredits = await BillingService.useCredits(
                    tenantId,
                    10,
                    'serper',
                    `CNPJ Mass Scan: ${keyword} em ${location} (Pág: ${page})`
                );
                if (!hasCredits) throw new Error("INSUFFICIENT_CREDITS");
            }

            // Fallback: Se não encontrar nada nos diretórios específicos, tentamos uma busca aberta
            if (!searchResponse || !searchResponse.organic || searchResponse.organic.length === 0) {
                console.log(`[CNPJ] Nenhum resultado nos diretórios. Tentando busca aberta...`);
                const fallbackQuery = `${keyword} ${location} "CNPJ" empresas governamentais`;
                searchResponse = await ApiGatewayService.callApi(
                    'google-search',
                    'search',
                    { q: fallbackQuery, page: page, num: 40 },
                    { tenantId, apiKeys }
                );
            }

            if (searchResponse && searchResponse.organic) {
                const foundCnpjs = new Set<string>();

                searchResponse.organic.forEach((result: any) => {
                    // Texto completo para busca (Título + Snippet + URL)
                    const textContent = (result.title + ' ' + result.snippet + ' ' + result.link);

                    // Regex hyper-agressiva para capturar CNPJs em qualquer formato
                    const matches = textContent.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|(\d{14})/g);

                    if (matches) {
                        matches.forEach(m => {
                            const clean = m.replace(/\D/g, '');
                            if (clean.length === 14) foundCnpjs.add(clean);
                        });
                    }

                    // Tentativa extra: extrair da URL se contiver padrão de CNPJ
                    const urlSegments = result.link.split(/[-/_]/);
                    urlSegments.forEach((seg: string) => {
                        const cleanSeg = seg.replace(/\D/g, '');
                        if (cleanSeg.length === 14) foundCnpjs.add(cleanSeg);
                    });
                });

                if (foundCnpjs.size > 0) {
                    console.log(`%c[Neural Discovery] Encontrados ${foundCnpjs.size} CNPJs potenciais para processamento.`, 'color: #06b6d4; font-weight: bold;');

                    const leads: Lead[] = [];
                    const cnpjList: string[] = Array.from(foundCnpjs).slice(0, 30);

                    for (const cnpj of cnpjList) {
                        // Respeito à cadência para não ser bloqueado nas APIs de consulta
                        await new Promise(resolve => setTimeout(resolve, 150));

                        const realData = await this.fetchRealCNPJData(cnpj);
                        if (realData && realData.nome) {
                            console.log(`%c[Neural Discovery] Lead Extraído: ${realData.nome}`, 'color: #10b981');
                            leads.push({
                                id: `cnpj-${cnpj}`,
                                name: String(realData.nome),
                                website: String(realData.site || ''),
                                phone: String(realData.telefone || ''),
                                industry: realData.atividade_principal?.[0]?.text || keyword,
                                location: location,
                                status: LeadStatus.NEW,
                                lastUpdated: new Date().toISOString(),
                                details: {
                                    tradeName: realData.fantasia || realData.nome,
                                    legalName: realData.nome,
                                    activity: realData.atividade_principal?.[0]?.text,
                                    cnpj: cnpj,
                                    address: String(`${realData.logradouro}, ${realData.numero} - ${realData.municipio}, ${realData.uf}`)
                                },
                                socialLinks: {
                                    cnpj: cnpj,
                                    whatsapp: realData.telefone ? `https://wa.me/55${realData.telefone.replace(/\D/g, '')}` : undefined
                                }
                            });
                        }
                    }
                    return leads;
                } else {
                    console.warn(`[Neural Discovery] A busca retornou resultados do Google, mas nenhum CNPJ válido foi extraído dos snippets ou links na página ${page}.`);
                }
            } else {
                console.error(`[Neural Discovery] Falha na resposta do motor de busca Serper. Verifique se a API Key é válida.`);
            }
        } catch (error) {
            console.error('[CNPJ Mass Scan] Erro durante a varredura:', error);
            throw error; // Propagate error
        }

        return [];
    }

    /**
     * Busca dados reais de um CNPJ específico usando múltiplas APIs com fallback
     */
    static async fetchRealCNPJData(cnpj: string): Promise<any> {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        // APIs Públicas sugeridas (Ordem de prioridade pelo tempo de resposta/estabilidade)
        const endpoints = [
            `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
            `https://receitaws.com.br/v1/cnpj/${cleanCnpj}`,
            `https://minhareceita.org/${cleanCnpj}`,
            `https://api.cnpja.com.br/companies/${cleanCnpj}`
        ];

        for (const url of endpoints) {
            try {
                console.log(`[CNPJ API] Consultando: ${url}`);
                const response = await fetch(url, { signal: AbortSignal.timeout(5000) }); // Timeout de 5s por API

                if (response.ok) {
                    const data = await response.json();

                    // Normalização Universal dos dados retornados
                    return {
                        nome: data.nome || data.razao_social || data.name || '',
                        fantasia: data.fantasia || data.nome_fantasia || data.alias || data.razao_social || '',
                        telefone: data.telefone || data.ddd_telefone_1 || (data.phone ? `${data.phone.area}-${data.phone.number}` : ''),
                        email: data.email || '',
                        municipio: data.municipio || data.cidade || data.address?.city || '',
                        uf: data.uf || data.state || data.address?.state || '',
                        abertura: data.abertura || data.data_inicio_atividade || data.founded || '',
                        porte: data.porte || data.size || '',
                        logradouro: data.logradouro || data.address?.street || '',
                        numero: data.numero || data.address?.number || '',
                        bairro: data.bairro || data.address?.district || '',
                        atividade_principal: data.atividade_principal ||
                            (data.cnae_fiscal_descricao ? [{ text: data.cnae_fiscal_descricao }] :
                                data.main_activity ? [{ text: data.main_activity.text }] : []),
                        site: data.site || data.website || '',
                        qsa: (data.qsa || data.socios || []).map((s: any) => ({
                            nome: s.nome || s.nome_socio || s.name || 'Sócio não identificado',
                            cargo: s.qual || s.qualificacao_socio || s.role || 'Sócio'
                        }))
                    };
                }
            } catch (err) {
                console.warn(`[CNPJ API] Falha na rota ${url}:`, err);
                continue; // Tenta a próxima API da lista
            }
        }

        return null;
    }

    /**
     * MODO SHERLOCK: Prospecção de Clientes de Concorrentes
     * Busca por interações públicas, reclamações e ex-clientes em redes sociais e portais.
     */
    static async performCompetitorScan(competitorInput: string, location: string, tenantId?: string, apiKeys?: any, page: number = 1, contextKeywords?: string): Promise<Lead[]> {
        console.log(`[Sherlock Scan] Iniciando espionagem de: ${competitorInput} (Pág: ${page}, Contexto: ${contextKeywords || 'Nenhum'})`);

        // 1. Tentar extrair nome limpo do concorrente a partir da URL ou Input
        let competitorName = competitorInput;
        try {
            if (competitorInput.includes('http') || competitorInput.includes('www')) {
                const urlObj = new URL(competitorInput.startsWith('http') ? competitorInput : `https://${competitorInput}`);
                if (urlObj.hostname.includes('instagram') || urlObj.hostname.includes('facebook') || urlObj.hostname.includes('linkedin')) {
                    const pathParts = urlObj.pathname.split('/').filter(p => p);
                    if (pathParts.length > 0) competitorName = pathParts[0];
                } else {
                    competitorName = urlObj.hostname.replace('www.', '').split('.')[0];
                }
            }
        } catch (e) {
            competitorName = competitorInput;
        }

        competitorName = competitorName.replace('@', '');
        console.log(`[Sherlock Scan] Alvo Identificado: ${competitorName}`);

        try {
            let dorks = [];

            // Se o usuário forneceu palavras-chave específicas
            if (contextKeywords && contextKeywords.trim().length > 0) {
                const keywords = contextKeywords.split(',').map(k => `"${k.trim()}"`).join(' OR ');
                dorks = [
                    // Foca em ReclameAqui (consumidores reais)
                    `site:reclameaqui.com.br "${competitorName}" (${keywords})`,
                    // Foca em comentários e não em posts da marca
                    `site:instagram.com "comentários" "${competitorName}" (${keywords})`,
                    `site:facebook.com "comentários" "${competitorName}" (${keywords})`,
                    // Foca em pessoas pedindo indicação ou reclamando em fóruns/blogs
                    `"${competitorName}" (${keywords}) -site:instagram.com -site:facebook.com -site:${competitorInput}`,
                    `related:${competitorInput}`
                ];
            } else {
                // Estratégia Padrão (Sem keywords específicas)
                dorks = [
                    `site:reclameaqui.com.br "${competitorName}"`,
                    `site:facebook.com "${competitorName}" "não recomendo"`,
                    `site:instagram.com "${competitorName}" "reclamação"`,
                    `"${competitorName}" "estou insatisfeito" -site:${competitorInput}`,
                    `"${competitorName}" "alternativa para" OR "parecido com"`,
                    `related:${competitorInput}`
                ];
            }

            const queryTemplate = dorks[(page - 1) % dorks.length] || dorks[0];
            const finalQuery = `${queryTemplate} ${location}`;

            console.log(`[Sherlock Scan] Executing Dork: ${finalQuery}`);

            const searchResponse: any = await ApiGatewayService.callApi(
                'google-search',
                'search',
                { q: finalQuery, page: page, num: 15 },
                { tenantId, apiKeys }
            );

            // Enterprise Scaling: Validação de Créditos para Sherlock
            if (tenantId) {
                const hasCredits = await BillingService.useCredits(
                    tenantId,
                    15,
                    'serper',
                    `Sherlock Hunter: ${competitorInput} em ${location}`
                );
                if (!hasCredits) throw new Error("INSUFFICIENT_CREDITS");
            }

            if (searchResponse && searchResponse.organic) {
                return searchResponse.organic.map((result: any): Lead | null => {
                    let extractedName = result.title;
                    let leadType = 'Interesse';

                    // Lógica de Extração Inteligente de Nome de Perfil
                    if (result.link.includes('instagram.com')) {
                        // Tenta pegar "Nome (@handle)"
                        const instaMatch = result.title.match(/^(.+?) \(@/);
                        if (instaMatch) {
                            extractedName = instaMatch[1];
                        } else if (result.title.includes(' on Instagram:')) {
                            // "User Name on Instagram: 'Caption...'"
                            extractedName = result.title.split(' on Instagram:')[0];
                        }
                    } else if (result.link.includes('facebook.com')) {
                        if (result.title.includes('| Facebook')) {
                            extractedName = result.title.split('| Facebook')[0].trim();
                        }
                    } else if (result.link.includes('reclameaqui.com.br')) {
                        leadType = 'Cliente Insatisfeito';
                        // ReclameAqui titles usually are "Title of complaint - Company Name"
                        // We can't easily get the person's name from title, so we use a placeholder or the complaint title as context
                        extractedName = "Cliente ReclameAqui (" + result.title.split('-')[0].substring(0, 20) + "...)";
                    }

                    // Limpeza final
                    extractedName = extractedName.substring(0, 50).trim();

                    // Ignorar se o nome extraído for o próprio concorrente (falso positivo)
                    if (extractedName.toLowerCase().includes(competitorName.toLowerCase())) {
                        return null;
                    }

                    return {
                        id: `sherlock-${Math.random().toString(36).substr(2, 9)}`,
                        name: extractedName,
                        website: result.link,
                        phone: '',
                        industry: `${leadType} em: ${competitorName}`,
                        location: location || 'Brasil',
                        status: LeadStatus.NEW,
                        lastUpdated: new Date().toISOString(),
                        details: {
                            tradeName: result.title,
                            // @ts-ignore
                            notes: `Fonte: ${result.source || 'Web'}. Snippet: ${result.snippet}`
                        },
                        socialLinks: {
                            map_link: result.link,
                            whatsapp: null
                        }
                    };
                }).filter((l: Lead | null) => l !== null); // Remove nulls
            }

        } catch (error) {
            console.error('[Sherlock Scan] Erro fatal:', error);
            throw error; // Propagate error
        }

        return [];
    }





    /**
     * MODO B2C HUNTER: Captura de intenção de compra B2C
     * Busca por pessoas físicas expressando intenção de compra, dúvidas ou pedidos de indicação em fóruns e redes sociais.
     */
    static async performB2CHunterScan(keyword: string, location: string, tenantId?: string, apiKeys?: any, page: number = 1): Promise<Lead[]> {
        console.log(`[B2C Hunter] Iniciando caça de intenção para: ${keyword} em ${location} (Pág: ${page})`);

        try {
            const dorks = [
                // Fóruns e Comunidades de Dúvidas
                `site:reddit.com/r/brasil OR site:reddit.com "${keyword}" ("alguém sabe" OR "recomendações" OR "quanto custa" OR "vale a pena")`,
                `site:quora.com "${keyword}" ("ajuda" OR "indicação" OR "como funciona")`,
                // Redes Sociais (Filtro por indicação/dúvida)
                `site:facebook.com "alguém indica" "${keyword}"`,
                `site:twitter.com OR site:x.com "alguém indica" "${keyword}"`,
                // Buscas abertas por intenção
                `"preciso de" "${keyword}" "indicação"`,
                `"qual o melhor" "${keyword}" "custo benefício"`
            ];

            const queryTemplate = dorks[(page - 1) % dorks.length] || dorks[0];
            const finalQuery = `${queryTemplate} ${location}`;

            console.log(`[B2C Hunter] Executing Intent Dork: ${finalQuery}`);

            const searchResponse: any = await ApiGatewayService.callApi(
                'google-search',
                'search',
                { q: finalQuery, page: page, num: 15 },
                { tenantId, apiKeys }
            );

            // Enterprise Scaling: Validação de Créditos para B2C Hunter
            if (tenantId) {
                const hasCredits = await BillingService.useCredits(
                    tenantId,
                    15,
                    'serper',
                    `B2C Intent Hunter: ${keyword}`
                );
                if (!hasCredits) throw new Error("INSUFFICIENT_CREDITS");
            }

            if (searchResponse && searchResponse.organic) {
                return searchResponse.organic.map((result: any): Lead => {
                    let extractedName = result.title;
                    let leadType = 'Intenção B2C';

                    // Lógica de Extração de Nome baseada na fonte
                    if (result.link.includes('reddit.com')) {
                        const redditMatch = result.title.match(/(.+) : r\//);
                        if (redditMatch) extractedName = redditMatch[1];
                        leadType = 'Post Reddit';
                    } else if (result.link.includes('quora.com')) {
                        leadType = 'Dúvida Quora';
                    } else if (result.link.includes('facebook.com')) {
                        leadType = 'Post Facebook';
                    }

                    return {
                        id: `b2c-${Math.random().toString(36).substr(2, 9)}`,
                        name: extractedName.substring(0, 50).trim(),
                        website: result.link,
                        phone: '', // B2C raramente tem telefone direto no post, requer abordagem via rede social
                        industry: `${leadType}: ${keyword}`,
                        location: location || 'Brasil',
                        status: LeadStatus.NEW,
                        lastUpdated: new Date().toISOString(),
                        details: {
                            tradeName: result.title,
                            // @ts-ignore
                            notes: `Fonte: ${result.source || 'Web'}. Snippet: ${result.snippet}`,
                            intent_score: 0.85 // Score fixo alto para esse modo
                        },
                        socialLinks: {
                            map_link: result.link,
                            whatsapp: null
                        }
                    };
                });
            }

        } catch (error) {
            console.error('[B2C Hunter] Erro fatal:', error);
            throw error;
        }

        return [];
    }

    private static async mockCNPJDiscovery(keyword: string, location: string): Promise<Lead[]> {
        // DESATIVADO: Geração de leads demo removida para produção estrita.
        return [];
    }

    private static generateMockExtractedLeads(keyword: any, location: string): Lead[] {
        // DESATIVADO: Geração de leads demo removida para produção estrita.
        return [];
    }
}
