-- Melhorias na tela de mensalidades: mês de início + anotações por pagamento
-- Execute este arquivo no Supabase: SQL Editor -> New query -> Run

-- start_month: mês 1 de contas com quantidade de meses (null para mensalidades recorrentes)
alter table public.monthly_bills
  add column if not exists start_month date;

-- description: anotação livre por pagamento (ex.: "paguei com PIX")
alter table public.bill_payments
  add column if not exists description text;
