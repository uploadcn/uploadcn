---
"@uploadcn/core": patch
---

`cloudinaryAdapter` uploads large files with chunks of at least 5 MiB (5,242,880 bytes). Cloudinary refuses smaller chunks, so a `chunkSize` of 5 MB failed with a 400. Errors from Cloudinary now carry its reason in the message, for example `Cloudinary: Upload preset not found`, instead of only the status.
