import { GoogleCalendarEvent, Appointment } from '../types';

const STORAGE_KEY = 'google_access_token';

export function getGoogleAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setGoogleAccessToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function removeGoogleAccessToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasGoogleAccessToken(): boolean {
  return Boolean(getGoogleAccessToken());
}

/**
 * Busca eventos do Google Calendar para o filtro selecionado
 */
export async function listEvents(filter: 'today' | 'tomorrow' | 'week' | 'month' = 'month'): Promise<GoogleCalendarEvent[]> {
  const token = getGoogleAccessToken();
  if (!token) return [];

  const now = new Date();
  let timeMin: Date;
  let timeMax: Date;

  if (filter === 'today') {
    timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (filter === 'tomorrow') {
    timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
  } else if (filter === 'week') {
    const dayOfWeek = now.getDay();
    timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
    timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59);
  } else {
    // month
    timeMin = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin.toISOString()
    )}&timeMax=${encodeURIComponent(timeMax.toISOString())}&singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      removeGoogleAccessToken();
      return [];
    }

    if (!res.ok) {
      console.warn(`[GoogleCalendarService] listEvents error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('[GoogleCalendarService] listEvents network error:', err);
    return [];
  }
}

/**
 * Cria um evento no Google Agenda a partir de um Agendamento
 */
export async function createCalendarEvent(
  appointment: Appointment
): Promise<{ id: string; htmlLink?: string } | null> {
  const token = getGoogleAccessToken();
  if (!token) {
    console.warn('[GoogleCalendarService] Token ausente. Sincronização ignorada.');
    return null;
  }

  const summary = `${appointment.title} - ${appointment.client_name}`;
  const description = [
    `Atendimento: ${appointment.title}`,
    `Cliente: ${appointment.client_name}`,
    appointment.client_phone ? `Telefone: ${appointment.client_phone}` : null,
    appointment.service_value > 0
      ? `Valor: R$ ${appointment.service_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : null,
    `Status: ${appointment.status}`,
    `Origem: FinanceApp`
  ]
    .filter(Boolean)
    .join('\n');

  const payload = {
    summary,
    description,
    start: {
      dateTime: new Date(appointment.start_time).toISOString()
    },
    end: {
      dateTime: new Date(appointment.end_time).toISOString()
    }
  };

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      removeGoogleAccessToken();
      throw new Error('Sessão do Google expirada. Faça login novamente.');
    }

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[GoogleCalendarService] createCalendarEvent failed:', errText);
      return null;
    }

    const data = await res.json();
    return {
      id: data.id,
      htmlLink: data.htmlLink
    };
  } catch (err: any) {
    console.warn('[GoogleCalendarService] Erro ao sincronizar evento:', err?.message || err);
    return null;
  }
}

/**
 * Exclui evento no Google Calendar se existir id
 */
export async function deleteCalendarEvent(googleEventId: string): Promise<boolean> {
  const token = getGoogleAccessToken();
  if (!token || !googleEventId) return false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
