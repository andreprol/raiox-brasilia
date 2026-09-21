import { describe, it, expect } from "vitest";
import { comoLinkSeguro } from "./links";

describe("comoLinkSeguro", () => {
  it("bloqueia esquema javascript:", () => {
    expect(comoLinkSeguro("javascript:alert(1)")).toBeNull();
  });

  it("bloqueia esquema data:", () => {
    expect(comoLinkSeguro("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("permite http(s) mesmo com esquema em caixa alta", () => {
    expect(comoLinkSeguro("HTTP://exemplo.com")).toBe("HTTP://exemplo.com");
  });

  it("bloqueia string que não é uma URL, sem lançar exceção", () => {
    expect(() => comoLinkSeguro("não é uma url")).not.toThrow();
    expect(comoLinkSeguro("não é uma url")).toBeNull();
  });

  it("permite URL https válida", () => {
    expect(comoLinkSeguro("https://tse.jus.br/algo")).toBe("https://tse.jus.br/algo");
  });
});
