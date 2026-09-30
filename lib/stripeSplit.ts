export type SplitAllocationInput = {
  grossAmountCents: number;
  affiliatePercent: number;
  platformFeeCents?: number;
  commissionableAmountCents?: number;
};

export type SplitAllocation = {
  grossAmountCents: number;
  platformFeeCents: number;
  affiliateAmountCents: number;
  companyAmountCents: number;
};

/** Use integer BRL cents only. The company absorbs Stripe processing costs. */
export function calculateSplit(input: SplitAllocationInput): SplitAllocation {
  const { grossAmountCents } = input;
  const platformFeeCents = input.platformFeeCents ?? 99;
  const affiliatePercent = input.affiliatePercent;

  if (!Number.isSafeInteger(grossAmountCents) || grossAmountCents < 50) {
    throw new Error('Valor de cobrança inválido para Pix (mínimo de R$ 0,50).');
  }
  if (!Number.isSafeInteger(platformFeeCents) || platformFeeCents < 0) {
    throw new Error('Taxa da plataforma inválida.');
  }
  if (!Number.isFinite(affiliatePercent) || affiliatePercent < 0 || affiliatePercent > 100) {
    throw new Error('Percentual de comissão inválido.');
  }

  const commissionableAmountCents = input.commissionableAmountCents ?? grossAmountCents;
  if (!Number.isSafeInteger(commissionableAmountCents) || commissionableAmountCents < 0 || commissionableAmountCents > grossAmountCents) {
    throw new Error('Base de comissão inválida.');
  }
  const affiliateAmountCents = Math.round((commissionableAmountCents * affiliatePercent) / 100);
  const companyAmountCents = grossAmountCents - platformFeeCents - affiliateAmountCents;
  if (companyAmountCents < 0) {
    throw new Error('O valor da venda não cobre a taxa da plataforma e a comissão configurada.');
  }

  return { grossAmountCents, platformFeeCents, affiliateAmountCents, companyAmountCents };
}

export function toCents(amount: unknown): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Valor inválido.');
  return Math.round(value * 100);
}
