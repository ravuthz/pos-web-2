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
    LogOut,
    Menu,
    Package,
    Palette,
    Receipt,
    ScanLine,
    ShoppingBag,
    Smartphone,
    Shuffle,
    Store,
    Truck,
    Users,
    Wallet,
    X,
    type LucideIcon
} from 'lucide-react';
import { authService } from '@/services/auth';
import { appThemes, applyTheme, getStoredTheme, type AppTheme } from '@/lib/theme';
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
    { bgClass: 'bg-primary', textClass: 'text-primary-content' },
    { bgClass: 'bg-secondary', textClass: 'text-secondary-content' },
    { bgClass: 'bg-accent', textClass: 'text-accent-content' },
    { bgClass: 'bg-info', textClass: 'text-info-content' },
    { bgClass: 'bg-success', textClass: 'text-success-content' }
];
const shellBackgroundStyle = {
    backgroundImage:
        'radial-gradient(circle at top left, color-mix(in oklch, var(--color-primary) 18%, transparent), transparent 35%), linear-gradient(180deg, var(--color-base-200), var(--color-base-100))'
};

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
    const [selectedTheme, setSelectedTheme] = useState<AppTheme>(() => getStoredTheme());
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
        applyTheme(selectedTheme);
    }, [selectedTheme]);

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

    useEffect(() => {
        setIsDrawerOpen(false);
    }, [location.pathname]);

    const ActiveIcon = activeNavItem?.icon ?? BarChart3;
    const headerAccent = headerAccentOptions[headerAccentIndex];

    return (
        <div
            className="h-dvh overflow-hidden bg-surface-100"
            style={shellBackgroundStyle}
        >
            <div className="container mx-auto h-full min-h-0 max-w-[1600px] overflow-hidden px-4 py-4 md:px-6">
                <div className="drawer h-full min-h-0 overflow-hidden [grid-template-rows:minmax(0,1fr)] lg:drawer-open">
                    <input
                        id="app-sidebar-drawer"
                        type="checkbox"
                        className="drawer-toggle"
                        checked={isDrawerOpen}
                        onChange={(event) => setIsDrawerOpen(event.target.checked)}
                    />

                    <div className="drawer-content h-full min-h-0 min-w-0 overflow-hidden">
                        <div className="flex h-full min-h-0 flex-col gap-4">
                            <header className="card border border-base-300 bg-base-100 px-4 py-3 shadow-xl backdrop-blur lg:shrink-0">
                                <div className="navbar min-h-0 gap-3 px-0 py-0">
                                    <div className="navbar-start min-w-0 flex-1 gap-3">
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-square lg:hidden"
                                            aria-label="Open navigation"
                                            onClick={() => setIsDrawerOpen(true)}
                                        >
                                            <Menu className="h-5 w-5" />
                                        </button>

                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-box transition-colors ${headerAccent.bgClass} ${headerAccent.textClass}`}
                                        >
                                            <ActiveIcon className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-surface-900">POS</p>
                                            <p className="truncate text-sm text-surface-500">{headerSubtitle}</p>
                                        </div>
                                    </div>

                                    <div className="navbar-end hidden md:flex md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-2">
                                        <label className="flex items-center gap-2 text-sm text-surface-600">
                                            <Palette className="h-4 w-4 shrink-0" />
                                            <select
                                                className="select select-bordered min-h-11 min-w-36 rounded-box bg-base-100 text-base-content"
                                                value={selectedTheme}
                                                onChange={(event) => setSelectedTheme(event.target.value as AppTheme)}
                                                title="Theme"
                                            >
                                                {appThemes.map((theme) => (
                                                    <option key={theme} value={theme}>
                                                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <BranchSelector labelVariant="icon" />
                                    </div>
                                </div>
                            </header>

                            <main className="card min-h-0 flex-1 overflow-hidden border border-base-300 bg-base-100 shadow-xl backdrop-blur">
                                <div className="h-full overflow-y-auto p-4 lg:p-6 lg:pr-5">
                                    <Outlet />
                                </div>
                            </main>
                        </div>
                    </div>

                    <div className="drawer-side z-30">
                        <label htmlFor="app-sidebar-drawer" aria-label="Close navigation" className="drawer-overlay" />

                        <aside className="min-h-full w-80 bg-transparent p-0 lg:pr-4">
                            <div className="card flex h-full min-h-full flex-col border border-base-300 bg-base-100 p-3 shadow-xl backdrop-blur">
                                <div className="mb-3 flex items-center justify-between lg:hidden">
                                    <div>
                                        <p className="text-sm font-medium text-surface-900">Navigation</p>
                                        <p className="text-xs text-surface-500">Operations console</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm btn-square"
                                        aria-label="Close navigation"
                                        onClick={() => setIsDrawerOpen(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <nav className="menu w-full gap-4 p-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                                    {navItems.map((group) => {
                                        const isCollapsibleGroup = collapsibleGroups.has(group.label);
                                        const isGroupExpanded = expandedGroups[group.label];
                                        const GroupIcon = navGroupIcons[group.label];

                                        return (
                                            <section key={group.label} className="space-y-2">
                                                {isCollapsibleGroup ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost h-auto min-h-0 w-full items-center justify-between rounded-[calc(var(--radius-field)*1.1)] border-0 px-3 py-2.5 text-left text-sm font-medium normal-case text-surface-700 shadow-none hover:bg-base-200 hover:text-base-content"
                                                        onClick={() =>
                                                            setExpandedGroups((current) => ({
                                                                ...current,
                                                                [group.label]: !current[group.label]
                                                            }))
                                                        }
                                                    >
                                                        <span className="flex flex-1 items-center gap-3 text-left">
                                                            {GroupIcon ? <GroupIcon className="h-4 w-4" /> : null}
                                                            <span className="flex-1 text-left">{group.label}</span>
                                                        </span>
                                                        {isGroupExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-surface-400" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-surface-400" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <p className="menu-title px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
                                                        {group.label}
                                                    </p>
                                                )}

                                                {isCollapsibleGroup && !isGroupExpanded ? null : (
                                                    <div
                                                        className={`grid gap-1 ${isCollapsibleGroup ? 'ml-3 border-l border-base-300/70 pl-3' : ''
                                                            }`}
                                                    >
                                                        {group.items.map((item) => {
                                                            const Icon = item.icon;
                                                            const isActive = location.pathname === item.to;

                                                            return (
                                                                <Link
                                                                    key={item.to}
                                                                    to={item.to}
                                                                    className={`btn btn-ghost h-auto min-h-0 w-full items-center justify-start gap-3 rounded-[calc(var(--radius-field)*1.1)] border-0 px-3 py-2.5 text-left text-sm font-medium normal-case text-surface-700 shadow-none ${isActive
                                                                        ? 'bg-primary text-primary-content hover:bg-primary/70 hover:text-primary-content'
                                                                        : ''
                                                                        }`}
                                                                >
                                                                    <Icon className="h-4 w-4 shrink-0" />
                                                                    <span className="flex-1 text-left">{item.label}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </section>
                                        );
                                    })}
                                </nav>

                                <div className="divider my-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/35">
                                    Session
                                </div>

                                <div className="space-y-3 md:hidden">
                                    <label className="flex flex-col gap-1.5 text-sm text-surface-600">
                                        <span>Theme</span>
                                        <select
                                            className="select select-bordered min-h-11 w-full rounded-box bg-base-100 text-base-content"
                                            value={selectedTheme}
                                            onChange={(event) => setSelectedTheme(event.target.value as AppTheme)}
                                            title="Theme"
                                        >
                                            {appThemes.map((theme) => (
                                                <option key={theme} value={theme}>
                                                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <BranchSelector fullWidth showMobileLabel />
                                </div>

                                <div className="divider my-2 md:hidden" />

                                <button
                                    type="button"
                                    className="btn btn-primary w-full justify-start gap-3"
                                    onClick={() => logoutMutation.mutate()}
                                    disabled={logoutMutation.isPending}
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    <span>{logoutMutation.isPending ? 'Signing out...' : 'Logout'}</span>
                                </button>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
