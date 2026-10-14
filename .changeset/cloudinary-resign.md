---
"@uploadcn/core": patch
---

`cloudinaryAdapter` re-signs chunked uploads before the signature turns one hour old (Cloudinary rejects older signatures), both when resuming an upload and between chunks of long uploads. The upload keeps the same id and continues from its saved offset.
