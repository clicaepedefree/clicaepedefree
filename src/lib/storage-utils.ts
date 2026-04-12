import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/restaurant-images/userId/banner_123.jpg"
 * → "userId/banner_123.jpg"
 */
export function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = '/storage/v1/object/public/restaurant-images/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

/**
 * Deletes a file from the restaurant-images bucket given its public URL.
 * Silently ignores errors (best-effort cleanup).
 */
export async function deleteStorageImage(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  const path = extractStoragePath(publicUrl);
  if (!path) return;

  try {
    const { error } = await supabase.storage
      .from('restaurant-images')
      .remove([path]);
    if (error) {
      console.warn('Failed to delete storage image:', path, error);
    } else {
      console.log('Deleted storage image:', path);
    }
  } catch (err) {
    console.warn('Error deleting storage image:', err);
  }
}
