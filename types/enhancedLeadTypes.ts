// Interface extendida para informações adicionais da empresa
export interface CompanyDetails {
  // Informações básicas
  tradeName?: string;
  legalName?: string;
  cnpj?: string;
  website?: string;
  email?: string;
  phone?: string;
  placeImage?: string;
  
  // Novas informações
  companySize?: 'micro' | 'pequeno' | 'medio' | 'grande' | 'enorme';
  employeeCount?: number;
  revenue?: number;
  foundedYear?: number;
  
  // Informações dos sócios/QSA
  partners?: Partner[];
  qsa?: QSA[];
  
  // Informações adicionais
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  
  // Endereço completo
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Informações de contato
  contacts?: Contact[];
  
  // Informações financeiras
  financialInfo?: {
    annualRevenue?: number;
    monthlyRevenue?: number;
    profit?: number;
    capital?: number;
  };
  
  // Informações operacionais
  operationalInfo?: {
    sectors?: string[];
    products?: string[];
    services?: string[];
    markets?: string[];
  };
}

// Interface de Sócio/Partner
export interface Partner {
  nome?: string;
  name?: string;
  cpf?: string;
  cargo?: string;
  qual?: string;
  participation?: number; // percentual de participação
  isPrincipal?: boolean;
  contact?: {
    email?: string;
    phone?: string;
    linkedin?: string;
  };
}

// Interface de QSA (Quadro de Sócios e Administradores)
export interface QSA {
  nome?: string;
  name?: string;
  cpf?: string;
  qual?: string;
  cargo?: string;
  dataEntrada?: string;
  dataSaida?: string;
  codigoQual?: string;
}

// Interface de Contato
export interface Contact {
  name?: string;
  position?: string;
  email?: string;
  phone?: string;
  department?: string;
  isPrincipal?: boolean;
}

// Status do Lead
export enum LeadStatus {
  NEW = 'NEW',
  ENRICHED = 'ENRICHED',
  PARKED = 'PARKED',
  DISCARDED = 'DISCARDED'
}

// Lead básico
export interface Lead {
  id: string;
  name: string;
  location: string;
  industry: string;
  status: LeadStatus;
  lastUpdated: string;
  details?: CompanyDetails;
  website?: string;
  phone?: string;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

// Lead extendido com as novas informações
export interface EnhancedLead extends Lead {
  details?: CompanyDetails;
  enrichmentLevel?: number; // 0-100
  lastEnriched?: string;
  source?: string;
  tags?: string[];
  notes?: string[];
  customFields?: Record<string, any>;
}

// Tipos de tamanho de empresa
export type CompanySize = 'micro' | 'pequeno' | 'medio' | 'grande' | 'enorme';

// Configuração de tamanho de empresa
export const COMPANY_SIZE_CONFIG = {
  micro: {
    label: 'Microempresa',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: '🏢',
    maxEmployees: 9,
    maxRevenue: 360000 // R$ 360.000/ano
  },
  pequeno: {
    label: 'Pequena',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: '🏢',
    maxEmployees: 49,
    maxRevenue: 4800000 // R$ 4.800.000/ano
  },
  medio: {
    label: 'Média',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: '🏢',
    maxEmployees: 249,
    maxRevenue: 300000000 // R$ 300.000.000/ano
  },
  grande: {
    label: 'Grande',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: '🏢',
    maxEmployees: 999,
    maxRevenue: Infinity
  },
  enorme: {
    label: 'Grande Porte',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: '🏢',
    maxEmployees: Infinity,
    maxRevenue: Infinity
  }
};

// Função para determinar tamanho da empresa
export const determineCompanySize = (employeeCount?: number, revenue?: number): CompanySize => {
  if (!employeeCount && !revenue) return 'medio';
  
  if (employeeCount <= 9 && (!revenue || revenue <= 360000)) return 'micro';
  if (employeeCount <= 49 && (!revenue || revenue <= 4800000)) return 'pequeno';
  if (employeeCount <= 249 && (!revenue || revenue <= 300000000)) return 'medio';
  if (employeeCount <= 999) return 'grande';
  
  return 'enorme';
};

// Função para formatar número de funcionários
export const formatEmployeeCount = (count?: number): string => {
  if (!count) return 'N/A';
  
  if (count <= 1) return `${count} funcionário`;
  if (count <= 999) return `${count} funcionários`;
  if (count <= 9999) return `${(count / 1000).toFixed(1)}K funcionários`;
  return `${(count / 1000).toFixed(0)}K funcionários`;
};

// Função para formatar receita
export const formatRevenue = (revenue?: number): string => {
  if (!revenue) return 'N/A';
  
  if (revenue < 1000) return `R$ ${revenue.toFixed(2)}`;
  if (revenue < 1000000) return `R$ ${(revenue / 1000).toFixed(0)}K`;
  if (revenue < 1000000000) return `R$ ${(revenue / 1000000).toFixed(0)}M`;
  return `R$ ${(revenue / 1000000000).toFixed(0)}B`;
};

// Função para validar CNPJ
export const validateCNPJ = (cnpj?: string): boolean => {
  if (!cnpj) return false;
  
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Cálculo do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (firstDigit !== parseInt(cleanCNPJ[12])) return false;
  
  // Cálculo do segundo dígito verificador
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return secondDigit === parseInt(cleanCNPJ[13]);
};

// Função para formatar CNPJ
export const formatCNPJ = (cnpj?: string): string => {
  if (!cnpj) return '';
  
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  if (cleanCNPJ.length !== 14) return cnpj;
  
  return cleanCNPJ.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
};

// Função para mascarar CNPJ
export const maskCNPJ = (cnpj?: string): string => {
  if (!cnpj) return '';
  
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  if (cleanCNPJ.length !== 14) return cnpj;
  
  return cleanCNPJ.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3.****-**'
  );
};
