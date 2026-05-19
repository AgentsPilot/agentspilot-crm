import Header from '@/components/layout/Header'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <Header title="Settings" subtitle="Dashboard configuration" />
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm text-center">
          <Settings className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Settings coming soon</p>
        </div>
      </div>
    </div>
  )
}
