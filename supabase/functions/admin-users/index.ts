import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = [
  'gustavo.salomao@gazin.com.br',
  'email-da-gerente@gazin.com.br',
  'email-da-coordenadora@gazin.com.br',
].map((email) => email.toLowerCase());

const SITE_URL = Deno.env.get('SITE_URL') || 'https://guhhzz.github.io/Site-Fechamento/';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function profileName(user: any) {
  const meta = user?.user_metadata || {};
  return String(meta.name || meta.full_name || user?.email?.split('@')[0] || 'Usuario').trim();
}

function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: profileName(user),
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed_at: user.email_confirmed_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Variaveis do Supabase nao configuradas na Edge Function.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Sessao ausente.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: sessionData, error: sessionError } = await userClient.auth.getUser();
  const requester = sessionData?.user;
  if (sessionError || !requester?.email) return json({ error: 'Sessao invalida.' }, 401);
  if (!ADMIN_EMAILS.includes(requester.email.toLowerCase())) return json({ error: 'Acesso restrito a administradores.' }, 403);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: any = {};
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: 'Corpo da requisicao invalido.' }, 400);
  }

  try {
    if (body.action === 'list') {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page: Number(body.page || 1),
        perPage: Math.min(Number(body.perPage || 200), 200),
      });
      if (error) throw error;
      const users = (data?.users || []).map(publicUser).sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
      return json({ users });
    }

    if (body.action === 'updateName') {
      const userId = String(body.userId || '').trim();
      const name = String(body.name || '').trim();
      if (!userId || !name) return json({ error: 'Informe usuario e nome.' }, 400);

      const { data: currentData, error: getError } = await adminClient.auth.admin.getUserById(userId);
      if (getError) throw getError;
      const currentMeta = currentData?.user?.user_metadata || {};
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { ...currentMeta, name, full_name: name },
      });
      if (error) throw error;
      return json({ user: publicUser(data.user) });
    }

    if (body.action === 'resetPassword') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) return json({ error: 'Informe o e-mail do usuario.' }, 400);
      const { error } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: SITE_URL,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: 'Acao administrativa desconhecida.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Erro administrativo no Supabase.');
    return json({ error: message }, 500);
  }
});
