# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# App Financeiro ("Finanças")

App mobile de finanças pessoais (Android/iOS), interface em português (pt-BR) e moeda BRL.

## Stack

- Expo SDK 57 + React Native 0.86 + TypeScript (React 19.2)
- Expo Router (file-based routing) — `main: "expo-router/entry"`
- Supabase (auth + Postgres com Row Level Security)
- `@react-native-community/datetimepicker`, `expo-local-authentication`, `expo-notifications`, `expo-secure-store`

## Rotas (app/)

- `(auth)/login`, `(auth)/register` — autenticação por e-mail/senha (Supabase), com confirmação de e-mail
- `(tabs)/` — 6 abas:
  - `index` Dashboard: seletor de mês, saldo do mês = recebidos − gastos − contas pagas − investidos, cards de estatísticas (grade 2×2), resumo de contas do mês, lançamentos do mês
  - `expense` Gastos — `TransactionManager` com seção "Contas do mês" (`showBills`); `income` Recebidos, `investments` Investimentos — `TransactionManager` sem contas
  - `bills` Contas mensais: orientado pelo mês, criar recorrentes ou com prazo (parcelas), marcar pago do mês, ativar/pausar, excluir
  - `profile` Perfil: editar nome, toggle de biometria, CRUD de categorias, sair da conta
- `bill/[id]` — detalhe de uma conta: histórico (recorrentes) ou parcelas (contas com prazo), marcar/desfazer pagamento, anotação por pagamento

## Funcionalidades

- **Auth:** sessão persistida em SecureStore, redirect automático entre `(auth)` e `(tabs)`.
- **Biometria:** desbloqueio opcional (expo-local-authentication); flag por dispositivo em SecureStore; prompt oferecido após o cadastro; toggle no Perfil. `BiometricGate` bloqueia o app na abertura.
- **Transações:** CRUD de receita/despesa/investimento com valor, data, descrição e categoria; filtro por mês.
- **Categorias:** CRUD por tipo com ícone emoji; categorias padrão criadas automaticamente no cadastro (trigger `handle_new_user`).
- **Contas mensais:** `monthly_bills` é apenas a **configuração** da conta (recorrente, todo mês sem fim, ou parcelada com `total_months` + `start_month`; dia de vencimento 1–31; `active`). O pagamento de cada mês é um registro separado em `bill_payments` (um por mês, unique `(bill_id, month)`), com valor, `paid_at` e anotação próprios. Conta não paga **não** é descontada do saldo.
- **Notificações:** lembrete de vencimento às 09:00 do dia de vencimento (`syncBillReminders`), resincronizadas ao abrir o app e a cada mudança de contas/pagamentos. Parceladas não geram lembrete antes do `start_month`.
- **Dashboard:** `balance = income − expense − billsPaid − invested`, onde `billsPaid` é a soma dos `bill_payments` do mês selecionado (não a soma das contas cadastradas).

## Telas (comportamento detalhado)

### `(auth)/login`
- Campos: E-mail, Senha (com toggle mostrar/ocultar). Validação: e-mail e senha preenchidos; erro exibido em texto.
- Botão "Entrar" com loading; erros da API exibidos em texto vermelho.
- Link "Cadastre-se" → `(auth)/register`. Layout centralizado com `KeyboardAvoidingView`.
- Sucesso → redirect automático para `/` (tratado no layout raiz, não na tela).

### `(auth)/register`
- Campos: Nome, E-mail, Senha (mín. 6 caracteres), Confirmar senha.
- Validações: todos preenchidos, senhas coincidem, senha ≥ 6 caracteres.
- Após sucesso: se `needsEmailConfirmation` mostra aviso "Confirme seu e-mail"; senão `router.replace("/")` e dispara prompt de biometria (`useBiometricPrompt`).
- Link "Entrar" → `(auth)/login`.

