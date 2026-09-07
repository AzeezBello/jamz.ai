// POST /stripe-portal — hand the user to Stripe for invoices, payment method
// changes and cancellation, so none of that has to be rebuilt here.

import { handle, json, requireUser, serviceClient, HttpError } from '../_shared/http.ts';
import { siteUrl, stripe } from '../_shared/stripe.ts';

Deno.serve((req) =>
  handle(req, async () => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');

    const { user } = await requireUser(req);
    const { data: profile } = await serviceClient()
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      throw new HttpError(400, 'no_customer', 'You have no billing history yet.');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl()}/billing`,
    });

    return json(req, { url: session.url });
  }),
);
