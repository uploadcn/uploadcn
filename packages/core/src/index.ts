export { createUploader, isActiveStatus, isFinishedStatus } from "./uploader"
export type {
  AddOptions,
  DuplicateStrategy,
  ItemSelector,
  NetworkMonitor,
  PauseReason,
  PersistedUpload,
  ProcessContext,
  ResultOf,
  UploadAdapter,
  UploadAdapterAbortContext,
  UploadAdapterContext,
  UploadChunks,
  UploadItem,
  UploadItemUpdate,
  UploadPersistence,
  UploadProgress,
  UploadStatus,
  Uploader,
  UploaderEventName,
  UploaderEvents,
  UploaderOptions,
  UploaderState,
} from "./types"

export {
  UploadError,
  abortError,
  httpError,
  isAbortError,
  isRetryableStatus,
  isUploadError,
  parseRetryAfter,
  toUploadError,
  type UploadErrorCode,
  type UploadErrorOptions,
} from "./errors"

export {
  getFileType,
  matchesAccept,
  parseAccept,
  toAcceptAttribute,
  validateFile,
  validateFileCount,
  validateFiles,
  validateFileSync,
  type FileValidator,
  type ImageConstraints,
  type MediaConstraints,
  type ValidateFilesResult,
  type ValidationCode,
  type ValidationIssue,
  type ValidationOptions,
  type ValidatorContext,
} from "./validation"

export {
  getImageDimensions,
  getMediaDuration,
  isAudio,
  isImage,
  isPreviewableImage,
  isVideo,
  type ImageDimensions,
} from "./media"

export {
  DEFAULT_RETRY,
  getRetryDelay,
  resolveRetryOptions,
  sleep,
  withRetry,
  type RetryOptions,
} from "./retry"

export { createChunks, getPartSize, GiB, KiB, MiB, type Chunk } from "./chunk"
export { getUploadSummary, type UploadSummary } from "./summary"
export {
  getClipboardFiles,
  getDraggedTypes,
  getDroppedFiles,
  isFileDrag,
} from "./dom"
export { createBrowserNetworkMonitor } from "./network"
export {
  createIndexedDBPersistence,
  createMemoryPersistence,
  getBackgroundCapabilities,
  requestPersistentStorage,
  type BackgroundCapabilities,
  type IndexedDBPersistenceOptions,
} from "./persistence"
export {
  createId,
  formatBytes,
  formatDuration,
  formatSpeed,
  getFileExtension,
  getFileFingerprint,
} from "./utils"

export * from "./protocol"

export {
  xhrTransport,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from "./adapters/transport"
export { httpAdapter, type HttpAdapterOptions } from "./adapters/http"
export {
  presignedAdapter,
  type PresignedAdapterOptions,
  type PresignedRequestContext,
  type PresignedTarget,
  type PresignedUploadResult,
} from "./adapters/presigned"
export {
  multipartAdapter,
  type MultipartAdapterOptions,
  type MultipartPartContext,
  type MultipartResumeState,
  type UploadedPart,
} from "./adapters/multipart"
export {
  getS3Key,
  r2Adapter,
  s3Adapter,
  type S3AdapterOptions,
  type S3MultipartOptions,
  type S3ResumeState,
} from "./adapters/s3"
export { routeAdapter } from "./adapters/route"
export {
  mockAdapter,
  type MockAdapterOptions,
  type MockUploadResult,
} from "./adapters/mock"
export { postJson, type JsonRequestOptions } from "./adapters/shared"
export { createAdapter, type CreateAdapterOptions } from "./adapters/custom"
export {
  cloudinaryAdapter,
  type CloudinaryAdapterOptions,
  type CloudinarySignature,
  type CloudinaryUploadResult,
} from "./adapters/cloudinary"
export {
  deleteLocalFile,
  getLocalFile,
  localAdapter,
  type LocalAdapterOptions,
  type LocalUploadResult,
} from "./adapters/local"
export {
  ocrEndpoint,
  ocrProcess,
  tesseractOcr,
  type OcrEndpointOptions,
  type OcrField,
  type OcrLine,
  type OcrPage,
  type OcrProcessOptions,
  type OcrRecognizer,
  type OcrResult,
  type TesseractModule,
  type TesseractOcrOptions,
} from "./ocr"
