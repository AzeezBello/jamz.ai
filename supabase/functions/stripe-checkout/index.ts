// POST /stripe-checkout — start a subscription.
//
// The plan the user ends up on is decided by the webhook reading the Stripe
// subscription, never by anything the browser sends back after redirect.

import { handle, json, requireUser, serviceClient, HttpError } from '../_shared/http.ts';
import { priceIdFor, siteUrl, stripe } from '../_shared/stripe.ts';

Deno.serve((req) =>
  handle(req, async () => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');

    const { user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const planId = String(body.planId ?? '');
    const interval = body.interval === 'yearly' ? 'yearly' : 'monthly';

    const automaticTax = Deno.env.get('STRIPE_AUTOMATIC_TAX') === 'true';
    const db = serviceClient();

    const { data: plan } = await db.from('plans').select('*').eq('id', planId).single();
    if (!plan) throw new HttpError(400, 'unknown_plan', 'That plan does not exist.');
    if (plan.monthly_price_cents === 0) {
      throw new HttpError(400, 'not_purchasable', 'The free plan does not need checkout.');
    }

    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.display_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await db.rpc('set_stripe_customer', { p_user_id: user.id, p_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceIdFor(plan, interval), quantity: 1 }],
      allow_promotion_codes: true,
      // Off unless the account has Stripe Tax configured — turning it on
      // without that setup makes every checkout call fail outright.
      ...(automaticTax
        ? { automatic_tax: { enabled: true }, customer_update: { address: 'auto' as const } }
        : {}),
      subscription_data: { metadata: { supabase_user_id: user.id, plan_id: plan.id } },
      metadata: { supabase_user_id: user.id, plan_id: plan.id, interval },
      success_url: `${siteUrl()}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/pricing?checkout=cancelled`,
    });

    return json(req, { url: session.url });
  }),
);
