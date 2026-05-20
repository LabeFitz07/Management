import type { getSupabaseAdminClient } from "./supabase-admin";

type AdminSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;

export const TASK_SUBMISSION_FILE_BUCKET = "task-submission-files";
export const MAX_TASK_SUBMISSION_FILES = 5;
export const MAX_TASK_SUBMISSION_FILE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_TASK_SUBMISSION_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-works",
  "application/zip",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export type UploadedTaskFile = {
  storageBucket: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type UploadedTaskSubmissionFile = UploadedTaskFile;
export type UploadedTaskReferenceFile = UploadedTaskFile;

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return "attachment";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function validateTaskFiles(files: File[]) {
  if (files.length > MAX_TASK_SUBMISSION_FILES) {
    return false;
  }

  return files.every(
    (file) =>
      file.size > 0 &&
      file.size <= MAX_TASK_SUBMISSION_FILE_BYTES &&
      ALLOWED_TASK_SUBMISSION_FILE_TYPES.has(file.type),
  );
}

export function getTaskSubmissionFiles(formData: FormData): File[] | "invalid-files" {
  const files = formData
    .getAll("taskFiles")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!validateTaskFiles(files)) {
    return "invalid-files";
  }

  return files;
}

export function getTaskReferenceFiles(formData: FormData): File[] | "invalid-files" {
  const files = formData
    .getAll("taskReferenceFiles")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!validateTaskFiles(files)) {
    return "invalid-files";
  }

  return files;
}

export async function ensureTaskSubmissionBucket(adminSupabase: AdminSupabaseClient) {
  const { error: getBucketError } = await adminSupabase.storage.getBucket(TASK_SUBMISSION_FILE_BUCKET);

  if (!getBucketError) {
    return;
  }

  const { error: createBucketError } = await adminSupabase.storage.createBucket(
    TASK_SUBMISSION_FILE_BUCKET,
    {
      public: false,
      fileSizeLimit: MAX_TASK_SUBMISSION_FILE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_TASK_SUBMISSION_FILE_TYPES),
    },
  );

  if (createBucketError && !createBucketError.message.toLowerCase().includes("already")) {
    throw new Error(`Failed to prepare task submission storage: ${createBucketError.message}`);
  }
}

async function uploadTaskFiles(
  adminSupabase: AdminSupabaseClient,
  basePath: string,
  files: File[],
) {
  if (files.length === 0) {
    return [] satisfies UploadedTaskFile[];
  }

  await ensureTaskSubmissionBucket(adminSupabase);

  const uploadedFiles: UploadedTaskFile[] = [];

  for (const [index, file] of files.entries()) {
    const safeName = sanitizeFileName(file.name);
    const storagePath = `${basePath}/${Date.now()}-${index + 1}-${safeName}`;
    const { error } = await adminSupabase.storage
      .from(TASK_SUBMISSION_FILE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload task submission file: ${error.message}`);
    }

    uploadedFiles.push({
      storageBucket: TASK_SUBMISSION_FILE_BUCKET,
      storagePath,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }

  return uploadedFiles;
}

export async function uploadTaskSubmissionFiles(
  adminSupabase: AdminSupabaseClient,
  taskId: string,
  submissionId: string,
  files: File[],
) {
  return uploadTaskFiles(adminSupabase, `${taskId}/${submissionId}`, files);
}

export async function uploadTaskReferenceFiles(
  adminSupabase: AdminSupabaseClient,
  taskId: string,
  files: File[],
) {
  return uploadTaskFiles(adminSupabase, `${taskId}/reference`, files);
}

export async function removeTaskSubmissionFiles(
  adminSupabase: AdminSupabaseClient,
  storagePaths: string[],
) {
  if (storagePaths.length === 0) {
    return;
  }

  await adminSupabase.storage.from(TASK_SUBMISSION_FILE_BUCKET).remove(storagePaths);
}

export async function createTaskSubmissionSignedUrl(
  adminSupabase: AdminSupabaseClient,
  storagePath: string,
  expiresInSeconds = 60 * 60,
) {
  const { data, error } = await adminSupabase.storage
    .from(TASK_SUBMISSION_FILE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    return null;
  }

  return data.signedUrl;
}
