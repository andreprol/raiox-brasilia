import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseServidor } from "./supabase/server";
import { buscarFicha } from "./ficha";

const SLUG_TESTE = "candidato-teste-ficha-3a2b1c";

beforeAll(async () => {
  const { data: pessoa, error } = await supabaseServidor
    .from("pessoa")
    .insert({
      slug: SLUG_TESTE,
      nome_civil: "Candidato Teste Ficha",
      data_nascimento: "1980-05-20",
      sg_uf_nascimento: "RR",
    })
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
    nm_partido: "Partido Trabalhista Brasileiro",
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
    expect(ficha?.dataNascimento).toBe("1980-05-20");
    expect(ficha?.ufNascimento).toBe("RR");
    expect(ficha?.candidaturas).toHaveLength(1);
    expect(ficha?.candidaturas[0].cargo).toBe("SENADOR");
    expect(ficha?.candidaturas[0].turno).toBe(1);
    expect(ficha?.candidaturas[0].nrCandidato).toBe("88888");
    expect(ficha?.candidaturas[0].nmPartido).toBe("Partido Trabalhista Brasileiro");
    expect(ficha?.candidaturas[0].fonteUrl).toBe("https://teste.local");
  });

  it("retorna null para slug inexistente", async () => {
    const ficha = await buscarFicha("nao-existe-999999");
    expect(ficha).toBeNull();
  });
});

// A coluna `oculto` (pessoa e candidatura) existe para atender decisão
// judicial de ocultação. A Task 7 (busca.ts) já teve um bug real onde
// `pessoa.oculto` não era checado — estes testes garantem que buscarFicha()
// não regrida nos dois pontos onde filtra por `oculto=false`
// (lib/ficha.ts: busca da pessoa e busca das candidaturas).
describe("buscarFicha — visibilidade (oculto)", () => {
  const SLUG_PESSOA_OCULTA = "candidato-teste-ficha-pessoa-oculta-7d6c5b";
  const SQ_CANDIDATO_PESSOA_OCULTA = "999999999999993";

  const SLUG_CANDIDATURA_OCULTA = "candidato-teste-ficha-cand-oculta-1a2b3c";
  const SQ_CANDIDATO_OCULTO = "999999999999992";
  const SQ_CANDIDATO_VISIVEL = "999999999999989";

  beforeAll(async () => {
    const { data: pessoaOculta, error: erroPessoaOculta } = await supabaseServidor
      .from("pessoa")
      .insert({ slug: SLUG_PESSOA_OCULTA, nome_civil: "Pessoa Oculta Teste", oculto: true })
      .select("id")
      .single();
    if (erroPessoaOculta) throw erroPessoaOculta;

    const { error: erroCandidaturaDaPessoaOculta } = await supabaseServidor
      .from("candidatura")
      .insert({
        pessoa_id: pessoaOculta.id,
        ano_eleicao: 2026,
        turno: 1,
        cargo: "SENADOR",
        sg_uf: "RR",
        nr_candidato: "88887",
        nm_urna: "PESSOA OCULTA TESTE",
        sg_partido: "PTB",
        situacao: "ELEITO",
        sq_candidato_tse: SQ_CANDIDATO_PESSOA_OCULTA,
        fonte_url: "https://teste.local",
      });
    if (erroCandidaturaDaPessoaOculta) throw erroCandidaturaDaPessoaOculta;

    const { data: pessoaVisivel, error: erroPessoaVisivel } = await supabaseServidor
      .from("pessoa")
      .insert({ slug: SLUG_CANDIDATURA_OCULTA, nome_civil: "Pessoa Com Candidatura Oculta" })
      .select("id")
      .single();
    if (erroPessoaVisivel) throw erroPessoaVisivel;

    const { error: erroCandidaturasMistas } = await supabaseServidor.from("candidatura").insert([
      {
        pessoa_id: pessoaVisivel.id,
        ano_eleicao: 2026,
        turno: 1,
        cargo: "SENADOR",
        sg_uf: "RR",
        nr_candidato: "88886",
        nm_urna: "PESSOA COM CANDIDATURA OCULTA",
        sg_partido: "PTB",
        situacao: "ELEITO",
        sq_candidato_tse: SQ_CANDIDATO_OCULTO,
        fonte_url: "https://teste.local",
        oculto: true,
      },
      {
        pessoa_id: pessoaVisivel.id,
        ano_eleicao: 2022,
        turno: 1,
        cargo: "DEPUTADO ESTADUAL",
        sg_uf: "RR",
        nr_candidato: "88886",
        nm_urna: "PESSOA COM CANDIDATURA OCULTA",
        sg_partido: "PTB",
        situacao: "NAO ELEITO",
        sq_candidato_tse: SQ_CANDIDATO_VISIVEL,
        fonte_url: "https://teste.local",
        // Explícito (em vez de deixar a coluna de fora) porque este insert é
        // em lote junto com uma linha que tem `oculto: true` — o PostgREST
        // monta a lista de colunas pela união das chaves do array, e a linha
        // que "não tem" a chave recebe NULL explícito na coluna em vez de
        // cair no `default false` da tabela, o que violaria o NOT NULL.
        oculto: false,
      },
    ]);
    if (erroCandidaturasMistas) throw erroCandidaturasMistas;
  });

  afterAll(async () => {
    await supabaseServidor
      .from("candidatura")
      .delete()
      .in("sq_candidato_tse", [
        SQ_CANDIDATO_PESSOA_OCULTA,
        SQ_CANDIDATO_OCULTO,
        SQ_CANDIDATO_VISIVEL,
      ]);
    await supabaseServidor
      .from("pessoa")
      .delete()
      .in("slug", [SLUG_PESSOA_OCULTA, SLUG_CANDIDATURA_OCULTA]);
  });

  it("retorna null quando a própria pessoa está oculta, mesmo com candidatura visível", async () => {
    const ficha = await buscarFicha(SLUG_PESSOA_OCULTA);
    expect(ficha).toBeNull();
  });

  it("omite candidatura oculta mas mantém as demais de uma pessoa visível", async () => {
    const ficha = await buscarFicha(SLUG_CANDIDATURA_OCULTA);
    expect(ficha?.nome).toBe("Pessoa Com Candidatura Oculta");
    expect(ficha?.candidaturas).toHaveLength(1);
    expect(ficha?.candidaturas[0].cargo).toBe("DEPUTADO ESTADUAL");
    // Esta fixture não preenche nm_partido — cobre o fallback pra sigla.
    expect(ficha?.candidaturas[0].nmPartido).toBe("PTB");
  });
});
