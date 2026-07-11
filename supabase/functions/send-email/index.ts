import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  template_type?: 'order_created' | 'order_shipped';
  variables?: Record<string, any>;
  // Overrides for manual/test mode
  resend_api_key?: string;
  from_name?: string;
  from_address?: string;
  subject?: string;
  html_content?: string;
  test_mode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: EmailRequest = await req.json();
    const { to, template_type, variables, test_mode } = payload;

    // 1. Fetch settings from DB
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();

    if (settingsError && !payload.resend_api_key) {
      throw new Error('Could not fetch email settings and no backup key provided');
    }

    const apiKey = payload.resend_api_key || settings?.resend_api_key;
    const fromName = payload.from_name || settings?.email_from_name || '2Clothing2Rent';
    const fromAddress = payload.from_address || settings?.email_from_address || 'noreply@2clothing2rent.com.br';
    const isActive = settings?.email_active ?? true;

    if (!isActive && !test_mode) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email system is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!apiKey) throw new Error('Resend API key missing');
    if (!to) throw new Error('Recipient email (to) missing');

    let finalSubject = payload.subject || "2Clothing2Rent Notificação";
    let finalHtml = payload.html_content || "<p>Conteúdo não definido.</p>";

    // 2. Handle Templates if requested
    if (template_type && settings) {
      const templateHtml = template_type === 'order_created' 
        ? settings.email_template_order_created 
        : settings.email_template_order_shipped;
      
      if (templateHtml) {
        finalHtml = templateHtml;
        finalSubject = template_type === 'order_created' ? 'Pedido Recebido - 2Clothing2Rent' : 'Pedido Enviado - 2Clothing2Rent';
        
        // Replace tags: {{variable}}
        if (variables) {
          Object.keys(variables).forEach(tag => {
            const regex = new RegExp(`{{${tag}}}`, 'g');
            finalHtml = finalHtml.replace(regex, String(variables[tag]));
          });
        }
      }
    }

    // 3. Handle Test Mode
    if (test_mode) {
      finalSubject = "Teste de Configuração - 2Clothing2Rent";
      finalHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #000;">A configuração está funcionando! 🎉</h2>
          <p>Você configurou o Resend com sucesso no painel administrativo.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">A partir de agora, os e-mails transacionais serão disparados automaticamente.</p>
        </div>
      `;
    }

    const sender = `${fromName} <${fromAddress}>`;

    let resendData: any;
    let resendError: any = null;

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: sender,
          to: [to],
          subject: finalSubject,
          html: finalHtml
        })
      });

      resendData = await resendResponse.json();

      if (!resendResponse.ok) {
        throw new Error(resendData.message || 'Error from Resend API');
      }

      // Log success
      await supabaseClient.from('email_logs').insert({
        to_email: to,
        subject: finalSubject,
        status: 'success'
      });

      return new Response(
        JSON.stringify({ success: true, id: resendData.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (err: any) {
      resendError = err;
      // Log error
      await supabaseClient.from('email_logs').insert({
        to_email: to,
        subject: finalSubject,
        status: 'error',
        error_message: err.message
      });
      throw err;
    }

  } catch (error: any) {
    console.error('Email error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

