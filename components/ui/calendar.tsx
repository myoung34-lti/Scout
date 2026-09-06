'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'

function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      className={cn('p-3', className)}
      classNames={{
        months: cn(defaultClassNames.months, 'gap-4'),
        month: cn(defaultClassNames.month, 'space-y-3'),
        month_caption: cn(
          defaultClassNames.month_caption,
          'flex items-center justify-center px-9 text-sm font-medium'
        ),
        nav: cn(defaultClassNames.nav, 'flex items-center justify-between'),
        button_previous: cn(
          defaultClassNames.button_previous,
          'absolute left-1 size-7 rounded-md hover:bg-accent inline-flex items-center justify-center disabled:opacity-30'
        ),
        button_next: cn(
          defaultClassNames.button_next,
          'absolute right-1 size-7 rounded-md hover:bg-accent inline-flex items-center justify-center disabled:opacity-30'
        ),
        month_grid: cn(defaultClassNames.month_grid, 'w-full border-collapse'),
        weekdays: cn(defaultClassNames.weekdays, 'flex'),
        weekday: cn(
          defaultClassNames.weekday,
          'w-9 text-center text-xs font-normal text-muted-foreground'
        ),
        week: cn(defaultClassNames.week, 'flex w-full mt-1'),
        day: cn(
          defaultClassNames.day,
          'relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20'
        ),
        day_button: cn(
          defaultClassNames.day_button,
          'size-9 rounded-md p-0 font-normal hover:bg-accent inline-flex items-center justify-center'
        ),
        range_start: cn(defaultClassNames.range_start, 'rounded-l-md bg-accent'),
        range_middle: cn(
          defaultClassNames.range_middle,
          '!rounded-none bg-accent/50 [&>button]:!bg-transparent'
        ),
        range_end: cn(defaultClassNames.range_end, 'rounded-r-md bg-accent'),
        selected: cn(
          defaultClassNames.selected,
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary'
        ),
        today: cn(defaultClassNames.today, '[&>button]:border [&>button]:border-primary'),
        outside: cn(defaultClassNames.outside, 'text-muted-foreground/40'),
        disabled: cn(defaultClassNames.disabled, 'text-muted-foreground/30'),
        hidden: cn(defaultClassNames.hidden, 'invisible'),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
