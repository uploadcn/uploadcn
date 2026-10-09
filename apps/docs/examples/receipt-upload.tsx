"use client"

import { toast } from "sonner"

import { ReceiptUpload } from "@/registry/default/blocks/receipt-upload"

/** Stand-in for your OCR or AI extraction. */
async function extract() {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return { merchant: "Blue Bottle Coffee", amount: "14.50", category: "Meals" }
}

export default function ReceiptUploadExample() {
  return (
    <div className="w-full max-w-xl">
      <ReceiptUpload
        extract={extract}
        onSubmit={(expense) =>
          toast.success("Expense submitted", {
            description: `${expense.merchant} · ${expense.amount}`,
          })
        }
      />
    </div>
  )
}
