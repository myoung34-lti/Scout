'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function useFilterParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [searchParams, pathname, router, startTransition]
  )

  // Any filter change resets to page 1 — a page number from the old result
  // set is meaningless once the results themselves change.
  const setSingle = useCallback(
    (key: string, value: string | undefined) => {
      updateParams((params) => {
        if (!value || value === 'ALL') params.delete(key)
        else params.set(key, value)
        if (key !== 'page') params.delete('page')
      })
    },
    [updateParams]
  )

  // For changing more than one param at once — setSingle called repeatedly
  // in the same handler each reads the same stale searchParams snapshot and
  // fires its own navigation, so only the last call's change survives. This
  // applies every change to one snapshot in a single navigation.
  const setMany = useCallback(
    (updates: Record<string, string | undefined>) => {
      updateParams((params) => {
        for (const [key, value] of Object.entries(updates)) {
          if (!value || value === 'ALL') params.delete(key)
          else params.set(key, value)
        }
        params.delete('page')
      })
    },
    [updateParams]
  )

  const setMulti = useCallback(
    (key: string, values: string[]) => {
      updateParams((params) => {
        params.delete(key)
        values.forEach((v) => params.append(key, v))
        params.delete('page')
      })
    },
    [updateParams]
  )

  const removeOne = useCallback(
    (key: string, value: string) => {
      updateParams((params) => {
        const current = params.getAll(key)
        params.delete(key)
        current
          .filter((v) => v !== value)
          .forEach((v) => params.append(key, v))
        params.delete('page')
      })
    },
    [updateParams]
  )

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }, [router, pathname, startTransition])

  return { searchParams, setSingle, setMany, setMulti, removeOne, clearAll }
}
