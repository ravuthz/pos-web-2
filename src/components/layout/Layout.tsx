import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import {
  BarChart3,
  Boxes,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  ShoppingBag,
  Shuffle,
  Store,
  Truck,
  Users,
  Wallet,
  type LucideIcon
} from 'lucide-react';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { BranchSelector } from '@/components/layout/BranchSelector';

type NavRoute =
  | '/'
  | '/reports'
  | '/pos'
  | '/sales'
  | '/expenses'
  | '/shifts'
  | '/products'
  | '/categories'
  | '/vendors'
  | '/purchases'
  | '/stock-movements'
  | '/customers'
  | '/users';

interface NavItem {
  to: NavRoute;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navItems: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/reports', label: 'Reports', icon: ChartColumn }
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: '/pos', label: 'POS', icon: ScanLine },
      { to: '/sales', label: 'Sales', icon: Receipt },
      { to: '/expenses', label: 'Expenses', icon: Wallet },
      { to: '/shifts', label: 'Shifts', icon: Store }
    ]
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: Package },
      { to: '/categories', label: 'Categories', icon: Boxes },
      { to: '/vendors', label: 'Vendors', icon: Truck },
      { to: '/purchases', label: 'Purchases', icon: ShoppingBag },
      { to: '/stock-movements', label: 'Stock', icon: Shuffle }
    ]
  },
  {
    label: 'People',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/users', label: 'Users', icon: Users }
    ]
  }
];

const collapsibleGroups = new Set(['Inventory', 'People']);
const navGroupIcons: Partial<Record<NavGroup['label'], LucideIcon>> = {
  Inventory: Boxes,
  People: Users
};
const flatNavItems = navItems.flatMap((group) => group.items);
const headerAccentOptions: Array<{ bgClass: string; textClass: string }> = [
  { bgClass: 'bg-rose-100', textClass: 'text-rose-700' },
  { bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  { bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  { bgClass: 'bg-sky-100', textClass: 'text-sky-700' },
  { bgClass: 'bg-indigo-100', textClass: 'text-indigo-700' },
  { bgClass: 'bg-fuchsia-100', textClass: 'text-fuchsia-700' }
];

function getInitialExpandedGroups(pathname: string) {
  return {
    Inventory: navItems
      .find((group) => group.label === 'Inventory')
      ?.items.some((item) => item.to === pathname) ?? false,
    People:
      navItems.find((group) => group.label === 'People')?.items.some((item) => item.to === pathname) ?? false
  };
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    getInitialExpandedGroups(location.pathname)
  );
  const [headerAccentIndex, setHeaderAccentIndex] = useState(0);
  const headerSubtitle = [user?.role?.name, user?.username].filter(Boolean).join(' - ') || 'Point of sale workspace';

  const activeNavItem = useMemo(() => {
    return flatNavItems.find((item) => item.to === location.pathname) ?? flatNavItems.find((item) => item.to === '/') ?? null;
  }, [location.pathname]);

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: async () => {
      clearAuth();
      setSelectedBranch(null);
      await navigate({ to: '/login' });
    }
  });

  useEffect(() => {
    setHeaderAccentIndex((current) => {
      if (headerAccentOptions.length <= 1) {
        return 0;
      }

      let nextAccentIndex = current;

      while (nextAccentIndex === current) {
        nextAccentIndex = Math.floor(Math.random() * headerAccentOptions.length);
      }

      return nextAccentIndex;
    });
  }, [location.pathname]);

  useEffect(() => {
    setExpandedGroups((current) => {
      let didChange = false;
      const next = { ...current };

      for (const group of navItems) {
        if (!collapsibleGroups.has(group.label)) {
          continue;
        }

        if (group.items.some((item) => item.to === location.pathname) && !current[group.label]) {
          next[group.label] = true;
          didChange = true;
        }
      }

      return didChange ? next : current;
    });
  }, [location.pathname]);

  const ActiveIcon = activeNavItem?.icon ?? BarChart3;
  const headerAccent = headerAccentOptions[headerAccentIndex];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#ecfeff)] md:h-screen md:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-4 py-4 md:h-full md:min-h-0 md:flex-row md:px-6">
        <aside className="md:flex md:h-full md:min-h-0 md:w-72 md:shrink-0">
          <div className="md:flex md:h-full md:min-h-0 md:flex-1 md:pr-1">
            <div className="rounded-3xl border border-surface-200 bg-white/90 p-3 shadow-soft backdrop-blur md:flex md:min-h-0 md:flex-1 md:flex-col">
              <nav className="space-y-4 md:min-h-0 md:flex-1 md:overflow-y-auto">
                {navItems.map((group) => {
                  const isCollapsibleGroup = collapsibleGroups.has(group.label);
                  const isGroupExpanded = expandedGroups[group.label];
                  const GroupIcon = navGroupIcons[group.label];

                  return (
                    <section key={group.label} className="space-y-2">
                      {isCollapsibleGroup ? (
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-surface-700 transition hover:bg-surface-100"
                          onClick={() =>
                            setExpandedGroups((current) => ({
                              ...current,
                              [group.label]: !current[group.label]
                            }))
                          }
                        >
                          <span className="flex items-center gap-3">
                            {GroupIcon ? <GroupIcon className="h-4 w-4" /> : null}
                            <span>{group.label}</span>
                          </span>
                          {isGroupExpanded ? (
                            <ChevronDown className="h-4 w-4 text-surface-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-surface-400" />
                          )}
                        </button>
                      ) : (
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">
                          {group.label}
                        </p>
                      )}

                      {isCollapsibleGroup && !isGroupExpanded ? null : (
                        <div className={`grid gap-1 ${isCollapsibleGroup ? 'pl-4' : ''}`}>
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;

                            return (
                              <Link
                                key={item.to}
                                to={item.to}
                                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                                  isActive
                                    ? 'bg-primary-700 text-white shadow-soft hover:bg-primary-700/70'
                                    : 'text-surface-700 hover:bg-surface-100'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4 md:flex md:min-h-0 md:flex-col md:overflow-hidden">
          <header className="rounded-3xl border border-surface-200 bg-white/90 p-4 shadow-soft backdrop-blur md:shrink-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${headerAccent.bgClass} ${headerAccent.textClass}`}
                >
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-900">POS Web2</p>
                  <p className="text-sm text-surface-500">{headerSubtitle}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <BranchSelector />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? 'Signing out...' : 'Logout'}
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-6 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur md:min-h-0 md:flex-1 md:overflow-y-auto md:p-6 md:pr-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
