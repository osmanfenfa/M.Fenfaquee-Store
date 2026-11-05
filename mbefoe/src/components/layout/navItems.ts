import {
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string | null
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Daily work',
    items: [
      { to: '/sales', label: 'Sales', icon: ShoppingCart },
      { to: '/purchases', label: 'Purchases', icon: Truck },
      { to: '/expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    label: 'Stock',
    items: [
      { to: '/products', label: 'Products', icon: Package },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/suppliers', label: 'Suppliers', icon: Receipt },
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

