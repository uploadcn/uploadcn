---
"@uploadcn/core": patch
"@uploadcn/react": patch
---

Paste to upload, opt-in. With `paste`, an upload component takes files pasted with Ctrl/⌘+V (screenshots, copied images, files copied from the file manager, several at once) while it is focused or hovered; `paste="global"` takes them from anywhere on the page. Pasted files go through the same validation as dropped ones (`accept`, `maxSize`, `maxFiles`, custom validators) and are announced in the live region. Pastes into text inputs, textareas and `contenteditable` elements are never touched, and neither are text-only pastes.

- `@uploadcn/react`: `paste` on `Upload.Root` (`boolean | "global"`, default `false`) and on `UploadConfigProvider`, which sets it for every upload component below; a component's own prop wins. The root and its dropzone get `data-paste` while paste is on. New `useDropzonePaste` hook for custom drop zones. `usePasteFiles` has an `ignoreEditable` option and skips pastes another handler already took, so a file is never added twice.
- `@uploadcn/core`: `getClipboardFiles` names clipboard images that have no real file name `pasted-image-<timestamp>.<ext>` (browsers send them unnamed or as a generic `image.png`); files copied from a file manager keep their names. New `isEditableTarget` helper.
