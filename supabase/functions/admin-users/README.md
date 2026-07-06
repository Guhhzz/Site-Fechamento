# Edge Function: admin-users

Esta função ativa a tela administrativa de usuários do painel.

Ela deve ser publicada no Supabase porque usa `SUPABASE_SERVICE_ROLE_KEY`, que não pode ficar no HTML/JavaScript do site.

## Publicação

No Supabase CLI:

```bash
supabase functions deploy admin-users --project-ref evpjwlvozywnpsxgczxg
```

Opcionalmente, configure o segredo `SITE_URL` para o link do GitHub Pages:

```bash
supabase secrets set SITE_URL=https://guhhzz.github.io/Site-Fechamento/ --project-ref evpjwlvozywnpsxgczxg
```

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo ambiente das Edge Functions do Supabase.
