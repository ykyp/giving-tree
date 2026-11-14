-- An ornament made for a friend carries the design its maker chose. Optional: links made earlier have none.
-- Design: specs/005-simpler-flow/plan.md (D4)
alter table sent_wishes add column if not exists design smallint check (design between 0 and 7);
