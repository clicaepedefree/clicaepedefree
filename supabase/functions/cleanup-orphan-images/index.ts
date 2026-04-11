import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const bucketName = 'restaurant-images';
    const baseUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketName}/`;

    console.log('Starting orphan image cleanup...');

    // 1. Get all referenced URLs from the database
    const [productsRes, restaurantsRes] = await Promise.all([
      supabase.from('products').select('image_url'),
      supabase.from('restaurants').select('logo_url, banner_url'),
    ]);

    const referencedPaths = new Set<string>();

    // Extract file paths from product image URLs
    for (const p of productsRes.data || []) {
      if (p.image_url) {
        const path = extractPath(p.image_url, baseUrl);
        if (path) referencedPaths.add(path);
      }
    }

    // Extract file paths from restaurant logo/banner URLs
    for (const r of restaurantsRes.data || []) {
      if (r.logo_url) {
        const path = extractPath(r.logo_url, baseUrl);
        if (path) referencedPaths.add(path);
      }
      if (r.banner_url) {
        const path = extractPath(r.banner_url, baseUrl);
        if (path) referencedPaths.add(path);
      }
    }

    console.log(`Found ${referencedPaths.size} referenced images in database`);

    // 2. List all files in storage bucket by iterating through restaurant folders
    const { data: restaurants } = await supabase.from('restaurants').select('id');
    const restaurantIds = (restaurants || []).map((r: { id: string }) => r.id);

    let totalFiles = 0;
    let orphanCount = 0;
    let freedBytes = 0;
    const orphansToDelete: string[] = [];

    for (const restaurantId of restaurantIds) {
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list(restaurantId, { limit: 1000 });

      if (listError) {
        console.error(`Error listing files for ${restaurantId}:`, listError.message);
        continue;
      }

      if (!files) continue;

      for (const file of files) {
        totalFiles++;
        const fullPath = `${restaurantId}/${file.name}`;

        if (!referencedPaths.has(fullPath)) {
          orphansToDelete.push(fullPath);
          orphanCount++;
          // metadata.size is in bytes
          const size = (file.metadata as Record<string, unknown>)?.size;
          if (typeof size === 'number') {
            freedBytes += size;
          }
        }
      }
    }

    console.log(`Found ${totalFiles} total files, ${orphanCount} orphans (${formatBytes(freedBytes)})`);

    // 3. Delete orphans in batches of 100
    let deletedCount = 0;
    for (let i = 0; i < orphansToDelete.length; i += 100) {
      const batch = orphansToDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(batch);

      if (deleteError) {
        console.error(`Error deleting batch starting at ${i}:`, deleteError.message);
      } else {
        deletedCount += batch.length;
        console.log(`Deleted batch ${Math.floor(i / 100) + 1}: ${batch.length} files`);
      }
    }

    const summary = {
      success: true,
      totalFilesScanned: totalFiles,
      referencedImages: referencedPaths.size,
      orphansFound: orphanCount,
      orphansDeleted: deletedCount,
      freedSpace: formatBytes(freedBytes),
    };

    console.log('Cleanup complete:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function extractPath(url: string, baseUrl: string): string | null {
  if (!url) return null;
  // Handle full URLs
  if (url.startsWith(baseUrl)) {
    return decodeURIComponent(url.replace(baseUrl, ''));
  }
  // Handle relative paths
  if (url.includes('/storage/v1/object/public/restaurant-images/')) {
    const parts = url.split('/storage/v1/object/public/restaurant-images/');
    return decodeURIComponent(parts[1]);
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
