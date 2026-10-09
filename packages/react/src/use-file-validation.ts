import {
  type ValidateFilesResult,
  type ValidationIssue,
  type ValidationOptions,
  validateFileCount,
  validateFiles,
} from "@uploadcn/core"
import * as React from "react"

/**
 * Standalone validation for flows that don't upload immediately — e.g.
 * collecting files in a form and submitting them later. Uses the same rules
 * as the uploader, including async and custom validators.
 */
export function useFileValidation(options: ValidationOptions) {
  const [isValidating, setIsValidating] = React.useState(false)
  const optionsRef = React.useRef(options)
  React.useEffect(() => {
    optionsRef.current = options
  })
  const pending = React.useRef<AbortController | null>(null)

  React.useEffect(() => () => pending.current?.abort(), [])

  const validate = React.useCallback(
    async (
      files: readonly File[],
      context: { existingCount?: number } = {}
    ): Promise<ValidateFilesResult> => {
      pending.current?.abort()
      const controller = new AbortController()
      pending.current = controller
      setIsValidating(true)
      try {
        return await validateFiles(files, optionsRef.current, {
          ...context,
          signal: controller.signal,
        })
      } finally {
        if (pending.current === controller) {
          pending.current = null
          setIsValidating(false)
        }
      }
    },
    []
  )

  const validateCount = React.useCallback(
    (count: number): ValidationIssue | null =>
      validateFileCount(count, optionsRef.current),
    []
  )

  return { validate, validateCount, isValidating }
}
