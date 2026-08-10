export type CategoryType = "income" | "expense" | "investment";

export type Profile = {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string | null;
  type: CategoryType;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
};

export type MonthlyBill = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  is_recurring: boolean;
  total_months: number | null;
  start_month: string | null;
  active: boolean;
  created_at: string;
};

export type BillPayment = {
  id: string;
  bill_id: string;
  user_id: string;
  month: string;
  amount: number;
  description: string | null;
  paid_at: string;
};
