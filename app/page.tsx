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
    <>
      <section className="hero">
        <div className="hero__conteudo">
          <span className="hero__kicker">candidatura · votação · processo · apoio</span>
          <h1 className="hero__titulo">
            A ficha completa de <span className="destaque">qualquer</span> político brasileiro
          </h1>
          <p className="hero__subtitulo">
            Busque por nome, número de candidato ou partido. Cada dado vem com a fonte
            oficial e a data em que foi coletado — sem interpretação, sem retoque.
          </p>
          <form className="busca-form" action="/">
            <div className="busca-form__campo">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Nome, número ou partido"
                autoFocus
              />
            </div>
            <button type="submit">Buscar</button>
          </form>
        </div>
      </section>

      <section className="resultados">
        {resultados.length > 0 && (
          <ul className="resultados__lista">
            {resultados.map((r) => (
              <li key={r.pessoaId}>
                <Link href={`/politico/${r.slug}`} className="resultado-card">
                  <div className="resultado-card__nome">{r.nome}</div>
                  <div className="resultado-card__meta">
                    {r.cargoMaisRecente} · {r.partido} · {r.uf}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {q !== undefined && !termoValido && (
          <p className="mensagem-estado">Digite pelo menos 2 caracteres para buscar.</p>
        )}
        {termoValido && resultados.length === 0 && (
          <p className="mensagem-estado">Nenhum político encontrado para &quot;{termo}&quot;.</p>
        )}
      </section>
    </>
  );
}
