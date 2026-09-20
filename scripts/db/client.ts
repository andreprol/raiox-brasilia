import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

// CA raiz da Supabase (prod-ca-2021.crt / "Supabase Root 2021 CA"), publica e
// documentada pela Supabase. O pool de conexao (Session Pooler) apresenta uma
// cadeia assinada por essa CA propria, que nao esta na lista padrao de CAs
// confiaveis do Node — por isso precisamos informar explicitamente, em vez de
// usar `ssl: true` (que falha com SELF_SIGNED_CERT_IN_CHAIN) ou desligar a
// validacao com `rejectUnauthorized: false`.
const supabaseCa = readFileSync(join(__dirname, "supabase-ca.pem"), "utf-8");

export function criarClientePostgres(): Client {
  if (!process.env.SUPABASE_DB_URL) {
    console.error("SUPABASE_DB_URL não definida em .env.local");
    process.exit(1);
  }
  return new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { ca: supabaseCa },
  });
}
