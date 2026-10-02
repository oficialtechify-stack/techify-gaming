export interface PublicPlatformMetrics {
  totalRegisteredUsers: number;
  totalStartups: number;
  totalPlans: number;
  totalCommissionsGenerated: number;
  totalCommissionsPaid: number;
  totalGrossSales: number;
  totalSalesCount: number;
}

export const EMPTY_PUBLIC_METRICS: PublicPlatformMetrics = {
  totalRegisteredUsers: 0,
  totalStartups: 0,
  totalPlans: 0,
  totalCommissionsGenerated: 0,
  totalCommissionsPaid: 0,
  totalGrossSales: 0,
  totalSalesCount: 0,
};

export async function fetchPublicPlatformMetrics(): Promise<PublicPlatformMetrics> {
  const response = await fetch('/api/public/metrics', {
    method: 'GET',
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.metrics) {
    throw new Error(data.error || 'Não foi possível carregar as métricas.');
  }

  return {
    totalRegisteredUsers: Number(data.metrics.totalRegisteredUsers || 0),
    totalStartups: Number(data.metrics.totalStartups || 0),
    totalPlans: Number(data.metrics.totalPlans || 0),
    totalCommissionsGenerated: Number(data.metrics.totalCommissionsGenerated || 0),
    totalCommissionsPaid: Number(data.metrics.totalCommissionsPaid || 0),
    totalGrossSales: Number(data.metrics.totalGrossSales || 0),
    totalSalesCount: Number(data.metrics.totalSalesCount || 0),
  };
}
