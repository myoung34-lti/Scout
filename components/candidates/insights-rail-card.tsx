'use client'

import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProfileTabs } from '@/components/candidates/profile-tabs'

// A discovery surface, not a second copy of the feature. The ten-field
// insight itself stays in its tab, where it has room to be readable — this
// card exists because the tab is easy to miss.
export function InsightsRailCard({
  hasInsight,
  generatedAt,
  isStale,
}: {
  hasInsight: boolean
  generatedAt: string | null
  isStale: boolean
}) {
  const { setTab } = useProfileTabs()

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Candidate Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasInsight ? (
          <>
            <p className="text-sm text-muted-foreground">
              {isStale
                ? 'There has been new activity since these were generated.'
                : `Last generated ${generatedAt}.`}
            </p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setTab('insights')}>
              View insights
              <ArrowRight />
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Get an AI-written summary based on this candidate&apos;s interviews, notes and
              resume.
            </p>
            <Button size="sm" className="w-full" onClick={() => setTab('insights')}>
              <Sparkles />
              Generate insights
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
