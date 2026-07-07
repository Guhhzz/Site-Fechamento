# Edge Function: admin-users

Esta funcao ativa a tela administrativa de usuarios do painel.

Ela deve ser publicada no Supabase porque usa `SERVICE_ROLE_KEY`, que nao pode ficar no HTML/JavaScript do site.

## Acoes disponiveis

- `list`: lista usuarios cadastrados.
- `updateName`: atualiza o nome de exibicao.
- `resetPassword`: envia e-mail de redefinicao de senha.
- `deleteUser`: exclui um usuario do Auth e remove seu perfil.

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
