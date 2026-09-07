import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Column on mobile so the drawer's top bar stacks above the content;
    // row from lg up where the sidebar sits beside it. As a row at every
    // width the bar was a flex sibling of main and stole its width.
    <div className="flex min-h-screen flex-col bg-muted/20 lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {children}
      </main>
    </div>
  )
}
