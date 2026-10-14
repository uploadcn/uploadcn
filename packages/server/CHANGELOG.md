# @uploadcn/server

## 0.1.3

### Patch Changes

- Updated dependencies [d319a58]
  - @uploadcn/core@0.1.3

## 0.1.2

### Patch Changes

- 9db590a: Fix resuming multipart uploads on S3-compatible services that escape quotes as `&#34;` in XML (Tigris, MinIO). `s3Storage` now decodes numeric character references, so ETags from ListParts match the ones the part uploads returned, and an upload restored after a page reload completes instead of failing with `InvalidPart`.
- @uploadcn/core@0.1.2

## 0.1.1

### Patch Changes

- @uploadcn/core@0.1.1
