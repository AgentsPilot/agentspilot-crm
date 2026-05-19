import Header from '@/components/layout/Header'
import { BarChart2 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div>
      <Header title="Reports" subtitle="Performance analytics across all CRM data" />
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-6">
          <strong>Coming soon:</strong> Reports will be built once Contacts, Pipeline, and Campaigns are all connected to Supabase.
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm text-center">
          <BarChart2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Reports coming soon</p>
          <p className="text-xs text-slate-400 mt-1">Leads by source · CR over time · Pipeline value · Revenue forecast</p>
        </div>
      </div>
    </div>
  )
}
