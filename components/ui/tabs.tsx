"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  variant = "pill",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "pill" | "underline"
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "text-muted-foreground",
        variant === "pill"
          ? "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1"
          : "flex w-full items-center gap-1 overflow-x-auto border-b border-border",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        "in-data-[variant=pill]:flex-1 in-data-[variant=pill]:rounded-md in-data-[variant=pill]:border in-data-[variant=pill]:border-transparent in-data-[variant=pill]:px-2 in-data-[variant=pill]:py-1 in-data-[variant=pill]:data-[state=active]:bg-background in-data-[variant=pill]:data-[state=active]:text-foreground in-data-[variant=pill]:data-[state=active]:shadow-sm",
        "in-data-[variant=underline]:-mb-px in-data-[variant=underline]:shrink-0 in-data-[variant=underline]:border-b-2 in-data-[variant=underline]:border-transparent in-data-[variant=underline]:px-3 in-data-[variant=underline]:pb-2.5 in-data-[variant=underline]:pt-1 in-data-[variant=underline]:hover:text-foreground in-data-[variant=underline]:data-[state=active]:border-primary in-data-[variant=underline]:data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
