import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-auto px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  )
}
