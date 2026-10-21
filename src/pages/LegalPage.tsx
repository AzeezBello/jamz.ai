import { Link, useLocation } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';
import { LAST_UPDATED, POLICIES, COMPANY } from '@/lib/legal';
import { FileText } from 'lucide-react';

/**
 * Renders any policy from one template, so they stay consistent and a new one
 * is a content change rather than a new page.
 */
export default function LegalPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/legal\//, '').replace(/\/$/, '');
  const policy = POLICIES.find((item) => item.slug === slug);

  if (!policy) return <NotFoundPage />;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-28 pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Column: Policy Switcher & Section Index */}
        <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
          <div className="studio-surface rounded-2xl p-5">
            <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-3">
              {COMPANY} // GOVERNANCE
            </p>
            <nav aria-label="Other policies" className="space-y-1.5">
              {POLICIES.map((item, idx) => {
                const active = item.slug === policy.slug;
                return (
                  <Link
                    key={item.slug}
                    to={`/legal/${item.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#ff6b6b] text-black font-semibold'
                        : 'text-white/65 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>{item.title}</span>
                    <span
                      className={`font-mono-tech text-[11px] ${
                        active ? 'text-black/70' : 'text-white/35'
                      }`}
                    >
                      0{idx + 1}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="studio-surface rounded-2xl p-5 hidden lg:block">
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-white/45 mb-3">
              ON THIS PAGE
            </p>
            <ul className="space-y-2 text-xs text-white/60">
              {policy.sections.map((section, idx) => (
                <li key={section.heading} className="flex items-center gap-2.5">
                  <span className="font-mono-tech text-[10px] text-white/35">0{idx + 1}</span>
                  <span className="truncate">{section.heading}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Right Column: Editorial Policy Document */}
        <article className="lg:col-span-8 studio-surface rounded-2xl p-6 sm:p-10">
          <div className="border-b border-white/[0.08] pb-8 mb-8">
            <div className="inline-flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-[#ff8e8e] mb-3">
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              POLICY DOCUMENT // {COMPANY}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
              {policy.title}
            </h1>
            <p className="text-white/65 text-base sm:text-lg max-w-[62ch] mb-4">{policy.summary}</p>
            <p className="font-mono-tech text-white/40 text-xs">Last updated {LAST_UPDATED}</p>
          </div>

          <div className="space-y-10 max-w-[68ch]">
            {policy.sections.map((section, idx) => (
              <section key={section.heading}>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-mono-tech text-xs text-[#ff8e8e]">0{idx + 1}</span>
                  <h2 className="font-display text-xl font-bold text-white">{section.heading}</h2>
                </div>
                <div className="space-y-3 pl-0 sm:pl-7">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-white/65 leading-relaxed text-sm sm:text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
