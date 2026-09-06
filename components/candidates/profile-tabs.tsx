'use client'

import { createContext, useContext, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type ProfileTab = 'activity' | 'insights' | 'ask-scout'

const Ctx = createContext<{ setTab: (tab: ProfileTab) => void } | null>(null)

// The tab value is lifted so the right-rail Insights card can send the reader
// into the Insights tab. The rail is a sibling of the tabs, not a child, so a
// small provider is the only way for one to drive the other.
export function ProfileTabsProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<ProfileTab>('activity')

  return (
    <Ctx.Provider value={{ setTab }}>
      <TabValue.Provider value={tab}>{children}</TabValue.Provider>
    </Ctx.Provider>
  )
}

const TabValue = createContext<ProfileTab>('activity')

export function useProfileTabs() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProfileTabs must be used within a ProfileTabsProvider')
  return ctx
}

export function ProfileTabs({
  activity,
  insights,
  askScout,
}: {
  activity: React.ReactNode
  insights: React.ReactNode
  askScout: React.ReactNode
}) {
  const tab = useContext(TabValue)
  const { setTab } = useProfileTabs()

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as ProfileTab)} className="gap-4">
      <TabsList variant="underline">
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="insights">Candidate Insight</TabsTrigger>
        <TabsTrigger value="ask-scout">Ask Scout</TabsTrigger>
      </TabsList>
      <TabsContent value="activity">{activity}</TabsContent>
      <TabsContent value="insights">{insights}</TabsContent>
      <TabsContent value="ask-scout">{askScout}</TabsContent>
    </Tabs>
  )
}
