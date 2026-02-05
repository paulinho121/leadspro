
export enum LeadStatus {
  NEW = 'NEW',
  ENRICHING = 'ENRICHING',
  ENRICHED = 'ENRICHED',
  EXPORTED = 'EXPORTED'
}

export interface CompanyDetails {
  cnpj?: string;
  legalName?: string;
  tradeName?: string;
  activity?: string; // CNAE
  size?: string;
  address?: string;
  qsa?: string[]; // Partners
  foundedDate?: string;
  rating?: number;
  reviews?: number;
  ai_score?: number;
}

export interface Lead {
  id: string;
  name: string;
  website: string;
  phone: string;
  industry: string;
  location: string;
  status: LeadStatus;
  details?: CompanyDetails;
  ai_insights?: string;
  lastUpdated: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    google?: string;
    cnpj?: string;
    whatsapp?: string;
    linkedin?: string;
  };
}

export interface SearchFilters {
  keyword: string;
  location: string;
  cnae: string;
  radius: number;
}
