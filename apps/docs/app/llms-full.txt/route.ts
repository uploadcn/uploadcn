import { getLlmsFullTxt } from "@/lib/llms"

export const revalidate = false

export async function GET() {
  return new Response(await getLlmsFullTxt(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}
