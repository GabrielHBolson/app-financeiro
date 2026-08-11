-- Performance: consultas mensais de pagamentos (tela de Contas, Gastos e Dashboard)
-- Execute este arquivo no Supabase: SQL Editor -> New query -> Run

create index if not exists bill_payments_user_month_idx
  on public.bill_payments (user_id, month);
