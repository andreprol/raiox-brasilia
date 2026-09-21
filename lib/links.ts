// `fonte_url` (candidatura) vem do pipeline de ingestão do TSE e não tem
// validação de formato no banco (é `NOT NULL`, mas nada garante o esquema).
// Renderizar direto como `href` permitiria, em tese, um valor
// `javascript:`/`data:` virar link clicável (XSS armazenado). Só tratamos
// como link de verdade quando é uma URL http(s) válida; qualquer outra
// coisa (esquema não permitido, ou string que nem é uma URL) é "insegura".
export function comoLinkSeguro(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
