import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENDOR_API_KEY = Deno.env.get("AGENDOR_API_KEY");
const AGENDOR_API_URL = "https://api.agendor.com.br/v3";

// Validação de CNPJ
function isValidCNPJ(taxId: string | null | undefined): boolean {
  if (!taxId) return false;
  const digits = taxId.replace(/\D/g, '');
  return digits.length === 14;
}

// Buscar organização por nome no Agendor
async function findOrganizationByName(name: string): Promise<number | null> {
  try {
    const response = await fetch(`${AGENDOR_API_URL}/organizations?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${AGENDOR_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].id;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar organização');
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUserClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    const userId = claimsData.claims.sub as string;
    const email = (claimsData.claims.email as string | undefined) ?? null;

    // Service role client for privileged inserts (after auth verified)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      restaurantName,
      responsibleName,
      whatsapp,
      taxId
    } = await req.json();

    // Basic input validation
    if (!restaurantName || typeof restaurantName !== 'string' || restaurantName.length > 200 ||
        !responsibleName || typeof responsibleName !== 'string' || responsibleName.length > 200 ||
        !whatsapp || typeof whatsapp !== 'string' || whatsapp.length > 30) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Registrando restaurante para usuário:', userId);

    // 1. Gerar slug único
    const { data: slugData, error: slugError } = await supabaseAdmin
      .rpc('generate_unique_slug', { restaurant_name: restaurantName });

    if (slugError) {
      console.error('Erro ao gerar slug:', slugError);
      throw new Error(`Erro ao gerar slug: ${slugError.message}`);
    }

    const slug = slugData as string;

    // 2. Criar restaurante na tabela
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        user_id: userId,
        name: restaurantName,
        responsible_name: responsibleName,
        whatsapp: whatsapp,
        tax_id: taxId,
        slug: slug
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Erro ao criar restaurante:', restaurantError);
      throw new Error(`Erro ao criar restaurante: ${restaurantError.message}`);
    }

    console.log('Restaurante criado:', restaurant?.id);

    // 3. Criar negócio no Agendor (não-bloqueante)
    if (AGENDOR_API_KEY) {
      try {
        // Verificar se organização já existe
        let organizationId = await findOrganizationByName(restaurantName);

        // Se não existe, criar nova organização
        if (!organizationId) {
          const orgPayload: any = {
            name: restaurantName,
            description: `Responsável: ${responsibleName}\nWhatsApp: ${whatsapp}\nEmail: ${email || 'N/A'}`,
            contact: {
              email: email || undefined,
              whatsapp: whatsapp,
            },
            phones: [
              { number: whatsapp, type: 5 } // type 5 = WhatsApp
            ],
          };

          // Adicionar CNPJ se válido
          if (isValidCNPJ(taxId)) {
            orgPayload.cnpj = taxId;
          }

          const orgResponse = await fetch(`${AGENDOR_API_URL}/organizations`, {
            method: 'POST',
            headers: {
              'Authorization': `Token ${AGENDOR_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orgPayload),
          });

          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            organizationId = orgData.data.id;
            console.log('Organização criada no Agendor:', organizationId);
          } else {
            console.error('Erro ao criar organização no Agendor (status):', orgResponse.status);
          }
        }

        // Buscar funil "Negócios"
        if (organizationId) {
          const funnelsResponse = await fetch(`${AGENDOR_API_URL}/funnels`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${AGENDOR_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });

          if (funnelsResponse.ok) {
            const funnelsData = await funnelsResponse.json();
            const negociosFunnel = funnelsData.data?.find((f: any) =>
              f.name?.toLowerCase().includes('negócio') ||
              f.name?.toLowerCase().includes('negocio')
            );

            if (negociosFunnel) {
              const dealDescription = `**Novo Restaurante Cadastrado**

Nome do Restaurante: ${restaurantName}
Responsável: ${responsibleName}
CPF/CNPJ: ${taxId}
WhatsApp: ${whatsapp}
Email: ${email || 'N/A'}
Slug (URL): ${slug}
Data de cadastro: ${new Date().toLocaleDateString('pt-BR')}

Cadastro realizado via Clica e Pede`;

              const dealPayload = {
                title: `${responsibleName} - ${restaurantName}`,
                description: dealDescription,
                funnel: negociosFunnel.id,
                ranking: 3,
                allowToAllUsers: true,
              };

              const dealResponse = await fetch(`${AGENDOR_API_URL}/organizations/${organizationId}/deals`, {
                method: 'POST',
                headers: {
                  'Authorization': `Token ${AGENDOR_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(dealPayload),
              });

              if (dealResponse.ok) {
                const dealData = await dealResponse.json();
                console.log('Deal criado no Agendor:', dealData.data?.id);
              } else {
                console.error('Erro ao criar deal no Agendor (status):', dealResponse.status);
              }
            }
          }
        }
      } catch (agendorError) {
        console.error('Erro na integração com Agendor');
        // Não falhar o registro por causa do Agendor
      }
    } else {
      console.log('AGENDOR_API_KEY não configurada, pulando integração');
    }

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: restaurant,
        slug: slug
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro no registro:', (error as Error).message);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
