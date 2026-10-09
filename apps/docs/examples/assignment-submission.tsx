"use client"

import * as React from "react"
import { toast } from "sonner"

import { AssignmentSubmission } from "@/registry/default/blocks/assignment-submission"

export default function AssignmentSubmissionExample() {
  // Due in two days, fixed at mount so it doesn't change on re-render.
  const [due] = React.useState(() => new Date(Date.now() + 2 * 86_400_000))
  return (
    <div className="w-full max-w-md">
      <AssignmentSubmission
        due={due}
        onSubmit={async (files) => {
          await new Promise((resolve) => setTimeout(resolve, 600))
          toast.success(`Turned in ${files.length} files`)
        }}
      />
    </div>
  )
}
