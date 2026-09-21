import Link from "next/link";
import { buscarPoliticos } from "@/lib/busca";

export default async function PaginaBusca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const resultados = q ? await buscarPoliticos(q) : [];

  return (
    <main>
      <h1>RaioX Brasília</h1>
      <form>
        <input type="text" name="q" defaultValue={q} placeholder="Nome, número ou partido" />
        <button type="submit">Buscar</button>
      </form>
      <ul>
        {resultados.map((r) => (
          <li key={r.pessoaId}>
            <Link href={`/politico/${r.slug}`}>
              {r.nome} — {r.cargoMaisRecente} — {r.partido}/{r.uf}
            </Link>
          </li>
        ))}
      </ul>
      {q && resultados.length === 0 && <p>Nenhum político encontrado para &quot;{q}&quot;.</p>}
    </main>
  );
}
