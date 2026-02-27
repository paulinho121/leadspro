
export enum LeadStatus {
  NEW = 'NEW',
  ENRICHING = 'ENRICHING',
  ENRICHED = 'ENRICHED',
  EXPORTED = 'EXPORTED'
}

export enum DealStage {
  DISCOVERY = 'discovery',
  PRESENTATION = 'presentation',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost'
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
  email?: string; // Email governamental/oficial
  placeImage?: string;
  employee_count?: string;
  partners?: string[];
  partners_contacts?: string[];
  realPhones?: string[];
}

export interface Lead {
  id: string;
  tenant_id?: string;
  name: string;
  website: string;
  phone: string;
  email?: string; // Email REAL para abordagem
  industry: string;
  location: string;
  status: LeadStatus;
  details?: CompanyDetails;
  ai_insights?: string;
  lastUpdated: string;
  p2c_score?: number; // Probability to Close (0-1)
  intent_signals?: any[];
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    map_link?: string;
    cnpj?: string;
    whatsapp?: string;
    linkedin?: string;
  };
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  target_niche?: string;
  target_location?: string;
  created_at: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  lead_id: string;
  campaign_id?: string;
  estimated_value: number;
  probability_to_close: number;
  stage: DealStage;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  closed_at?: string;
  created_at: string;
  lead?: Lead; // Join
}

export interface SearchFilters {
  keyword: string;
  location: string;
  industry?: string;
  cnae?: string;
  radius?: number;
  limit?: number;
}

export interface SequenceStep {
  delay_days: number;
  channel: 'whatsapp' | 'email';
  template?: string;
}

export interface OutreachSequence {
  id: string;
  tenant_id: string;
  name: string;
  steps: SequenceStep[];
  is_active: boolean;
  created_at: string;
}

export interface OutreachCampaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  channel: 'whatsapp' | 'email';
  template_content: string;
  scheduled_at?: string;
  total_leads: number;
  processed_leads: number;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  trigger_type: 'incoming_message' | 'lead_enriched' | 'status_changed';
  conditions: any;
  action_type: 'send_reply' | 'move_stage' | 'notify_admin';
  action_payload: any;
  is_active: boolean;
  created_at: string;
}
