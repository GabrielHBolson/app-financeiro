import type { BillPayment, MonthlyBill } from "@/services/types";

export type BillOccurrence = {
  installment: number | null;
  totalMonths: number | null;
};

export type BillMonthSummary = {
  expectedCount: number;
  expectedTotal: number;
  paidCount: number;
  paidTotal: number;
  pendingCount: number;
  pendingTotal: number;
};

export function getBillOccurrence(bill: MonthlyBill, month: Date): BillOccurrence | null {
  if (bill.is_recurring) {
    return { installment: null, totalMonths: null };
  }
  const start = bill.start_month ? new Date(`${bill.start_month}T12:00:00`) : new Date(bill.created_at);
  const diff = (month.getFullYear() - start.getFullYear()) * 12 + (month.getMonth() - start.getMonth());
  if (diff < 0 || diff >= (bill.total_months ?? 0)) {
    return null;
  }
  return { installment: diff + 1, totalMonths: bill.total_months };
}

export function buildMonthWindow(count: number, from = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(from.getFullYear(), from.getMonth() - i, 1));
}

export function summarizeBillsForMonth(bills: MonthlyBill[], payments: BillPayment[], month: Date): BillMonthSummary {
  const paidByBill = new Map(payments.map((p) => [p.bill_id, p]));
  const summary: BillMonthSummary = {
    expectedCount: 0,
    expectedTotal: 0,
    paidCount: 0,
    paidTotal: 0,
    pendingCount: 0,
    pendingTotal: 0,
  };
  for (const bill of bills) {
    if (!bill.active || !getBillOccurrence(bill, month)) {
      continue;
    }
    const payment = paidByBill.get(bill.id);
    summary.expectedCount += 1;
    summary.expectedTotal += bill.amount;
    if (payment) {
      summary.paidCount += 1;
      summary.paidTotal += payment.amount;
    } else {
      summary.pendingCount += 1;
      summary.pendingTotal += bill.amount;
    }
  }
  return summary;
}
