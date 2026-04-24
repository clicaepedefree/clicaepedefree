import { corsHeaders } from '../_shared/cors.ts';

const TINIFY_API_KEY = Deno.env.get('TINIFY_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!TINIFY_API_KEY) {
      console.error('TinyPNG API key not configured');
      throw new Error('TinyPNG API key not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('No file provided in request');
      throw new Error('No file provided');
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    console.log('Sending to TinyPNG API...');
    
    // Compress with TinyPNG
    const response = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${TINIFY_API_KEY}`)}`,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TinyPNG API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`TinyPNG API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('TinyPNG response:', result);
    
    // Download compressed image
    const compressedResponse = await fetch(result.output.url);
    if (!compressedResponse.ok) {
      throw new Error('Failed to download compressed image');
    }
    
    const compressedBuffer = await compressedResponse.arrayBuffer();
    console.log(`Compressed image size: ${compressedBuffer.byteLength}`);

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
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});