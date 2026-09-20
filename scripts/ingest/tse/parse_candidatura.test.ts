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
});
