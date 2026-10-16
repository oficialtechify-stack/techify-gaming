import React from 'react';
import { Bell, CreditCard, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';

export type ProfileSection = 'geral' | 'senha' | 'seguranca' | 'planos' | 'notificacoes';

const sections: { id: ProfileSection; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'geral', label: 'Geral', Icon: UserRound },
  { id: 'senha', label: 'Alterar Senha', Icon: LockKeyhole },
  { id: 'seguranca', label: 'Segurança', Icon: ShieldCheck },
  { id: 'planos', label: 'Planos e Taxas', Icon: CreditCard },
  { id: 'notificacoes', label: 'Notificações', Icon: Bell },
];

interface ProfileSectionTabsProps {
  active: ProfileSection;
  onChange: (section: ProfileSection) => void;
}

export const ProfileSectionTabs: React.FC<ProfileSectionTabsProps> = ({ active, onChange }) => (
  <nav aria-label="Seções do perfil" className="w-full overflow-x-auto border-b border-white/10">
    <div role="tablist" aria-label="Configurações da conta" className="flex min-w-max items-center gap-1">
      {sections.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={`profile-tab-${id}`}
          type="button"
          role="tab"
          aria-selected={active === id}
          aria-controls={`profile-panel-${id}`}
          onClick={() => onChange(id)}
          className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lime-300 ${active === id ? 'border-[#D9F22A] text-white' : 'border-transparent text-white/55 hover:text-white'}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  </nav>
);
