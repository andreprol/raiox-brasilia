import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidaturaTSE } from "./parse_candidatura";

function gerarSlug(nomeCandidato: string): string {
  const base = nomeCandidato
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const sufixo = randomBytes(3).toString("hex");
  return `${base}-${sufixo}`;
}

export async function resolverPessoaId(
  supabase: SupabaseClient,
  candidatura: CandidaturaTSE
): Promise<string> {
  if (candidatura.cpf) {
    const { data, error } = await supabase
      .from("pessoa")
      .select("id")
      .eq("cpf", candidatura.cpf)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }

  if (candidatura.dataNascimento) {
    const { data, error } = await supabase
      .from("pessoa")
      .select("id")
      .eq("nome_civil", candidatura.nmCandidato)
      .eq("data_nascimento", candidatura.dataNascimento)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }

  const { data, error } = await supabase
    .from("pessoa")
    .insert({
      slug: gerarSlug(candidatura.nmCandidato),
      nome_civil: candidatura.nmCandidato,
      data_nascimento: candidatura.dataNascimento,
      sg_uf_nascimento: candidatura.sgUfNascimento,
      cpf: candidatura.cpf,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
