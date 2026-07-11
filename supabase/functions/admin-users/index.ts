import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = [
  'gustavo.salomao@gazin.com.br',
  'email-da-gerente@gazin.com.br',
  'email-da-coordenadora@gazin.com.br',
].map((email) => email.toLowerCase());

const SITE_URL = Deno.env.get('SITE_URL') || 'https://guhhzz.github.io/Site-Fechamento/';
const DEFAULT_SUPABASE_URL = 'https://evpjwlvozywnpsxgczxg.supabase.co';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function profileName(user: any, profile?: any) {
  if (profile?.nome) return String(profile.nome).trim();
  const meta = user?.user_metadata || {};
  return String(meta.name || meta.full_name || user?.email?.split('@')[0] || 'Usuario').trim();
}

function publicUser(user: any, profile?: any) {
  return {
    id: user.id,
    email: user.email,
    name: profileName(user, profile),
    perfil: profile?.perfil || 'usuario',
    ativo: profile?.ativo !== false,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed_at: user.email_confirmed_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Metodo nao permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({
      error: 'Configuracao da Edge Function incompleta.',
      details: 'SUPABASE_URL ou SERVICE_ROLE_KEY nao configurada.',
    }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Sessao ausente.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sessionData, error: sessionError } = await adminClient.auth.getUser(token);
  const requester = sessionData?.user;
  if (sessionError || !requester?.email) return json({ error: 'Sessao invalida.' }, 401);
  const isFallbackAdmin = ADMIN_EMAILS.includes(requester.email.toLowerCase());

  const { data: requesterProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('perfil, ativo')
    .eq('id', requester.id)
    .maybeSingle();
  if (profileError && !isFallbackAdmin) return json({ error: profileError.message || 'Nao foi possivel validar o perfil administrativo.' }, 500);

  const isProfileAdmin = requesterProfile?.perfil === 'admin' && requesterProfile?.ativo !== false;
  if (!isProfileAdmin && !isFallbackAdmin) return json({ error: 'Acesso restrito a administradores.' }, 403);

  let body: any = req.method === 'GET' ? { action: 'list' } : {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch (_) {
      return json({ error: 'Corpo da requisicao invalido.' }, 400);
    }
  }

  try {
    if (body.action === 'list') {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page: Number(body.page || 1),
        perPage: Math.min(Number(body.perPage || 200), 200),
      });
      if (error) throw error;
      const ids = (data?.users || []).map((user) => user.id);
      let profiles: any[] = [];
      if (ids.length) {
        const { data: profilesData, error: profilesError } = await adminClient
          .from('profiles')
          .select('id, nome, email, perfil, ativo')
          .in('id', ids);
        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }
      const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
      const users = (data?.users || [])
        .map((user) => publicUser(user, profileById.get(user.id)))
        .sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
      return json({ users });
    }

    if (body.action === 'inviteUser') {
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim();
      const perfil = String(body.perfil || 'usuario').trim().toLowerCase() === 'admin' ? 'admin' : 'usuario';
      if (!email) return json({ error: 'Informe o e-mail para enviar o convite.' }, 400);

      const displayName = name || email.split('@')[0] || 'Usuario';
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: SITE_URL,
        data: {
          name: displayName,
          full_name: displayName,
          perfil,
        },
      });
      if (error) throw error;

      const invitedUser = data?.user;
      if (invitedUser?.id) {
        const { error: profileUpsertError } = await adminClient
          .from('profiles')
          .upsert({
            id: invitedUser.id,
            email,
            nome: displayName,
            perfil,
            ativo: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        if (profileUpsertError) throw profileUpsertError;
      }

      return json({ ok: true, user: invitedUser ? publicUser(invitedUser, { nome: displayName, email, perfil, ativo: true }) : null });
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
      await adminClient.from('profiles').update({ nome: name, updated_at: new Date().toISOString() }).eq('id', userId);
      return json({ user: publicUser(data.user, { nome: name }) });
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

    if (body.action === 'deleteUser') {
      const userId = String(body.userId || '').trim();
      if (!userId) return json({ error: 'Informe o usuario que deve ser excluido.' }, 400);
      if (userId === requester.id) return json({ error: 'Voce nao pode excluir o proprio usuario logado.' }, 400);

      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;

      await adminClient.from('profiles').delete().eq('id', userId);
      return json({ ok: true });
    }

    return json({ error: 'Acao administrativa desconhecida.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Erro administrativo no Supabase.');
    return json({ error: message }, 500);
  }
});
