export interface Phone {
  _id: string;
  label: string;
  purchase_cost: number;
  target_receivable: number;
  profit?: number;
  delivery_share?: number; // Updated to match MongoDB field
  status: "IN_KOREA" | "IN_TRANSIT" | "SETTLED";
  batch_id?: string;
  created_at?: string;
}

export interface Batch {
  _id: string;
  courier_name: string;
  courier_phone?: string;
  telegram_handle?: string;
  flight_date: string;
  courier_details: string;
  total_delivery_fee: number;
  phone_ids: string[];
  created_at: string;
}

export interface User {
  _id: string;
  telegram_id: number;
  telegram_username?: string;
  display_name?: string;
  bio?: string;
  role: "user" | "admin";
  created_at: string;
}

export interface Settlement {
  _id: string;
  phone_ids: string[];
  total_recovered: number;
  created_at: string;
}

export interface DashboardStats {
  liquid_cash_korea: number;
  korea_stock_value: number;
  friend_owed_debt: number;
  total_realized_profit: number;
  counts: {
    in_korea: number;
    abroad_unsettled: number;
    total_settled: number;
  };
}
