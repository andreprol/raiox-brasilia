import { supabaseServidor } from "./supabase/server";

export interface ResultadoBusca {
  pessoaId: string;
  slug: string;
  nome: string;
  cargoMaisRecente: string;
  partido: string;
  uf: string;
}

interface LinhaBusca {
  pessoa_id: string;
  nm_urna: string;
  cargo: string;
  sg_partido: string;
  sg_uf: string;
  pessoa: { slug: string; nome_civil: string; oculto: boolean } | null;
}

const LIMITE_RESULTADOS = 20;
// Buscamos um lote bruto maior que o limite final porque a query roda sobre
// `candidatura` (uma linha por candidatura) e só depois deduplicamos por
// pessoa. Um político com várias candidaturas correspondentes ocuparia mais
// de uma vaga do lote bruto; sem essa folga, a lista final ficaria com menos
// de 20 pessoas distintas mesmo havendo mais correspondências.
const LOTE_BRUTO = 200;
const TAMANHO_MAX_TERMO = 100;

export async function buscarPoliticos(termo: string): Promise<ResultadoBusca[]> {
  const termoLimpo = termo.trim();
  if (termoLimpo.length < 2) return [];

  // PostgREST usa `,` para separar condições e `()` para agrupá-las dentro do
  // filtro `.or()`. Sem sanitizar, um termo com esses caracteres alteraria a
  // estrutura lógica do filtro em vez de ser tratado como texto de busca.
  const termoSeguro = termoLimpo.replace(/[,()]/g, "").trim().slice(0, TAMANHO_MAX_TERMO);
  if (termoSeguro.length < 2) return [];

  const { data, error } = await supabaseServidor
    .from("candidatura")
    .select(
      "pessoa_id, nm_urna, cargo, sg_partido, sg_uf, ano_eleicao, pessoa:pessoa_id(slug, nome_civil, oculto)"
    )
    .eq("oculto", false)
    .or(
      `nm_urna.ilike.%${termoSeguro}%,sg_partido.ilike.%${termoSeguro}%,nr_candidato.eq.${termoSeguro}`
    )
    .order("ano_eleicao", { ascending: false })
    .limit(LOTE_BRUTO);

  if (error) throw error;

  const vistos = new Set<string>();
  const resultados: ResultadoBusca[] = [];
  for (const linha of (data ?? []) as unknown as LinhaBusca[]) {
    if (!linha.pessoa || linha.pessoa.oculto || vistos.has(linha.pessoa_id)) continue;
    vistos.add(linha.pessoa_id);
    resultados.push({
      pessoaId: linha.pessoa_id,
      slug: linha.pessoa.slug,
      nome: linha.pessoa.nome_civil,
      cargoMaisRecente: linha.cargo,
      partido: linha.sg_partido,
      uf: linha.sg_uf,
    });
    if (resultados.length === LIMITE_RESULTADOS) break;
  }
  return resultados;
}
