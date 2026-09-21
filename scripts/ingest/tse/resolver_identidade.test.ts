import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { supabaseServidor } from "../../../lib/supabase/server";
import { resolverPessoaId } from "./resolver_identidade";
import type { CandidaturaTSE } from "./parse_candidatura";

const CPF_TESTE = "00000000191";

function candidaturaExemplo(sobrescreve: Partial<CandidaturaTSE> = {}): CandidaturaTSE {
  return {
    anoEleicao: 2026,
    turno: 1,
    cargo: "GOVERNADOR",
    sgUf: "RR",
    nrCandidato: "10",
    nmUrna: "MARIA TESTE",
    nmCandidato: "MARIA DA SILVA TESTE",
    sgPartido: "PX",
    nmPartido: "PARTIDO EXEMPLO",
    situacao: "ELEITO",
    sqCandidatoTse: "999999999999997",
    cpf: null,
    dataNascimento: "1975-03-15",
    sgUfNascimento: "RR",
    ...sobrescreve,
  };
}

async function limparPessoasDeTeste(): Promise<void> {
  await supabaseServidor.from("pessoa").delete().eq("cpf", CPF_TESTE);
  await supabaseServidor
    .from("pessoa")
    .delete()
    .eq("nome_civil", "MARIA DA SILVA TESTE")
    .is("cpf", null);
}

// Protege contra resíduo de uma execução anterior que quebrou no meio (antes
// do afterEach rodar) e poderia fazer um teste "passar" por engano ao
// reaproveitar uma pessoa que já existia antes da chamada.
beforeEach(limparPessoasDeTeste);
afterEach(limparPessoasDeTeste);

describe("resolverPessoaId", () => {
  it("cria pessoa nova na primeira chamada e reaproveita na segunda, pelo CPF", async () => {
    const candidatura = candidaturaExemplo({ cpf: CPF_TESTE });

    const primeiroId = await resolverPessoaId(supabaseServidor, candidatura);
    const segundoId = await resolverPessoaId(supabaseServidor, candidatura);

    expect(segundoId).toBe(primeiroId);
  });

  it("sem CPF, reaproveita pessoa por nome + data de nascimento", async () => {
    const candidatura = candidaturaExemplo({ cpf: null });

    const primeiroId = await resolverPessoaId(supabaseServidor, candidatura);
    const segundoId = await resolverPessoaId(
      supabaseServidor,
      candidaturaExemplo({ cpf: null, sqCandidatoTse: "999999999999996" })
    );

    expect(segundoId).toBe(primeiroId);
  });

  it("mesmo nome + data de nascimento mas UF de nascimento diferente resolve para pessoas diferentes (evita colisão de homônimo)", async () => {
    const candidaturaRR = candidaturaExemplo({
      cpf: null,
      sgUfNascimento: "RR",
      sqCandidatoTse: "999999999999995",
    });
    const candidaturaSP = candidaturaExemplo({
      cpf: null,
      sgUfNascimento: "SP",
      sqCandidatoTse: "999999999999994",
    });

    const idRR = await resolverPessoaId(supabaseServidor, candidaturaRR);
    const idSP = await resolverPessoaId(supabaseServidor, candidaturaSP);

    expect(idRR).not.toBe(idSP);
  });
});
