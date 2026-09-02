import { AwardItem, StatItem } from '../types';

export const STATS_DATA: StatItem[] = [
  {
    id: '1',
    value: '0',
    numericTarget: 0,
    prefix: '',
    title: 'STARTUPS & PLANOS NO CATÁLOGO',
  },
  {
    id: '2',
    value: 'R$ 0,00',
    numericTarget: 0,
    prefix: 'R$ ',
    title: 'COMISSÕES GERADAS & PAGAS',
  },
  {
    id: '3',
    value: '0',
    numericTarget: 0,
    prefix: '',
    title: 'AFILIADOS & VENDEDORES CADASTRADOS',
  },
];

export const AWARDS_DATA: AwardItem[] = [
  {
    id: 'award-1',
    year: '2025',
    title: 'Ecossistema Nacional de Afiliação B2B & Startups',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'award-2',
    year: '2025',
    title: 'Split de Pagamentos em Tempo Real e Liquidação Instantânea',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=300&q=80',
  },
];

export const TECH_ECOSYSTEM_PARTNERS = [
  {
    id: '1',
    name: 'AWS Cloud Services',
    category: 'Cloud & DevOps',
    logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: '2',
    name: 'OpenAI Ecosystem',
    category: 'IA & Automação',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: '3',
    name: 'PIX Central Bank',
    category: 'Fintech & Pagamentos',
    logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: '4',
    name: 'Google Cloud Platform',
    category: 'Infraestrutura',
    logo: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: '5',
    name: 'Stripe Payments',
    category: 'Gateway Global',
    logo: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: '6',
    name: 'Supabase & Firestore',
    category: 'Database Cloud',
    logo: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=160&q=80',
  },
];
