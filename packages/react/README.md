# @uploadcn/react

React hooks and headless, accessible upload primitives for
[UploadCN](https://uploadcn.dev). The shadcn-styled components in the UploadCN registry
are built on these.

```bash
npm install @uploadcn/react @uploadcn/core
```

```tsx
import { s3Adapter } from "@uploadcn/core"
import { Upload } from "@uploadcn/react"

const adapter = s3Adapter({ endpoint: "/api/upload" })

export function Uploader() {
  return (
    <Upload.Root adapter={adapter} accept="image/*" maxFiles={5}>
      <Upload.Dropzone>Drop images or press Enter to browse</Upload.Dropzone>
      <Upload.List>
        {(item) => (
          <Upload.Item item={item}>
            <Upload.Name />
            <Upload.Progress>
              <Upload.ProgressIndicator />
            </Upload.Progress>
            <Upload.Status />
            <Upload.Retry>Retry</Upload.Retry>
            <Upload.Remove>Remove</Upload.Remove>
          </Upload.Item>
        )}
      </Upload.List>
    </Upload.Root>
  )
}
```

Hooks: `useUploader`, `useUpload`, `useUploadState`, `useUploadSelector`,
`useUploadItem`, `useUploadProgress`, `useUploadValue`, `useDropzone`, `useWindowDrop`,
`usePasteFiles`, `useFileValidation`, `useImageCompression`, `useImageCrop`,
`useFilePreview`, `useNetworkStatus`, `useUploadGuard`.

Requires React 19. Documentation: https://uploadcn.dev/docs/hooks

MIT
