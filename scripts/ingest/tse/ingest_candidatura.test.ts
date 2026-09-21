import { describe, it, expect, vi, beforeEach } from "vitest";
import AdmZip from "adm-zip";
import { ingerirCandidaturas2026 } from "./ingest_candidatura";

function mockRespostaFetchOk(buffer: Buffer): Response {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  } as unknown as Response;
}

const CABECALHO_CSV =
  "ANO_ELEICAO;NR_TURNO;DS_CARGO;SG_UF;NR_CANDIDATO;NM_URNA_CANDIDATO;NM_CANDIDATO;SG_PARTIDO;NM_PARTIDO;DS_SIT_TOT_TURNO;SQ_CANDIDATO;NR_CPF_CANDIDATO;DT_NASCIMENTO;SG_UF_NASCIMENTO";

const LINHA_CANDIDATO_1 =
  "2026;1;GOVERNADOR;RR;10;MARIA TESTE;MARIA DA SILVA TESTE;PARTIDO X;PARTIDO EXEMPLO;#NULO#;111111111111111;12345678900;15/03/1975;RR";

const LINHA_CANDIDATO_2 =
  "2026;1;SENADOR;SP;20;JOAO TESTE;JOAO DA SILVA TESTE;PARTIDO Y;PARTIDO EXEMPLO 2;#NULO#;222222222222222;98765432100;20/07/1980;SP";

function criarZipComCsvBrasil(linhas: string[]): Buffer {
  const zip = new AdmZip();
  const csv = [CABECALHO_CSV, ...linhas].join("\n");
  zip.addFile("consulta_cand_2026_BRASIL.csv", Buffer.from(csv, "utf-8"));
  return zip.toBuffer();
}

// Builder de `pessoa` que responde a qualquer encadeamento usado por
// resolverPessoaId (select/eq encadeados, insert->select->single) sem
// depender da ordem exata das chamadas — sempre "não encontrou match
// existente" nas buscas e "inseriu com sucesso" no insert final.
function criarPessoaQueryBuilderFalso(pessoaId: string) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  builder.single = vi.fn(async () => ({ data: { id: pessoaId }, error: null }));
  return builder;
}

function criarSupabaseFalso(opcoes: { upsertError?: { message: string } | null } = {}) {
  let contadorPessoa = 0;
  const upsertMock = vi.fn(async () => ({ error: opcoes.upsertError ?? null }));
  const from = vi.fn((tabela: string) => {
    if (tabela === "pessoa") {
      contadorPessoa += 1;
      return criarPessoaQueryBuilderFalso(`pessoa-fake-${contadorPessoa}`);
    }
    if (tabela === "candidatura") {
      return { upsert: upsertMock };
    }
    throw new Error(`tabela inesperada no mock de teste: ${tabela}`);
  });
  return { from, upsertMock } as any;
}

describe("ingerirCandidaturas2026 — fonte indisponível", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("não grava nada e não derruba o processo quando o download do TSE falha", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 503 } as Response);
    const supabaseFalso = { from: vi.fn() } as any;

    const resultado = await ingerirCandidaturas2026(supabaseFalso);

    expect(resultado.falhou).toBe(true);
    expect(resultado.processados).toBe(0);
    expect(supabaseFalso.from).not.toHaveBeenCalled();
  });

  it("não grava nada e não derruba o processo quando o zip baixado não é um zip válido", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      mockRespostaFetchOk(Buffer.from("isso não é um zip, é uma página de erro HTML"))
    );
    const supabaseFalso = { from: vi.fn() } as any;

    const resultado = await ingerirCandidaturas2026(supabaseFalso);

    expect(resultado.falhou).toBe(true);
    expect(resultado.processados).toBe(0);
    expect(supabaseFalso.from).not.toHaveBeenCalled();
  });

  it("não grava nada e não derruba o processo quando o zip não contém arquivo *_BRASIL.csv", async () => {
    const zip = new AdmZip();
    zip.addFile("consulta_cand_2026_AC.csv", Buffer.from("conteudo irrelevante"));
    vi.spyOn(global, "fetch").mockResolvedValue(mockRespostaFetchOk(zip.toBuffer()));
    const supabaseFalso = { from: vi.fn() } as any;

    const resultado = await ingerirCandidaturas2026(supabaseFalso);

    expect(resultado.falhou).toBe(true);
    expect(resultado.processados).toBe(0);
    expect(supabaseFalso.from).not.toHaveBeenCalled();
  });

  it("não grava nada e não derruba o processo quando o CSV do TSE vem malformado", async () => {
    // ANO_ELEICAO não numérico — parseCandidaturaCsv lança exceção síncrona.
    const linhaComAnoInvalido = LINHA_CANDIDATO_1.replace("2026;1;", "ABC;1;");
    vi.spyOn(global, "fetch").mockResolvedValue(
      mockRespostaFetchOk(criarZipComCsvBrasil([linhaComAnoInvalido]))
    );
    const supabaseFalso = { from: vi.fn() } as any;

    const resultado = await ingerirCandidaturas2026(supabaseFalso);

    expect(resultado.falhou).toBe(true);
    expect(resultado.processados).toBe(0);
    expect(supabaseFalso.from).not.toHaveBeenCalled();
  });
});

describe("ingerirCandidaturas2026 — loop principal (resolução de pessoa + upsert)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("caminho feliz: grava todas as candidaturas quando pessoa e candidatura são gravadas com sucesso", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      mockRespostaFetchOk(criarZipComCsvBrasil([LINHA_CANDIDATO_1, LINHA_CANDIDATO_2]))
    );
    const supabaseFalso = criarSupabaseFalso();

    const resultado = await ingerirCandidaturas2026(supabaseFalso);

    expect(resultado.processados).toBe(2);
    expect(resultado.comErro).toBe(0);
    expect(resultado.falhou).toBe(false);
    expect(supabaseFalso.upsertMock).toHaveBeenCalledTimes(2);
  });

  it("marca falhou=true quando todas as candidaturas falham ao gravar (upsert)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      mockRespostaFetchOk(criarZipComCsvBrasil([LINHA_CANDIDATO_1, LINHA_CANDIDATO_2]))
    );
    const supabaseFalso = criarSupabaseFalso({
      upsertError: { message: "column \"sq_candidato_tse\" does not exist" },
    });

    const resultado = await ingerirCandidaturas2026(supabaseFalso);

    expect(resultado.processados).toBe(0);
    expect(resultado.comErro).toBe(2);
    expect(resultado.falhou).toBe(true);
  });
});
