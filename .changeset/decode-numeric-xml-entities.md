---
"@uploadcn/server": patch
---

Fix resuming multipart uploads on S3-compatible services that escape quotes as `&#34;` in XML (Tigris, MinIO). `s3Storage` now decodes numeric character references, so ETags from ListParts match the ones the part uploads returned, and an upload restored after a page reload completes instead of failing with `InvalidPart`.
