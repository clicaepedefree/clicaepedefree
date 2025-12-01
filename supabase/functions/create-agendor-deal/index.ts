import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENDOR_API_KEY = Deno.env.get('AGENDOR_API_KEY');
const AGENDOR_API_URL = 'https://api.agendor.com.br/v3';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      restaurantName, 
      responsibleName, 
      taxId, 
      whatsapp, 
      email,
      slug 
    } = await req.json();

    console.log('Creating Agendor deal for:', restaurantName);

    // Primeiro, vamos buscar o funnel ID do funil "Negócios"
    const funnelsResponse = await fetch(`${AGENDOR_API_URL}/funnels`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${AGENDOR_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!funnelsResponse.ok) {
      const funnelsError = await funnelsResponse.text();
      console.error('Error fetching funnels:', funnelsError);
      throw new Error(`Failed to fetch funnels: ${funnelsError}`);
    }

    const funnelsData = await funnelsResponse.json();
    console.log('Available funnels:', funnelsData);

    // Procurar pelo funil "Negócios" (case insensitive)
    const negociosFunnel = funnelsData.data?.find(
      (funnel: any) => funnel.name?.toLowerCase() === 'negócios' || funnel.name?.toLowerCase() === 'negocios'
    );

    if (!negociosFunnel) {
      console.error('Funil "Negócios" não encontrado. Funis disponíveis:', funnelsData.data?.map((f: any) => f.name));
      throw new Error('Funil "Negócios" não encontrado no Agendor');
    }

    console.log('Found "Negócios" funnel:', negociosFunnel);

    // Criar descrição com todos os dados
    const description = `
**Novo Restaurante Cadastrado**

Nome do Restaurante: ${restaurantName}
Responsável: ${responsibleName}
CPF/CNPJ: ${taxId}
WhatsApp: ${whatsapp}
Email: ${email}
Slug (URL): ${slug}

Cadastro realizado via Cardápio Fácil
    `.trim();

    // Criar o negócio no Agendor
    const dealData = {
      title: `${restaurantName} - Novo Cadastro`,
      description: description,
      funnel: negociosFunnel.id,
      // Opcionalmente, podemos adicionar mais campos:
      // value: 29.90, // Valor do negócio
      // ranking: 3, // Ranking/probabilidade (1-5)
    };

    console.log('Creating deal with data:', dealData);

    const dealResponse = await fetch(`${AGENDOR_API_URL}/deals`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${AGENDOR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dealData),
    });

    if (!dealResponse.ok) {
      const dealError = await dealResponse.text();
      console.error('Error creating deal:', dealError);
      throw new Error(`Failed to create deal: ${dealError}`);
    }

    const dealResult = await dealResponse.json();
    console.log('Deal created successfully:', dealResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dealId: dealResult.data?.id,
        dealUrl: dealResult.data?.url 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-agendor-deal function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
