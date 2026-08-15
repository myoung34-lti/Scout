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

  const setSingle = useCallback(
    (key: string, value: string | undefined) => {
      updateParams((params) => {
        if (!value || value === 'ALL') params.delete(key)
        else params.set(key, value)
      })
    },
    [updateParams]
  )

  const setMulti = useCallback(
    (key: string, values: string[]) => {
      updateParams((params) => {
        params.delete(key)
        values.forEach((v) => params.append(key, v))
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
      })
    },
    [updateParams]
  )

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }, [router, pathname, startTransition])

  return { searchParams, setSingle, setMulti, removeOne, clearAll }
}
