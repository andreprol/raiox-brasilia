import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCandidaturaCsv } from "./parse_candidatura";
import { resolverPessoaId } from "./resolver_identidade";
import { supabaseServidor } from "../../../lib/supabase/server";

const URL_ZIP =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";

export interface ResultadoIngestao {
  processados: number;
  falhou: boolean;
}

export async function ingerirCandidaturas2026(
  supabase: SupabaseClient = supabaseServidor
): Promise<ResultadoIngestao> {
  let buffer: Buffer;
  try {
    const resposta = await fetch(URL_ZIP);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    buffer = Buffer.from(await resposta.arrayBuffer());
  } catch (erro) {
    console.error(
      `[ingest_candidatura] Falha ao baixar ${URL_ZIP}: ${erro}. Dado já gravado foi mantido, nada foi alterado.`
    );
    return { processados: 0, falhou: true };
  }

  const zip = new AdmZip(buffer);
  const arquivoBrasil = zip.getEntries().find((e) => /_BRASIL\.csv$/i.test(e.entryName));
  if (!arquivoBrasil) {
    console.error(
      "[ingest_candidatura] Arquivo *_BRASIL.csv não encontrado no zip baixado. Dado já gravado foi mantido, nada foi alterado."
    );
    return { processados: 0, falhou: true };
  }

  const conteudoUtf8 = iconv.decode(arquivoBrasil.getData(), "latin1");
  const candidaturas = parseCandidaturaCsv(conteudoUtf8);

  let processados = 0;
  for (const candidatura of candidaturas) {
    const pessoaId = await resolverPessoaId(supabase, candidatura);
    const { error } = await supabase.from("candidatura").upsert(
      {
        pessoa_id: pessoaId,
        ano_eleicao: candidatura.anoEleicao,
        turno: candidatura.turno,
        cargo: candidatura.cargo,
        sg_uf: candidatura.sgUf,
        nr_candidato: candidatura.nrCandidato,
        nm_urna: candidatura.nmUrna,
        sg_partido: candidatura.sgPartido,
        nm_partido: candidatura.nmPartido,
        situacao: candidatura.situacao,
        sq_candidato_tse: candidatura.sqCandidatoTse,
        fonte_url: URL_ZIP,
        coletado_em: new Date().toISOString(),
      },
      { onConflict: "ano_eleicao,turno,sq_candidato_tse" }
    );
    if (error) {
      console.error(
        `[ingest_candidatura] Falha ao gravar candidatura ${candidatura.sqCandidatoTse}: ${error.message}`
      );
      continue;
    }
    processados += 1;
  }

  return { processados, falhou: false };
}

if (require.main === module) {
  ingerirCandidaturas2026().then((resultado) => {
    console.log(
      `[ingest_candidatura] Concluído: ${resultado.processados} candidatura(s) processada(s).`
    );
    process.exit(resultado.falhou ? 1 : 0);
  });
}