### `(tabs)/index` Dashboard
- Saudação "Olá, {primeiro nome}!" (parte do nome do perfil) + subtítulo com mês atual.
- `MonthPicker`: setas ‹/› para navegar meses; badge "Atual" (sem ação) ou "Hoje" (volta ao mês atual).
- Card azul "Saldo do mês" = recebidos − gastos − contas pagas − investidos; texto vermelho claro se negativo.
- 4 cards de estatísticas do mês em grade 2×2: Recebido (verde, `arrow-up-circle`), Gasto (vermelho, `arrow-down-circle`), Contas pagas (azul, `receipt-outline`), Investido (azul, `trending-up`).
- Card "Contas do mês": "{n} de {m} pagas · R$ pagos de R$ total" (somente contas ativas com ocorrência no mês; `paidTotal` vem dos `bill_payments`).
- Lista "Lançamentos do mês": descrição (ou "Sem descrição"), data dd/mm/aaaa, valor com "+" (verde) ou "−" (vermelho) ou "−" (azul) conforme tipo.
- Estado vazio: "Nenhum lançamento neste mês." Pull-to-refresh (`RefreshControl`).
- Dados carregados em `useFocusEffect`: `getProfile`, `getTransactions(monthStartISO, monthEndISO)`, `getMonthlyBills`, `getBillPaymentsBetween(monthStartISO, monthEndISO)`.

### `(tabs)/expense` Gastos · `(tabs)/income` Recebidos · `(tabs)/investments` Investimentos
- Telas finas que apenas renderizam `TransactionManager` com `type` ("expense" | "income" | "investment") e `title` ("Gasto" | "Recebido" | "Investimento"); somente Gastos passa `showBills`.
- `TransactionManager`:
  - `MonthPicker` + card azul "Total de {tipo}s no mês" (soma do mês filtrado).
  - Botão "+ Novo {tipo}" alterna abertura do `TransactionForm` (ghost "Fechar formulário" quando aberto).
  - `TransactionForm`: valor (R$, decimal-pad), data (`DateTimePicker`, inline no iOS), descrição, categoria por chips ("Sem categoria" + categorias do tipo), resumo "Total" ao vivo, botão Salvar.
  - Lista "Lançamentos do mês": descrição, data, valor; lápis edita (`TransactionForm` em modo edição), lixeira exclui com `Alert` de confirmação.
  - Dados em `useFocusEffect` via `getTransactions(mês, tipo)`.
  - Edição atualiza `amount`, `description`, `date`, `category_id`; inserção inclui `type`.
  - Com `showBills` (apenas Gastos): seção "Contas do mês" com resumo "{n} de {m} pagas · R$ pagos" e lista das contas ativas do mês via `BillPaymentRow`; o check marca/desfaz o pagamento do mês selecionado (`markBillPaid`/`undoBillPayment`) e resincroniza lembretes. O total de gastos NÃO inclui contas (evita dupla contagem).

### `(tabs)/bills` Contas mensais
- Orientada pelo mês: `MonthPicker` no topo; a navegação de mês permite ver qualquer mês (inclusive futuros, para pré-pagamento) e o histórico é sempre por mês.
- Card azul "Contas do mês": "{pago} de {total} pagas" + blocos "Pago" (verde) e "Pendente" (vermelho).
- Botão "+ Nova conta mensal" alterna o formulário:
  - Nome, Valor (R$), Dia de vencimento (1–31, number-pad).
  - Switch "Mensalidade": ligado = recorrente (paga todo mês, sem fim); desligado = exibe "Quantidade de meses" + "Mês de início" (`MonthPicker`).
  - Validações: nome, valor > 0, dia 1–31; parcelas exigem meses ≥ 1.
  - Ao salvar: pede permissão de notificação (`ensureNotificationPermission`) e resincroniza lembretes (`refresh` → `syncBillReminders`).
- Lista do mês (FlatList): apenas contas **ativas** com ocorrência no mês (recorrentes = todos os meses; parceladas = entre `start_month` e `start_month + total_months − 1` via `getBillOccurrence`), ordenadas por `due_day`.
- Cada linha usa `BillPaymentRow`: nome, "Dia {n} · valor", "Parcela {n}/{total}" quando parcelada, estado "Pago em dd/mm" (verde) ou "Pendente"; tap na linha → `bill/[id]`.
- Check (círculo) marca/desmarca o pagamento do **mês selecionado** (`monthStartISO(month)`); `Switch` ativa/pausa (`toggleMonthlyBillActive`); lixeira exclui com `Alert`.
- Contas inativas são escondidas da lista mensal e não contam nos totais.
- Estado vazio: "Nenhuma conta neste mês."

