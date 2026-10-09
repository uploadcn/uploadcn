"use client"

import * as React from "react"

export type CameraStatus =
  "idle" | "starting" | "ready" | "denied" | "unavailable" | "error"

export interface UseCameraOptions {
  /** Which camera to prefer. Default `"environment"` (rear on phones). */
  facingMode?: "user" | "environment"
  /** Captured image type. Default `"image/jpeg"`. */
  type?: string
  /** Encoder quality for lossy types, 0–1. Default `0.9`. */
  quality?: number
}

/**
 * Streams the device camera into a `<video>` and captures frames as Files.
 * The camera only starts when you call `start()`, never on mount, and is
 * released on `stop()` and on unmount.
 */
export function useCamera({
  facingMode: initialFacingMode = "environment",
  type = "image/jpeg",
  quality = 0.9,
}: UseCameraOptions = {}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [status, setStatus] = React.useState<CameraStatus>("idle")
  const [facingMode, setFacingMode] = React.useState(initialFacingMode)

  const release = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = React.useCallback(
    async (mode: "user" | "environment" = facingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable")
        return
      }
      release()
      setStatus("starting")
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1920 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setStatus("ready")
      } catch (error) {
        const name = error instanceof DOMException ? error.name : ""
        setStatus(
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "unavailable"
              : "error"
        )
      }
    },
    [facingMode, release]
  )

  const stop = React.useCallback(() => {
    release()
    setStatus("idle")
  }, [release])

  const flip = React.useCallback(() => {
    const next = facingMode === "user" ? "environment" : "user"
    setFacingMode(next)
    if (streamRef.current) void start(next)
  }, [facingMode, start])

  /** Grabs the current frame. Resolves `null` if the camera isn't ready. */
  const capture = React.useCallback(
    async (name = `photo-${Date.now()}`) => {
      const video = videoRef.current
      if (!video || !streamRef.current || video.videoWidth === 0) return null
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d")?.drawImage(video, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, quality)
      )
      if (!blob) return null
      const extension =
        type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1]
      return new File([blob], `${name}.${extension}`, { type })
    },
    [type, quality]
  )

  React.useEffect(() => release, [release])

  return { videoRef, status, facingMode, start, stop, flip, capture }
}
