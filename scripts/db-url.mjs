// Descobre a URL do banco. Aceita, nesta ordem:
//   DATABASE_URL          -> banco próprio (ex.: Neon), cadastrado à mão no Netlify
//   NETLIFY_DB_URL        -> Netlify Database (nome atual)
//   NETLIFY_DATABASE_URL  -> Netlify DB (nome antigo)
export function resolveDbUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DB_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    ''
  )
}
