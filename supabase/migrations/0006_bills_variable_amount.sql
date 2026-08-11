-- Valor variável: o valor configurado é uma média; o valor pago real é informado ao marcar o pagamento
-- Execute este arquivo no Supabase: SQL Editor -> New query -> Run

alter table public.monthly_bills
  add column if not exists has_variable_amount boolean not null default false;
