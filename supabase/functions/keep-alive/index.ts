/**
 * Supabase Edge Function: keep-alive
 * 
 * Executa um SELECT leve no banco para evitar que o projeto
 * seja pausado por inatividade no plano gratuito do Supabase.
 * 
 * Agendamento recomendado: a cada 5 dias via pg_cron
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Ping leve — apenas verifica conectividade sem retornar dados reais
    const { error } = await supabase.rpc('ping');

    // Se a função RPC não existir, usa fallback com query direta
    if (error?.code === 'PGRST202') {
      const { error: fallbackError } = await supabase
        .from('_keep_alive_check')
        .select('1')
        .limit(1)
        .maybeSingle();

      // Ignora erro de tabela inexistente — o ping já funcionou
      console.log('Keep-alive ping executado (fallback):', fallbackError?.code ?? 'OK');
    } else if (error) {
      throw error;
    } else {
      console.log('Keep-alive ping executado via RPC: OK');
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Supabase keep-alive executado com sucesso'
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    console.error('Erro no keep-alive:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
