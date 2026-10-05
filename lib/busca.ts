import { supabaseServidor } from "./supabase/server";

export interface ResultadoBusca {
  pessoaId: string;
  slug: string;
  nome: string;
  cargoMaisRecente: string;
  partido: string;
  uf: string;
}

interface LinhaBusca {
  id: string;
  pessoa_id: string;
  nm_urna: string;
  cargo: string;
  sg_partido: string;
  sg_uf: string;
  pessoa: { slug: string; nome_civil: string; oculto: boolean } | null;
}

const LIMITE_RESULTADOS = 20;
const TAMANHO_PAGINA = 200;
// Teto de linhas varridas por nível, mesmo paginando. Partidos grandes têm
// uma única combinação cargo+partido com até ~1000 candidaturas (ex.: PL a
// deputado estadual em 2026) — 10 páginas cobre isso com folga. Sem teto, um
// termo muito genérico (ex. nome comum de 2 letras) casando em todos os
// cargos poderia paginar indefinidamente antes de desistir de um nível.
const MAX_LINHAS_POR_NIVEL = TAMANHO_PAGINA * 10;
const TAMANHO_MAX_TERMO = 100;

// Ordem de relevância pública dos cargos. Toda a base hoje é de um único
// ciclo eleitoral (2026): uma busca ampla (ex: sigla de partido) pode casar
// milhares de candidaturas a deputado estadual. Sem priorizar por cargo, o
// corte alfabético do lote bruto excluía candidatos de cargos mais
// relevantes — ex.: buscar "PT" não trazia Lula (único candidato a
// presidente do partido) porque "LULA" vem depois de ~580 outros nomes em
// ordem alfabética dentro do mesmo partido. Cada nível só é consultado se os
// anteriores não preencherem o limite de resultados.
const NIVEIS_CARGO: string[][] = [
  ["PRESIDENTE", "VICE-PRESIDENTE"],
  ["GOVERNADOR", "VICE-GOVERNADOR"],
  ["SENADOR"],
  ["DEPUTADO FEDERAL", "DEPUTADO DISTRITAL"],
  ["DEPUTADO ESTADUAL"],
  ["1º SUPLENTE", "2º SUPLENTE"],
];
// Nível de segurança: cargo que não bateu em nenhum nível acima (ex.: um
// rótulo novo do TSE em ciclo futuro) ainda assim é buscado, só que por
// último — nunca fica de fora da busca por causa de um valor não mapeado.
const CARGOS_COM_NIVEL = NIVEIS_CARGO.flat();
const FILTRO_CARGOS_SEM_NIVEL = `(${CARGOS_COM_NIVEL.map((c) => `"${c}"`).join(",")})`;

export async function buscarPoliticos(termo: string): Promise<ResultadoBusca[]> {
  const termoLimpo = termo.trim();
  if (termoLimpo.length < 2) return [];

  // PostgREST usa `,` para separar condições e `()` para agrupá-las dentro do
  // filtro `.or()`. Sem sanitizar, um termo com esses caracteres alteraria a
  // estrutura lógica do filtro em vez de ser tratado como texto de busca.
  const termoSeguro = termoLimpo.replace(/[,()]/g, "").trim().slice(0, TAMANHO_MAX_TERMO);
  if (termoSeguro.length < 2) return [];

  // `%` e `_` são coringas do ILIKE do Postgres (qualquer sequência e um
  // único caractere, respectivamente). Sem escapar, um termo como "silva_"
  // faria o `_` virar coringa em vez de caractere literal, alargando o match
  // além do esperado. A ordem importa: escapar a própria barra invertida
  // primeiro, senão as barras adicionadas pelos passos seguintes seriam
  // escapadas de novo.
  const termoEscapado = termoSeguro
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  // `sg_partido` é sigla de um conjunto fechado (os partidos oficiais do
  // TSE) — tratamos como igualdade exata (ILIKE sem `%`, só pra manter
  // case-insensitive), não substring. Com `%...%` o termo "PT" também
  // casaria qualquer partido cujo nome completo contivesse "PT".
  const filtro = `nm_urna.ilike.%${termoEscapado}%,sg_partido.ilike.${termoEscapado},nr_candidato.eq.${termoSeguro}`;

  const vistos = new Set<string>();
  const resultados: ResultadoBusca[] = [];

  function acumular(linhas: LinhaBusca[]): void {
    for (const linha of linhas) {
      if (!linha.pessoa || linha.pessoa.oculto || vistos.has(linha.pessoa_id)) continue;
      vistos.add(linha.pessoa_id);
      resultados.push({
        pessoaId: linha.pessoa_id,
        slug: linha.pessoa.slug,
        nome: linha.pessoa.nome_civil,
        cargoMaisRecente: linha.cargo,
        partido: linha.sg_partido,
        uf: linha.sg_uf,
      });
      if (resultados.length === LIMITE_RESULTADOS) return;
    }
  }

  // Pagina dentro do nível em vez de um único LIMIT fixo: um nível populoso
  // (ex.: "DEPUTADO ESTADUAL" de um partido grande, 900+ linhas) com um
  // único corte de página sofreria a mesma exclusão alfabética que motivou
  // esta função (o candidato relevante nunca chega a ser buscado do banco).
  // Acumula resultado a cada página e para assim que: a página encher
  // LIMITE_RESULTADOS (não busca páginas a mais à toa — importante pra um
  // termo que já bate muitas linhas na primeira página), o nível esgotar
  // (página incompleta), ou o teto de segurança ser atingido.
  async function consultarNivel(cargos: string[] | null): Promise<void> {
    for (let pagina = 0; pagina * TAMANHO_PAGINA < MAX_LINHAS_POR_NIVEL; pagina += 1) {
      const inicio = pagina * TAMANHO_PAGINA;
      let query = supabaseServidor
        .from("candidatura")
        .select(
          "id, pessoa_id, nm_urna, cargo, sg_partido, sg_uf, ano_eleicao, pessoa:pessoa_id(slug, nome_civil, oculto)"
        )
        .eq("oculto", false)
        .or(filtro)
        .order("ano_eleicao", { ascending: false })
        .order("nm_urna", { ascending: true })
        // Critério de desempate determinístico: sem uma coluna única no
        // `order`, a ordem relativa de linhas com mesmo ano+nm_urna não é
        // garantida entre uma página e outra, podendo pular ou repetir
        // candidatos na paginação.
        .order("id", { ascending: true })
        .range(inicio, inicio + TAMANHO_PAGINA - 1);
      query = cargos ? query.in("cargo", cargos) : query.not("cargo", "in", FILTRO_CARGOS_SEM_NIVEL);

      const { data, error } = await query;
      if (error) throw error;

      const linhasPagina = (data ?? []) as unknown as LinhaBusca[];
      acumular(linhasPagina);
      if (resultados.length >= LIMITE_RESULTADOS) return;
      if (linhasPagina.length < TAMANHO_PAGINA) return;
    }
  }

  for (const cargos of NIVEIS_CARGO) {
    if (resultados.length >= LIMITE_RESULTADOS) break;
    await consultarNivel(cargos);
  }
  if (resultados.length < LIMITE_RESULTADOS) {
    await consultarNivel(null);
  }

  return resultados;
}
