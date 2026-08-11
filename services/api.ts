import { supabase } from "@/services/supabase";
import type { BillPayment, Category, CategoryType, MonthlyBill, Profile, Transaction } from "@/services/types";

type TransactionRow = Omit<Transaction, "amount"> & { amount: string | number };
type MonthlyBillRow = Omit<MonthlyBill, "amount"> & { amount: string | number };
type BillPaymentRow = Omit<BillPayment, "amount"> & { amount: string | number };

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function mapTransaction(row: TransactionRow): Transaction {
  return { ...row, amount: toNumber(row.amount) };
}

function mapMonthlyBill(row: MonthlyBillRow): MonthlyBill {
  return { ...row, amount: toNumber(row.amount) };
}

function mapBillPayment(row: BillPaymentRow): BillPayment {
  return { ...row, amount: toNumber(row.amount) };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    return null;
  }
  return data;
}

export async function updateProfileName(userId: string, fullName: string): Promise<string | null> {
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
  return error ? error.message : null;
}

export async function getCategories(type?: CategoryType): Promise<Category[]> {
  let query = supabase.from("categories").select("*").order("name", { ascending: true });
  if (type) {
    query = query.eq("type", type);
  }
  const { data, error } = await query;
  if (error) {
    return [];
  }
  return data;
}

export async function insertCategory(userId: string, input: { name: string; type: CategoryType; icon?: string; color?: string }): Promise<string | null> {
  const { error } = await supabase.from("categories").insert({ ...input, user_id: userId });
  return error ? error.message : null;
}

export async function deleteCategory(id: string): Promise<string | null> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  return error ? error.message : null;
}

export async function getTransactions(from: string, to: string, type?: CategoryType): Promise<Transaction[]> {
  let query = supabase.from("transactions").select("*").gte("date", from).lte("date", to);
  if (type) {
    query = query.eq("type", type);
  }
  query = query.order("date", { ascending: false });
  const { data, error } = await query;
  if (error) {
    return [];
  }
  return data.map(mapTransaction);
}

export async function deleteTransaction(id: string): Promise<string | null> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  return error ? error.message : null;
}

export async function updateTransaction(
  id: string,
  input: { amount: number; description?: string; date: string; category_id?: string | null }
): Promise<string | null> {
  const { error } = await supabase
    .from("transactions")
    .update({
      amount: input.amount,
      description: input.description?.trim() || null,
      date: input.date,
      category_id: input.category_id ?? null,
    })
    .eq("id", id);
  return error ? error.message : null;
}

export async function insertTransaction(
  userId: string,
  input: {
    type: CategoryType;
    amount: number;
    description?: string;
    date: string;
    category_id?: string | null;
  }
): Promise<string | null> {
  const { error } = await supabase.from("transactions").insert({
    ...input,
    user_id: userId,
    description: input.description?.trim() || null,
  });
  return error ? error.message : null;
}

export async function getMonthlyBills(): Promise<MonthlyBill[]> {
  const { data, error } = await supabase.from("monthly_bills").select("*").order("due_day", { ascending: true });
  if (error) {
    return [];
  }
  return data.map(mapMonthlyBill);
}

export async function insertMonthlyBill(
  userId: string,
  input: { name: string; amount: number; due_day: number; is_recurring: boolean; total_months?: number | null; start_month?: string | null }
): Promise<string | null> {
  const { error } = await supabase
    .from("monthly_bills")
    .insert({
      ...input,
      user_id: userId,
      total_months: input.is_recurring ? null : (input.total_months ?? null),
      start_month: input.is_recurring ? null : (input.start_month ?? null),
    });
  return error ? error.message : null;
}

export async function getMonthlyBill(id: string): Promise<MonthlyBill | null> {
  const { data, error } = await supabase.from("monthly_bills").select("*").eq("id", id).single();
  if (error) {
    return null;
  }
  return mapMonthlyBill(data);
}

export async function toggleMonthlyBillActive(id: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from("monthly_bills").update({ active }).eq("id", id);
  return error ? error.message : null;
}

export async function deleteMonthlyBill(id: string): Promise<string | null> {
  const { error } = await supabase.from("monthly_bills").delete().eq("id", id);
  return error ? error.message : null;
}

export async function getBillPayments(billId: string): Promise<BillPayment[]> {
  const { data, error } = await supabase
    .from("bill_payments")
    .select("*")
    .eq("bill_id", billId)
    .order("month", { ascending: false });
  if (error) {
    return [];
  }
  return data.map(mapBillPayment);
}

export async function getAllBillPayments(): Promise<BillPayment[]> {
  const { data, error } = await supabase.from("bill_payments").select("*");
  if (error) {
    return [];
  }
  return data.map(mapBillPayment);
}

export async function getBillPaymentsBetween(from: string, to: string): Promise<BillPayment[]> {
  const { data, error } = await supabase
    .from("bill_payments")
    .select("*")
    .gte("month", from)
    .lte("month", to)
    .order("month", { ascending: false });
  if (error) {
    return [];
  }
  return data.map(mapBillPayment);
}

export async function markBillPaid(
  userId: string,
  input: { bill_id: string; month: string; amount: number; description?: string | null }
): Promise<string | null> {
  const { error } = await supabase.from("bill_payments").insert({ ...input, user_id: userId });
  return error ? error.message : null;
}

export async function updateBillPaymentDescription(billId: string, month: string, description: string | null): Promise<string | null> {
  const { error } = await supabase
    .from("bill_payments")
    .update({ description: description?.trim() || null })
    .eq("bill_id", billId)
    .eq("month", month);
  return error ? error.message : null;
}

export async function undoBillPayment(billId: string, month: string): Promise<string | null> {
  const { error } = await supabase.from("bill_payments").delete().eq("bill_id", billId).eq("month", month);
  return error ? error.message : null;
}
