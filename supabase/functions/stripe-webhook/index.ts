// POST /stripe-webhook — the only writer of subscription state.
//
// Signature-verified, deduplicated by event id, and safe to replay: credit
// grants are keyed on the invoice id, so a redelivery grants nothing twice.
// Requires verify_jwt = false (see supabase/config.toml) because Stripe cannot
// present a Supabase JWT.

import { serviceClient } from '../_shared/http.ts';
import { cryptoProvider, stripe } from '../_shared/stripe.ts';
import type Stripe from 'https://esm.sh/stripe@17.5.0?target=deno';

const PLAN_BY_STATUS_DOWNGRADE = 'free';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !secret) {
    return new Response('missing signature', { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error('signature verification failed', err);
    return new Response('invalid signature', { status: 400 });
  }

  const db = serviceClient();

  // Dedupe: the insert fails on replay, and we acknowledge without re-running.
  const { error: dedupeError } = await db
    .from('stripe_events')
    .insert({ id: event.id, type: event.type, payload: event.data.object as unknown });

  if (dedupeError) {
    if (dedupeError.code === '23505') return new Response('duplicate', { status: 200 });
    console.error('dedupe insert failed', dedupeError);
    return new Response('storage error', { status: 500 });
  }

  try {
    await route(db, event);
  } catch (err) {
    // Remove the marker so Stripe's retry gets a real second attempt.
    await db.from('stripe_events').delete().eq('id', event.id);
    console.error('handler failed', event.type, err);
    return new Response('handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// deno-lint-ignore no-explicit-any
async function route(db: any, event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return syncSubscription(db, event.data.object as Stripe.Subscription);

    case 'invoice.paid':
      return handleInvoicePaid(db, event.data.object as Stripe.Invoice);

    case 'invoice.payment_failed':
      return handlePaymentFailed(db, event.data.object as Stripe.Invoice);

    default:
      return;
  }
}

// deno-lint-ignore no-explicit-any
async function userIdForCustomer(db: any, customerId: string, sub?: Stripe.Subscription) {
  const fromMetadata = sub?.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;

  const { data } = await db
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (data?.id) return data.id;

  // Fall back to the customer object, which carries the id we set at creation.
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted && customer.metadata?.supabase_user_id) {
    const userId = customer.metadata.supabase_user_id;
    await db.rpc('set_stripe_customer', { p_user_id: userId, p_customer_id: customerId });
    return userId;
  }
  throw new Error(`no supabase user for stripe customer ${customerId}`);
}

// deno-lint-ignore no-explicit-any
async function planForPrice(db: any, priceId: string, fallback?: string | null) {
  const { data } = await db
    .from('plans')
    .select('id')
    .or(`stripe_monthly_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`)
    .maybeSingle();

  if (data?.id) return data.id;

  // Env-configured prices (no columns set) — reverse the lookup.
  for (const plan of ['pro', 'premier']) {
    for (const interval of ['MONTHLY', 'YEARLY']) {
      if (Deno.env.get(`STRIPE_PRICE_${plan.toUpperCase()}_${interval}`) === priceId) return plan;
    }
  }

  if (fallback) return fallback;
  throw new Error(`no plan mapped to price ${priceId}`);
}

const ENTITLED = new Set(['active', 'trialing']);

// Stripe moved the billing period from the subscription onto its items in the
// 2025 API versions. Read whichever this account's version provides.
// deno-lint-ignore no-explicit-any
function periodStart(sub: any): number | null {
  return sub.current_period_start ?? sub.items?.data?.[0]?.current_period_start ?? null;
}

// deno-lint-ignore no-explicit-any
function periodEnd(sub: any): number | null {
  return sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
}

function toIso(seconds: number | null): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

// deno-lint-ignore no-explicit-any
async function syncSubscription(db: any, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId = await userIdForCustomer(db, customerId, sub);

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? '';
  const planId = await planForPrice(db, priceId, sub.metadata?.plan_id ?? null);
  const interval = item?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly';

  await db.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: planId,
      status: sub.status,
      interval,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      current_period_start: toIso(periodStart(sub)),
      current_period_end: toIso(periodEnd(sub)),
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );

  // Entitlement follows Stripe's status, not the checkout redirect.
  const effectivePlan = ENTITLED.has(sub.status) ? planId : PLAN_BY_STATUS_DOWNGRADE;
  await db.rpc('set_user_plan', { p_user_id: userId, p_plan_id: effectivePlan });

  if (ENTITLED.has(sub.status)) {
    await db.rpc('grant_plan_credits', {
      p_user_id: userId,
      p_idempotency_key: `sub:${sub.id}:${periodStart(sub) ?? 0}`,
    });
  }
}

// deno-lint-ignore no-explicit-any
async function handleInvoicePaid(db: any, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const userId = await userIdForCustomer(db, customerId);

  await db.from('invoices').upsert(
    {
      user_id: userId,
      stripe_invoice_id: invoice.id,
      amount_due_cents: invoice.amount_due ?? 0,
      amount_paid_cents: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? 'usd',
      status: invoice.status ?? 'paid',
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    },
    { onConflict: 'stripe_invoice_id' },
  );

  // The per-period top-up. Keyed on the invoice, so replays are free.
  await db.rpc('grant_plan_credits', {
    p_user_id: userId,
    p_idempotency_key: `invoice:${invoice.id}`,
  });
}

// deno-lint-ignore no-explicit-any
async function handlePaymentFailed(db: any, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const userId = await userIdForCustomer(db, customerId);

  await db.from('notifications').insert({
    user_id: userId,
    kind: 'payment_failed',
    title: 'Your payment did not go through',
    body: 'Update your payment method to keep your plan active.',
    link: '/billing',
  });
}
