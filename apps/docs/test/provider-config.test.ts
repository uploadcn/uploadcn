// The provider config generator: every provider's output, how it follows
// the inputs, and that it only uses environment variables UploadCN reads.
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  type ConfigBlock,
  type ProviderConfig,
  type ProviderId,
  PLACEHOLDER_ORIGIN,
  generateProviderConfig,
  getEnvNames,
  parseOrigins,
  providers,
} from "@/lib/provider-config"

const root = path.resolve(import.meta.dirname, "..")
const read = (file: string) => readFileSync(path.join(root, file), "utf8")

const block = (config: ProviderConfig, id: string): ConfigBlock => {
  const found = config.sections
    .flatMap((section) => section.blocks)
    .find((entry) => entry.id === id)
  if (!found) throw new Error(`${config.provider.id}: no "${id}" block`)
  return found
}
const section = (config: ProviderConfig, id: string) => {
  const found = config.sections.find((entry) => entry.id === id)
  if (!found) throw new Error(`${config.provider.id}: no "${id}" section`)
  return found
}
const parsed = (config: ProviderConfig, id: string) =>
  JSON.parse(block(config, id).code) as unknown

const ORIGINS = ["https://app.example.com", "http://localhost:3000"]
const generate = (provider: ProviderId, bucket = "acme-uploads") =>
  generateProviderConfig({ provider, bucket, origins: ORIGINS })

/** What a browser upload needs, in the S3 CORS vocabulary. */
const s3Rule = (origins: string[]) => ({
  AllowedOrigins: origins,
  AllowedMethods: ["PUT"],
  AllowedHeaders: ["content-type"],
  ExposeHeaders: ["ETag"],
  MaxAgeSeconds: 3600,
})

const objectPolicy = (bucket: string) => ({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts",
      ],
      Resource: `arn:aws:s3:::${bucket}/*`,
    },
  ],
})

describe("parseOrigins", () => {
  it("splits on commas, spaces and new lines", () => {
    expect(
      parseOrigins("https://a.com, https://b.com\nhttps://c.com  https://d.com")
        .origins
    ).toEqual([
      "https://a.com",
      "https://b.com",
      "https://c.com",
      "https://d.com",
    ])
  })

  it("accepts a list as well as a string", () => {
    expect(parseOrigins(["https://a.com", "https://b.com"]).origins).toEqual([
      "https://a.com",
      "https://b.com",
    ])
  })

  it("drops paths, trailing slashes and duplicates, and lowercases", () => {
    const { origins, warnings } = parseOrigins(
      "https://App.Example.com/upload?x=1 https://app.example.com/ https://app.example.com"
    )
    expect(origins).toEqual(["https://app.example.com"])
    expect(warnings).toContain(
      'Using https://app.example.com for "https://App.Example.com/upload?x=1".'
    )
  })

  it("adds a missing scheme: https, or http for localhost", () => {
    expect(
      parseOrigins("example.com localhost:3000 127.0.0.1:5173").origins
    ).toEqual([
      "https://example.com",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ])
  })

  it("keeps ports and wildcard hosts", () => {
    expect(
      parseOrigins("https://*.example.com https://example.com:8443").origins
    ).toEqual(["https://*.example.com", "https://example.com:8443"])
  })

  it("warns about * and about plain http outside localhost", () => {
    const { origins, warnings } = parseOrigins("* http://example.com")
    expect(origins).toEqual(["*", "http://example.com"])
    expect(warnings.some((warning) => warning.startsWith("* lets any"))).toBe(
      true
    )
    expect(warnings).toContain(
      "http://example.com is not HTTPS. Use it for local testing only."
    )
    expect(parseOrigins("http://localhost:3000").warnings).toEqual([])
  })

  it("skips what is not an origin and says so", () => {
    const { origins, warnings } = parseOrigins("ftp://files.example.com")
    expect(origins).toEqual([])
    expect(warnings).toEqual([
      'Skipped "ftp://files.example.com": an origin looks like https://example.com.',
    ])
  })

  it("returns nothing for empty input", () => {
    expect(parseOrigins(undefined)).toEqual({ origins: [], warnings: [] })
    expect(parseOrigins("  \n ")).toEqual({ origins: [], warnings: [] })
  })
})

