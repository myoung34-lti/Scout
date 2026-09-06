'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { reportDefinitionSchema } from '@/lib/reporting/report-schema'
import { runReport, computeDrillDown } from '@/lib/reporting/reporting-service'
import type { ReportResult, Visualization } from '@/lib/reporting/report-schema'
import type { DrillDownRow } from '@/lib/reporting/reporting-service'
import type { Prisma } from '@prisma/client'

export type RunReportResult = { result: ReportResult } | { error: string }

// Called on every builder-control change (debounced client-side) — never
// automatically on page load, and never persists anything.
export async function runReportPreview(definition: unknown): Promise<RunReportResult> {
  await requireSession()

  const parsed = reportDefinitionSchema.safeParse(definition)
  if (!parsed.success) {
    return { error: 'Invalid report configuration.' }
  }

  try {
    const result = await runReport(parsed.data)
    return { result }
  } catch (err) {
    console.error('runReportPreview failed:', err instanceof Error ? err.message : err)
    return { error: "Couldn't run this report. Please try again." }
  }
}

export type DrillDownResult = { rows: DrillDownRow[] } | { error: string }

// Reuses the exact same filter/date-range logic as the aggregate report —
// never a second, divergent query — so the drill-down list is guaranteed
// to be exactly what makes up the number the recruiter clicked on.
export async function getReportDrillDown(
  definition: unknown,
  groupLabel: string
): Promise<DrillDownResult> {
  await requireSession()

  const parsed = reportDefinitionSchema.safeParse(definition)
  if (!parsed.success) {
    return { error: 'Invalid report configuration.' }
  }

  try {
    const rows = await computeDrillDown(parsed.data, groupLabel.slice(0, 200))
    return { rows }
  } catch (err) {
    console.error('getReportDrillDown failed:', err instanceof Error ? err.message : err)
    return { error: "Couldn't load the details for this. Please try again." }
  }
}

type SaveInput = {
  name: string
  description?: string
  visualization: Visualization
  definition: unknown
}

export type SaveReportResult = { error: string } | { ok: true; id: string }

// Saves the CONFIGURATION only — never a frozen copy of results. Reopening
// a saved report re-runs `definition` against live data.
export async function saveReport(input: SaveInput): Promise<SaveReportResult> {
  const user = await requireSession()

  if (!input.name.trim()) return { error: 'Name is required.' }
  const parsedDefinition = reportDefinitionSchema.safeParse(input.definition)
  if (!parsedDefinition.success) return { error: 'Invalid report configuration.' }

  const created = await prisma.savedReport.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      visualization: input.visualization,
      definition: parsedDefinition.data,
      createdById: user.id,
    },
  })

  revalidatePath('/reporting')
  return { ok: true, id: created.id }
}

export async function updateSavedReport(id: string, input: SaveInput): Promise<SaveReportResult> {
  await requireSession()

  if (!input.name.trim()) return { error: 'Name is required.' }
  const parsedDefinition = reportDefinitionSchema.safeParse(input.definition)
  if (!parsedDefinition.success) return { error: 'Invalid report configuration.' }

  await prisma.savedReport.update({
    where: { id },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      visualization: input.visualization,
      definition: parsedDefinition.data,
    },
  })

  revalidatePath('/reporting')
  return { ok: true, id }
}

export async function listSavedReports() {
  await requireSession()
  return prisma.savedReport.findMany({
    include: { createdBy: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function duplicateSavedReport(id: string): Promise<{ error: string } | { ok: true }> {
  const user = await requireSession()

  const source = await prisma.savedReport.findUniqueOrThrow({ where: { id } })
  await prisma.savedReport.create({
    data: {
      name: `${source.name} (Copy)`,
      description: source.description,
      visualization: source.visualization,
      definition: source.definition as Prisma.InputJsonValue,
      createdById: user.id,
    },
  })

  revalidatePath('/reporting')
  return { ok: true }
}

export async function deleteSavedReport(id: string): Promise<void> {
  await requireSession()
  await prisma.savedReport.delete({ where: { id } })
  revalidatePath('/reporting')
}
