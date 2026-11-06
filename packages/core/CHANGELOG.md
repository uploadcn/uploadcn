# @uploadcn/core

## 0.1.4

### Patch Changes

- 6b1b5cd: `cloudinaryAdapter` uploads large files with chunks of at least 5 MiB (5,242,880 bytes). Cloudinary refuses smaller chunks, so a `chunkSize` of 5 MB failed with a 400. Errors from Cloudinary now carry its reason in the message, for example `Cloudinary: Upload preset not found`, instead of only the status.

## 0.1.3

### Patch Changes

- d319a58: `cloudinaryAdapter` re-signs chunked uploads before the signature turns one hour old (Cloudinary rejects older signatures), both when resuming an upload and between chunks of long uploads. The upload keeps the same id and continues from its saved offset.

## 0.1.2

No changes in this release.

## 0.1.1

No changes in this release.
