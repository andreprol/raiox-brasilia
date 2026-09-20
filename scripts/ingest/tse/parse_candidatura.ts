import { parse } from "csv-parse/sync";

export interface CandidaturaTSE {
  anoEleicao: number;
  turno: number;
  cargo: string;
  sgUf: string;
  nrCandidato: string;
  nmUrna: string;
  nmCandidato: string;
  sgPartido: string;
  nmPartido: string;
  situacao: string;
  sqCandidatoTse: string;
  cpf: string | null;
  dataNascimento: string | null;
  sgUfNascimento: string | null;
}

const VALORES_NULOS = new Set(["#NULO#", "#NULO", "", "-1", "-3"]);

const COLUNAS_OBRIGATORIAS = [
  "ANO_ELEICAO",
  "NR_TURNO",
  "DS_CARGO",
  "SG_UF",
  "NR_CANDIDATO",
  "NM_URNA_CANDIDATO",
  "NM_CANDIDATO",
  "SG_PARTIDO",
  "NM_PARTIDO",
  "DS_SIT_TOT_TURNO",
  "SQ_CANDIDATO",
  "NR_CPF_CANDIDATO",
  "DT_NASCIMENTO",
  "SG_UF_NASCIMENTO",
];

function converterInteiro(nomeCampo: string, valor: string | undefined): number {
  const numero = Number(valor);
  if (Number.isNaN(numero)) {
    throw new Error(`Campo ${nomeCampo} não é um número válido: "${valor}"`);
  }
  return numero;
}

function validarColunas(colunasPresentes: string[]): void {
  const faltando = COLUNAS_OBRIGATORIAS.filter(
    (c) => !colunasPresentes.includes(c)
  );
  if (faltando.length > 0) {
    throw new Error(
      `Colunas esperadas ausentes no CSV do TSE: ${faltando.join(", ")}`
    );
  }
}

function limpar(valor: string | undefined): string | null {
  if (valor === undefined) return null;
  const v = valor.trim();
  return VALORES_NULOS.has(v) ? null : v;
}

function converterDataBrParaIso(dataBr: string): string {
  const [dia, mes, ano] = dataBr.split("/");
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

export function parseCandidaturaCsv(conteudoUtf8: string): CandidaturaTSE[] {
  const registros: Record<string, string>[] = parse(conteudoUtf8, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
  });

  // Validar colunas apenas se houver registros
  if (registros.length > 0) {
    validarColunas(Object.keys(registros[0]));
  }

  return registros.map((linha) => {
    const dataNascBr = limpar(linha["DT_NASCIMENTO"]);
    return {
      anoEleicao: converterInteiro("ANO_ELEICAO", linha["ANO_ELEICAO"]),
      turno: converterInteiro("NR_TURNO", linha["NR_TURNO"]),
      cargo: linha["DS_CARGO"].trim(),
      sgUf: linha["SG_UF"].trim(),
      nrCandidato: linha["NR_CANDIDATO"].trim(),
      nmUrna: linha["NM_URNA_CANDIDATO"].trim(),
      nmCandidato: linha["NM_CANDIDATO"].trim(),
      sgPartido: linha["SG_PARTIDO"].trim(),
      nmPartido: linha["NM_PARTIDO"].trim(),
      situacao: limpar(linha["DS_SIT_TOT_TURNO"]) ?? "NAO_DIVULGADO",
      sqCandidatoTse: linha["SQ_CANDIDATO"].trim(),
      cpf: limpar(linha["NR_CPF_CANDIDATO"]),
      dataNascimento: dataNascBr ? converterDataBrParaIso(dataNascBr) : null,
      sgUfNascimento: limpar(linha["SG_UF_NASCIMENTO"]),
    };
  });
}
