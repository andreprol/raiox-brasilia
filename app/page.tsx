import Link from "next/link";
import { buscarPoliticos } from "@/lib/busca";

export default async function PaginaBusca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q: qBruto } = await searchParams;
  // O Next.js retorna string[] quando a query tem chaves repetidas (?q=a&q=b);
  // sem normalizar, buscarPoliticos() receberia um array e quebraria em .trim().
  const q = Array.isArray(qBruto) ? qBruto[0] : qBruto;
  const termo = q?.trim() ?? "";
  const termoValido = termo.length >= 2;
  const resultados = termoValido ? await buscarPoliticos(termo) : [];

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
      {q !== undefined && !termoValido && <p>Digite pelo menos 2 caracteres para buscar.</p>}
      {termoValido && resultados.length === 0 && (
        <p>Nenhum político encontrado para &quot;{termo}&quot;.</p>
      )}
    </main>
  );
}
