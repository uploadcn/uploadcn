type Handler<T> = (payload: T) => void

/** A tiny typed event emitter. Handler errors never break the engine. */
export class Emitter<TEvents extends object> {
  private handlers = new Map<keyof TEvents, Set<Handler<never>>>()

  on<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: Handler<TEvents[TEvent]>
  ): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as Handler<never>)
    return () => {
      set.delete(handler as Handler<never>)
    }
  }

  emit<TEvent extends keyof TEvents>(event: TEvent, payload: TEvents[TEvent]) {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of [...set]) {
      try {
        ;(handler as Handler<TEvents[TEvent]>)(payload)
      } catch (error) {
        queueMicrotask(() => {
          throw error
        })
      }
    }
  }

  clear() {
    this.handlers.clear()
  }
}
