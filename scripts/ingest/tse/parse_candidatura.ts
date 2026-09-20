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

function limpar(valor: string | undefined): string | null {
  if (valor === undefined) return null;
  const v = valor.trim();
  return VALORES_NULOS.has(v) ? null : v;
}

function converterDataBrParaIso(dataBr: string): string {
  const [dia, mes, ano] = dataBr.split("/");
  return `${ano}-${mes}-${dia}`;
}

export function parseCandidaturaCsv(conteudoUtf8: string): CandidaturaTSE[] {
  const registros: Record<string, string>[] = parse(conteudoUtf8, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
  });

  return registros.map((linha) => {
    const dataNascBr = limpar(linha["DT_NASCIMENTO"]);
    return {
      anoEleicao: Number(linha["ANO_ELEICAO"]),
      turno: Number(linha["NR_TURNO"]),
      cargo: linha["DS_CARGO"],
      sgUf: linha["SG_UF"],
      nrCandidato: linha["NR_CANDIDATO"],
      nmUrna: linha["NM_URNA_CANDIDATO"],
      nmCandidato: linha["NM_CANDIDATO"],
      sgPartido: linha["SG_PARTIDO"],
      nmPartido: linha["NM_PARTIDO"],
      situacao: limpar(linha["DS_SIT_TOT_TURNO"]) ?? "NAO_DIVULGADO",
      sqCandidatoTse: linha["SQ_CANDIDATO"],
      cpf: limpar(linha["NR_CPF_CANDIDATO"]),
      dataNascimento: dataNascBr ? converterDataBrParaIso(dataNascBr) : null,
      sgUfNascimento: limpar(linha["SG_UF_NASCIMENTO"]),
    };
  });
}
