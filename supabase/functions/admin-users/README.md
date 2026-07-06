# Edge Function: admin-users

Esta funcao ativa a tela administrativa de usuarios do painel.

Ela deve ser publicada no Supabase porque usa `SERVICE_ROLE_KEY`, que nao pode ficar no HTML/JavaScript do site.

## Publicacao

O deploy foi preparado para rodar pelo GitHub Actions em:

`.github/workflows/deploy-supabase-functions.yml`

Se precisar publicar manualmente com Supabase CLI:

```bash
supabase functions deploy admin-users --project-ref evpjwlvozywnpsxgczxg
```

## Secrets necessarios

No Supabase, em Edge Functions > Secrets:

```bash
SERVICE_ROLE_KEY=<chave service_role do projeto>
SITE_URL=https://guhhzz.github.io/Site-Fechamento/
```

A funcao tambem aceita `SUPABASE_SERVICE_ROLE_KEY` como fallback, mas o nome principal usado neste projeto e `SERVICE_ROLE_KEY`.
