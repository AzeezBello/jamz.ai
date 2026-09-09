import { Link, useParams } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';
import { LAST_UPDATED, POLICIES, COMPANY } from '@/lib/legal';

/**
 * Renders any policy from one template, so they stay consistent and a new one
 * is a content change rather than a new page.
 */
export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const policy = POLICIES.find((item) => item.slug === slug);

  if (!policy) return <NotFoundPage />;

  return (
    <article className="mx-auto max-w-3xl px-6 pt-28 pb-32">
      <p className="text-[#ff8e8e] text-xs uppercase tracking-[0.2em] font-semibold mb-3">
        {COMPANY}
      </p>
      <h1 className="text-3xl md:text-4xl font-bold mb-3">{policy.title}</h1>
      <p className="text-white/60 mb-2">{policy.summary}</p>
      <p className="text-white/30 text-sm mb-10">Last updated {LAST_UPDATED}</p>

      <div className="space-y-9">
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold mb-3">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-white/60 leading-relaxed mb-3 last:mb-0">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <nav aria-label="Other policies" className="mt-14 border-t border-white/10 pt-6">
        <ul className="flex flex-wrap gap-4">
          {POLICIES.filter((item) => item.slug !== policy.slug).map((item) => (
            <li key={item.slug}>
              <Link to={`/legal/${item.slug}`} className="text-sm text-white/50 hover:text-white">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
