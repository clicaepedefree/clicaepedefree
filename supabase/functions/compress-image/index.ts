import { corsHeaders } from '../_shared/cors.ts';

const TINIFY_API_KEY = Deno.env.get('TINIFY_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!TINIFY_API_KEY) {
      throw new Error('TinyPNG API key not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Compress with TinyPNG
    const response = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${TINIFY_API_KEY}`)}`,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      throw new Error(`TinyPNG API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Download compressed image
    const compressedResponse = await fetch(result.output.url);
    const compressedBuffer = await compressedResponse.arrayBuffer();

    return new Response(compressedBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': file.type,
        'Content-Length': compressedBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Error compressing image:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});