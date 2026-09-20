import { describe, it, expect, afterEach } from "vitest";
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

afterEach(async () => {
  await supabaseServidor.from("pessoa").delete().eq("cpf", CPF_TESTE);
  await supabaseServidor
    .from("pessoa")
    .delete()
    .eq("nome_civil", "MARIA DA SILVA TESTE")
    .is("cpf", null);
});

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
});
