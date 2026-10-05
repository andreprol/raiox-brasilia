import { supabaseServidor } from "./supabase/server";

export interface FichaPolitico {
  nome: string;
  dataNascimento: string | null;
  ufNascimento: string | null;
  candidaturas: {
    anoEleicao: number;
    turno: number;
    cargo: string;
    sgUf: string;
    nrCandidato: string;
    sgPartido: string;
    nmPartido: string;
    situacao: string;
    fonteUrl: string;
    coletadoEm: string;
  }[];
}

export async function buscarFicha(slug: string): Promise<FichaPolitico | null> {
  const { data: pessoa, error: erroPessoa } = await supabaseServidor
    .from("pessoa")
    .select("id, nome_civil, data_nascimento, sg_uf_nascimento")
    .eq("slug", slug)
    .eq("oculto", false)
    .maybeSingle();
  if (erroPessoa) throw erroPessoa;
  if (!pessoa) return null;

  const { data: candidaturas, error: erroCandidaturas } = await supabaseServidor
    .from("candidatura")
    .select(
      "ano_eleicao, turno, cargo, sg_uf, nr_candidato, sg_partido, nm_partido, situacao, fonte_url, coletado_em"
    )
    .eq("pessoa_id", pessoa.id)
    .eq("oculto", false)
    .order("ano_eleicao", { ascending: false })
    .order("turno", { ascending: true });
  if (erroCandidaturas) throw erroCandidaturas;

  return {
    nome: pessoa.nome_civil,
    dataNascimento: pessoa.data_nascimento,
    ufNascimento: pessoa.sg_uf_nascimento,
    candidaturas: (candidaturas ?? []).map((c) => ({
      anoEleicao: c.ano_eleicao,
      turno: c.turno,
      cargo: c.cargo,
      sgUf: c.sg_uf,
      nrCandidato: c.nr_candidato,
      sgPartido: c.sg_partido,
      nmPartido: c.nm_partido ?? c.sg_partido,
      situacao: c.situacao ?? "Não divulgada",
      fonteUrl: c.fonte_url,
      coletadoEm: c.coletado_em,
    })),
  };
}
