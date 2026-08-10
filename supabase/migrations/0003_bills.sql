-- Contas mensais: mensalidade/parcelas + histórico de pagamentos
-- Execute este arquivo no Supabase: SQL Editor -> New query -> Run

-- ============ MONTHLY_BILLS ============
-- is_recurring: true = mensalidade (paga todo mês sem acabar)
-- total_months: quantidade de meses (obrigatório quando NÃO for mensalidade)
alter table public.monthly_bills
  add column if not exists is_recurring boolean not null default false;

alter table public.monthly_bills
  add column if not exists total_months integer
  check (total_months is null or total_months >= 1);

-- Contas já existentes eram mensais por natureza
update public.monthly_bills
set is_recurring = true
where is_recurring = false;

-- ============ BILL_PAYMENTS (histórico de pagamentos) ============
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.monthly_bills (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  unique (bill_id, month)
);

create index if not exists bill_payments_bill_id_idx on public.bill_payments (bill_id);
create index if not exists bill_payments_user_id_idx on public.bill_payments (user_id);

alter table public.bill_payments enable row level security;

create policy "CRUD do próprio pagamento"
  on public.bill_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
