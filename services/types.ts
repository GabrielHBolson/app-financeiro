export type CategoryType = "income" | "expense";

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
  active: boolean;
  created_at: string;
};
