import type { getSupabaseAdminClient } from "./supabase-admin";

type AdminSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;

export const PROFILE_IMAGE_BUCKET = "staff-profile-images";
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getProfileImageFile(formData: FormData): File | null | "invalid-photo" {
  const profileImage = formData.get("profileImage");

  if (!(profileImage instanceof File) || profileImage.size === 0) {
    return null;
  }

  if (
    profileImage.size > MAX_PROFILE_IMAGE_BYTES ||
    !ALLOWED_PROFILE_IMAGE_TYPES.has(profileImage.type)
  ) {
    return "invalid-photo";
  }

  return profileImage;
}

export async function ensureProfileImageBucket(adminSupabase: AdminSupabaseClient) {
  const { error: getBucketError } = await adminSupabase.storage.getBucket(PROFILE_IMAGE_BUCKET);

  if (!getBucketError) {
    return;
  }

  const { error: createBucketError } = await adminSupabase.storage.createBucket(
    PROFILE_IMAGE_BUCKET,
    {
      public: true,
      fileSizeLimit: MAX_PROFILE_IMAGE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_PROFILE_IMAGE_TYPES),
    },
  );

  if (createBucketError && !createBucketError.message.toLowerCase().includes("already")) {
    throw new Error(`Failed to prepare profile image storage: ${createBucketError.message}`);
  }
}

function getProfileImageExtension(file: File) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByType[file.type] ?? "jpg";
}

export async function uploadProfileImage(
  adminSupabase: AdminSupabaseClient,
  userId: string,
  file: File | null,
) {
  if (!file) {
    return "";
  }

  await ensureProfileImageBucket(adminSupabase);

  const extension = getProfileImageExtension(file);
  const storagePath = `${userId}/profile-${Date.now()}.${extension}`;
  const { error } = await adminSupabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload profile image: ${error.message}`);
  }

  const { data } = adminSupabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(storagePath);

  return data.publicUrl;
}
