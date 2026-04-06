import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect
} from '@tanstack/react-router';
import { isAuthenticated } from '@/store/auth';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { SalesPage } from '@/pages/SalesPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { StockMovementsPage } from '@/pages/StockMovementsPage';
import { UsersPage } from '@/pages/UsersPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { VendorsPage } from '@/pages/VendorsPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ShiftsPage } from '@/pages/ShiftsPage';
import { MobilePage } from '@/pages/MobilePage';

function RootComponent() {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-surface-900">404</h1>
        <p className="text-surface-600">Page not found</p>
      </div>
    </div>
  )
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: Layout
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: DashboardPage
});

const posRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/pos',
  component: MobilePage
});

const productsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/products',
  component: ProductsPage
});

const salesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/sales',
  component: SalesPage
});

const categoriesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/categories',
  component: CategoriesPage
});

const customersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/customers',
  component: CustomersPage
});

const purchasesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/purchases',
  component: PurchasesPage
});

const vendorsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/vendors',
  component: VendorsPage
});

const stockMovementsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/stock-movements',
  component: StockMovementsPage
});

const expensesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/expenses',
  component: ExpensesPage
});

const shiftsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/shifts',
  component: ShiftsPage
});

const usersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/users',
  component: UsersPage
});

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/reports',
  component: ReportsPage
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    indexRoute,
    posRoute,
    productsRoute,
    salesRoute,
    categoriesRoute,
    customersRoute,
    purchasesRoute,
    vendorsRoute,
    stockMovementsRoute,
    expensesRoute,
    shiftsRoute,
    usersRoute,
    reportsRoute
  ])
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingMs: 200
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
