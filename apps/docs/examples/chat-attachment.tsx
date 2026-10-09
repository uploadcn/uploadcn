"use client"

import * as React from "react"
import type { StoredObject } from "@uploadcn/core"
import { PaperclipIcon } from "lucide-react"

import { ChatAttachments } from "@/registry/default/blocks/chat-attachments"

interface Message {
  id: number
  text: string
  files: string[]
}

export default function ChatAttachmentExample() {
  const [messages, setMessages] = React.useState<Message[]>([])

  return (
    <div className="flex flex-col gap-4">
      {messages.length ? (
        <ol className="flex flex-col gap-2" aria-label="Messages">
          {messages.map((message) => (
            <li
              key={message.id}
              className="animate-in self-end rounded-2xl bg-secondary px-3 py-2 text-sm text-secondary-foreground fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
            >
              {message.text ? <p>{message.text}</p> : null}
              {message.files.length ? (
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <PaperclipIcon className="size-3" aria-label="Attachments" />
                  {message.files.join(", ")}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Paste a screenshot, drop a PDF, or click the paperclip.
        </p>
      )}
      <ChatAttachments<StoredObject>
        onSend={({ text, attachments }) =>
          setMessages((previous) => [
            ...previous,
            {
              id: previous.length,
              text,
              files: attachments.map((item) => item.name),
            },
          ])
        }
      />
    </div>
  )
}
