import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { BillPayment, MonthlyBill } from "@/services/types";
import { formatCurrency, monthStartISO } from "@/utils/format";

const CHANNEL_ID = "contas";
const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function billReminderIdentifier(billId: string): string {
  return `bill-reminder-${billId}`;
}

function dueDateForMonth(year: number, monthIndex: number, dueDay: number): Date {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(dueDay, daysInMonth), REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
}

export function computeNextDueDate(bill: MonthlyBill, paidMonths: Set<string>): Date | null {
  const now = new Date();
  const paidCount = paidMonths.size;
  if (!bill.active) {
    return null;
  }
  if (!bill.is_recurring && bill.total_months != null && paidCount >= bill.total_months) {
    return null;
  }
  const startMonth = bill.is_recurring ? null : new Date(`${bill.start_month}T12:00:00`);
  for (let i = 0; i < 24; i++) {
    const base = new Date(now.getFullYear(), now.getMonth() + i, 1);
    if (startMonth && base.getTime() < startMonth.getTime()) {
      continue;
    }
    const due = dueDateForMonth(base.getFullYear(), base.getMonth(), bill.due_day);
    const monthKey = monthStartISO(base);
    if (due.getTime() <= now.getTime()) {
      continue;
    }
    if (paidMonths.has(monthKey)) {
      continue;
    }
    if (!bill.is_recurring && bill.total_months != null && paidCount >= bill.total_months) {
      return null;
    }
    return due;
  }
  return null;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Lembretes de contas",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function notificationPermissionGranted(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    return current.granted;
  } catch {
    return false;
  }
}

export async function scheduleBillReminder(bill: MonthlyBill, due: Date): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: billReminderIdentifier(bill.id),
      content: {
        title: `Conta vence hoje: ${bill.name}`,
        body: `${bill.name} — ${formatCurrency(bill.amount)} vence hoje.`,
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
        data: { billId: bill.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due },
    });
  } catch {
    // notificações indisponíveis (sem permissão ou módulo) — ignora
  }
}

export async function cancelBillReminder(billId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(billReminderIdentifier(billId));
  } catch {
    // ignora
  }
}

function buildPaidMap(payments: BillPayment[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const p of payments) {
    const set = map.get(p.bill_id) ?? new Set<string>();
    set.add(p.month);
    map.set(p.bill_id, set);
  }
  return map;
}

export async function syncBillReminders(bills: MonthlyBill[], payments: BillPayment[]): Promise<void> {
  const granted = await notificationPermissionGranted();
  if (!granted) {
    return;
  }
  try {
    const paidMap = buildPaidMap(payments);
    const activeIds = new Set(bills.filter((b) => b.active).map((b) => b.id));
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const s of scheduled) {
      if (s.identifier.startsWith("bill-reminder-")) {
        const billId = s.identifier.replace("bill-reminder-", "");
        if (!activeIds.has(billId)) {
          await Notifications.cancelScheduledNotificationAsync(s.identifier);
        }
      }
    }
    for (const bill of bills) {
      if (!bill.active) {
        continue;
      }
      const due = computeNextDueDate(bill, paidMap.get(bill.id) ?? new Set());
      if (due) {
        await scheduleBillReminder(bill, due);
      } else {
        await cancelBillReminder(bill.id);
      }
    }
  } catch {
    // ignora
  }
}
