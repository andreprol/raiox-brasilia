import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseServidor } from "./supabase/server";
import { buscarFicha } from "./ficha";

const SLUG_TESTE = "candidato-teste-ficha-3a2b1c";

beforeAll(async () => {
  const { data: pessoa, error } = await supabaseServidor
    .from("pessoa")
    .insert({ slug: SLUG_TESTE, nome_civil: "Candidato Teste Ficha" })
    .select("id")
    .single();
  if (error) throw error;

  const { error: erroCandidatura } = await supabaseServidor.from("candidatura").insert({
    pessoa_id: pessoa.id,
    ano_eleicao: 2026,
    turno: 1,
    cargo: "SENADOR",
    sg_uf: "RR",
    nr_candidato: "88888",
    nm_urna: "CANDIDATO TESTE FICHA",
    sg_partido: "PTB",
    situacao: "ELEITO",
    sq_candidato_tse: "999999999999994",
    fonte_url: "https://teste.local",
  });
  if (erroCandidatura) throw erroCandidatura;
});

afterAll(async () => {
  await supabaseServidor.from("candidatura").delete().eq("sq_candidato_tse", "999999999999994");
  await supabaseServidor.from("pessoa").delete().eq("slug", SLUG_TESTE);
});

describe("buscarFicha", () => {
  it("retorna pessoa e suas candidaturas", async () => {
    const ficha = await buscarFicha(SLUG_TESTE);
    expect(ficha?.nome).toBe("Candidato Teste Ficha");
    expect(ficha?.candidaturas).toHaveLength(1);
    expect(ficha?.candidaturas[0].cargo).toBe("SENADOR");
    expect(ficha?.candidaturas[0].fonteUrl).toBe("https://teste.local");
  });

  it("retorna null para slug inexistente", async () => {
    const ficha = await buscarFicha("nao-existe-999999");
    expect(ficha).toBeNull();
  });
});
