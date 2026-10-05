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

describe("buscarPoliticos — relevância por cargo e partido", () => {
  const PARTIDO_TESTE = "ZPT9XTESTE";
  const SLUG_PRESIDENTE = "candidato-teste-prioridade-presidente-4d3c2b";
  const SLUG_DEPUTADO = "candidato-teste-prioridade-deputado-1a9f8e";
  const SLUG_OUTRO_PARTIDO = "candidato-teste-prioridade-outro-partido-7e6d5c";
  const SLUG_CARGO_SEM_NIVEL = "candidato-teste-prioridade-cargo-sem-nivel-2f1e0d";
  const SQ_PRESIDENTE = "999999999999991";
  const SQ_DEPUTADO = "999999999999990";
  const SQ_OUTRO_PARTIDO = "999999999999988";
  const SQ_CARGO_SEM_NIVEL = "999999999999987";

  beforeAll(async () => {
    const { data: pessoas, error: erroPessoas } = await supabaseServidor
      .from("pessoa")
      .insert([
        { slug: SLUG_PRESIDENTE, nome_civil: "Zelote Teste Prioridade" },
        { slug: SLUG_DEPUTADO, nome_civil: "Alberto Teste Prioridade" },
        { slug: SLUG_OUTRO_PARTIDO, nome_civil: "Outro Partido Teste" },
        { slug: SLUG_CARGO_SEM_NIVEL, nome_civil: "Candidato Cargo Sem Nivel" },
      ])
      .select("id, slug");
    if (erroPessoas) throw erroPessoas;
    const idPorSlug = new Map(pessoas!.map((p) => [p.slug, p.id]));

    const { error: erroCandidaturas } = await supabaseServidor.from("candidatura").insert([
      {
        // Nome começa com "Z" (viria por último em ordem alfabética), mas é
        // PRESIDENTE — deve aparecer antes do deputado abaixo mesmo assim.
        pessoa_id: idPorSlug.get(SLUG_PRESIDENTE),
        ano_eleicao: 2026,
        turno: 1,
        cargo: "PRESIDENTE",
        sg_uf: "BR",
        nr_candidato: "77771",
        nm_urna: "ZELOTE TESTE PRIORIDADE",
        sg_partido: PARTIDO_TESTE,
        situacao: "NAO_DIVULGADO",
        sq_candidato_tse: SQ_PRESIDENTE,
        fonte_url: "https://teste.local",
      },
      {
        // Nome começa com "A" (viria primeiro em ordem alfabética); cargo de
        // menor relevância — deve aparecer depois do presidente acima.
        pessoa_id: idPorSlug.get(SLUG_DEPUTADO),
        ano_eleicao: 2026,
        turno: 1,
        cargo: "DEPUTADO ESTADUAL",
        sg_uf: "RR",
        nr_candidato: "77772",
        nm_urna: "ALBERTO TESTE PRIORIDADE",
        sg_partido: PARTIDO_TESTE,
        situacao: "NAO_DIVULGADO",
        sq_candidato_tse: SQ_DEPUTADO,
        fonte_url: "https://teste.local",
      },
      {
        // Sigla que CONTÉM o termo buscado como substring ("PTB" contém
        // "PT"), mas não é igual a ele — com o match de partido tratado como
        // igualdade exata, não deve aparecer na busca por "PT".
        pessoa_id: idPorSlug.get(SLUG_OUTRO_PARTIDO),
        ano_eleicao: 2026,
        turno: 1,
        cargo: "DEPUTADO ESTADUAL",
        sg_uf: "RR",
        nr_candidato: "77773",
        nm_urna: "CANDIDATO PARTIDO SUBSTRING XYZ123",
        sg_partido: "PTB",
        situacao: "NAO_DIVULGADO",
        sq_candidato_tse: SQ_OUTRO_PARTIDO,
        fonte_url: "https://teste.local",
      },
      {
        // Cargo fora de NIVEIS_CARGO (ex.: ciclo municipal futuro) — cobre o
        // nível de segurança (`consultarNivel(null)`), que não tinha teste.
        pessoa_id: idPorSlug.get(SLUG_CARGO_SEM_NIVEL),
        ano_eleicao: 2026,
        turno: 1,
        cargo: "PREFEITO",
        sg_uf: "RR",
        nr_candidato: "77774",
        nm_urna: "CANDIDATO CARGO SEM NIVEL",
        sg_partido: PARTIDO_TESTE,
        situacao: "NAO_DIVULGADO",
        sq_candidato_tse: SQ_CARGO_SEM_NIVEL,
        fonte_url: "https://teste.local",
      },
    ]);
    if (erroCandidaturas) throw erroCandidaturas;
  });

  afterAll(async () => {
    await supabaseServidor
      .from("candidatura")
      .delete()
      .in("sq_candidato_tse", [SQ_PRESIDENTE, SQ_DEPUTADO, SQ_OUTRO_PARTIDO, SQ_CARGO_SEM_NIVEL]);
    await supabaseServidor
      .from("pessoa")
      .delete()
      .in("slug", [SLUG_PRESIDENTE, SLUG_DEPUTADO, SLUG_OUTRO_PARTIDO, SLUG_CARGO_SEM_NIVEL]);
  });

  it("prioriza cargo de maior relevância (presidente) sobre ordem alfabética dentro do mesmo partido", async () => {
    const resultados = await buscarPoliticos(PARTIDO_TESTE);
    const indicePresidente = resultados.findIndex((r) => r.slug === SLUG_PRESIDENTE);
    const indiceDeputado = resultados.findIndex((r) => r.slug === SLUG_DEPUTADO);
    expect(indicePresidente).toBeGreaterThanOrEqual(0);
    expect(indiceDeputado).toBeGreaterThanOrEqual(0);
    expect(indicePresidente).toBeLessThan(indiceDeputado);
  });

  it("busca por partido casa só igualdade exata, não substring (PTB não aparece buscando 'PT')", async () => {
    const resultados = await buscarPoliticos("PT");
    const encontrados = resultados.filter((r) => r.slug === SLUG_OUTRO_PARTIDO);
    expect(encontrados).toHaveLength(0);
  });

  it("nível de segurança encontra cargo fora da lista priorizada (ex.: ciclo municipal)", async () => {
    const resultados = await buscarPoliticos(PARTIDO_TESTE);
    const encontrado = resultados.find((r) => r.slug === SLUG_CARGO_SEM_NIVEL);
    expect(encontrado).toBeDefined();
    expect(encontrado?.cargoMaisRecente).toBe("PREFEITO");
  });
});

