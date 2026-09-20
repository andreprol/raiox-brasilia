import { criarClientePostgres } from "./client";

async function main() {
  const client = criarClientePostgres();
  await client.connect();
  try {
    const tabelas = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('pessoa', 'candidatura') order by table_name"
    );
    console.log("Tabelas:", tabelas.rows);

    const rls = await client.query(
      "select relname, relrowsecurity from pg_class where relname in ('pessoa', 'candidatura') order by relname"
    );
    console.log("RLS:", rls.rows);
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
