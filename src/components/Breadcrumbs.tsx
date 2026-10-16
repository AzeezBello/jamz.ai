import { Link, useLocation } from 'react-router-dom';

/**
 * Global breadcrumb component that builds a navigation trail from the current URL.
 * Includes schema.org BreadcrumbList microdata for search engines and accessibility.
 * Hidden on the root route ('/').
 */
export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const crumbs = segments.map((segment, index) => {
    const to = '/' + segments.slice(0, index + 1).join('/');
    const label = segment
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { to, label };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="px-4 md:px-8 py-2 text-sm text-white/50"
    >
      <ol
        className="flex items-center flex-wrap gap-1.5"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        <li
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
          className="flex items-center"
        >
          <Link
            to="/"
            itemProp="item"
            className="text-white/60 hover:text-white transition-colors"
          >
            <span itemProp="name">Home</span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const position = i + 2;
          return (
            <li
              key={c.to}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center gap-1.5"
            >
              <span className="text-white/30" aria-hidden="true">
                /
              </span>
              {isLast ? (
                <span
                  itemProp="name"
                  aria-current="page"
                  className="text-white font-medium truncate max-w-[200px] sm:max-w-none"
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  to={c.to}
                  itemProp="item"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <span itemProp="name">{c.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(position)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