describe("buscarPoliticos — paginação dentro de um nível populoso", () => {
  // Reproduz o cenário real encontrado em revisão: um partido grande tem
  // mais de 200 candidaturas a um mesmo cargo (ex.: PL teve 963 a deputado
  // estadual em 2026). Uma única página de 200 linhas, ordenada
  // alfabeticamente, nunca chegaria a buscar do banco um candidato cujo
  // nome vem depois — mesmo problema do Lula, só que contido a um nível.
  // Aqui simulamos isso com 1 pessoa "decoy" respondendo por 200 linhas (uma
  // página inteira) e 1 pessoa "agulha" cujo nome só aparece na página 2.
  const PARTIDO_TESTE = "ZPAGTESTE1";
  const SLUG_DECOY = "candidato-teste-paginacao-decoy-9c8b7a";
  const SLUG_AGULHA = "candidato-teste-paginacao-agulha-6f5e4d";
  const QUANTIDADE_DECOY = 200;
  const SQS_DECOY = Array.from({ length: QUANTIDADE_DECOY }, (_, i) => `99999998${String(i).padStart(4, "0")}`);
  const SQ_AGULHA = "999999979999";

  beforeAll(async () => {
    const { data: pessoas, error: erroPessoas } = await supabaseServidor
      .from("pessoa")
      .insert([
        { slug: SLUG_DECOY, nome_civil: "Decoy Teste Paginacao" },
        { slug: SLUG_AGULHA, nome_civil: "Zzzagulha Teste Paginacao" },
      ])
      .select("id, slug");
    if (erroPessoas) throw erroPessoas;
    const idPorSlug = new Map(pessoas!.map((p) => [p.slug, p.id]));
    const idDecoy = idPorSlug.get(SLUG_DECOY);
    const idAgulha = idPorSlug.get(SLUG_AGULHA);

    // 200 candidaturas da MESMA pessoa decoy — preenchem a página 1 inteira
    // (ordenada por nm_urna, "AAA..." vem antes de "ZZZ...") sem nunca
    // avançar `resultados` além de 1 item (são todas a mesma pessoa), o que
    // força o paginador a buscar a página 2 pra atingir LIMITE_RESULTADOS.
    const linhasDecoy = SQS_DECOY.map((sq) => ({
      pessoa_id: idDecoy,
      ano_eleicao: 2026,
      turno: 1,
      cargo: "1º SUPLENTE",
      sg_uf: "RR",
      nr_candidato: "77775",
      nm_urna: "AAA DECOY PAGINACAO",
      sg_partido: PARTIDO_TESTE,
      situacao: "NAO_DIVULGADO",
      sq_candidato_tse: sq,
      fonte_url: "https://teste.local",
    }));
    const { error: erroDecoy } = await supabaseServidor.from("candidatura").insert(linhasDecoy);
    if (erroDecoy) throw erroDecoy;

    const { error: erroAgulha } = await supabaseServidor.from("candidatura").insert({
      pessoa_id: idAgulha,
      ano_eleicao: 2026,
      turno: 1,
      cargo: "1º SUPLENTE",
      sg_uf: "RR",
      nr_candidato: "77776",
      nm_urna: "ZZZAGULHA TESTE PAGINACAO",
      sg_partido: PARTIDO_TESTE,
      situacao: "NAO_DIVULGADO",
      sq_candidato_tse: SQ_AGULHA,
      fonte_url: "https://teste.local",
    });
    if (erroAgulha) throw erroAgulha;
  });

  afterAll(async () => {
    await supabaseServidor
      .from("candidatura")
      .delete()
      .in("sq_candidato_tse", [...SQS_DECOY, SQ_AGULHA]);
    await supabaseServidor.from("pessoa").delete().in("slug", [SLUG_DECOY, SLUG_AGULHA]);
  });

  it("não para na primeira página — encontra candidato cujo nome só aparece além da linha 200", async () => {
    const resultados = await buscarPoliticos(PARTIDO_TESTE);
    const encontrado = resultados.find((r) => r.slug === SLUG_AGULHA);
    expect(encontrado).toBeDefined();
  });
});
