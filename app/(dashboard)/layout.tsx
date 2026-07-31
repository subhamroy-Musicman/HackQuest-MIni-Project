'use client'

import { Sidebar } from '@/components/dashboard/Sidebar'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen w-full flex bg-[#F8FAFC]">
      <AnimatedBackground />
      
      <div className="max-w-[1440px] mx-auto w-full flex p-4 sm:p-6 lg:p-8 gap-8 relative z-10">
        
        {/* Left Sidebar (Sticky) */}
        <aside className="hidden lg:block w-[320px] shrink-0 sticky top-8 h-[calc(100vh-64px)] overflow-y-auto hide-scrollbar">
          <Sidebar />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
        
      </div>
    </div>
  )
}
