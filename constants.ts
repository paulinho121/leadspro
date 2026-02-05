
import { Lead, LeadStatus } from './types';

export const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    name: 'Tech Solutions Ltda',
    website: 'https://techsolutions.com.br',
    phone: '(11) 4002-8922',
    industry: 'Software Development',
    location: 'São Paulo, SP',
    status: LeadStatus.NEW,
    lastUpdated: '2023-10-27'
  },
  {
    id: '2',
    name: 'Green Energy Co.',
    website: 'https://greenenergy.io',
    phone: '(21) 3344-5566',
    industry: 'Renewable Energy',
    location: 'Rio de Janeiro, RJ',
    status: LeadStatus.ENRICHED,
    lastUpdated: '2023-10-25',
    details: {
      cnpj: '12.345.678/0001-90',
      tradeName: 'Green Energy',
      activity: 'Electricity Production',
      size: 'Medium',
      address: 'Av. Brasil, 1000'
    },
    aiInsights: 'Green Energy focuses on solar panel installation for industrial complexes. They recently expanded to wind farm maintenance.'
  },
  {
    id: '3',
    name: 'Logistics Pro',
    website: 'https://logpro.com.br',
    phone: '(41) 98877-6655',
    industry: 'Logistics',
    location: 'Curitiba, PR',
    status: LeadStatus.NEW,
    lastUpdated: '2023-10-28'
  }
];

export const CNAE_LIST = [
  { code: '6201-5/00', label: 'Desenvolvimento de software' },
  { code: '6202-3/00', label: 'Consultoria em TI' },
  { code: '7020-4/00', label: 'Consultoria empresarial' },
  { code: '4751-2/01', label: 'Comércio de informática' }
];
