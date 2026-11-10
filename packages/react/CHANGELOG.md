# @uploadcn/react

## 0.1.5

### Patch Changes

- 41182a5: Paste to upload, opt-in. With `paste`, an upload component takes files pasted with Ctrl/⌘+V (screenshots, copied images, files copied from the file manager, several at once) while it is focused or hovered; `paste="global"` takes them from anywhere on the page. Pasted files go through the same validation as dropped ones (`accept`, `maxSize`, `maxFiles`, custom validators) and are announced in the live region. Pastes into text inputs, textareas and `contenteditable` elements are never touched, and neither are text-only pastes.

  - `@uploadcn/react`: `paste` on `Upload.Root` (`boolean | "global"`, default `false`) and on `UploadConfigProvider`, which sets it for every upload component below; a component's own prop wins. The root and its dropzone get `data-paste` while paste is on, and the dropzone gets `aria-keyshortcuts`. Parts that take files for themselves (named slots) mark themselves with `data-paste-target` and receive the paste through their own file input: the one in use, or the first empty one. New `useDropzonePaste` hook for custom drop zones. `usePasteFiles` has an `ignoreEditable` option and skips pastes another handler already took, so a file is never added twice.
  - `@uploadcn/core`: `getClipboardFiles` names clipboard images that have no real file name `pasted-image-<timestamp>.<ext>` (browsers send them unnamed or as a generic `image.png`); files copied from a file manager keep their names. New `isEditableTarget` helper.

- Updated dependencies [41182a5]
  - @uploadcn/core@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies [6b1b5cd]
  - @uploadcn/core@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies [d319a58]
  - @uploadcn/core@0.1.3

## 0.1.2

### Patch Changes

- @uploadcn/core@0.1.2

## 0.1.1

### Patch Changes

- 966dbdc: Components no longer throw when no adapter is configured. They render, log a setup hint once, and each upload fails with the same hint, so pages still build and pre-render before storage is set up.
- @uploadcn/core@0.1.1
