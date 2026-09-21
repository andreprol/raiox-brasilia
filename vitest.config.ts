import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    resolve: {
      // Fora de um build Next.js real (que define a condição de resolução
      // "react-server"), o `index.js` do pacote `server-only` lança erro
      // incondicionalmente — ele não sabe que o ambiente de teste é
      // confiável. Adicionamos a mesma condição aqui, só dentro do Vitest,
      // pra resolver pro `empty.js` (no-op) que o próprio pacote já expõe
      // para builds de servidor; o build real do Next.js (produção) não usa
      // essa config e continua protegido normalmente.
      conditions: ["react-server"],
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
