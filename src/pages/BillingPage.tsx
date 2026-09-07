import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { fetchCreditHistory, fetchInvoices, fetchSubscription, openBillingPortal } from '@/lib/api';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { auditLedger, songsRemaining } from '@/lib/credits';
import type { CreditEntry, Invoice, Subscription } from '@/lib/types';

const REASON_LABEL: Record<string, string> = {
  signup_grant: 'Welcome credits',
  daily_grant: 'Daily refill',
  plan_grant: 'Plan credits',
  generation_debit: 'Song generation',
  generation_refund_cancelled: 'Refund — cancelled',
  generation_refund_failed: 'Refund — failed',
};

export default function BillingPage() {
  const [params, setParams] = useSearchParams();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [history, setHistory] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  const load = async () => {
    setLoading(true);
    const [sub, inv, ledger] = await Promise.all([
      fetchSubscription(),
      fetchInvoices(),
      fetchCreditHistory(),
    ]);
    setSubscription(sub);
    setInvoices(inv);
    setHistory(ledger);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // Returning from Checkout: the webhook is what actually grants the plan, so
  // poll briefly rather than trusting the redirect.
  useEffect(() => {
    if (params.get('checkout') !== 'success') return;

    toast.success('Payment received — activating your plan…');
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      await refreshProfile();
      const sub = await fetchSubscription();
      setSubscription(sub);
      if (sub?.status === 'active' || attempts >= 10) {
        clearInterval(timer);
        void load();
      }
    }, 2000);

    params.delete('checkout');
    params.delete('session_id');
    setParams(params, { replace: true });

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Surfaces a ledger that disagrees with the recorded balance instead of
  // quietly showing a number nobody can reconcile.
  const ledgerAudit = auditLedger(history);

  const handlePortal = async () => {
    setOpeningPortal(true);
    try {
      window.location.assign(await openBillingPortal());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the billing portal.');
      setOpeningPortal(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-32 space-y-10">
      <h1 className="text-3xl font-bold">Billing</h1>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-sm mb-1">Current plan</p>
            <p className="text-2xl font-bold capitalize">{profile?.plan_id ?? 'free'}</p>
            {subscription && (
              <p className="text-white/50 text-sm mt-2">
                {subscription.cancel_at_period_end
                  ? `Cancels on ${subscription.current_period_end ? formatDate(subscription.current_period_end) : 'the period end'}`
                  : subscription.current_period_end
                    ? `Renews ${formatDate(subscription.current_period_end)} · billed ${subscription.interval}`
                    : `Status: ${subscription.status}`}
              </p>
            )}
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
              <Sparkles className="w-4 h-4 text-[#ff6b6b]" aria-hidden="true" />
              <span className="text-sm">{profile?.credit_balance ?? 0} credits</span>
            </div>
            <p className="text-white/40 text-xs mt-1">
              about {songsRemaining(profile?.credit_balance ?? 0)} more songs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          {subscription ? (
            <Button
              onClick={handlePortal}
              disabled={openingPortal}
              className="gradient-coral text-black font-semibold"
            >
              {openingPortal ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Manage subscription <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
                </>
              )}
            </Button>
          ) : (
            <Button asChild className="gradient-coral text-black font-semibold">
              <a href="/pricing">See plans</a>
            </Button>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Invoices</h2>
        {loading ? (
          <Skeleton className="h-24 w-full bg-white/5" />
        ) : invoices.length ? (
          <ul className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between gap-4 p-4 bg-white/5"
              >
                <div>
                  <p className="text-sm">
                    {formatMoney(invoice.amount_paid_cents, invoice.currency)}
                  </p>
                  <p className="text-white/40 text-xs">
                    {formatDate(invoice.created_at)} · {invoice.status}
                  </p>
                </div>
                {invoice.hosted_invoice_url && (
                  <a
                    href={invoice.hosted_invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#ff6b6b] text-sm hover:underline"
                  >
                    View
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-white/40 text-sm">No invoices yet.</p>
        )}
      </section>

      <Separator className="bg-white/10" />

      <section>
        <h2 className="text-lg font-semibold mb-4">Credit history</h2>
        {ledgerAudit.inconsistent && (
          <p className="text-[#ff6b6b] text-sm mb-3" role="alert">
            This history doesn't add up to your balance. Contact support before spending more
            credits.
          </p>
        )}
        {loading ? (
          <Skeleton className="h-32 w-full bg-white/5" />
        ) : history.length ? (
          <ul className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 p-3 bg-white/5 text-sm"
              >
                <div>
                  <p>{REASON_LABEL[entry.reason] ?? entry.reason}</p>
                  <p className="text-white/40 text-xs">{formatRelative(entry.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={entry.delta >= 0 ? 'text-emerald-400' : 'text-white/70'}>
                    {entry.delta >= 0 ? '+' : ''}
                    {entry.delta}
                  </p>
                  <p className="text-white/30 text-xs">{entry.balance_after} left</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-white/40 text-sm">No credit activity yet.</p>
        )}
      </section>
    </div>
  );
}
