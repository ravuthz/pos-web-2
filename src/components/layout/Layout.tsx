import { useMutation } from '@tanstack/react-query';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import {
  BarChart3,
  Boxes,
  ChartColumn,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  ShoppingBag,
  Shuffle,
  Store,
  Truck,
  Users,
  Wallet
} from 'lucide-react';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { BranchSelector } from '@/components/layout/BranchSelector';
import { getInitials } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pos', label: 'POS', icon: ScanLine },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/categories', label: 'Categories', icon: Boxes },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/vendors', label: 'Vendors', icon: Truck },
  { to: '/purchases', label: 'Purchases', icon: ShoppingBag },
  { to: '/stock-movements', label: 'Stock', icon: Shuffle },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/shifts', label: 'Shifts', icon: Store },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/reports', label: 'Reports', icon: ChartColumn }
] as const;

export function Layout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: async () => {
      clearAuth();
      setSelectedBranch(null);
      await navigate({ to: '/login' });
    }
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#ecfeff)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-4 py-4 md:flex-row md:px-6">
        <aside className="md:w-72 md:shrink-0">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-surface-900 p-5 text-white shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 font-semibold">
                  {getInitials(user?.name ?? 'POS')}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-teal-200">POS Web2</p>
                  <p className="text-lg font-semibold">{user?.name ?? 'Operator'}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-surface-300">
                {user?.role?.name ? `Role: ${user.role.name}` : 'Point of sale workspace'}
              </p>
            </div>

            <div className="rounded-3xl border border-surface-200 bg-white/90 p-3 shadow-soft backdrop-blur">
              <nav className="grid gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeProps={{ className: 'bg-primary-700 text-white shadow-soft' }}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-surface-700 transition hover:bg-surface-100"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <header className="rounded-3xl border border-surface-200 bg-white/90 p-4 shadow-soft backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-900">Operations Console</p>
                  <p className="text-sm text-surface-500">
                    Real-time overview for sales, stock, shifts, and reporting.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <BranchSelector />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? 'Signing out...' : 'Logout'}
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-6 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
