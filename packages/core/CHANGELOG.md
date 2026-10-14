# @uploadcn/core

## 0.1.3

### Patch Changes

- d319a58: `cloudinaryAdapter` re-signs chunked uploads before the signature turns one hour old (Cloudinary rejects older signatures), both when resuming an upload and between chunks of long uploads. The upload keeps the same id and continues from its saved offset.

## 0.1.2

No changes in this release.

## 0.1.1

No changes in this release.
