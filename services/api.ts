import { supabase } from "@/services/supabase";
import type { Category, CategoryType, MonthlyBill, Profile, Transaction } from "@/services/types";

type TransactionRow = Omit<Transaction, "amount"> & { amount: string | number };
type MonthlyBillRow = Omit<MonthlyBill, "amount"> & { amount: string | number };

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function mapTransaction(row: TransactionRow): Transaction {
  return { ...row, amount: toNumber(row.amount) };
}

function mapMonthlyBill(row: MonthlyBillRow): MonthlyBill {
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

export async function insertCategory(input: { name: string; type: CategoryType; icon?: string; color?: string }): Promise<string | null> {
  const { error } = await supabase.from("categories").insert(input);
  return error ? error.message : null;
}

export async function deleteCategory(id: string): Promise<string | null> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  return error ? error.message : null;
}

export async function getTransactions(from: string, to: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });
  if (error) {
    return [];
  }
  return data.map(mapTransaction);
}

export async function getRecentTransactions(limit = 10): Promise<Transaction[]> {
  const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false }).limit(limit);
  if (error) {
    return [];
  }
  return data.map(mapTransaction);
}

export async function insertTransaction(input: {
  type: CategoryType;
  amount: number;
  description?: string;
  date: string;
  category_id?: string | null;
}): Promise<string | null> {
  const { error } = await supabase.from("transactions").insert({
    ...input,
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

export async function insertMonthlyBill(input: { name: string; amount: number; due_day: number }): Promise<string | null> {
  const { error } = await supabase.from("monthly_bills").insert(input);
  return error ? error.message : null;
}

export async function toggleMonthlyBillActive(id: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from("monthly_bills").update({ active }).eq("id", id);
  return error ? error.message : null;
}

export async function deleteMonthlyBill(id: string): Promise<string | null> {
  const { error } = await supabase.from("monthly_bills").delete().eq("id", id);
  return error ? error.message : null;
}