describe("every provider", () => {
  it.each(providers.map((provider) => [provider.id] as const))(
    "%s: has an .env template, official doc links and its guide",
    (id) => {
      const config = generate(id)
      expect(config.sections[0]!.id).toBe("env")
      expect(block(config, "env").filename).toBe(".env.local")
      expect(config.links.length).toBeGreaterThan(0)
      for (const link of config.links) expect(link.href).toMatch(/^https:\/\//)
      expect(config.provider.guide).toMatch(/^\/docs\//)
    }
  )

  it.each(providers.map((provider) => [provider.id] as const))(
    "%s: every JSON block is valid JSON and nothing contains a secret",
    (id) => {
      const blocks = generate(id).sections.flatMap((entry) => entry.blocks)
      for (const entry of blocks) {
        if (entry.language === "json")
          expect(() => JSON.parse(entry.code), entry.id).not.toThrow()
      }
      const env = block(generate(id), "env").code
      for (const line of env.split("\n")) {
        if (/SECRET|ACCESS_KEY_ID|API_KEY/.test(line.split("=")[0]!))
          expect(line, "credentials are left empty").toMatch(/=$/)
      }
    }
  )

  it.each(providers.map((provider) => [provider.id] as const))(
    "%s: uses no em dashes in its copy",
    (id) => {
      expect(JSON.stringify(generate(id)).includes("—")).toBe(false)
    }
  )

  it("falls back to placeholders until the reader types", () => {
    const config = generateProviderConfig({ provider: "s3" })
    expect(config.bucket).toBe("my-bucket")
    expect(config.origins).toEqual([PLACEHOLDER_ORIGIN])
    expect(config.warnings).toEqual([])
    expect(generateProviderConfig({ provider: "cloudinary" }).bucket).toBe(
      "user-uploads"
    )
  })

  it("keeps names safe for JSON, ARNs and shell commands", () => {
    const config = generateProviderConfig({
      provider: "s3",
      bucket: ' my bucket"; rm -rf ~ ',
    })
    expect(config.bucket).toBe("mybucketrm-rf")
    expect(config.warnings[0]).toMatch(/^Using "mybucketrm-rf"/)
    expect(block(config, "cors-cli").commands![0]).toBe(
      "aws s3api put-bucket-cors --bucket mybucketrm-rf --cors-configuration file://cors.json"
    )
  })
})

describe("environment variable names", () => {
  // The generator must not invent names: each one has to be read by the
  // upload route UploadCN scaffolds, or used by the provider's guide.
  const route = read("registry/default/files/upload-route.ts")
  const cloudinaryGuide = read("content/docs/storage/cloudinary.mdx")

  it.each(["s3", "r2", "tigris"] as const)(
    "%s: every name is read by the upload route",
    (id) => {
      const names = getEnvNames(generate(id))
      expect(names.length).toBeGreaterThan(3)
      for (const name of names)
        expect(route, name).toContain(`process.env.${name}`)
    }
  )

  it("cloudinary: every name is used by the Cloudinary guide", () => {
    const names = getEnvNames(generate("cloudinary"))
    expect(names).toEqual([
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ])
    for (const name of names)
      expect(cloudinaryGuide, name).toContain(`process.env.${name}`)
  })

  it("names exactly the variables each provider needs", () => {
    expect(getEnvNames(generate("s3"))).toEqual([
      "S3_BUCKET",
      "S3_REGION",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
      "S3_PUBLIC_URL",
    ])
    expect(getEnvNames(generate("r2"))).toEqual([
      "R2_ACCOUNT_ID",
      "R2_BUCKET",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_PUBLIC_URL",
    ])
    expect(getEnvNames(generate("tigris"))).toEqual([
      "S3_ENDPOINT",
      "S3_REGION",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
    ])
  })
})

describe("Amazon S3", () => {
  const config = generate("s3")

  it("fills the bucket and region into the .env template", () => {
    const env = block(config, "env").code
    expect(env).toContain("S3_BUCKET=acme-uploads")
    expect(env).toContain("S3_REGION=us-east-1")
    expect(env).toContain("S3_ACCESS_KEY_ID=\n")
    expect(env).not.toContain("S3_ENDPOINT")
    expect(
      block(
        generateProviderConfig({ provider: "s3", region: " eu-west-1 " }),
        "env"
      ).code
    ).toContain("S3_REGION=eu-west-1")
  })

  it("gives the console a bare array of CORS rules", () => {
    expect(parsed(config, "cors")).toEqual([s3Rule(ORIGINS)])
  })

  it("wraps the same rules in CORSRules for the AWS CLI", () => {
    expect(parsed(config, "cors-cli")).toEqual({ CORSRules: [s3Rule(ORIGINS)] })
    expect(block(config, "cors-cli").filename).toBe("cors.json")
    expect(block(config, "cors-cli").commands).toEqual([
      "aws s3api put-bucket-cors --bucket acme-uploads --cors-configuration file://cors.json",
    ])
  })

  it("grants object actions on the bucket's objects only", () => {
    expect(parsed(config, "policy")).toEqual(objectPolicy("acme-uploads"))
  })

  it("offers a lifecycle rule that aborts abandoned multipart uploads", () => {
    expect(parsed(config, "lifecycle")).toEqual({
      Rules: [
        {
          ID: "abort-incomplete-multipart-uploads",
          Status: "Enabled",
          Filter: { Prefix: "" },
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
        },
      ],
    })
    expect(block(config, "lifecycle").commands).toEqual([
      "aws s3api put-bucket-lifecycle-configuration --bucket acme-uploads --lifecycle-configuration file://lifecycle.json",
    ])
  })
})

describe("Cloudflare R2", () => {
  const config = generate("r2")

  it("fills the bucket into the .env template", () => {
    const env = block(config, "env").code
    expect(env).toContain("R2_BUCKET=acme-uploads")
    expect(env).toContain("R2_ACCOUNT_ID=\n")
    expect(env).not.toContain("S3_")
  })

  it("gives the dashboard a bare array in the S3 vocabulary", () => {
    expect(parsed(config, "cors")).toEqual([s3Rule(ORIGINS)])
  })

  it("gives Wrangler a rules array with lowercase, nested keys", () => {
    expect(parsed(config, "cors-cli")).toEqual({
      rules: [
        {
          allowed: {
            origins: ORIGINS,
            methods: ["PUT"],
            headers: ["content-type"],
          },
          exposeHeaders: ["ETag"],
          maxAgeSeconds: 3600,
        },
      ],
    })
    // Wrangler rejects the S3 format outright.
    expect(block(config, "cors-cli").code).not.toMatch(
      /CORSRules|AllowedOrigins/
    )
    expect(block(config, "cors-cli").commands).toEqual([
      "npx wrangler r2 bucket cors set acme-uploads --file cors.json",
      "npx wrangler r2 bucket cors list acme-uploads",
    ])
  })

  it("explains the API token instead of an IAM policy", () => {
    const access = section(config, "access")
    expect(access.blocks).toEqual([])
    expect(access.notes!.join(" ")).toContain("Object Read & Write")
  })
})

describe("Tigris", () => {
  const config = generate("tigris")

  it("points the S3 variables at the Tigris endpoint", () => {
    const env = block(config, "env").code
    expect(env).toContain("S3_ENDPOINT=https://t3.storage.dev")
    expect(env).toContain("S3_REGION=auto")
    expect(env).toContain("S3_BUCKET=acme-uploads")
  })

  it("uses the S3 CORSRules format against the Tigris endpoint", () => {
    expect(parsed(config, "cors-cli")).toEqual({ CORSRules: [s3Rule(ORIGINS)] })
    expect(block(config, "cors-cli").commands).toEqual([
      "aws s3api put-bucket-cors --bucket acme-uploads --endpoint-url https://t3.storage.dev --cors-configuration file://cors.json",
    ])
  })

  it("flags the field Tigris's docs do not show", () => {
    expect(section(config, "cors").notes!.join(" ")).toContain("ExposeHeaders")
  })

  it("creates and attaches an IAM policy through the Tigris IAM endpoint", () => {
    expect(parsed(config, "policy")).toEqual(objectPolicy("acme-uploads"))
    const [create, attach] = block(config, "policy").commands!
    expect(create).toBe(
      "aws iam create-policy --endpoint-url https://iam.storage.dev --policy-name uploadcn-acme-uploads --policy-document file://policy.json"
    )
    expect(attach).toContain(
      "aws iam attach-user-policy --endpoint-url https://iam.storage.dev"
    )
  })
})

describe("Cloudinary", () => {
  const config = generate("cloudinary", "product-photos")

  it("treats the name as the upload preset", () => {
    expect(config.provider.bucketLabel).toBe("Upload preset name")
    expect(block(config, "preset").code).toContain(
      'curl -d "name=product-photos&unsigned=true&allowed_formats=jpg,png"'
    )
    expect(block(config, "preset").code).toContain(
      "https://<API_KEY>:<API_SECRET>@api.cloudinary.com/v1_1/<cloud_name>/upload_presets"
    )
    expect(block(config, "adapter").code).toContain(
      'uploadPreset: "product-photos"'
    )
  })

  it("has no CORS block and ignores origins", () => {
    const cors = section(config, "cors")
    expect(cors.blocks).toEqual([])
    expect(cors.description).toContain("Nothing to configure")
    expect(config.origins).toEqual([])
    expect(JSON.stringify(config)).not.toContain("app.example.com")
    // Origin problems are not this provider's concern.
    expect(
      generateProviderConfig({ provider: "cloudinary", origins: "*" }).warnings
    ).toEqual([])
  })
})

describe("input changes", () => {
  it.each(["s3", "r2", "tigris"] as const)(
    "%s: a new origin reaches every CORS block and nothing else",
    (id) => {
      const before = generateProviderConfig({
        provider: id,
        bucket: "acme-uploads",
        origins: "https://one.example.com",
      })
      const after = generateProviderConfig({
        provider: id,
        bucket: "acme-uploads",
        origins: "https://one.example.com, https://two.example.com",
      })
      const cors = section(after, "cors").blocks
      expect(cors.length).toBeGreaterThan(0)
      for (const entry of cors)
        expect(entry.code, entry.id).toContain("https://two.example.com")
      for (const entry of section(before, "cors").blocks)
        expect(entry.code, entry.id).not.toContain("https://two.example.com")
      expect(block(after, "env")).toEqual(block(before, "env"))
    }
  )

  it.each(["s3", "r2", "tigris"] as const)(
    "%s: a new bucket name reaches the .env, the commands and the policy",
    (id) => {
      const config = generateProviderConfig({ provider: id, bucket: "renamed" })
      const text = JSON.stringify(config.sections)
      expect(text).toContain("BUCKET=renamed")
      expect(text).not.toContain("my-bucket")
      const commands = config.sections
        .flatMap((entry) => entry.blocks)
        .flatMap((entry) => entry.commands ?? [])
      expect(commands.length).toBeGreaterThan(0)
      for (const command of commands.filter((entry) =>
        /cors|lifecycle|create-policy/.test(entry)
      ))
        expect(command).toContain("renamed")
      if (id !== "r2")
        expect(block(config, "policy").code).toContain(
          '"arn:aws:s3:::renamed/*"'
        )
    }
  )

  it("uses the placeholder origin again when origins are cleared", () => {
    const config = generateProviderConfig({ provider: "r2", origins: "" })
    expect(parsed(config, "cors")).toEqual([s3Rule([PLACEHOLDER_ORIGIN])])
  })

  it("reports input problems as warnings instead of failing", () => {
    const config = generateProviderConfig({
      provider: "s3",
      origins: "nonsense://x, example.com",
    })
    expect(config.origins).toEqual(["https://example.com"])
    expect(config.warnings).toEqual([
      'Skipped "nonsense://x": an origin looks like https://example.com.',
      'Using https://example.com for "example.com".',
    ])
  })
})
