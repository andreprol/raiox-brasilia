create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table pessoa (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome_civil text not null,
  data_nascimento date,
  sg_uf_nascimento text,
  nm_municipio_nascimento text,
  cpf text unique,
  oculto_por_ordem_judicial text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index pessoa_nome_trgm_idx on pessoa using gin (nome_civil gin_trgm_ops);

create table candidatura (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references pessoa(id) on delete cascade,
  ano_eleicao integer not null,
  turno integer not null,
  cargo text not null,
  sg_uf text not null,
  nr_candidato text not null,
  nm_urna text not null,
  sg_partido text not null,
  nm_partido text,
  situacao text,
  sq_candidato_tse text not null,
  oculto_por_ordem_judicial text,
  fonte_url text not null,
  coletado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  unique (ano_eleicao, turno, sq_candidato_tse)
);

create index candidatura_pessoa_idx on candidatura (pessoa_id);
create index candidatura_busca_idx on candidatura using gin (nm_urna gin_trgm_ops);
