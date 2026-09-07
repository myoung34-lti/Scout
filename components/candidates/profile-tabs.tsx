import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ProfileTabs({
  activity,
  insights,
  askScout,
}: {
  activity: React.ReactNode
  insights: React.ReactNode
  askScout: React.ReactNode
}) {
  return (
    <Tabs defaultValue="activity" className="gap-4">
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
