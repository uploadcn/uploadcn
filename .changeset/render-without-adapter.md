---
"@uploadcn/react": patch
---

Components no longer throw when no adapter is configured. They render, log a setup hint once, and each upload fails with the same hint, so pages still build and pre-render before storage is set up.
