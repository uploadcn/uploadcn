interface Sample {
  time: number
  loaded: number
}

/**
 * Measures throughput over a sliding window so speed and ETA stay stable
 * instead of jumping with every progress event.
 */
export class SpeedTracker {
  private samples: Sample[] = []

  constructor(private readonly windowMs = 4000) {}

  reset() {
    this.samples = []
  }

  /** Records a progress sample and returns bytes/second, or `null`. */
  sample(loaded: number, time: number): number | null {
    const last = this.samples.at(-1)
    // A drop means the upload restarted; previous samples are meaningless.
    if (last && loaded < last.loaded) this.samples = []
    this.samples.push({ time, loaded })
    while (
      this.samples.length > 2 &&
      time - this.samples[0]!.time > this.windowMs
    ) {
      this.samples.shift()
    }
    const first = this.samples[0]!
    const elapsed = time - first.time
    if (elapsed < 250) return null
    return ((loaded - first.loaded) / elapsed) * 1000
  }
}

export function estimateEta(
  loaded: number,
  total: number,
  speed: number | null
): number | null {
  if (!speed || speed <= 0) return null
  return Math.max(0, (total - loaded) / speed)
}
