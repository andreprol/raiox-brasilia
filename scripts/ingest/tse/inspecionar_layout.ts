import AdmZip from "adm-zip";
import iconv from "iconv-lite";

const URL_ZIP =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";

async function main() {
  console.log(`Baixando arquivo do TSE: ${URL_ZIP}`);
  const resposta = await fetch(URL_ZIP);
  if (!resposta.ok) {
    throw new Error(`Falha ao baixar ${URL_ZIP}: HTTP ${resposta.status}`);
  }
  console.log("Download concluído, descompactando...");
  const buffer = Buffer.from(await resposta.arrayBuffer());
  const zip = new AdmZip(buffer);
  const entradas = zip.getEntries();

  console.log("\n=== Arquivos dentro do zip ===");
  for (const entrada of entradas) {
    console.log(`- ${entrada.entryName} (${entrada.header.size} bytes)`);
  }

  const arquivoBrasil = entradas.find((e) => /_BRASIL\.csv$/i.test(e.entryName));
  if (!arquivoBrasil) {
    throw new Error(
      "Não achei um arquivo consolidado *_BRASIL.csv no zip — confira a lista acima e ajuste o filtro deste script."
    );
  }

  console.log(
    `\nArquivo selecionado: ${arquivoBrasil.entryName} (${arquivoBrasil.header.size} bytes)`
  );
  console.log("Decodificando como Latin1...");
  const conteudoUtf8 = iconv.decode(arquivoBrasil.getData(), "latin1");
  const linhas = conteudoUtf8.split(/\r?\n/);

  console.log("\n=== Cabeçalho (nomes de coluna, nessa ordem) ===");
  console.log(linhas[0]);
  console.log("\n=== Primeira linha de dado ===");
  console.log(linhas[1]);

  // Imprimir o número de linhas de dado (aproximado)
  console.log(
    `\nAproximadamente ${linhas.length - 1} linhas de dados no arquivo (incluindo cabeçalho)`
  );
}

main().catch((erro) => {
  console.error("Erro:", erro);
  process.exit(1);
});
