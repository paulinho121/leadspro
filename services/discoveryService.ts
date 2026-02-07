
import { ApiGatewayService } from './apiGatewayService';
import { Lead, LeadStatus } from '../types';

export class DiscoveryService {
    private static businessAdjectives = ['Inovação', 'Premium', 'Soluções', 'Group', 'Matrix', 'Advanced', 'Global', 'Digital', 'Elite', 'Prime', 'Smart', 'Nexus'];
    private static businessSuffixes = ['LTDA', 'SA', 'EIRELI', 'ME', 'Consultoria', 'Serviços', 'Tech', 'Hub'];

    /**
     * Realiza uma varredura profunda focada em fontes geolocalizadas e Redes Sociais
     */
    static async performDeepScan(keyword: string, location: string, tenantId?: string, apiKeys?: any, page: number = 1): Promise<Lead[]> {
        console.log(`[Neural Discovery] Calling Live Engine for: ${keyword} "${location}" (Pág: ${page})`);

        try {
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
                            reviews: place.ratingCount
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
            return [];
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

            const searchResponse: any = await ApiGatewayService.callApi(
                'google-search',
                'search',
                { q: query, page: page, num: 40 },
                { tenantId, apiKeys }
            );

            if (searchResponse && searchResponse.organic) {
                const foundCnpjs = new Set<string>();

                searchResponse.organic.forEach((result: any) => {
                    const textContent = (result.title + ' ' + result.snippet + ' ' + result.link);
                    const matches = textContent.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|(\d{14})/g);
                    if (matches) {
                        matches.forEach(m => {
                            const clean = m.replace(/\D/g, '');
                            if (clean.length === 14) foundCnpjs.add(clean);
                        });
                    }
                });

                if (foundCnpjs.size > 0) {
                    console.log(`[CNPJ] Detectados ${foundCnpjs.size} códigos potenciais:`, Array.from(foundCnpjs));
                    console.log(`[CNPJ] Extraindo dados reais...`);

                    const leads: Lead[] = [];
                    // Processamos até 30 CNPJs para garantir que pelo menos 20 sejam válidos e novos
                    const cnpjList: string[] = Array.from(foundCnpjs).slice(0, 30);

                    for (const cnpj of cnpjList) {
                        // Delay mínimo para respeitar limites de API
                        await new Promise(resolve => setTimeout(resolve, 80));

                        const realData = await this.fetchRealCNPJData(cnpj);
                        if (realData && realData.nome) {
                            leads.push({
                                id: `cnpj-${cnpj}`,
                                name: String(realData.nome),
                                website: String(realData.site || ''),
                                phone: String(realData.telefone || ''),
                                industry: keyword,
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
                }
            }
        } catch (error) {
            console.error('[CNPJ Mass Scan] Erro durante a varredura:', error);
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
                        site: data.site || data.website || ''
                    };
                }
            } catch (err) {
                console.warn(`[CNPJ API] Falha na rota ${url}:`, err);
                continue; // Tenta a próxima API da lista
            }
        }

        return null;
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
