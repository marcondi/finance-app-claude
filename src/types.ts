export type TransactionType = 'income' | 'expense';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Category {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
  user_id?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO date string (YYYY-MM-DD or timestamptz)
  category_id: string;
  is_paid: boolean;
  parent_id?: string | null;
  appointment_id?: string | null;
}

export interface ScheduledBill {
  id: string;
  user_id?: string;
  description: string;
  amount: number;
  due_date: string;
  category_id: string;
  is_paid: boolean;
}

export interface Appointment {
  id: string;
  user_id?: string;
  title: string;
  client_name: string;
  client_phone: string;
  start_time: string; // ISO timestamptz
  end_time: string;   // ISO timestamptz
  service_value: number;
  status: AppointmentStatus;
  google_event_id?: string | null;
  synced_google: boolean;
  linked_transaction_id?: string | null;
  category_id?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

export interface ChangeMetric {
  text: string;
  direction: 'up' | 'down' | 'flat';
}

export interface ExpenseByCategory {
  id: string;
  name: string;
  value: number;
  color: string;
  percent: number;
}
