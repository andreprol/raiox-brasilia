import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingerirCandidaturas2026 } from "./ingest_candidatura";

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
});
