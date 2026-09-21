import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseServidor } from "./supabase/server";
import { buscarPoliticos } from "./busca";

const SLUG_TESTE = "candidato-teste-busca-9f8e7d";
const SQ_CANDIDATO_TESTE_1 = "999999999999995";
// Segunda candidatura da MESMA pessoa (ano diferente), para que o teste de
// deduplicação exercite de fato o Set `vistos` em busca.ts — com apenas uma
// candidatura, o teste passaria mesmo sem nenhuma lógica de dedup.
const SQ_CANDIDATO_TESTE_2 = "999999999999996";

beforeAll(async () => {
  const { data: pessoa, error } = await supabaseServidor
    .from("pessoa")
    .insert({ slug: SLUG_TESTE, nome_civil: "Candidato Teste Busca" })
    .select("id")
    .single();
  if (error) throw error;

  const { error: erroCandidatura } = await supabaseServidor.from("candidatura").insert([
    {
      pessoa_id: pessoa.id,
      ano_eleicao: 2026,
      turno: 1,
      cargo: "DEPUTADO ESTADUAL",
      sg_uf: "RR",
      nr_candidato: "99999",
      nm_urna: "CANDIDATO TESTE BUSCA",
      sg_partido: "PTB",
      situacao: "AGUARDANDO JULGAMENTO",
      sq_candidato_tse: SQ_CANDIDATO_TESTE_1,
      fonte_url: "https://teste.local",
    },
    {
      pessoa_id: pessoa.id,
      ano_eleicao: 2022,
      turno: 1,
      cargo: "DEPUTADO ESTADUAL",
      sg_uf: "RR",
      nr_candidato: "99999",
      nm_urna: "CANDIDATO TESTE BUSCA",
      sg_partido: "PTB",
      situacao: "ELEITO",
      sq_candidato_tse: SQ_CANDIDATO_TESTE_2,
      fonte_url: "https://teste.local",
    },
  ]);
  if (erroCandidatura) throw erroCandidatura;
});

afterAll(async () => {
  await supabaseServidor
    .from("candidatura")
    .delete()
    .in("sq_candidato_tse", [SQ_CANDIDATO_TESTE_1, SQ_CANDIDATO_TESTE_2]);
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

  it("sanitiza termo com caracteres especiais sem lançar erro e sem tratar '_' como coringa do ilike", async () => {
    // ',' e '(' ')' são metacaracteres do filtro .or() do PostgREST — devem
    // ser removidos sem quebrar a chamada (se não fossem, isto lançaria).
    const resultados = await buscarPoliticos("Teste Busca,()%_");
    expect(Array.isArray(resultados)).toBe(true);

    // '_' é coringa de 1 caractere no ILIKE do Postgres. Sem escapar, o termo
    // "Teste_Busca" bateria com "TESTE BUSCA" (o espaço central contaria como
    // o caractere coringa) — um falso positivo. Com o '_' tratado como
    // literal, não deve encontrar a pessoa de teste (que tem espaço, não
    // underscore, entre "Teste" e "Busca").
    const comCoringaLiteral = await buscarPoliticos("Teste_Busca");
    const encontrados = comCoringaLiteral.filter((r) => r.slug === SLUG_TESTE);
    expect(encontrados).toHaveLength(0);
  });
});
