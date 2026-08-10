-- Investimentos: transações e categorias passam a aceitar o tipo 'investment'
-- Execute este arquivo no Supabase: SQL Editor -> New query -> Run

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense', 'investment'));

alter table public.categories
  drop constraint if exists categories_type_check;

alter table public.categories
  add constraint categories_type_check
  check (type in ('income', 'expense', 'investment'));

-- Categoria padrão "Investimentos" para usuários existentes
insert into public.categories (user_id, name, type, icon)
select id, 'Investimentos', 'investment', '📈'
from auth.users
where id not in (
  select user_id from public.categories
  where type = 'investment' and name = 'Investimentos'
);
