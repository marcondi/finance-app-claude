import { supabase } from '../supabaseClient';
import { Appointment, Transaction } from '../types';

async function getDeterministicAppointmentsSyncUuid(userId: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode('trg_cloud_appointments_prefix_' + (userId || 'marcondes_trg_owner'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      '4' + hex.substring(13, 16),
      '8' + hex.substring(17, 20),
      hex.substring(20, 32)
    ].join('-');
  } catch {
    return '003d1365-a35c-4ef2-8fb8-8be9b81d612e';
  }
}

export async function fetchAppointmentsFromSupabase(userId?: string): Promise<Appointment[] | null> {
  try {
    let query = supabase.from('appointments').select('*').order('start_time', { ascending: true });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) {
      if (userId) {
        try {
          const syncUuid = await getDeterministicAppointmentsSyncUuid(userId);
          const { data: txData } = await supabase.from('transactions').select('description').eq('id', syncUuid);
          if (txData && txData.length > 0) {
            const desc = txData[0]?.description || '';
            if (desc.startsWith('[TRG_CLOUD_APPOINTMENTS_SYNC]')) {
              const parsed = JSON.parse(desc.replace('[TRG_CLOUD_APPOINTMENTS_SYNC]', ''));
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed as Appointment[];
              }
            }
          }
        } catch {}
      }
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
      // Fallback: Salvar na lista de agendamentos em nuvem
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = appointment.user_id || session?.user?.id;
        if (userId) {
          const syncUuid = await getDeterministicAppointmentsSyncUuid(userId);
          const rawLocal = localStorage.getItem('finance_appointments');
          const allApts: Appointment[] = rawLocal ? JSON.parse(rawLocal) : [appointment];
          await supabase.from('transactions').upsert({
            id: syncUuid,
            user_id: userId,
            description: '[TRG_CLOUD_APPOINTMENTS_SYNC]' + JSON.stringify(allApts),
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            type: 'income'
          });
        }
      } catch {}
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
