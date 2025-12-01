import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENDOR_API_KEY = Deno.env.get('AGENDOR_API_KEY');
const AGENDOR_API_URL = 'https://api.agendor.com.br/v3';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting sync of all restaurants to Agendor...');

    // Criar cliente Supabase com service role para acessar todos os dados
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar todos os restaurantes com emails dos usuários
    const { data: restaurants, error: restaurantsError } = await supabase
      .rpc('get_restaurants_with_emails');

    if (restaurantsError) {
      console.error('Error fetching restaurants:', restaurantsError);
      throw restaurantsError;
    }

    console.log(`Found ${restaurants?.length || 0} restaurants to sync`);

    // Buscar o funil "Negócios" no Agendor
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
    const negociosFunnel = funnelsData.data?.find(
      (funnel: any) => funnel.name?.toLowerCase() === 'negócios' || funnel.name?.toLowerCase() === 'negocios'
    );

    if (!negociosFunnel) {
      throw new Error('Funil "Negócios" não encontrado no Agendor');
    }

    console.log('Found "Negócios" funnel:', negociosFunnel.id);

    const results = {
      success: [] as any[],
      errors: [] as any[],
    };

    // Criar negócio para cada restaurante
    for (const restaurant of restaurants || []) {
      try {
        console.log(`Processing restaurant: ${restaurant.name}`);

        const description = `
**Restaurante Existente - Importação**

Nome do Restaurante: ${restaurant.name}
Responsável: ${restaurant.responsible_name || 'Não informado'}
CPF/CNPJ: ${restaurant.tax_id || 'Não informado'}
WhatsApp: ${restaurant.whatsapp}
Email: ${restaurant.user_email}
Slug (URL): ${restaurant.slug}

Data de Cadastro: ${new Date(restaurant.created_at).toLocaleDateString('pt-BR')}
Faturamento Total: R$ ${Number(restaurant.total_revenue || 0).toFixed(2)}
Faturamento Mensal Atual: R$ ${Number(restaurant.monthly_revenue || 0).toFixed(2)}
Status: ${restaurant.is_open ? 'Aberto' : 'Fechado'}
${restaurant.is_blocked ? '⚠️ Bloqueado' : ''}

Sincronizado via Cardápio Fácil
        `.trim();

        const dealData = {
          title: `${restaurant.name} - Importação`,
          description: description,
          funnel: negociosFunnel.id,
          value: Number(restaurant.monthly_revenue || 0),
        };

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
          console.error(`Error creating deal for ${restaurant.name}:`, dealError);
          results.errors.push({
            restaurant: restaurant.name,
            error: dealError,
          });
        } else {
          const dealResult = await dealResponse.json();
          console.log(`Deal created successfully for ${restaurant.name}`);
          results.success.push({
            restaurant: restaurant.name,
            dealId: dealResult.data?.id,
          });
        }

        // Aguardar um pouco entre requests para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing restaurant ${restaurant.name}:`, error);
        results.errors.push({
          restaurant: restaurant.name,
          error: error.message,
        });
      }
    }

    console.log('Sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        total: restaurants?.length || 0,
        synced: results.success.length,
        failed: results.errors.length,
        results: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-all-agendor-deals function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
