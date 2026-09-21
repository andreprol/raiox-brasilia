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
  pessoa: { slug: string; nome_civil: string } | null;
}

export async function buscarPoliticos(termo: string): Promise<ResultadoBusca[]> {
  const termoLimpo = termo.trim();
  if (termoLimpo.length < 2) return [];

  const { data, error } = await supabaseServidor
    .from("candidatura")
    .select(
      "pessoa_id, nm_urna, cargo, sg_partido, sg_uf, ano_eleicao, pessoa:pessoa_id(slug, nome_civil)"
    )
    .eq("oculto", false)
    .or(
      `nm_urna.ilike.%${termoLimpo}%,sg_partido.ilike.%${termoLimpo}%,nr_candidato.eq.${termoLimpo}`
    )
    .order("ano_eleicao", { ascending: false })
    .limit(20);

  if (error) throw error;

  const vistos = new Set<string>();
  const resultados: ResultadoBusca[] = [];
  for (const linha of (data ?? []) as unknown as LinhaBusca[]) {
    if (!linha.pessoa || vistos.has(linha.pessoa_id)) continue;
    vistos.add(linha.pessoa_id);
    resultados.push({
      pessoaId: linha.pessoa_id,
      slug: linha.pessoa.slug,
      nome: linha.pessoa.nome_civil,
      cargoMaisRecente: linha.cargo,
      partido: linha.sg_partido,
      uf: linha.sg_uf,
    });
  }
  return resultados;
}
