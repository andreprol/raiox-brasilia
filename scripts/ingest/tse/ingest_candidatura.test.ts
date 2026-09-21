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
});
