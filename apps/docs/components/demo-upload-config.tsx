"use client"

import { UploadConfigProvider } from "@uploadcn/react"

import { demoAdapter } from "@/examples/_demo"

/**
 * Every upload on this site uses the simulated demo adapter unless a
 * component passes its own, the same pattern you'd use with a real one.
 */
export function DemoUploadConfig({ children }: { children: React.ReactNode }) {
  return (
    <UploadConfigProvider adapter={demoAdapter}>
      {children}
    </UploadConfigProvider>
  )
}
