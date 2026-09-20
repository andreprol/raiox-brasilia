import { describe, it, expect } from "vitest";
import { parseCandidaturaCsv } from "./parse_candidatura";

const CABECALHO =
  "ANO_ELEICAO;NR_TURNO;DS_CARGO;SG_UF;NR_CANDIDATO;NM_URNA_CANDIDATO;NM_CANDIDATO;SG_PARTIDO;NM_PARTIDO;DS_SIT_TOT_TURNO;SQ_CANDIDATO;NR_CPF_CANDIDATO;DT_NASCIMENTO;SG_UF_NASCIMENTO";

const LINHA_EXEMPLO =
  "2026;1;GOVERNADOR;RR;10;MARIA TESTE;MARIA DA SILVA TESTE;PARTIDO X;PARTIDO EXEMPLO;#NULO#;123456789012345;12345678900;15/03/1975;RR";

describe("parseCandidaturaCsv", () => {
  it("converte uma linha de candidatura corretamente", () => {
    const [registro] = parseCandidaturaCsv(`${CABECALHO}\n${LINHA_EXEMPLO}`);

    expect(registro.anoEleicao).toBe(2026);
    expect(registro.turno).toBe(1);
    expect(registro.cargo).toBe("GOVERNADOR");
    expect(registro.sgUf).toBe("RR");
    expect(registro.nmUrna).toBe("MARIA TESTE");
    expect(registro.cpf).toBe("12345678900");
    expect(registro.dataNascimento).toBe("1975-03-15");
    expect(registro.situacao).toBe("NAO_DIVULGADO");
  });

  it("trata CPF marcado como #NULO# como null", () => {
    const linhaSemCpf = LINHA_EXEMPLO.replace("12345678900", "#NULO#");
    const [registro] = parseCandidaturaCsv(`${CABECALHO}\n${linhaSemCpf}`);
    expect(registro.cpf).toBeNull();
  });

  it("lança erro se ANO_ELEICAO não for numérico", () => {
    const linhaAnoInvalido = LINHA_EXEMPLO.replace("2026", "ABC");
    expect(() => {
      parseCandidaturaCsv(`${CABECALHO}\n${linhaAnoInvalido}`);
    }).toThrow(/Campo ANO_ELEICAO não é um número válido/);
  });

  it("lança erro se NR_TURNO não for numérico", () => {
    const linhaTurnoInvalido = LINHA_EXEMPLO.replace("2026;1;", "2026;XYZ;");
    expect(() => {
      parseCandidaturaCsv(`${CABECALHO}\n${linhaTurnoInvalido}`);
    }).toThrow(/Campo NR_TURNO não é um número válido/);
  });

  it("lança erro se coluna obrigatória estiver faltando", () => {
    const cabecalhoIncompleto =
      "ANO_ELEICAO;NR_TURNO;DS_CARGO;SG_UF;NR_CANDIDATO;NM_URNA_CANDIDATO;NM_CANDIDATO;SG_PARTIDO;NM_PARTIDO;SQ_CANDIDATO;NR_CPF_CANDIDATO;DT_NASCIMENTO;SG_UF_NASCIMENTO";
    // Removeu DS_SIT_TOT_TURNO — criar linha de dados com mesma quantidade de colunas
    const linhaIncompleta =
      "2026;1;GOVERNADOR;RR;10;MARIA TESTE;MARIA DA SILVA TESTE;PARTIDO X;PARTIDO EXEMPLO;123456789012345;12345678900;15/03/1975;RR";
    expect(() => {
      parseCandidaturaCsv(`${cabecalhoIncompleto}\n${linhaIncompleta}`);
    }).toThrow(/Colunas esperadas ausentes no CSV do TSE/);
  });

  it("converte data com zero-padding correto", () => {
    const linhaDataCurta = LINHA_EXEMPLO.replace("15/03/1975", "5/3/1975");
    const [registro] = parseCandidaturaCsv(`${CABECALHO}\n${linhaDataCurta}`);
    expect(registro.dataNascimento).toBe("1975-03-05");
  });
});
