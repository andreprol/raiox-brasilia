import { supabaseServidor } from "./supabase/server";

export interface FichaPolitico {
  nome: string;
  candidaturas: {
    anoEleicao: number;
    cargo: string;
    sgUf: string;
    sgPartido: string;
    situacao: string;
    fonteUrl: string;
    coletadoEm: string;
  }[];
}

export async function buscarFicha(slug: string): Promise<FichaPolitico | null> {
  const { data: pessoa, error: erroPessoa } = await supabaseServidor
    .from("pessoa")
    .select("id, nome_civil")
    .eq("slug", slug)
    .eq("oculto", false)
    .maybeSingle();
  if (erroPessoa) throw erroPessoa;
  if (!pessoa) return null;

  const { data: candidaturas, error: erroCandidaturas } = await supabaseServidor
    .from("candidatura")
    .select("ano_eleicao, cargo, sg_uf, sg_partido, situacao, fonte_url, coletado_em")
    .eq("pessoa_id", pessoa.id)
    .eq("oculto", false)
    .order("ano_eleicao", { ascending: false });
  if (erroCandidaturas) throw erroCandidaturas;

  return {
    nome: pessoa.nome_civil,
    candidaturas: (candidaturas ?? []).map((c) => ({
      anoEleicao: c.ano_eleicao,
      cargo: c.cargo,
      sgUf: c.sg_uf,
      sgPartido: c.sg_partido,
      situacao: c.situacao ?? "Não divulgada",
      fonteUrl: c.fonte_url,
      coletadoEm: c.coletado_em,
    })),
  };
}
