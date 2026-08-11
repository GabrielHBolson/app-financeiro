export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function monthStartISO(date = new Date()): string {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = first.getTimezoneOffset();
  return new Date(first.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function monthEndISO(date = new Date()): string {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const offset = last.getTimezoneOffset();
  return new Date(last.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function currentMonthLabel(date = new Date()): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatPaidAt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
