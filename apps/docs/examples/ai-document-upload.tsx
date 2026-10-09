"use client"

import { simulateBackendStep } from "@/examples/_demo"
import {
  DocumentIngest,
  INGEST_STAGES,
  type IngestProcess,
} from "@/registry/default/blocks/document-ingest"

/**
 * After the bytes are stored, follow server-side ingestion. Here each stage
 * calls a demo endpoint; in production you'd poll a job or listen to SSE.
 */
const ingest: IngestProcess<unknown> = async (item, { setStage, signal }) => {
  for (const stage of INGEST_STAGES.slice(1)) {
    setStage(stage)
    // Your ingestion pipeline does the work; here a stand-in waits.
    await simulateBackendStep(item.name, stage, signal)
  }
}

export default function AiDocumentUploadExample() {
  return <DocumentIngest ingest={ingest} />
}
