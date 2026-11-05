import { Banknote, Boxes, HandCoins, Scale, type LucideIcon } from 'lucide-react'
import type { ReportType } from '@/types/report'

export const REPORTS: { type: ReportType; title: string; description: string; icon: LucideIcon; dated: boolean }[] = [
  { type: 'sales', title: 'Sales', description: 'By day and by product, with profit', icon: Banknote, dated: true },
  { type: 'profit-loss', title: 'Profit & loss', description: 'Revenue, costs, expenses, net profit', icon: Scale, dated: true },
  { type: 'stock', title: 'Stock', description: 'What you have now and its value', icon: Boxes, dated: false },
  { type: 'money-owed', title: 'Money owed', description: 'Customers who owe, suppliers you owe', icon: HandCoins, dated: false },
]

export type RangeKey = 'month' | 'last_month' | 'year' | 'custom'
