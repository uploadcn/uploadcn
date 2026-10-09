import "fake-indexeddb/auto"

import { describe, expect, it } from "vitest"

import { createIndexedDBPersistence } from "../src/persistence"
import type { PersistedUpload } from "../src/types"
import { createFile } from "./helpers"

function record(id: string, createdAt: number): PersistedUpload {
  const file = createFile(`${id}.bin`, 10)
  return {
    id,
    batchId: "batch",
    file,
    originalFile: file,
    meta: { folder: "docs" },
    resumeState: { uploadId: id },
    adapter: "s3",
    createdAt,
  }
}

describe("createIndexedDBPersistence", () => {
  it("saves, loads in creation order and removes records with their files", async () => {
    const persistence = createIndexedDBPersistence({ name: "test-roundtrip" })
    const now = Date.now()
    await persistence.save(record("b", now))
    await persistence.save(record("a", now - 1000))

    const loaded = await persistence.load()
    expect(loaded.map((r) => r.id)).toEqual(["a", "b"])
    expect(loaded[0]!.resumeState).toEqual({ uploadId: "a" })
    expect(loaded[0]!.file.size).toBe(10)

    await persistence.remove("a")
    expect((await persistence.load()).map((r) => r.id)).toEqual(["b"])
  })

  it("expires records older than maxAge", async () => {
    const persistence = createIndexedDBPersistence({
      name: "test-expiry",
      maxAge: 1000,
    })
    await persistence.save(record("old", Date.now() - 5000))
    await persistence.save(record("new", Date.now()))
    expect((await persistence.load()).map((r) => r.id)).toEqual(["new"])
  })
})
