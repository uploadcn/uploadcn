/**
 * Signs Cloudinary upload parameters with your API secret, for
 * `cloudinaryAdapter({ sign })`. Run it on the server only.
 *
 * @example
 * // app/api/cloudinary/route.ts
 * export async function POST(request: Request) {
 *   const params = await request.json()
 *   if (params.folder !== "avatars") return new Response(null, { status: 403 })
 *   return Response.json(
 *     await signCloudinaryParams(params, {
 *       apiKey: process.env.CLOUDINARY_API_KEY!,
 *       apiSecret: process.env.CLOUDINARY_API_SECRET!,
 *     })
 *   )
 * }
 */
export async function signCloudinaryParams(
  params: Record<string, string | number>,
  {
    apiKey,
    apiSecret,
    timestamp = Math.floor(Date.now() / 1000),
  }: { apiKey: string; apiSecret: string; timestamp?: number }
) {
  if (!apiSecret) throw new Error("signCloudinaryParams needs an API secret")
  const signed: Record<string, string | number> = { ...params, timestamp }
  // Cloudinary signs every parameter except these, sorted by name.
  const excluded = new Set([
    "file",
    "cloud_name",
    "resource_type",
    "api_key",
    "signature",
  ])
  const payload = Object.keys(signed)
    .filter((key) => !excluded.has(key) && signed[key] !== "")
    .sort()
    .map((key) => `${key}=${signed[key]}`)
    .join("&")
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(payload + apiSecret)
  )
  const signature = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  return { signature, timestamp, apiKey }
}
