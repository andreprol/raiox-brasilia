import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarFicha } from "@/lib/ficha";
import { comoLinkSeguro } from "@/lib/links";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ficha = await buscarFicha(slug);
  if (!ficha) return {};
  return { title: ficha.nome };
}

export default async function PaginaFicha({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ficha = await buscarFicha(slug);
  if (!ficha) notFound();

  const emailContato = process.env.NEXT_PUBLIC_EMAIL_CONTATO;
  const assuntoEmail = encodeURIComponent(`Correção na ficha: ${ficha.nome}`);
  const cargoAtual = ficha.candidaturas[0];

  return (
    <div className="ficha">
      <Link href="/" className="ficha__voltar">
        ← Nova busca
      </Link>

      <header className="ficha__cabecalho">
        <span className="ficha__rotulo">Dossiê público</span>
        <h1 className="ficha__nome">{ficha.nome}</h1>
        {cargoAtual && (
          <p className="ficha__meta">
            {cargoAtual.cargo} · {cargoAtual.nmPartido} ({cargoAtual.sgPartido}) · {cargoAtual.sgUf}
          </p>
        )}
        {(ficha.dataNascimento || ficha.ufNascimento) && (
          <p className="ficha__meta">
            {ficha.dataNascimento &&
              `Nascimento: ${new Date(ficha.dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`}
            {ficha.dataNascimento && ficha.ufNascimento && " · "}
            {ficha.ufNascimento && `Natural de ${ficha.ufNascimento}`}
          </p>
        )}
      </header>

      <section>
        <h2 className="ficha__secao-titulo">Candidaturas</h2>
        {ficha.candidaturas.length === 0 ? (
          <p className="sem-candidatura">Sem candidatura registrada.</p>
        ) : (
          <ul className="candidaturas">
            {ficha.candidaturas.map((c) => {
              const linkFonte = comoLinkSeguro(c.fonteUrl);
              return (
                <li key={`${c.anoEleicao}-${c.turno}-${c.cargo}`} className="candidatura-item">
                  <div className="candidatura-item__linha1">
                    <span className="candidatura-item__ano">{c.anoEleicao}</span>
                    <span className="candidatura-item__cargo">
                      {c.cargo} ({c.sgUf})
                    </span>
                    <span>
                      nº {c.nrCandidato} · {c.nmPartido} ({c.sgPartido})
                    </span>
                    <span className="candidatura-item__situacao">{c.situacao}</span>
                  </div>
                  <small className="candidatura-item__fonte">
                    fonte:{" "}
                    {linkFonte ? (
                      <a href={linkFonte} target="_blank" rel="noopener noreferrer">
                        Tribunal Superior Eleitoral — base de candidaturas {c.anoEleicao} (arquivo
                        consolidado nacional)
                      </a>
                    ) : (
                      c.fonteUrl
                    )}
                    , coletado em {new Date(c.coletadoEm).toLocaleDateString("pt-BR")}
                  </small>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {emailContato && (
        <a
          className="correcao-link"
          href={`mailto:${emailContato}?subject=${assuntoEmail}`}
        >
          Encontrou um erro nesta ficha? Reporte aqui →
        </a>
      )}
    </div>
  );
}
