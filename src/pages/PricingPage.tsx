import Pricing from '@/sections/Pricing';
import { Check, HelpCircle, Minus, ShieldCheck } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    feature: 'Credit Allocation',
    free: '50 credits / day',
    pro: '2,500 credits / month',
    premier: '10,000 credits / month',
  },
  {
    feature: 'Full Songs Equivalent',
    free: '10 songs / day',
    pro: '500 songs / month',
    premier: '2,000 songs / month',
  },
  {
    feature: 'Neural Audio Engine',
    free: 'v5 Standard',
    pro: 'v5 Max (Priority)',
    premier: 'v5 Max (Dedicated)',
  },
  {
    feature: 'Commercial Master Rights',
    free: false,
    pro: true,
    premier: true,
  },
  {
    feature: '24-Bit WAV + 12-Stem Export',
    free: false,
    pro: true,
    premier: true,
  },
  {
    feature: 'Concurrent Studio Sessions',
    free: '2 active jobs',
    pro: '6 active jobs',
    premier: '12 active jobs',
  },
];

const FAQS = [
  {
    q: 'Do I keep commercial rights if I cancel my subscription later?',
    a: 'Yes. Every song records the license tier active at the moment it was generated. Tracks created under an active Pro or Premier plan retain permanent commercial-use rights even if you later downgrade to Free.',
  },
  {
    q: 'How do credits map to songs and stem exports?',
    a: 'Generating a full track costs 5 credits regardless of length (up to 3 minutes). Writing lyrics with AI and exporting WAV stems from songs in your library do not deduct extra credits.',
  },
  {
    q: 'What happens if a generation fails or I cancel it mid-run?',
    a: 'Your credits are automatically refunded to your ledger the instant a job is canceled or encounters an error.',
  },
  {
    q: 'Can I switch between monthly and yearly billing?',
    a: 'Yes. You can switch billing intervals or manage your subscription at any time from the Billing portal in your account settings.',
  },
];

function renderCell(value: string | boolean) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="inline-flex items-center gap-1.5 text-[#ff8e8e] font-mono-tech text-xs">
        <Check className="w-4 h-4 text-[#ff6b6b]" aria-hidden="true" />
        Included
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-white/35 font-mono-tech text-xs">
        <Minus className="w-4 h-4" aria-hidden="true" />
        Personal only
      </span>
    );
  }
  return <span className="font-mono-tech text-xs sm:text-sm text-white/80">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="pt-16">
      <Pricing standalone />

      {/* Studio Technical Comparison Ledger */}
      <section className="py-20 px-4 sm:px-6 border-b border-white/[0.07]">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-3">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                SPECIFICATION MATRIX // TIER BREAKDOWN
              </div>
              <h2
                id="tier-matrix-heading"
                className="font-display text-2xl sm:text-3xl font-bold text-white"
              >
                Compare studio capabilities
              </h2>
            </div>
            <p className="text-white/55 text-sm max-w-[46ch]">
              Every plan includes access to the browser workstation, custom lyric editor, and
              private project folders.
            </p>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="tier-matrix-heading"
            className="studio-surface rounded-2xl p-3 sm:p-0 responsive-table-wrapper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b6b]"
          >
            <table
              className="responsive-spec-table text-left"
              style={
                {
                  '--label-2': '"Free"',
                  '--label-3': '"Pro Studio"',
                  '--label-4': '"Premier"',
                } as React.CSSProperties
              }
            >
              <thead>
                <tr className="border-b border-white/10 bg-[#121218]">
                  <th
                    scope="col"
                    className="py-4 px-5 font-mono-tech text-xs uppercase tracking-wider text-white/50"
                  >
                    Capability
                  </th>
                  <th
                    scope="col"
                    className="py-4 px-5 font-mono-tech text-xs uppercase tracking-wider text-white/70"
                  >
                    Free
                  </th>
                  <th
                    scope="col"
                    className="py-4 px-5 font-mono-tech text-xs uppercase tracking-wider text-[#ff8e8e]"
                  >
                    Pro Studio
                  </th>
                  <th
                    scope="col"
                    className="py-4 px-5 font-mono-tech text-xs uppercase tracking-wider text-[#ffb168]"
                  >
                    Premier
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="hover:bg-white/[0.02] transition-colors">
                    <th scope="row" className="py-3.5 sm:py-4 px-4 sm:px-5 text-sm font-medium text-white">
                      {row.feature}
                    </th>
                    <td className="py-3 sm:py-4 px-4 sm:px-5">{renderCell(row.free)}</td>
                    <td className="py-3 sm:py-4 px-4 sm:px-5 bg-[#ff6b6b]/[0.03]">
                      {renderCell(row.pro)}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-5">{renderCell(row.premier)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Licensing & Billing FAQ */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-3">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              LICENSING &amp; BILLING FAQ
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
              Clear terms for working creators
            </h2>
            <p className="text-white/55 text-sm sm:text-base leading-relaxed max-w-[44ch]">
              Straightforward answers on master ownership, credit math, and how your songs behave
              across plan changes.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {FAQS.map((item, idx) => (
              <div key={item.q} className="studio-surface rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <span className="font-mono-tech text-xs text-[#ff8e8e] mt-0.5">
                    0{idx + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white mb-2">
                      {item.q}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
