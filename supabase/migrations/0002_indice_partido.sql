create index candidatura_partido_trgm_idx on candidatura using gin (sg_partido gin_trgm_ops);
