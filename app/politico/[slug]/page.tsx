import { notFound } from "next/navigation";
import { buscarFicha } from "@/lib/ficha";
import { comoLinkSeguro } from "@/lib/links";

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

  return (
    <main>
      <h1>{ficha.nome}</h1>
      <section>
        <h2>Candidaturas</h2>
        {ficha.candidaturas.length === 0 ? (
          <p>Sem candidatura registrada.</p>
        ) : (
          <ul>
            {ficha.candidaturas.map((c) => {
              const linkFonte = comoLinkSeguro(c.fonteUrl);
              return (
                <li key={`${c.anoEleicao}-${c.turno}-${c.cargo}`}>
                  {c.anoEleicao} — {c.cargo} ({c.sgUf}) — {c.sgPartido} — {c.situacao}
                  <br />
                  <small>
                    fonte:{" "}
                    {linkFonte ? <a href={linkFonte}>{c.fonteUrl}</a> : c.fonteUrl}, coletado em{" "}
                    {new Date(c.coletadoEm).toLocaleDateString("pt-BR")}
                  </small>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {emailContato && (
        <footer>
          <a href={`mailto:${emailContato}?subject=${assuntoEmail}`}>
            Encontrou um erro nesta ficha? Reporte aqui.
          </a>
        </footer>
      )}
    </main>
  );
}
