/* Route config, not a component module — fast-refresh rule doesn't apply. */
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import RouteError from '@/components/errors/RouteError'
import AppLayout from '@/components/layout/AppLayout'
import Categories from '@/pages/Categories'
import Expenses from '@/pages/Expenses'
import Inventory from '@/pages/Inventory'
import Admin from '@/pages/Admin'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import NewPurchase from '@/pages/NewPurchase'
import NewSale from '@/pages/NewSale'
import NotFound from '@/pages/NotFound'
import Products from '@/pages/Products'
import PurchaseDetail from '@/pages/PurchaseDetail'
import Purchases from '@/pages/Purchases'
import Reports from '@/pages/Reports'
import SaleDetail from '@/pages/SaleDetail'
import SaleReceipt from '@/pages/SaleReceipt'
import Sales from '@/pages/Sales'
import Settings from '@/pages/Settings'
import Suppliers from '@/pages/Suppliers'
import ProtectedRoute, { FullPageSpinner } from './ProtectedRoute'

// The dashboard pulls in the charts library — load it separately so login stays fast
const Dashboard = lazy(() => import('@/pages/Dashboard'))

export const router = createBrowserRouter([
  {
    // Last-resort error screen (login, receipt, or the layout itself crashing)
    errorElement: <RouteError fullPage />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            // Receipt prints on its own page, without the sidebar
            path: 'sales/:id/receipt',
            element: <SaleReceipt />,
          },
          {
            element: <AppLayout />,
            children: [
              {
                // A crashing page shows the error INSIDE the layout, so the menu still works
                errorElement: <RouteError />,
                children: [
                  {
                    index: true,
                    element: (
                      <Suspense fallback={<FullPageSpinner />}>
                        <Dashboard />
                      </Suspense>
                    ),
                  },
                  { path: 'sales', element: <Sales /> },
                  { path: 'sales/new', element: <NewSale /> },
                  { path: 'sales/:id', element: <SaleDetail /> },
                  { path: 'purchases', element: <Purchases /> },
                  { path: 'purchases/new', element: <NewPurchase /> },
                  { path: 'purchases/:id', element: <PurchaseDetail /> },
                  { path: 'expenses', element: <Expenses /> },
                  { path: 'products', element: <Products /> },
                  { path: 'categories', element: <Categories /> },
                  { path: 'inventory', element: <Inventory /> },
                  { path: 'suppliers', element: <Suppliers /> },
                  { path: 'reports', element: <Reports /> },
                  { path: 'settings', element: <Settings /> },
                  { path: 'admin', element: <Admin /> },
                  { path: '*', element: <NotFound /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
