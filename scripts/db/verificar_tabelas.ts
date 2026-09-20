import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const resultado = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('pessoa', 'candidatura') order by table_name"
    );
    console.log(resultado.rows);
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
