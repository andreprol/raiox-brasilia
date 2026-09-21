import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseServidor } from "./supabase/server";
import { buscarPoliticos } from "./busca";

const SLUG_TESTE = "candidato-teste-busca-9f8e7d";

beforeAll(async () => {
  const { data: pessoa, error } = await supabaseServidor
    .from("pessoa")
    .insert({ slug: SLUG_TESTE, nome_civil: "Candidato Teste Busca" })
    .select("id")
    .single();
  if (error) throw error;

  const { error: erroCandidatura } = await supabaseServidor.from("candidatura").insert({
    pessoa_id: pessoa.id,
    ano_eleicao: 2026,
    turno: 1,
    cargo: "DEPUTADO ESTADUAL",
    sg_uf: "RR",
    nr_candidato: "99999",
    nm_urna: "CANDIDATO TESTE BUSCA",
    sg_partido: "PTB",
    situacao: "AGUARDANDO JULGAMENTO",
    sq_candidato_tse: "999999999999995",
    fonte_url: "https://teste.local",
  });
  if (erroCandidatura) throw erroCandidatura;
});

afterAll(async () => {
  await supabaseServidor.from("candidatura").delete().eq("sq_candidato_tse", "999999999999995");
  await supabaseServidor.from("pessoa").delete().eq("slug", SLUG_TESTE);
});

describe("buscarPoliticos", () => {
  it("encontra por nome parcial, sem repetir a mesma pessoa", async () => {
    const resultados = await buscarPoliticos("Teste Busca");
    const encontrados = resultados.filter((r) => r.slug === SLUG_TESTE);
    expect(encontrados).toHaveLength(1);
  });

  it("retorna vazio para termo muito curto", async () => {
    const resultados = await buscarPoliticos("a");
    expect(resultados).toEqual([]);
  });
});
