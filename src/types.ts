export interface AwardItem {
  id: string;
  year: string;
  title: string;
  image: string;
  category?: string;
}

export interface SponsorItem {
  id: string;
  name: string;
  year: string;
  category: 'futebol' | 'esports' | 'basquete' | 'futsal' | 'midia' | 'outros';
  image?: string;
}

export interface StatItem {
  id: string;
  value: string;
  numericTarget: number;
  prefix?: string;
  suffix?: string;
  title: string;
}

export type ActiveModal = 
  | 'careers' 
  | 'about' 
  | 'culture' 
  | 'report' 
  | 'responsible' 
  | 'login' 
  | 'register_affiliate' 
  | 'register_company' 
  | 'forgot_password' 
  | null;
