export type PlatformRole = 'empresa' | 'afiliado';

export type SubscriptionPlanDefinition = {
  id: string;
  role: PlatformRole;
  name: string;
  priceCents: number;
};

export const PLATFORM_SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanDefinition> = {
  afiliado_starter: { id: 'afiliado_starter', role: 'afiliado', name: 'Afiliado Starter', priceCents: 0 },
  afiliado_vip: { id: 'afiliado_vip', role: 'afiliado', name: 'Afiliado VIP', priceCents: 2990 },
  starter: { id: 'starter', role: 'empresa', name: 'Starter', priceCents: 0 },
  pro: { id: 'pro', role: 'empresa', name: 'Pro', priceCents: 4990 },
  scale: { id: 'scale', role: 'empresa', name: 'Scale', priceCents: 14990 },
};

export const WITHDRAWAL_FEE_CENTS = 200;
export const MIN_WITHDRAWAL_CENTS = 1000;

const paidTiers = new Set(
  Object.values(PLATFORM_SUBSCRIPTION_PLANS).filter((plan) => plan.priceCents > 0).map((plan) => plan.id),
);

export function getSubscriptionPlan(planId: unknown): SubscriptionPlanDefinition | undefined {
  const clean = typeof planId === 'string' ? planId.trim().toLowerCase() : '';
  return PLATFORM_SUBSCRIPTION_PLANS[clean];
}

export function profileHasPaidPlan(profile: Record<string, any> | null | undefined): boolean {
  if (!profile) return false;
  const status = String(profile.planStatus || profile.stripeSubscriptionStatus || '').trim().toLowerCase();
  const tier = String(profile.subscriptionTier || profile.plan || '').trim().toLowerCase();
  return status === 'active' && paidTiers.has(tier);
}

export function releaseDelayDays(profile: Record<string, any> | null | undefined): 8 | 15 {
  return profileHasPaidPlan(profile) ? 8 : 15;
}

export function roleAvailableCentsField(role: PlatformRole): string {
  return role === 'empresa' ? 'empresaAvailableBalanceCents' : 'afiliadoAvailableBalanceCents';
}

export function rolePendingCentsField(role: PlatformRole): string {
  return role === 'empresa' ? 'empresaPendingBalanceCents' : 'afiliadoPendingBalanceCents';
}
