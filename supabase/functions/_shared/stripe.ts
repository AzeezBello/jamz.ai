import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno';
import { HttpError } from './http.ts';

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

/**
 * Price ids live on the plans row, with an env override so a project can be
 * pointed at test-mode prices without a migration.
 */
export function priceIdFor(
  plan: {
    id: string;
    stripe_monthly_price_id: string | null;
    stripe_yearly_price_id: string | null;
  },
  interval: 'monthly' | 'yearly',
): string {
  const column = interval === 'yearly' ? plan.stripe_yearly_price_id : plan.stripe_monthly_price_id;
  const envKey = `STRIPE_PRICE_${plan.id.toUpperCase()}_${interval.toUpperCase()}`;
  const price = column ?? Deno.env.get(envKey);

  if (!price) {
    throw new HttpError(
      500,
      'price_not_configured',
      `No Stripe price for ${plan.id}/${interval}. Set plans.stripe_${interval}_price_id or ${envKey}.`,
    );
  }
  return price;
}

export function siteUrl(): string {
  return (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
}
