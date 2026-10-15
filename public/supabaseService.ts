import { supabase } from '../supabaseClient';
import { Appointment, Transaction } from '../types';

export async function fetchAppointmentsFromSupabase(userId?: string): Promise<Appointment[] | null> {
  try {
    let query = supabase.from('appointments').select('*').order('start_time', { ascending: true });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) {
      console.info('[Supabase] Appointments table fallback to local state:', error.message);
      return null;
    }
    return data as Appointment[];
  } catch {
    return null;
  }
}

export async function saveAppointmentToSupabase(appointment: Appointment): Promise<boolean> {
  try {
    const { error } = await supabase.from('appointments').upsert(appointment);
    if (error) {
      console.warn('[Supabase] Upsert appointment warning:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function deleteAppointmentFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function saveTransactionToSupabase(tx: Transaction): Promise<boolean> {
  try {
    const { error } = await supabase.from('transactions').upsert(tx);
    return !error;
  } catch {
    return false;
  }
}

export async function batchSaveTransactionsToSupabase(txs: Transaction[]): Promise<boolean> {
  try {
    const { error } = await supabase.from('transactions').upsert(txs);
    return !error;
  } catch {
    return false;
  }
}

export async function batchDeleteTransactionsFromSupabase(ids: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.from('transactions').delete().in('id', ids);
    return !error;
  } catch {
    return false;
  }
}
