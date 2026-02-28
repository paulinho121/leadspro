
import { Lead } from '../types';

export type CRMFormat = 'GENERIC' | 'HUBSPOT' | 'PIPEDRIVE' | 'SALESFORCE' | 'RD_STATION' | 'KOMMO' | 'BREVO';

export class ExportService {
    static exportToCSV(leads: Lead[], format: CRMFormat = 'GENERIC') {
        if (leads.length === 0) return;

        let headers: string[] = [];
        let rows: string[][] = [];

        switch (format) {
            case 'HUBSPOT':
                headers = ['First Name', 'Last Name', 'Company Name', 'Email', 'Phone Number', 'Website URL', 'Industry', 'City', 'Lead Insights'];
                rows = leads.map(l => {
                    const [firstName, ...lastNames] = (l.name || '').split(' ');
                    const lastName = lastNames.join(' ') || '.';
                    return [
                        this.sanitize(firstName),
                        this.sanitize(lastName),
                        this.sanitize(l.details?.tradeName || l.name),
                        this.sanitize(l.email || l.details?.email || ''),
                        this.sanitize(l.phone || ''),
                        this.sanitize(l.website || ''),
                        this.sanitize(l.industry || ''),
                        this.sanitize(l.location.split(',')[0] || ''),
                        this.sanitize(l.ai_insights || '')
                    ];
                });
                break;

            case 'PIPEDRIVE':
                headers = ['Person name', 'Organization', 'Email', 'Phone', 'Industry', 'Website', 'Address', 'AI Insights'];
                rows = leads.map(l => [
                    this.sanitize(l.name),
                    this.sanitize(l.details?.tradeName || l.name),
                    this.sanitize(l.email || l.details?.email || ''),
                    this.sanitize(l.phone || ''),
                    this.sanitize(l.industry || ''),
                    this.sanitize(l.website || ''),
                    this.sanitize(l.details?.address || l.location),
                    this.sanitize(l.ai_insights || '')
                ]);
                break;

            case 'SALESFORCE':
                headers = ['FirstName', 'LastName', 'Company', 'Email', 'Phone', 'Website', 'Industry', 'City', 'Description'];
                rows = leads.map(l => {
                    const [firstName, ...lastNames] = (l.name || '').split(' ');
                    const lastName = lastNames.join(' ') || (l.name || '.');
                    return [
                        this.sanitize(firstName),
                        this.sanitize(lastName),
                        this.sanitize(l.details?.tradeName || l.name),
                        this.sanitize(l.email || l.details?.email || ''),
                        this.sanitize(l.phone || ''),
                        this.sanitize(l.website || ''),
                        this.sanitize(l.industry || ''),
                        this.sanitize(l.location.split(',')[0] || ''),
                        this.sanitize(l.ai_insights || '')
                    ];
                });
                break;

            case 'RD_STATION':
                headers = ['Nome da Oportunidade', 'Nome da Organização', 'Nome do contato', 'Telefone do contato', 'E-mail do contato', 'Segmento do cliente', 'Anotação', 'Cidade', 'Estado', 'URL do site'];
                rows = leads.map(l => {
                    const locationParts = l.location.split(',').map(p => p.trim());
                    const cidade = locationParts[0] || '';
                    const estado = locationParts[1] || '';
                    const empresa = l.details?.tradeName || l.name;
                    return [
                        this.sanitize(`Venda - ${empresa}`), // Nome da Oportunidade (gera um card no CRM)
                        this.sanitize(empresa), // Nome da Organização
                        this.sanitize(l.name), // Nome do contato
                        this.sanitize(l.phone || ''), // Telefone do contato
                        this.sanitize(l.email || l.details?.email || ''), // E-mail do contato
                        this.sanitize(l.industry || ''), // Segmento do cliente
                        this.sanitize(l.ai_insights || ''), // Anotação
                        this.sanitize(cidade), // Cidade
                        this.sanitize(estado), // Estado
                        this.sanitize(l.website || '') // URL do site
                    ];
                });
                break;

            case 'BREVO':
                headers = ['EMAIL', 'FIRSTNAME', 'LASTNAME', 'SMS', 'COMPANY', 'WEBSITE', 'CITY', 'ATTRIBUTES'];
                rows = leads.map(l => {
                    const [firstName, ...lastNames] = (l.name || '').split(' ');
                    const lastName = lastNames.join(' ') || '.';
                    return [
                        this.sanitize(l.email || l.details?.email || ''),
                        this.sanitize(firstName),
                        this.sanitize(lastName),
                        this.sanitize(l.phone || ''),
                        this.sanitize(l.details?.tradeName || l.name),
                        this.sanitize(l.website || ''),
                        this.sanitize(l.location.split(',')[0] || ''),
                        this.sanitize(`Insight: ${l.ai_insights || ''}`)
                    ];
                });
                break;

            default:
                headers = ['Nome', 'Empresa', 'Email', 'Website', 'Telefone', 'Setor', 'Localização', 'Insights IA', 'Instagram', 'CNPJ'];
                rows = leads.map(l => [
                    this.sanitize(l.name),
                    this.sanitize(l.details?.tradeName || l.name),
                    this.sanitize(l.email || l.details?.email || ''),
                    this.sanitize(l.website || ''),
                    this.sanitize(l.phone || ''),
                    this.sanitize(l.industry || ''),
                    this.sanitize(l.location || ''),
                    this.sanitize(l.ai_insights || ''),
                    this.sanitize(l.socialLinks?.instagram || ''),
                    this.sanitize(l.details?.cnpj || l.socialLinks?.cnpj || '')
                ]);
        }

        const separator = ',';
        const csvContent = [
            headers.join(separator),
            ...rows.map(r => r.join(separator))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leads_export_${format.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private static sanitize(val: string): string {
        if (!val) return '""';
        return `"${val.toString().replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    }
}