### `bill/[id]` Detalhe da conta
- Header com nome da conta (Stack header).
- Card resumo azul: nome, valor, "Vence todo dia {n}", "{total} meses · x/y pagas" (prazo) ou "Mensalidade" (recorrente); badge amarelo "Conta pausada" se inativa.
- Conta com prazo (`is_recurring=false`): lista "Parcelas" gerada de `start_month`/`created_at` + `total_months` via `addMonths`; cada linha "Parcela {n}/{total}" + mês, valor e check.
- Conta recorrente: lista "Histórico" dos últimos 12 meses (`buildMonthWindow(12)`, do mês atual para trás), cada linha com mês, estado "Pago em dd/mm" ou "Não pago", valor e check. Meses futuros são pagos via navegação de mês na tela de Contas.
- Linha paga: valor verde, check preenchido; linha mostra `TextInput` de anotação ("paguei com PIX...").
- Toggle do check: se já pago → `undoBillPayment`; senão → `markBillPaid` (valor = `bill.amount`).
- Anotação salva no `onEndEditing` → `updateBillPaymentDescription`.
- Recarrega ao entrar (`getMonthlyBill` + `getBillPayments`) e após cada ação; resincroniza lembretes (`syncBillReminders`).

### `(tabs)/profile` Perfil
- Header com avatar (ícone pessoa), nome (`profile.full_name` ou "Usuário") e e-mail.
- Card "Nome": mostra valor + link "Editar" → vira `TextField` + botão "Salvar" (`updateProfileName`).
- Card "Desbloqueio com biometria": `Switch`; se ativar sem hardware/enrolamento → `Alert` "Seu aparelho não tem biometria..."; muda flag em SecureStore (`setBiometricEnabled`).
- Seção "Categorias":
  - Segmento Gastos/Recebidos/Investimentos (filtra o tipo novo).
  - Campo "Nome da categoria" + "Ícone (emoji, opcional)" + botão "Adicionar categoria" (`insertCategory`).
  - Lista: ícone (ou "•"), nome, tipo colorido (Gasto vermelho / Recebido verde / Investimento azul), lixeira com `Alert`.
- Botão "Sair da conta" (`signOut`, ghost).
- Dados em `useFocusEffect`: `getProfile`, `isBiometricEnabled`, `canUseBiometrics`, `getCategories`.

## Modelo de dados (Supabase)

Tabelas (migrações em `supabase/migrations/`):

- `profiles` — `id` (FK `auth.users`), `full_name`
- `categories` — `user_id`, `name`, `type` (`income` | `expense` | `investment`), `icon`, `color`
- `transactions` — `user_id`, `category_id`, `type`, `amount` (> 0), `description`, `date`
- `monthly_bills` — `user_id`, `name`, `amount`, `due_day` (1–31), `is_recurring`, `total_months`, `start_month`, `active`
- `bill_payments` — `bill_id`, `user_id`, `month`, `amount`, `description`, `paid_at`; unique `(bill_id, month)`; índice `bill_payments_user_month_idx (user_id, month)` (migração `0005`) para as consultas mensais

Todas com RLS baseado em `auth.uid() = user_id`.

Tipos TS correspondentes em `services/types.ts`.

## Convenções de código

- UI no `components/ui.tsx`: paleta `colors` (primary `#208AEF`), `Screen`, `TextField`, `Button`.
- Helpers de moeda/data no `utils/format.ts` (`formatCurrency`, `parseAmount`, `monthStartISO`, `monthEndISO`, `addMonths`, `currentMonthLabel`, `formatDate`, `formatPaidAt`, `toISODate`).
- Regras de contas em `utils/bills.ts`: `getBillOccurrence` (ocorrência de uma conta num mês; `installment`/`totalMonths` para parceladas), `buildMonthWindow` (meses do histórico) e `summarizeBillsForMonth` (totais de contas esperadas/pagas/pendentes do mês, considerando apenas contas ativas com ocorrência).
- Componente de linha de conta `components/bill-payment-row.tsx` (`BillPaymentRow`), compartilhado entre Contas e Gastos.
- Acesso a dados via `services/api.ts` (supabase client em `services/supabase.ts`); pagamentos do mês via `getBillPaymentsBetween(from, to)`.
- Notificações em `services/notifications.ts`; biometria em `utils/biometrics.ts`.
- Auth via `hooks/use-auth.tsx` (`useAuth`); prompt biométrico via `hooks/biometric-prompt.tsx`.
- Textos de UI em pt-BR; valores monetários em BRL.
- Não adicionar comentários ao código, salvo se solicitado.

## Comandos

- `npm start` — dev
- `npm run android` / `npm run ios` — build nativo local
- `npm run lint` — `expo lint`
- `npm run typecheck` — `tsc --noEmit`
- `npm run web` — Expo web

Após alterações, rodar `npm run lint` e `npm run typecheck`.
