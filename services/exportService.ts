
import { Lead } from '../types';

export type CRMFormat = 'GENERIC' | 'HUBSPOT' | 'PIPEDRIVE' | 'SALESFORCE' | 'RD_STATION' | 'KOMMO';

export class ExportService {
    static exportToCSV(leads: Lead[], format: CRMFormat = 'GENERIC') {
        if (leads.length === 0) return;

        let headers: string[] = [];
        let rows: string[][] = [];

        switch (format) {
            case 'HUBSPOT':
                headers = ['First Name', 'Last Name', 'Company Name', 'Email', 'Phone Number', 'Website URL', 'Industry', 'City', 'Lead Insights'];
                rows = leads.map(l => {
                    const [firstName, ...lastNames] = l.name.split(' ');
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
                    const [firstName, ...lastNames] = l.name.split(' ');
                    const lastName = lastNames.join(' ') || l.name;
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
                headers = ['Nome', 'Empresa', 'Email', 'Telefone', 'Site', 'Setor', 'Cidade', 'Estado', 'Anotações IA'];
                rows = leads.map(l => {
                    const locationParts = l.location.split(',').map(p => p.trim());
                    const cidade = locationParts[0] || '';
                    const estado = locationParts[1] || '';
                    return [
                        this.sanitize(l.name),
                        this.sanitize(l.details?.tradeName || l.name),
                        this.sanitize(l.email || l.details?.email || ''),
                        this.sanitize(l.phone || ''),
                        this.sanitize(l.website || ''),
                        this.sanitize(l.industry || ''),
                        this.sanitize(cidade),
                        this.sanitize(estado),
                        this.sanitize(l.ai_insights || '')
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

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
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
