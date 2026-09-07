// POST /delete-account — irreversible, user-initiated account removal.
//
// Cancels billing first so a deleted account cannot keep being charged, then
// soft-deletes content and removes the auth user, which cascades the rest.

import { handle, json, requireUser, serviceClient, HttpError } from '../_shared/http.ts';
import { stripe } from '../_shared/stripe.ts';

Deno.serve((req) =>
  handle(req, async () => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST.');

    const { client, user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    // Typing the email is the confirmation step; it stops a mis-click here.
    if (String(body.confirm ?? '').toLowerCase() !== (user.email ?? '').toLowerCase()) {
      throw new HttpError(400, 'confirmation_mismatch', 'Type your email address to confirm.');
    }

    const db = serviceClient();

    const { data: subs } = await db
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id);

    for (const sub of subs ?? []) {
      if (['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
        await stripe.subscriptions
          .cancel(sub.stripe_subscription_id)
          .catch((err) =>
            console.error('subscription cancel failed', sub.stripe_subscription_id, err),
          );
      }
    }

    const { error: markError } = await client.rpc('mark_account_deleted');
    if (markError) throw new HttpError(500, 'delete_failed', markError.message);

    const { data: assets } = await db
      .from('audio_assets')
      .select('storage_path')
      .eq('user_id', user.id);

    if (assets?.length) {
      await db.storage
        .from('audio')
        .remove(assets.map((a: { storage_path: string }) => a.storage_path));
    }

    const { error: authError } = await db.auth.admin.deleteUser(user.id);
    if (authError) throw new HttpError(500, 'delete_failed', authError.message);

    return json(req, { deleted: true });
  }),
);
