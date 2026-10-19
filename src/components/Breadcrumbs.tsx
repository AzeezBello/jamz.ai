import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useProjectStore } from '@/store/projectStore';
import { useLibraryStore } from '@/store/libraryStore';

/**
 * Global breadcrumb component built on shadcn's Breadcrumb primitive.
 * Dynamically builds a navigation trail from the current URL and dashboard state
 * (Studio tabs, active projects).
 * Hidden on the root marketing route ('/').
 */
export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const segments = pathname.split('/').filter(Boolean);
  const projectId = useLibraryStore((state) => state.projectId);
  const projects = useProjectStore((state) => state.projects);

  if (segments.length === 0) {
    return null;
  }

  const crumbs: Array<{ to: string; label: string }> = segments.map((segment, index) => {
    const to = '/' + segments.slice(0, index + 1).join('/');
    let label = segment
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (segment === 'dashboard') {
      label = 'Studio';
    }
    return { to, label };
  });

  if (pathname === '/dashboard') {
    const tab = params.get('tab');
    if (tab === 'home') {
      crumbs.push({ to: '/dashboard?tab=home', label: 'Home' });
    } else if (tab === 'discover') {
      crumbs.push({ to: '/dashboard?tab=discover', label: 'Discover' });
    } else if (tab === 'favourites') {
      crumbs.push({ to: '/dashboard?tab=favourites', label: 'Favourites' });
    } else if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        crumbs.push({ to: '/dashboard', label: project.title });
      }
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-3 pb-1">
      <Breadcrumb aria-label="Breadcrumb">
        <BreadcrumbList className="text-white/50 gap-1.5 sm:gap-2">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/"
                className="text-white/60 hover:text-white transition-colors duration-150"
              >
                Home
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={c.to + c.label} className="inline-flex items-center gap-1.5 sm:gap-2">
                <BreadcrumbSeparator className="text-white/30" />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-white font-medium truncate max-w-[200px] sm:max-w-none">
                      {c.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        to={c.to}
                        className="text-white/60 hover:text-white transition-colors duration-150"
                      >
                        {c.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
