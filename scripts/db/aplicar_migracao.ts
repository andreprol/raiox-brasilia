import { readFileSync } from "node:fs";
import { criarClientePostgres } from "./client";

const caminhoArquivo = process.argv[2];
if (!caminhoArquivo) {
  console.error("Uso: npx tsx scripts/db/aplicar_migracao.ts <caminho-do-arquivo-sql>");
  process.exit(1);
}

async function main() {
  const sql = readFileSync(caminhoArquivo, "utf-8");
  const client = criarClientePostgres();
  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log(`Migração aplicada: ${caminhoArquivo}`);
  } catch (erro) {
    await client.query("rollback");
    throw erro;
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
