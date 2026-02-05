import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENDOR_API_KEY = Deno.env.get('AGENDOR_API_KEY');
const AGENDOR_API_URL = 'https://api.agendor.com.br/v3';

// Função para validar se é um CNPJ válido (14 dígitos numéricos)
function isValidCNPJ(taxId: string | null | undefined): boolean {
  if (!taxId) return false;
  const digits = taxId.replace(/\D/g, '');
  return digits.length === 14;
}

// Função para buscar organização existente pelo nome
async function findOrganizationByName(name: string): Promise<number | null> {
  try {
    const response = await fetch(`${AGENDOR_API_URL}/organizations?nameExact=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${AGENDOR_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('Error searching organization:', await response.text());
      return null;
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      console.log(`Found existing organization: ${data.data[0].id}`);
      return data.data[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error searching organization:', error);
    return null;
  }
}

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

    console.log('Creating Agendor organization and deal for:', restaurantName);

    // Primeiro, verificar se já existe uma organização com esse nome
    let organizationId = await findOrganizationByName(restaurantName);

    if (!organizationId) {
      // Criar nova organização
      const organizationData: any = {
        name: restaurantName,
        description: `Restaurante cadastrado via Cardápio Fácil`,
        contact: {
          email: email,
          whatsapp: whatsapp,
        },
        phones: [
          { number: whatsapp, type: 5 } // type 5 = WhatsApp
        ],
        allowToAllUsers: true,
      };

      // Só adiciona CNPJ se for válido (14 dígitos)
      if (isValidCNPJ(taxId)) {
        organizationData.cnpj = taxId.replace(/\D/g, '');
      }

      console.log('Creating organization with data:', organizationData);

      const orgResponse = await fetch(`${AGENDOR_API_URL}/organizations`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${AGENDOR_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(organizationData),
      });

      if (!orgResponse.ok) {
        const orgError = await orgResponse.text();
        console.error('Error creating organization:', orgError);
        
        // Se o erro for "Name has already been taken", tenta buscar novamente
        if (orgError.includes('Name has already been taken')) {
          console.log('Organization exists, trying to find by name...');
          organizationId = await findOrganizationByName(restaurantName);
        }
        
        if (!organizationId) {
          throw new Error(`Failed to create organization: ${orgError}`);
        }
      } else {
        const orgResult = await orgResponse.json();
        organizationId = orgResult.data?.id;
      }
    }
    
    console.log('Organization ID:', organizationId);

    // Agora buscar o funil "Negócios"
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

    const negociosFunnel = funnelsData.data?.find(
      (funnel: any) => funnel.name?.toLowerCase() === 'negócios' || funnel.name?.toLowerCase() === 'negocios'
    );

    if (!negociosFunnel) {
      console.error('Funil "Negócios" não encontrado. Funis disponíveis:', funnelsData.data?.map((f: any) => f.name));
      throw new Error('Funil "Negócios" não encontrado no Agendor');
    }

    console.log('Found "Negócios" funnel:', negociosFunnel);

    // Criar o negócio associado à organização
    const dealDescription = `**Novo Restaurante Cadastrado**

Nome do Restaurante: ${restaurantName}
Responsável: ${responsibleName}
CPF/CNPJ: ${taxId}
WhatsApp: ${whatsapp}
Email: ${email}
Slug (URL): ${slug}

Cadastro realizado via Cardápio Fácil`;

    const dealData = {
      title: `${responsibleName} - ${restaurantName}`,
      description: dealDescription,
      funnel: negociosFunnel.id,
      ranking: 3,
      allowToAllUsers: true,
    };

    console.log('Creating deal for organization:', organizationId);

    const dealResponse = await fetch(`${AGENDOR_API_URL}/organizations/${organizationId}/deals`, {
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
