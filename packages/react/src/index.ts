import {
  UploadCancel,
  UploadClear,
  UploadDropzone,
  UploadEmpty,
  UploadError,
  UploadItemRoot,
  UploadList,
  UploadName,
  UploadPause,
  UploadPreview,
  UploadProgress,
  UploadProgressIndicator,
  UploadRemove,
  UploadResume,
  UploadRetry,
  UploadRoot,
  UploadSize,
  UploadSpeed,
  UploadStart,
  UploadStatus,
  UploadSuccess,
  UploadTrigger,
} from "./primitives"

/**
 * Headless, accessible upload primitives. Style them directly or use the
 * shadcn-styled versions from the UploadCN registry.
 */
export const Upload = {
  Root: UploadRoot,
  Dropzone: UploadDropzone,
  Trigger: UploadTrigger,
  List: UploadList,
  Item: UploadItemRoot,
  Preview: UploadPreview,
  Name: UploadName,
  Size: UploadSize,
  Speed: UploadSpeed,
  Status: UploadStatus,
  Error: UploadError,
  Success: UploadSuccess,
  Progress: UploadProgress,
  ProgressIndicator: UploadProgressIndicator,
  Remove: UploadRemove,
  Cancel: UploadCancel,
  Retry: UploadRetry,
  Pause: UploadPause,
  Resume: UploadResume,
  Empty: UploadEmpty,
  Start: UploadStart,
  Clear: UploadClear,
}

export {
  UploadCancel,
  UploadClear,
  UploadDropzone,
  UploadEmpty,
  UploadError,
  UploadItemRoot,
  UploadList,
  UploadName,
  UploadPause,
  UploadPreview,
  UploadProgress,
  UploadProgressIndicator,
  UploadRemove,
  UploadResume,
  UploadRetry,
  UploadRoot,
  UploadSize,
  UploadSpeed,
  UploadStart,
  UploadStatus,
  UploadSuccess,
  UploadTrigger,
}
export type {
  UploadDropzoneProps,
  UploadDropzoneState,
  UploadItemProps,
  UploadListProps,
  UploadPreviewProps,
  UploadProgressProps,
  UploadProgressState,
  UploadRootProps,
  UploadRootState,
  UploadSizeProps,
  UploadTriggerProps,
} from "./primitives"

export {
  UploadContext,
  UploadItemContext,
  useUploadContext,
  useUploadItem,
  type UploadContextValue,
} from "./context"
export {
  defaultMessages,
  getStatusLabel,
  type UploadMessages,
} from "./messages"
export { mergeProps, type RenderProp } from "./render"

export {
  useUploader,
  type UploaderCallbacks,
  type UseUploaderOptions,
} from "./use-uploader"
export {
  useUpload,
  useUploadProgress,
  useUploadState,
  useUploadValue,
  type UseUploadReturn,
} from "./use-upload"
export { shallowArrayEqual, useUploadSelector } from "./use-upload-selector"
export {
  useDropzone,
  type DropzoneHandlers,
  type DropzoneState,
  type UseDropzoneOptions,
} from "./use-dropzone"
export { useWindowDrop, type UseWindowDropOptions } from "./use-window-drop"
export { usePasteFiles, type UsePasteFilesOptions } from "./use-paste-files"
export { useFileValidation } from "./use-file-validation"
export {
  useImageCompression,
  useImageCrop,
  type CompressionStats,
  type ImageCropState,
  type UseImageCropOptions,
} from "./use-image"
export {
  getPreviewKind,
  useFilePreview,
  type PreviewKind,
  type UseFilePreviewOptions,
} from "./use-file-preview"
export {
  useNetworkStatus,
  useUploadGuard,
  type UseUploadGuardOptions,
} from "./use-network"
export {
  UploadConfigProvider,
  useUploadConfig,
  type UploadConfig,
} from "./config"
