import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

const caminhoArquivo = process.argv[2];
if (!caminhoArquivo) {
  console.error("Uso: npx tsx scripts/db/aplicar_migracao.ts <caminho-do-arquivo-sql>");
  process.exit(1);
}

async function main() {
  const sql = readFileSync(caminhoArquivo, "utf-8");
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Migração aplicada: ${caminhoArquivo}`);
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
