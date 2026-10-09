"use client"

import * as React from "react"
import { useUploadContext, useUploadProgress } from "@uploadcn/react"
import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

const COLORS = [
  "bg-primary",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
]

interface UploadConfettiProps {
  /** Pieces per burst. Default 28. */
  count?: number
  /** Only celebrate when every file succeeded. Default `true`. */
  onlyOnSuccess?: boolean
  className?: string
}

interface Burst {
  id: number
  pieces: {
    x: number
    y: number
    rotate: number
    color: string
    round: boolean
    delay: number
  }[]
}

/**
 * Drop it inside any `<Upload>`: when the queue finishes, a burst of
 * confetti in your theme's colors. Silent with reduced motion.
 */
function UploadConfetti({
  count = 28,
  onlyOnSuccess = true,
  className,
}: UploadConfettiProps) {
  const { uploader } = useUploadContext()
  const summary = useUploadProgress(uploader)
  const reduceMotion = useReducedMotion()
  const [bursts, setBursts] = React.useState<Burst[]>([])
  const wasUploading = React.useRef(false)

  React.useEffect(() => {
    if (summary.isUploading) {
      wasUploading.current = true
      return
    }
    if (!wasUploading.current) return
    wasUploading.current = false
    if (reduceMotion || (onlyOnSuccess && !summary.isComplete)) return
    const id = Date.now()
    const pieces = Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.4
      const distance = 70 + Math.random() * 90
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 40,
        rotate: Math.random() * 540 - 270,
        color: COLORS[index % COLORS.length]!,
        round: index % 3 === 0,
        delay: Math.random() * 0.08,
      }
    })
    queueMicrotask(() => setBursts((current) => [...current, { id, pieces }]))
  }, [
    summary.isUploading,
    summary.isComplete,
    reduceMotion,
    onlyOnSuccess,
    count,
  ])

  return (
    <div
      aria-hidden
      data-slot="upload-confetti"
      className={cn(
        "pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-visible",
        className
      )}
    >
      <AnimatePresence>
        {bursts.map((burst) => (
          <React.Fragment key={burst.id}>
            {burst.pieces.map((piece, index) => (
              <motion.span
                key={index}
                className={cn(
                  "absolute size-2",
                  piece.round ? "rounded-full" : "h-3 w-1.5 rounded-xs",
                  piece.color
                )}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
                animate={{
                  x: piece.x,
                  y: [0, piece.y, piece.y + 120],
                  opacity: [1, 1, 0],
                  rotate: piece.rotate,
                  scale: 1,
                }}
                transition={{
                  duration: 1.4,
                  ease: "easeOut",
                  delay: piece.delay,
                }}
                onAnimationComplete={
                  index === 0
                    ? () =>
                        setBursts((current) =>
                          current.filter((entry) => entry.id !== burst.id)
                        )
                    : undefined
                }
              />
            ))}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  )
}

export { UploadConfetti, type UploadConfettiProps }
