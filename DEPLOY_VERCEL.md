# Publicar o RePrice na Vercel

O projeto roda na Vercel sem mudanças no código. O banco continua o mesmo (Neon),
então nenhum dado se perde.

## 1. Colocar o projeto no GitHub

1. Crie uma conta em https://github.com (se ainda não tiver).
2. Clique em **New repository**, dê um nome (ex.: `reprice`) e deixe **Private**.
3. Envie esta pasta para o repositório:
   - mais fácil: instale o **GitHub Desktop**, use *Add existing repository* apontando
     para esta pasta e clique em *Publish repository*;
   - ou pelo terminal, dentro desta pasta:
     ```
     git remote add origin https://github.com/SEU-USUARIO/reprice.git
     git branch -M main
     git push -u origin main
     ```

Confira no GitHub: o `package.json` tem que aparecer na raiz do repositório.

## 2. Importar na Vercel

1. Entre em https://vercel.com com a sua conta do GitHub (plano **Hobby**, grátis).
2. **Add New → Project** e escolha o repositório `reprice`.
3. A Vercel reconhece o Next.js sozinha. Não mude Build Command nem Output Directory.
4. Antes de clicar em **Deploy**, abra **Environment Variables** e cadastre:

| Nome | Valor |
| --- | --- |
| `DATABASE_URL` | a mesma URL do Neon que estava no Netlify (termina em `?sslmode=require&pgbouncer=true`) |
| `DEV_EMAIL` | o email da área de dev |
| `DEV_PASSWORD` | a senha da área de dev |
| `EXPORT_KEY` | a chave da planilha do Google |

5. Clique em **Deploy**. No fim aparece o endereço do site (ex.: `reprice.vercel.app`).

## 3. Depois de publicar

- **Atualizar o site:** cada `git push` (ou *Push origin* no GitHub Desktop) publica
  sozinho uma nova versão.
- **Planilha do Google:** no Apps Script, troque `SITE` pelo novo endereço da Vercel.
- **Netlify:** pode deixar o site antigo lá; ele não interfere. O `netlify.toml`
  continua no projeto caso queiram voltar a usar o Netlify.

## Se der erro

- **"Nenhum banco configurado"** → a variável `DATABASE_URL` não foi cadastrada
  (ou o nome está diferente). Corrija em *Settings → Environment Variables* e
  clique em *Redeploy*.
- Qualquer outro erro → copie o log do deploy (*Deployments → o deploy → Build Logs*).
