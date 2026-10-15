import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Calendar,
  CalendarDays,
  Plus,
  Check,
  Clock,
  ExternalLink,
  ArrowDownRight,
  User,
  Phone,
  DollarSign,
  CheckCircle2,
  CalendarCheck,
  Sparkles,
  MessageCircle,
  FileText,
  RotateCcw,
  ClipboardList,
  Save,
  Printer,
  Trash2,
  History,
  Activity,
  X,
  FileDown,
  Cloud,
  RefreshCw,
  ShieldCheck,
  Upload,
  Target,
  Brain,
  HeartPulse,
  ClipboardCheck
} from 'lucide-react';
import { Appointment, AppointmentStatus, Category, GoogleCalendarEvent, ScheduledBill, Transaction } from './types';
import WhatsAppTRGModal, { TRGMessageType } from './WhatsAppTRGModal';
import ReceiptTRGModal from './ReceiptTRGModal';
import QuickReturnModal from './QuickReturnModal';
import GoogleUserBadge from './GoogleUserBadge';
import { supabase } from './supabaseClient';

interface AgendaViewProps {
  darkMode: boolean;
  currentDate: Date;
  scheduled: ScheduledBill[];
  transactions: Transaction[];
  categories: Category[];
  appointments: Appointment[];
  currentUser: any;
  agendaSubTab: string;
  setAgendaSubTab: (tab: string) => void;
  selectedCalendarDay: number | null;
  setSelectedCalendarDay: (day: number | null) => void;
  calendarEvents: GoogleCalendarEvent[];
  loadingCalendar: boolean;
  calendarFilter: string;
  setCalendarFilter: (filter: string) => void;
  hasGoogleToken: boolean;
  fetchCalendarEvents: (filter?: string) => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  payScheduled: (item: any) => void;
  setShowTransactionModal: () => void;
  formatCurrency: (val: number) => string;
  formatDate: (dateStr: string) => string;
  getTodayDateString: () => string;
  hideValues: boolean;
  onSaveAppointment: (appointment: Appointment, syncGoogle: boolean) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onUpdateAppointmentStatus: (
    appointment: Appointment,
    newStatus: AppointmentStatus,
    markPaidDirectly?: boolean,
    customAmount?: number,
    customCategoryId?: string
  ) => Promise<void>;
  setView?: (view: string) => void;
  onLogout?: () => void;
  showToast?: (text: string, type?: 'success' | 'warn' | 'error') => void;
  onOpenSyncModal?: () => void;
}

export default function AgendaView({
  darkMode,
  currentDate,
  scheduled,
  transactions,
  categories,
  appointments = [],
  currentUser,
  agendaSubTab,
  setAgendaSubTab,
  onOpenSyncModal,
  selectedCalendarDay,
  setSelectedCalendarDay,
  calendarEvents = [],
  loadingCalendar,
  calendarFilter,
  setCalendarFilter,
  hasGoogleToken,
  fetchCalendarEvents,
  handleGoogleLogin,
  payScheduled,
  setShowTransactionModal,
  formatCurrency,
  formatDate,
  getTodayDateString,
  hideValues,
  onSaveAppointment,
  onDeleteAppointment,
  onUpdateAppointmentStatus,
  setView,
  onLogout,
  showToast
}: AgendaViewProps) {
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [appointmentFilter, setAppointmentFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [appointmentDateFilter, setAppointmentDateFilter] = useState<'ALL' | 'TOMORROW' | 'TODAY'>('ALL');

  // Modal Novo Agendamento
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form Fields
  const [appTitle, setAppTitle] = useState('');
  const [appClientName, setAppClientName] = useState('');
  const [appClientPhone, setAppClientPhone] = useState('');
  const [appDate, setAppDate] = useState(() => getTodayDateString());
  const [appStartTime, setAppStartTime] = useState('09:00');
  const [appEndTime, setAppEndTime] = useState('10:00');
  const [appServiceValue, setAppServiceValue] = useState('');
  const [appCategoryId, setAppCategoryId] = useState('');
  const [appSyncGoogle, setAppSyncGoogle] = useState(true);

  // Modal de Conclusão Financeira
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
  const [directPaymentOption, setDirectPaymentOption] = useState<boolean>(true);
  const [completionAmount, setCompletionAmount] = useState<string>('');
  const [completionCategoryId, setCompletionCategoryId] = useState<string>('');

  // Modal de WhatsApp TRG
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetAppointment, setWhatsAppTargetAppointment] = useState<Appointment | null>(null);
  const [whatsAppInitialType, setWhatsAppInitialType] = useState<TRGMessageType | any>('presencial');

  const handleOpenWhatsApp = (apt?: Appointment | null, type: TRGMessageType | any = 'presencial') => {
    setWhatsAppTargetAppointment(apt || null);
    setWhatsAppInitialType(type);
    setWhatsAppModalOpen(true);
  };

  // Modal de Recibo TRG
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptTargetAppointment, setReceiptTargetAppointment] = useState<Appointment | null>(null);

  const handleOpenReceipt = (apt?: Appointment | null) => {
    setReceiptTargetAppointment(apt || null);
    setReceiptModalOpen(true);
  };

  // Modal de Agendamento Rápido de Retorno TRG (7 ou 14 dias)
  const [quickReturnModalOpen, setQuickReturnModalOpen] = useState<boolean>(false);
  const [quickReturnTargetAppointment, setQuickReturnTargetAppointment] = useState<Appointment | null>(null);

  const handleOpenQuickReturn = (apt: Appointment) => {
    setQuickReturnTargetAppointment(apt);
    setQuickReturnModalOpen(true);
  };

  // Modal de Ficha de Evolução & Prontuário TRG
  const [evolutionModalOpen, setEvolutionModalOpen] = useState<boolean>(false);
  const [evolutionTargetAppointment, setEvolutionTargetAppointment] = useState<Appointment | null>(null);

  const handleOpenEvolution = (apt?: Appointment | null) => {
    setEvolutionTargetAppointment(apt || null);
    setEvolutionModalOpen(true);
  };

  // Modal de Ficha de Anamnese & Mapeamento de Alvos TRG
  const [anamneseModalOpen, setAnamneseModalOpen] = useState<boolean>(false);
  const [anamneseTargetAppointment, setAnamneseTargetAppointment] = useState<Appointment | null>(null);

  const handleOpenAnamnese = (apt?: Appointment | null) => {
    setAnamneseTargetAppointment(apt || null);
    setAnamneseModalOpen(true);
  };

  const handleConfirmReturnAppointment = async (
    newAppointment: Appointment,
    syncGoogle: boolean,
    openWhatsApp: boolean
  ) => {
    await onSaveAppointment(newAppointment, syncGoogle);
    if (openWhatsApp) {
      handleOpenWhatsApp(newAppointment, 'return_scheduled' as any);
    }
  };

  const handleStartCompletion = (apt: Appointment) => {
    setCompletingAppointment(apt);
    setDirectPaymentOption(true);
    setCompletionAmount(apt.service_value ? String(apt.service_value) : '');
    const defaultCat = apt.category_id || categories.find(c => c.type === 'income')?.id || 'cat-extras';
    setCompletionCategoryId(defaultCat);
  };

  const showAmount = (val: number) => (hideValues ? 'R$ ••••••••' : formatCurrency(val));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = String(month + 1).padStart(2, '0');
  const targetPrefix = `${year}-${monthStr}`;
  const todayStr = getTodayDateString();

  // Amanhã (Data YYYY-MM-DD para filtro de lembretes de 24h antes)
  const tomorrowStr = (() => {
    try {
      const [y, m, d] = todayStr.split('-').map(Number);
      const tomorrow = new Date(y, m - 1, d);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const ty = tomorrow.getFullYear();
      const tm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const td = String(tomorrow.getDate()).padStart(2, '0');
      return `${ty}-${tm}-${td}`;
    } catch {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
  })();

  // Dia da semana de amanhã por extenso (ex: Segunda-feira)
  const tomorrowWeekday = (() => {
    try {
      const [y, m, d] = tomorrowStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const w = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
      return w.charAt(0).toUpperCase() + w.slice(1);
    } catch {
      return '';
    }
  })();

  // Atendimentos agendados para amanhã (Lembretes 24h) em toda a base
  const tomorrowAppointments = (appointments || []).filter(a => {
    const aDate = (a.start_time || '').split('T')[0];
    return aDate === tomorrowStr && a.status !== 'CANCELLED';
  });

  // Atendimentos agendados para hoje em toda a base
  const todayAppointments = (appointments || []).filter(a => {
    const aDate = (a.start_time || '').split('T')[0];
    return aDate === todayStr && a.status !== 'CANCELLED';
  });

  // 1. Contas financeiras do mês
  const monthBills = (() => {
    const map = new Map<string, any>();

    // Transações do mês
    (transactions || [])
      .filter(t => {
        if (currentUser?.id && t.user_id && t.user_id !== currentUser.id) return false;
        const tDate = (t.date || '').split('T')[0];
        return tDate.startsWith(targetPrefix);
      })
      .forEach(t => {
        map.set(t.id, {
          id: t.id,
          description: t.description,
          amount: Number(t.amount) || 0,
          category_id: t.category_id,
          date: (t.date || '').split('T')[0],
          type: t.type || 'expense',
          is_paid: t.is_paid !== false,
          rawItem: t,
          source: 'transaction'
        });
      });

    // Scheduled do mês
    (scheduled || [])
      .filter(s => {
        if (currentUser?.id && s.user_id && s.user_id !== currentUser.id) return false;
        const sDate = (s.due_date || '').split('T')[0];
        return sDate.startsWith(targetPrefix);
      })
      .forEach(s => {
        if (!map.has(s.id)) {
          const cat = categories.find(c => c.id === s.category_id);
          map.set(s.id, {
            id: s.id,
            description: s.description,
            amount: Number(s.amount) || 0,
            category_id: s.category_id,
            date: (s.due_date || '').split('T')[0],
            type: cat?.type || 'expense',
            is_paid: Boolean(s.is_paid),
            rawItem: s,
            source: 'scheduled'
          });
        }
      });

    return Array.from(map.values());
  })();

  // 2. Agendamentos de clientes do mês
  const monthAppointments = (appointments || []).filter(a => {
    const aDate = (a.start_time || '').split('T')[0];
    return aDate.startsWith(targetPrefix);
  });

  // Agrupamento por dia
  const billsPorDia: Record<number, any[]> = {};
  monthBills.forEach(b => {
    const d = parseInt((b.date || '').split('-')[2], 10);
    if (!isNaN(d)) {
      if (!billsPorDia[d]) billsPorDia[d] = [];
      billsPorDia[d].push(b);
    }
  });

  const appointmentsPorDia: Record<number, Appointment[]> = {};
  monthAppointments.forEach(a => {
    const d = parseInt((a.start_time || '').split('T')[0].split('-')[2], 10);
    if (!isNaN(d)) {
      if (!appointmentsPorDia[d]) appointmentsPorDia[d] = [];
      appointmentsPorDia[d].push(a);
    }
  });

  const primeiroDiaSemana = new Date(year, month, 1).getDay();
  const totalDiasNoMes = new Date(year, month + 1, 0).getDate();
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const selectedDayBills = selectedCalendarDay ? billsPorDia[selectedCalendarDay] || [] : [];
  const selectedDayAppointments = selectedCalendarDay ? appointmentsPorDia[selectedCalendarDay] || [] : [];

  // Totais do Mês
  const totalMesDespesas = monthBills.reduce((s, c) => s + (c.type === 'expense' ? c.amount : 0), 0);
  const totalMesDespesasPagas = monthBills.filter(c => c.is_paid && c.type === 'expense').reduce((s, c) => s + c.amount, 0);
  const totalMesDespesasPendentes = totalMesDespesas - totalMesDespesasPagas;

  const totalAtendimentosMes = monthAppointments.length;
  const valorTotalAtendimentos = monthAppointments
    .filter(a => a.status !== 'CANCELLED')
    .reduce((s, a) => s + (Number(a.service_value) || 0), 0);

  // Abertura do Modal de Novo Agendamento
  const handleOpenAppointmentModal = (apt?: Appointment) => {
    if (apt) {
      setEditingAppointment(apt);
      setAppTitle(apt.title);
      setAppClientName(apt.client_name);
      setAppClientPhone(apt.client_phone || '');
      const sDate = (apt.start_time || '').split('T')[0] || getTodayDateString();
      const sTime = apt.start_time ? apt.start_time.substring(11, 16) : '09:00';
      const eTime = apt.end_time ? apt.end_time.substring(11, 16) : '10:00';
      setAppDate(sDate);
      setAppStartTime(sTime);
      setAppEndTime(eTime);
      setAppServiceValue(apt.service_value ? String(apt.service_value) : '');
      setAppCategoryId(apt.category_id || '');
      setAppSyncGoogle(apt.synced_google);
    } else {
      setEditingAppointment(null);
      setAppTitle('Sessão TRG');
      setAppClientName('');
      setAppClientPhone('');
      const defaultDate = selectedCalendarDay
        ? `${year}-${monthStr}-${String(selectedCalendarDay).padStart(2, '0')}`
        : getTodayDateString();
      setAppDate(defaultDate);
      setAppStartTime('09:00');
      setAppEndTime('09:50');
      setAppServiceValue('150');
      const incomeCat = categories.find(c => c.type === 'income');
      setAppCategoryId(incomeCat?.id || categories[0]?.id || '');
      setAppSyncGoogle(hasGoogleToken);
    }
    setShowAppointmentModal(true);
  };

  const handleSaveAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle.trim() || !appClientName.trim() || !appDate) return;

    const startISO = new Date(`${appDate}T${appStartTime}:00`).toISOString();
    const endISO = new Date(`${appDate}T${appEndTime}:00`).toISOString();

    const newAppointment: Appointment = {
      id: editingAppointment?.id || `apt-${Date.now()}`,
      title: appTitle.trim(),
      client_name: appClientName.trim(),
      client_phone: appClientPhone.trim(),
      start_time: startISO,
      end_time: endISO,
      service_value: parseFloat(appServiceValue) || 0,
      status: editingAppointment?.status || 'SCHEDULED',
      synced_google: appSyncGoogle,
      google_event_id: editingAppointment?.google_event_id || null,
      linked_transaction_id: editingAppointment?.linked_transaction_id || null,
      category_id: appCategoryId,
      user_id: currentUser?.id
    };

    await onSaveAppointment(newAppointment, appSyncGoogle);
    setShowAppointmentModal(false);
    setEditingAppointment(null);
  };

  // Status Badge Helper
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return { label: 'Agendado', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200' };
      case 'CONFIRMED':
        return { label: 'Confirmado', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200' };
      case 'COMPLETED':
        return { label: 'Concluído', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200' };
      case 'CANCELLED':
        return { label: 'Cancelado', bg: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-300' };
      default:
        return { label: status, bg: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações e Sub-Abas */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Abas */}
        <div className={`flex flex-wrap gap-1.5 p-1.5 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          {[
            { key: 'calendar', label: 'Calendário Integrado', icon: CalendarIcon },
            { key: 'appointments', label: `Atendimentos (${monthAppointments.length})`, icon: User },
            { key: 'anamnese', label: 'Ficha de Anamnese TRG', icon: Target, isAnamnese: true },
            { key: 'bills', label: `Contas do Mês (${monthBills.length})`, icon: DollarSign },
            { key: 'google-calendar', label: 'Google Agenda v3', icon: CalendarDays }
          ].map(({ key, label, icon: Icon, isAnamnese }) => (
            <button
              key={key}
              onClick={() => {
                if (isAnamnese) {
                  if (setView) {
                    setView('anamnese');
                  } else {
                    handleOpenAnamnese(null);
                  }
                  return;
                }
                setAgendaSubTab(key);
                if (key === 'google-calendar') fetchCalendarEvents(calendarFilter);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                isAnamnese
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/20 hover:from-teal-500 hover:to-cyan-500'
                  : agendaSubTab === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : darkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {isAnamnese && (
                <span className="text-[10px] bg-white text-teal-900 px-1.5 py-0.2 rounded-full font-black">
                  TRG
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Botões Rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Rápido: Lembretes de Amanhã (24h) */}
          <button
            onClick={() => {
              setAgendaSubTab('appointments');
              setAppointmentDateFilter('TOMORROW');
            }}
            className={`flex items-center gap-2 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer ${
              agendaSubTab === 'appointments' && appointmentDateFilter === 'TOMORROW'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white ring-2 ring-amber-400'
                : tomorrowAppointments.length > 0
                ? darkMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                : darkMode
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title={`Filtrar atendimentos de amanhã (${tomorrowWeekday}) e disparar lembretes 24h`}
          >
            <Clock className={`w-4 h-4 ${tomorrowAppointments.length > 0 ? 'text-amber-500 animate-pulse' : 'text-gray-400'}`} />
            <span>Lembretes Amanhã</span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                tomorrowAppointments.length > 0
                  ? 'bg-amber-500 text-white shadow-sm'
                  : darkMode
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tomorrowAppointments.length}
            </span>
          </button>

          <button
            onClick={() => handleOpenAppointmentModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>

          <button
            onClick={() => handleOpenWhatsApp(null, 'presencial')}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            title="Abrir Central de Mensagens WhatsApp TRG (Presencial, Retorno, Pós, Indecisos, Pix)"
          >
            <MessageCircle className="w-4 h-4 text-white" />
            <span>WhatsApp TRG</span>
          </button>

          <button
            onClick={() => handleOpenReceipt(null)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            title="Emitir Recibo & Declaração de Sessão TRG em PDF"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Recibo TRG</span>
          </button>

          <button
            onClick={() => handleOpenEvolution(null)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            title="Abrir Ficha de Evolução & Prontuário TRG (Fases da TRG, Escala SUD, Anotações Clínicas)"
          >
            <ClipboardList className="w-4 h-4 text-white" />
            <span>Evolução TRG</span>
          </button>

          <button
            onClick={() => handleOpenAnamnese(null)}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            title="Abrir Ficha de Anamnese & Mapeamento de Alvos TRG (Primeira Consulta)"
          >
            <Target className="w-4 h-4 text-white" />
            <span>Anamnese TRG</span>
          </button>

          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border shadow-sm transition-all cursor-pointer ${
                darkMode
                  ? 'border-purple-500/40 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                  : 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}
              title="Sincronizar clientes e atendimentos com outro computador (Exportar/Importar)"
            >
              <RefreshCw className="w-4 h-4 text-purple-400" />
              <span>Sincronizar PCs</span>
            </button>
          )}

          <button
            onClick={() => {
              if (hasGoogleToken) {
                setAgendaSubTab('google-calendar');
                fetchCalendarEvents(calendarFilter);
              } else {
                handleGoogleLogin();
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border shadow-sm transition-all ${
              hasGoogleToken
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
            }`}
            title="Sincronizar eventos com o Google Agenda"
          >
            <CalendarDays className="w-4 h-4" />
            {hasGoogleToken ? 'Google Agenda Ativo' : 'Sincronizar Google Agenda'}
          </button>

          <button
            onClick={setShowTransactionModal}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Plus className="w-4 h-4 text-green-500" />
            Nova Conta/Previsão
          </button>

          {/* Fotinha estilo Login do Google no topo da Agenda */}
          {currentUser && onLogout && (
            <div className="pl-1 border-l border-gray-200 dark:border-gray-700">
              <GoogleUserBadge
                currentUser={currentUser}
                darkMode={darkMode}
                hasGoogleToken={hasGoogleToken}
                onLogout={onLogout}
                showToast={showToast}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Rápidos da Agenda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
            <span>Atendimentos no Mês</span>
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold mt-1 text-blue-500">
            {totalAtendimentosMes}
          </div>
          <span className="text-[11px] text-gray-400">
            {monthAppointments.filter(a => a.status === 'CONFIRMED').length} confirmados • {monthAppointments.filter(a => a.status === 'COMPLETED').length} concluídos
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
            <span>Receita de Serviços</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-500">
            {showAmount(valorTotalAtendimentos)}
          </div>
          <span className="text-[11px] text-gray-400">
            Previsto em atendimentos do mês
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
            <span>Contas a Pagar</span>
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold mt-1 text-red-500">
            {showAmount(totalMesDespesasPendentes)}
          </div>
          <span className="text-[11px] text-gray-400">
            {monthBills.filter(b => !b.is_paid && b.type === 'expense').length} contas pendentes
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
              <span>Sincronização Google</span>
              <CalendarDays className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                hasGoogleToken
                  ? 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300'
              }`}>
                {hasGoogleToken ? 'Conectado' : 'Não Vinculado'}
              </span>
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">
              {monthAppointments.filter(a => a.synced_google).length} agendamentos sincronizados
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-700/60">
            {hasGoogleToken ? (
              <button
                type="button"
                onClick={() => {
                  setAgendaSubTab('google-calendar');
                  fetchCalendarEvents(calendarFilter);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Ver Eventos do Google
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all animate-pulse"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Sincronizar Google Agenda
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUB-ABA 1: CALENDÁRIO MENSAL INTEGRADO */}
      {(agendaSubTab === 'calendar' || !agendaSubTab) && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Visão Mensal Integrada — {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Clique em qualquer dia para inspecionar os atendimentos de clientes e contas agendadas.
                </p>
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Atendimentos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Contas a Pagar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Quitadas / Entradas</span>
                </div>
              </div>
            </div>

            {/* Grid dos Dias da Semana */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
              {diasSemana.map(d => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid dos Dias do Mês */}
            <div className="grid grid-cols-7 gap-2">
              {/* Espaços vazios do início */}
              {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[92px] rounded-xl bg-transparent opacity-25" />
              ))}

              {/* Dias reais */}
              {Array.from({ length: totalDiasNoMes }).map((_, i) => {
                const diaNum = i + 1;
                const diaString = `${year}-${monthStr}-${String(diaNum).padStart(2, '0')}`;
                const isToday = diaString === todayStr;
                const isTomorrow = diaString === tomorrowStr;
                const isSelected = selectedCalendarDay === diaNum;

                const dayBillsList = billsPorDia[diaNum] || [];
                const dayAptsList = appointmentsPorDia[diaNum] || [];

                const hasPendingBills = dayBillsList.some(b => !b.is_paid && b.type === 'expense');
                const hasPaidBills = dayBillsList.some(b => b.is_paid);

                return (
                  <div
                    key={diaNum}
                    onClick={() => setSelectedCalendarDay(diaNum === selectedCalendarDay ? null : diaNum)}
                    className={`min-h-[105px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'ring-2 ring-blue-500 shadow-md border-blue-500 ' + (darkMode ? 'bg-blue-950/40' : 'bg-blue-50/70')
                        : isToday
                        ? darkMode ? 'bg-gray-700/80 border-blue-400' : 'bg-blue-50/50 border-blue-300'
                        : isTomorrow
                        ? darkMode ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30' : 'bg-amber-50/40 border-amber-300 hover:bg-amber-50'
                        : darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow'
                            : isTomorrow
                            ? 'w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center font-extrabold'
                            : darkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          {diaNum}
                        </span>
                        {isTomorrow && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            Amanhã
                          </span>
                        )}
                      </div>

                      {/* Indicadores resumidos */}
                      <div className="flex items-center gap-1">
                        {dayAptsList.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-blue-500" title={`${dayAptsList.length} Atendimento(s)`} />
                        )}
                        {hasPendingBills && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Conta a pagar pendente" />
                        )}
                        {hasPaidBills && (
                          <span className="w-2 h-2 rounded-full bg-green-500" title="Conta paga" />
                        )}
                      </div>
                    </div>

                    {/* Conteúdo mini dentro da célula do calendário */}
                    <div className="space-y-1 mt-1">
                      {/* Atendimentos no dia */}
                      {dayAptsList.slice(0, 2).map(apt => (
                        <div
                          key={apt.id}
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 flex items-center gap-1"
                        >
                          <User className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{apt.client_name.split(' ')[0]}</span>
                        </div>
                      ))}

                      {dayAptsList.length > 2 && (
                        <span className="text-[9px] font-bold text-blue-500 block">
                          +{dayAptsList.length - 2} cliente(s)
                        </span>
                      )}

                      {/* Contas no dia */}
                      {dayBillsList.slice(0, 1).map(bill => (
                        <div
                          key={bill.id}
                          className={`text-[9px] px-1 py-0.5 rounded font-semibold truncate ${
                            bill.is_paid
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                          }`}
                        >
                          {bill.is_paid ? '✓ ' : '• '}{bill.description}
                        </div>
                      ))}

                      {dayBillsList.length > 1 && (
                        <span className="text-[9px] font-bold text-red-400 block">
                          +{dayBillsList.length - 1} conta(s)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL DETALHADO DO DIA SELECIONADO */}
          {selectedCalendarDay && (
            <div className={`p-6 rounded-2xl shadow-xl border animate-fadeIn ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-200'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                    {selectedCalendarDay}
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Programação do Dia {selectedCalendarDay} de {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedDayAppointments.length} atendimento(s) e {selectedDayBills.length} conta(s) registrada(s).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAppointmentModal()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agendar Neste Dia
                  </button>
                  <button
                    onClick={() => setSelectedCalendarDay(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Seção 1: Atendimentos do Dia */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <User className="w-4 h-4 text-blue-500" />
                    Atendimentos com Clientes ({selectedDayAppointments.length})
                  </h4>
                </div>

                {selectedDayAppointments.length === 0 ? (
                  <div className={`p-4 rounded-xl text-center text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                    Nenhum atendimento agendado para este dia.{' '}
                    <button
                      onClick={() => handleOpenAppointmentModal()}
                      className="text-blue-500 font-bold hover:underline"
                    >
                      Clique aqui para adicionar.
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {selectedDayAppointments.map(apt => {
                      const startTimeStr = apt.start_time ? apt.start_time.substring(11, 16) : '--:--';
                      const endTimeStr = apt.end_time ? apt.end_time.substring(11, 16) : '--:--';
                      const badge = getStatusBadge(apt.status);

                      return (
                        <div
                          key={apt.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 font-extrabold text-xs flex flex-col items-center justify-center min-w-[64px]">
                              <Clock className="w-4 h-4 mb-0.5" />
                              <span>{startTimeStr}</span>
                              <span className="text-[10px] opacity-70">{endTimeStr}</span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {apt.title}
                                </h5>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                                  {badge.label}
                                </span>
                                {apt.synced_google && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400">
                                    <CalendarCheck className="w-3 h-3" /> Sincronizado Google
                                  </span>
                                )}
                              </div>

                              <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Cliente: <strong>{apt.client_name}</strong>
                                {apt.client_phone && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenWhatsApp(apt, apt.status === 'COMPLETED' ? 'after' : 'presencial')}
                                    className="ml-2 text-emerald-500 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                                    title="Abrir WhatsApp TRG com modelos prontos"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{apt.client_phone}</span>
                                  </button>
                                )}
                              </p>

                              {apt.linked_transaction_id && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] text-green-500 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Receita Lançada
                                  </span>
                                  {setView && (
                                    <button
                                      type="button"
                                      onClick={() => setView('transactions')}
                                      className="text-[11px] text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <span>Ver Lançamento</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-700">
                            {apt.service_value > 0 && (
                              <div className="text-right">
                                <span className="text-xs text-gray-400 block">Valor</span>
                                <span className="font-extrabold text-sm text-emerald-500">
                                  {showAmount(apt.service_value)}
                                </span>
                              </div>
                            )}

                            {/* Ações de Status & WhatsApp & Recibo */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Botão WhatsApp TRG */}
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(apt, apt.status === 'COMPLETED' ? 'after' : 'presencial')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Abrir WhatsApp TRG (Presencial, Lembrete, Pós, Dúvida ou Pix)"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                                <span>WhatsApp</span>
                              </button>

                              {/* Botão Recibo TRG */}
                              <button
                                type="button"
                                onClick={() => handleOpenReceipt(apt)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-600/15 text-amber-600 dark:text-amber-400 hover:bg-amber-600/25 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Emitir Recibo & Declaração em PDF"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-500" />
                                <span>Recibo</span>
                              </button>

                              {/* Botão Ficha de Evolução TRG */}
                              <button
                                type="button"
                                onClick={() => handleOpenEvolution(apt)}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-600/15 text-purple-600 dark:text-purple-400 hover:bg-purple-600/25 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Abrir Ficha de Evolução & Prontuário TRG (Fases e Anotações)"
                              >
                                <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                                <span>Evolução</span>
                              </button>

                              {/* Botão Ficha de Anamnese TRG */}
                              <button
                                type="button"
                                onClick={() => handleOpenAnamnese(apt)}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-600/15 text-teal-600 dark:text-teal-400 hover:bg-teal-600/25 border border-teal-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Abrir Ficha de Anamnese & Mapeamento de Alvos TRG deste assistido"
                              >
                                <Target className="w-3.5 h-3.5 text-teal-500" />
                                <span>Anamnese</span>
                              </button>

                              {/* Botão Agendar Retorno (7 ou 14 dias) */}
                              <button
                                type="button"
                                onClick={() => handleOpenQuickReturn(apt)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600/25 border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Agendamento Rápido de Retorno TRG (7 ou 14 dias)"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                                <span>Retorno</span>
                              </button>

                              {apt.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleStartCompletion(apt)}
                                  className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1 shadow transition-colors cursor-pointer"
                                  title="Concluir Atendimento e Lançar no Financeiro"
                                >
                                  <Check className="w-3.5 h-3.5" /> Concluir
                                </button>
                              )}

                              {apt.status === 'SCHEDULED' && (
                                <button
                                  onClick={() => onUpdateAppointmentStatus(apt, 'CONFIRMED')}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold"
                                  title="Confirmar Presença do Cliente"
                                >
                                  Confirmar
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenAppointmentModal(apt)}
                                className={`p-1.5 rounded-lg border text-xs ${
                                  darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                                title="Editar"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => onDeleteAppointment(apt.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 text-xs"
                                title="Excluir"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seção 2: Contas e Previsões do Dia */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Contas Financeiras do Dia ({selectedDayBills.length})
                  </h4>
                </div>

                {selectedDayBills.length === 0 ? (
                  <div className={`p-4 rounded-xl text-center text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                    Nenhuma conta ou previsão financeira para este dia.
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {selectedDayBills.map(bill => {
                      const isIncome = bill.type === 'income';
                      const cat = categories.find(c => c.id === bill.category_id);

                      return (
                        <div
                          key={bill.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat?.color || '#6b7280' }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {bill.description}
                                </span>
                                {bill.is_paid ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300">
                                    Quitada
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300">
                                    Pendente
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400">
                                {cat?.name || 'Sem Categoria'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`font-extrabold text-sm ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                              {isIncome ? '+' : '-'} {showAmount(bill.amount)}
                            </span>

                            {!bill.is_paid && (
                              <button
                                onClick={() => payScheduled(bill.rawItem || bill)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs shadow transition-colors"
                              >
                                Dar Baixa
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: GESTÃO DETALHADA DE ATENDIMENTOS */}
      {agendaSubTab === 'appointments' && (
        <div className="space-y-5">
          {/* BANNER / CENTRAL DE LEMBRETES DE AMANHÃ (24H ANTES) */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              tomorrowAppointments.length > 0
                ? darkMode
                  ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-gray-800 border-amber-500/40 shadow-lg shadow-amber-950/20'
                  : 'bg-gradient-to-r from-amber-50 via-orange-50 to-white border-amber-300 shadow-md'
                : darkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    tomorrowAppointments.length > 0
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                      : darkMode
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Clock className={`w-6 h-6 ${tomorrowAppointments.length > 0 ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Central de Lembretes de Amanhã (24h Antes)
                    </h3>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        tomorrowAppointments.length > 0
                          ? 'bg-amber-500 text-white shadow-sm'
                          : darkMode
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tomorrowAppointments.length} {tomorrowAppointments.length === 1 ? 'cliente agendado' : 'clientes agendados'}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {tomorrowWeekday ? `${tomorrowWeekday}, ` : ''}
                    {formatDate(tomorrowStr)} • Envie a confirmação 24h antes com o endereço do Studio e link do Google Maps / GPS.
                  </p>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
                <button
                  onClick={() => setAppointmentDateFilter(appointmentDateFilter === 'TOMORROW' ? 'ALL' : 'TOMORROW')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                    appointmentDateFilter === 'TOMORROW'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                      : darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-amber-300 border border-amber-500/30'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{appointmentDateFilter === 'TOMORROW' ? 'Ver Todos do Mês' : 'Filtrar Só Amanhã'}</span>
                </button>
              </div>
            </div>

            {/* Mini Cards dos Agendamentos de Amanhã */}
            {tomorrowAppointments.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tomorrowAppointments.map(apt => {
                  const sTime = apt.start_time ? apt.start_time.substring(11, 16) : '--:--';
                  const eTime = apt.end_time ? apt.end_time.substring(11, 16) : '--:--';
                  const isConfirmed = apt.status === 'CONFIRMED';

                  return (
                    <div
                      key={`tomorrow-quick-${apt.id}`}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                        darkMode
                          ? 'bg-gray-900/60 border-amber-500/30 hover:border-amber-400'
                          : 'bg-white border-amber-200 hover:border-amber-400 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            ⏰ {sTime} - {eTime}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isConfirmed
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/80 dark:text-green-300 border border-green-500/30'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {isConfirmed ? 'Confirmado' : 'Agendado'}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {apt.client_name || apt.title}
                        </h4>
                        {apt.client_phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            {apt.client_phone}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(apt, 'presencial')}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                          title="Enviar Lembrete Presencial com Link do Google Maps / Waze"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Lembrete WhatsApp</span>
                        </button>

                        {!isConfirmed && (
                          <button
                            type="button"
                            onClick={() => onUpdateAppointmentStatus(apt, 'CONFIRMED')}
                            className="py-1.5 px-2 rounded-lg bg-blue-600/15 text-blue-500 hover:bg-blue-600/25 border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            title="Marcar como Confirmado"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Nenhum atendimento aguardando confirmação para amanhã ({formatDate(tomorrowStr)}). Agenda liberada!</span>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-2xl shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {appointmentDateFilter === 'TOMORROW'
                    ? `Atendimentos de Amanhã — ${formatDate(tomorrowStr)} (${tomorrowAppointments.length})`
                    : appointmentDateFilter === 'TODAY'
                    ? `Atendimentos de Hoje — ${formatDate(todayStr)} (${todayAppointments.length})`
                    : `Atendimentos & Clientes do Mês (${monthAppointments.length})`}
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {appointmentDateFilter === 'TOMORROW'
                    ? 'Exibindo exclusivamente os agendamentos de amanhã para disparo dos lembretes de 24h antes.'
                    : 'Gerencie o status, confirme presenças e envie mensagens no WhatsApp com 1 clique.'}
                </p>
              </div>

              {/* Filtros Combinados: Período e Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto flex-wrap">
                {/* Filtro Rápido de Período */}
                <div className={`p-1 rounded-xl flex items-center gap-1 ${darkMode ? 'bg-gray-700/60' : 'bg-gray-100'}`}>
                  <button
                    onClick={() => setAppointmentDateFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      appointmentDateFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow'
                        : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    Mês Inteiro
                  </button>

                  <button
                    onClick={() => setAppointmentDateFilter('TOMORROW')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      appointmentDateFilter === 'TOMORROW'
                        ? 'bg-amber-600 text-white shadow ring-1 ring-amber-400'
                        : tomorrowAppointments.length > 0
                        ? darkMode ? 'text-amber-300 hover:bg-gray-600' : 'text-amber-700 hover:bg-gray-200'
                        : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Amanhã (24h)</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      tomorrowAppointments.length > 0
                        ? 'bg-amber-500 text-white'
                        : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tomorrowAppointments.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setAppointmentDateFilter('TODAY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      appointmentDateFilter === 'TODAY'
                        ? 'bg-blue-600 text-white shadow'
                        : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <span>Hoje</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      todayAppointments.length > 0
                        ? 'bg-blue-500 text-white'
                        : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {todayAppointments.length}
                    </span>
                  </button>
                </div>

                {/* Filtro de Status */}
                <div className="flex items-center gap-1 flex-wrap">
                  {(['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setAppointmentFilter(st)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        appointmentFilter === st
                          ? 'bg-blue-600 text-white shadow'
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {st === 'ALL' ? 'Todos Status' : getStatusBadge(st as AppointmentStatus).label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista dos Agendamentos */}
            {(() => {
              // 1. Filtragem por data (Amanhã, Hoje, ou Mês)
              let baseList = monthAppointments;
              if (appointmentDateFilter === 'TOMORROW') {
                baseList = (appointments || []).filter(a => {
                  const aDate = (a.start_time || '').split('T')[0];
                  return aDate === tomorrowStr;
                });
              } else if (appointmentDateFilter === 'TODAY') {
                baseList = (appointments || []).filter(a => {
                  const aDate = (a.start_time || '').split('T')[0];
                  return aDate === todayStr;
                });
              }

              // 2. Filtragem por status
              const filtered = baseList.filter(a => {
                if (appointmentFilter === 'ALL') return true;
                return a.status === appointmentFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                    <p className="font-semibold text-sm">
                      {appointmentDateFilter === 'TOMORROW'
                        ? `Nenhum atendimento agendado para amanhã (${formatDate(tomorrowStr)}).`
                        : appointmentDateFilter === 'TODAY'
                        ? `Nenhum atendimento agendado para hoje (${formatDate(todayStr)}).`
                        : 'Nenhum atendimento encontrado para os critérios selecionados.'}
                    </p>
                    {appointmentDateFilter !== 'ALL' && (
                      <button
                        onClick={() => setAppointmentDateFilter('ALL')}
                        className="mt-2 text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                      >
                        Ver todos os agendamentos do mês
                      </button>
                    )}

                    {appointments.length === 0 && onOpenSyncModal && (
                      <div className="mt-6 p-4 max-w-md mx-auto rounded-2xl border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300">
                        <p className="font-bold mb-1">💡 Você já cadastrou clientes em outro computador?</p>
                        <p className="text-[11px] text-gray-400 mb-3">
                          Os dados do navegador ficam salvos localmente em cada PC. Clique abaixo para transferir seus clientes para este computador em 1 clique:
                        </p>
                        <button
                          type="button"
                          onClick={onOpenSyncModal}
                          className="px-4 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Sincronizar / Carregar Clientes do Outro PC</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid gap-3">
                  {filtered.map(apt => {
                    const sDate = (apt.start_time || '').split('T')[0];
                    const sTime = apt.start_time ? apt.start_time.substring(11, 16) : '--:--';
                    const eTime = apt.end_time ? apt.end_time.substring(11, 16) : '--:--';
                    const badge = getStatusBadge(apt.status);
                    const isTomorrow = sDate === tomorrowStr;
                    const isToday = sDate === todayStr;

                    return (
                      <div
                        key={apt.id}
                        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                          isTomorrow
                            ? darkMode
                              ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                              : 'bg-amber-50/50 border-amber-300 shadow-sm'
                            : darkMode
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl font-extrabold flex flex-col items-center justify-center flex-shrink-0 text-xs ${
                              isTomorrow
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-500'
                            }`}
                          >
                            <span>{sDate.split('-')[2]}</span>
                            <span className="text-[10px] opacity-75">{sTime}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {apt.title}
                              </h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              {isTomorrow && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                  <Clock className="w-3 h-3" /> Amanhã • Lembrete 24h
                                </span>
                              )}
                              {isToday && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  Hoje
                                </span>
                              )}
                              {apt.synced_google && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400">
                                  <CalendarCheck className="w-3 h-3" /> Sincronizado Google
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs mt-1 text-gray-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-blue-400" />
                                <strong className={darkMode ? 'text-gray-200' : 'text-gray-700'}>{apt.client_name}</strong>
                              </span>

                              {apt.client_phone && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsApp(apt, apt.status === 'COMPLETED' ? 'after' : 'presencial')}
                                  className="flex items-center gap-1 text-emerald-500 hover:underline font-semibold cursor-pointer"
                                  title="Abrir Central WhatsApp TRG"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {apt.client_phone}
                                </button>
                              )}

                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(sDate)} ({sTime} - {eTime})
                              </span>
                            </div>

                            {apt.linked_transaction_id && (
                              <div className="mt-2 text-xs font-semibold text-green-500 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Vinculado ao Lançamento Financeiro
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-gray-200 dark:border-gray-700">
                          {apt.service_value > 0 && (
                            <div className="text-right">
                              <span className="text-[11px] text-gray-400 block">Valor do Serviço</span>
                              <span className="text-base font-extrabold text-emerald-500">
                                {showAmount(apt.service_value)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Botão WhatsApp TRG */}
                            <button
                              onClick={() => handleOpenWhatsApp(apt, apt.status === 'COMPLETED' ? 'after' : 'presencial')}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                isTomorrow
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                                  : 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30'
                              }`}
                              title={
                                isTomorrow
                                  ? 'Disparar lembrete 24h no WhatsApp com endereço do Studio e link do Google Maps'
                                  : 'Disparar mensagem no WhatsApp (Presencial, Retorno, Pré, Pós, Dúvidas de Valor, PIX)'
                              }
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{isTomorrow ? 'Lembrete 24h (WhatsApp)' : 'WhatsApp'}</span>
                            </button>

                            {/* Botão Recibo TRG */}
                            <button
                              onClick={() => handleOpenReceipt(apt)}
                              className="px-3 py-1.5 rounded-xl bg-amber-600/15 text-amber-600 dark:text-amber-400 hover:bg-amber-600/25 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Emitir Recibo & Declaração em PDF"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-500" />
                              <span>Recibo</span>
                            </button>

                            {/* Botão Ficha de Evolução TRG */}
                            <button
                              onClick={() => handleOpenEvolution(apt)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600/15 text-purple-600 dark:text-purple-400 hover:bg-purple-600/25 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Abrir Ficha de Evolução & Prontuário TRG deste cliente"
                            >
                              <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                              <span>Evolução</span>
                            </button>

                            {/* Botão Ficha de Anamnese TRG */}
                            <button
                              onClick={() => handleOpenAnamnese(apt)}
                              className="px-3 py-1.5 rounded-xl bg-teal-600/15 text-teal-600 dark:text-teal-400 hover:bg-teal-600/25 border border-teal-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Abrir Ficha de Anamnese & Mapeamento de Alvos TRG deste assistido"
                            >
                              <Target className="w-3.5 h-3.5 text-teal-500" />
                              <span>Anamnese</span>
                            </button>

                            {/* Botão Agendar Retorno (7 ou 14 dias) */}
                            <button
                              onClick={() => handleOpenQuickReturn(apt)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600/25 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Agendamento Rápido de Retorno TRG (7 ou 14 dias)"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                              <span>Retorno</span>
                            </button>

                            {apt.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleStartCompletion(apt)}
                                className="px-3.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1 shadow transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Concluir Atendimento
                              </button>
                            )}

                            {apt.status === 'SCHEDULED' && (
                              <button
                                onClick={() => onUpdateAppointmentStatus(apt, 'CONFIRMED')}
                                className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 font-semibold text-xs"
                              >
                                Confirmar
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenAppointmentModal(apt)}
                              className={`p-2 rounded-xl border text-xs ${
                                darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                              }`}
                              title="Editar"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => onDeleteAppointment(apt.id)}
                              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 text-xs"
                              title="Excluir"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: CONTAS E PREVISÕES AGENDADAS DO MÊS */}
      {agendaSubTab === 'bills' && (
        <div className="space-y-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Contas & Previsões ({monthBills.length})
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Contas fixas e parcelamentos a vencer ou quitados neste mês.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilterPaid('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    filterPaid === 'all'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterPaid('paid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    filterPaid === 'paid'
                      ? 'bg-green-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Pagas
                </button>
                <button
                  onClick={() => setFilterPaid('unpaid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    filterPaid === 'unpaid'
                      ? 'bg-yellow-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Pendentes
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {(() => {
                let filtered = monthBills.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                if (filterPaid === 'paid') filtered = filtered.filter(b => b.is_paid);
                if (filterPaid === 'unpaid') filtered = filtered.filter(b => !b.is_paid);

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400">
                      <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-semibold">Nenhuma conta encontrada com esse filtro.</p>
                    </div>
                  );
                }

                return filtered.map(item => {
                  const cat = categories.find(c => c.id === item.category_id);
                  const sDateStr = (item.date || '').split('T')[0];
                  const isPastDue = sDateStr < todayStr && !item.is_paid;
                  const isIncome = item.type === 'income';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isPastDue ? 'border-2 border-red-500' : ''
                      } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat?.color || '#6b7280' }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.description}
                            </h4>
                            {isPastDue && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                Vencida
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            Vencimento: {formatDate(item.date)} • {cat?.name || 'Sem Categoria'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className={`font-extrabold text-sm ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                          {isIncome ? '+' : '-'} {showAmount(item.amount)}
                        </span>

                        {!item.is_paid && (
                          <button
                            onClick={() => payScheduled(item.rawItem || item)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
                          >
                            Dar Baixa (Pagar)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 4: GOOGLE CALENDAR API v3 */}
      {agendaSubTab === 'google-calendar' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'today', label: 'Hoje' },
                { key: 'tomorrow', label: 'Amanhã' },
                { key: 'week', label: 'Esta Semana' },
                { key: 'month', label: 'Este Mês' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setCalendarFilter(key);
                    fetchCalendarEvents(key);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                    calendarFilter === key
                      ? 'bg-blue-600 text-white shadow'
                      : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {loadingCalendar && calendarFilter === key ? 'Carregando...' : label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchCalendarEvents(calendarFilter)}
              className={`text-xs font-bold flex items-center gap-1.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
            >
              🔄 Atualizar Eventos
            </button>
          </div>

          {!hasGoogleToken && (
            <div className={`p-6 rounded-2xl border text-center ${
              darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-blue-500" />
              <h3 className="text-base font-bold mb-1">Conecte sua conta do Google</h3>
              <p className="text-xs mb-4 max-w-md mx-auto text-gray-400">
                Faça login para visualizar e sincronizar seus compromissos e agendamentos profissionais com o Google Calendar.
              </p>
              <button
                onClick={handleGoogleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow"
              >
                Conectar com Google Agenda
              </button>
            </div>
          )}

          {loadingCalendar ? (
            <div className={`p-12 rounded-2xl shadow text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-400">Consultando API do Google Agenda v3...</p>
            </div>
          ) : calendarEvents.length > 0 ? (
            <div className="grid gap-3">
              {calendarEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div>
                    <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {event.summary || 'Sem título'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {event.start?.dateTime
                          ? new Date(event.start.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                          : event.start?.date
                          ? formatDate(event.start.date)
                          : 'Horário não especificado'}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border text-blue-400 border-gray-700 hover:bg-gray-700 self-start sm:self-auto"
                    >
                      Abrir no Google <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : hasGoogleToken ? (
            <div className={`p-12 rounded-2xl shadow text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-xs text-gray-400">Nenhum evento encontrado no Google Agenda para o período selecionado.</p>
            </div>
          ) : null}
        </div>
      )}

      {/* MODAL: NOVO / EDITAR AGENDAMENTO */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-blue-500" />
                {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento Profissional'}
              </h3>
              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  setEditingAppointment(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointmentSubmit} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-400">Título do Atendimento / Serviço</label>
                  <div className="flex items-center gap-1">
                    {['Sessão TRG', 'Retorno TRG', 'Avaliação'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setAppTitle(tag);
                          if (!appServiceValue) setAppServiceValue('150');
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold transition-colors cursor-pointer"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sessão TRG, Avaliação..."
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={appClientName}
                    onChange={(e) => setAppClientName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Ex: (11) 98765-4321"
                    value={appClientPhone}
                    onChange={(e) => setAppClientPhone(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Data</label>
                  <input
                    type="date"
                    required
                    value={appDate}
                    onChange={(e) => setAppDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Horário Início</label>
                  <input
                    type="time"
                    required
                    value={appStartTime}
                    onChange={(e) => setAppStartTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Horário Fim</label>
                  <input
                    type="time"
                    required
                    value={appEndTime}
                    onChange={(e) => setAppEndTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-400">Valor do Atendimento (R$)</label>
                    <div className="flex items-center gap-1">
                      {['150', '120', '0'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAppServiceValue(val)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold transition-colors cursor-pointer"
                        >
                          {val === '0' ? 'Cortesia' : `R$ ${val}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="150,00"
                    value={appServiceValue}
                    onChange={(e) => setAppServiceValue(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Categoria Financeira</label>
                  <select
                    value={appCategoryId}
                    onChange={(e) => setAppCategoryId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    {categories
                      .filter(c => c.type === 'income')
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Checkbox Sincronizar Google Agenda */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  <div>
                    <label htmlFor="appSyncGoogle" className="text-xs font-bold block cursor-pointer">
                      Sincronizar com Google Agenda
                    </label>
                    <span className="text-[10px] text-gray-400">
                      Cria evento via Google Calendar API v3
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  id="appSyncGoogle"
                  checked={appSyncGoogle}
                  onChange={(e) => setAppSyncGoogle(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAppointmentModal(false);
                    setEditingAppointment(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
                >
                  Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE CONCLUSÃO E VINCULAÇÃO FINANCEIRA */}
      {completingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Concluir Atendimento
              </h3>
              <button
                onClick={() => setCompletingAppointment(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Cliente:</span>
                <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{completingAppointment.client_name}</strong>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Serviço:</span>
                <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{completingAppointment.title}</strong>
              </div>

              {/* CARD DE CONFIGURAÇÃO DA RECEITA FINANCEIRA */}
              <div className={`p-4 rounded-xl border space-y-3.5 ${
                darkMode ? 'bg-green-950/20 border-green-800/60' : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-bold text-green-500 uppercase tracking-wider">
                    Vinculação Financeira Automática
                  </span>
                </div>

                {/* Campo Valor do Serviço */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Valor Cobrado (R$):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-green-500">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={completionAmount}
                      onChange={(e) => setCompletionAmount(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm font-black border ${
                        darkMode
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-green-500 outline-none`}
                    />
                  </div>
                </div>

                {/* Campo Categoria de Receita */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Categoria da Receita:
                  </label>
                  <select
                    value={completionCategoryId}
                    onChange={(e) => setCompletionCategoryId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-green-500 outline-none`}
                  >
                    {categories.filter(c => c.type === 'income').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status do Pagamento */}
                <div className="pt-2 border-t border-green-800/40 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    Status do Recebimento:
                  </span>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="paymentConfirmation"
                      checked={directPaymentOption === true}
                      onChange={() => setDirectPaymentOption(true)}
                      className="text-green-600 focus:ring-green-500 accent-green-600"
                    />
                    <span>🟢 Já foi recebido / Quitado agora (PIX, dinheiro ou cartão)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="paymentConfirmation"
                      checked={directPaymentOption === false}
                      onChange={() => setDirectPaymentOption(false)}
                      className="text-yellow-600 focus:ring-yellow-500 accent-yellow-600"
                    />
                    <span>🟡 Lançar como A Receber (Cliente pagará depois)</span>
                  </label>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic">
                💡 O lançamento será gravado em tempo real em Lançamentos e sincronizado no Supabase.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex-wrap">
              <button
                type="button"
                onClick={() => setCompletingAppointment(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                } cursor-pointer`}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  const val = parseFloat(completionAmount) || 0;
                  await onUpdateAppointmentStatus(completingAppointment, 'COMPLETED', directPaymentOption, val, completionCategoryId);
                  setCompletingAppointment(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-200' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                } cursor-pointer`}
              >
                Apenas Concluir
              </button>

              <button
                type="button"
                onClick={async () => {
                  const targetApt = completingAppointment;
                  const val = parseFloat(completionAmount) || 0;
                  await onUpdateAppointmentStatus(completingAppointment, 'COMPLETED', directPaymentOption, val, completionCategoryId);
                  setCompletingAppointment(null);
                  if (targetApt) {
                    handleOpenQuickReturn(targetApt);
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Concluir no financeiro e agendar retorno em 7 ou 14 dias"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Concluir & Agendar Retorno</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const targetApt = completingAppointment;
                  const val = parseFloat(completionAmount) || 0;
                  await onUpdateAppointmentStatus(completingAppointment, 'COMPLETED', directPaymentOption, val, completionCategoryId);
                  setCompletingAppointment(null);
                  if (targetApt) {
                    handleOpenReceipt({ ...targetApt, service_value: val, status: 'COMPLETED' });
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-lg shadow-amber-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Concluir no financeiro e gerar recibo em PDF"
              >
                <FileText className="w-4 h-4" />
                <span>Concluir & Gerar Recibo</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const targetApt = completingAppointment;
                  const val = parseFloat(completionAmount) || 0;
                  await onUpdateAppointmentStatus(completingAppointment, 'COMPLETED', directPaymentOption, val, completionCategoryId);
                  setCompletingAppointment(null);
                  if (targetApt) {
                    handleOpenWhatsApp(targetApt, 'after');
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-95 text-white shadow-lg shadow-green-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Concluir no financeiro e abrir mensagem de pós-sessão TRG no WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Concluir & Abrir Pós no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DISPARADOR WHATSAPP TRG */}
      <WhatsAppTRGModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        appointment={whatsAppTargetAppointment}
        allAppointments={appointments}
        darkMode={darkMode}
        initialType={whatsAppInitialType}
      />

      {/* MODAL DE RECIBO & DECLARAÇÃO TRG */}
      <ReceiptTRGModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        appointment={receiptTargetAppointment}
        allAppointments={appointments}
        darkMode={darkMode}
      />

      {/* MODAL DE AGENDAMENTO RÁPIDO DE RETORNO TRG (7 ou 14 dias) */}
      <QuickReturnModal
        isOpen={quickReturnModalOpen}
        onClose={() => setQuickReturnModalOpen(false)}
        sourceAppointment={quickReturnTargetAppointment}
        darkMode={darkMode}
        categories={categories}
        hasGoogleToken={hasGoogleToken}
        onConfirmReturn={handleConfirmReturnAppointment}
      />

      {/* MODAL DE FICHA DE EVOLUÇÃO & PRONTUÁRIO TRG */}
      <ClientEvolutionModal
        isOpen={evolutionModalOpen}
        onClose={() => setEvolutionModalOpen(false)}
        appointment={evolutionTargetAppointment}
        allAppointments={appointments}
        darkMode={darkMode}
        onOpenWhatsApp={handleOpenWhatsApp}
        onOpenQuickReturn={handleOpenQuickReturn}
        onOpenAnamnese={handleOpenAnamnese}
      />

      {/* MODAL DE FICHA DE ANAMNESE & MAPEAMENTO DE ALVOS TRG */}
      <ClientAnamneseModal
        isOpen={anamneseModalOpen}
        onClose={() => setAnamneseModalOpen(false)}
        appointment={anamneseTargetAppointment}
        allAppointments={appointments}
        darkMode={darkMode}
        onOpenEvolution={handleOpenEvolution}
      />
    </div>
  );
}

/* ========================================================================= */
/* COMPONENTE INTERNO: FICHA DE EVOLUÇÃO & PRONTUÁRIO CLÍNICO TRG           */
/* (Incluso diretamente no AgendaView para compatibilidade 100% no Vercel)  */
/* ========================================================================= */

export type TRGPhase =
  | 'cronologico'
  | 'somatico'
  | 'tematico'
  | 'futuro'
  | 'potencializacao'
  | 'manutencao';

export interface EvolutionRecord {
  id: string;
  clientKey: string;
  clientName: string;
  clientPhone: string;
  appointmentId?: string;
  date: string;
  time?: string;
  sessionNumber: number;
  phase: TRGPhase;
  sudInitial: number;
  sudFinal: number;
  chiefComplaint: string;
  reprocessedEvents: string;
  postSessionObservations: string;
  nextSessionNotes: string;
  createdAt: string;
}

interface ClientEvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  allAppointments: Appointment[];
  darkMode: boolean;
  onOpenWhatsApp?: (apt: Appointment | null, type?: any) => void;
  onOpenQuickReturn?: (apt: Appointment) => void;
  onOpenAnamnese?: (apt?: Appointment | null) => void;
}

export const TRG_PHASES_INFO: Record<
  TRGPhase,
  { label: string; number: string; description: string; color: string; badgeBg: string }
> = {
  cronologico: {
    label: 'Método Cronológico',
    number: 'Fase 1',
    description: 'Reprocessamento histórico: infância, adolescência até a fase adulta.',
    color: 'text-purple-500',
    badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
  },
  somatico: {
    label: 'Método Somático',
    number: 'Fase 2',
    description: 'Reprocessamento de sensações físicas, dores somatizadas e memória corporal.',
    color: 'text-blue-500',
    badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
  },
  tematico: {
    label: 'Método Temático',
    number: 'Fase 3',
    description: 'Foco em temas específicos: luto, fobias, abusos, medos ou bloqueios pontuais.',
    color: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  },
  futuro: {
    label: 'Método Futuro',
    number: 'Fase 4',
    description: 'Projeção e reprocessamento de cenários futuros com serenidade e confiança.',
    color: 'text-amber-500',
    badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
  },
  potencializacao: {
    label: 'Potencialização',
    number: 'Fase 5',
    description: 'Fixação de recursos emocionais, autoestima fortalecida e novo padrão de vida.',
    color: 'text-rose-500',
    badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
  },
  manutencao: {
    label: 'Manutenção / Retorno',
    number: 'Acompanhamento',
    description: 'Consolidação de resultados, acolhimento periódico e sustentação.',
    color: 'text-indigo-500',
    badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
  }
};

const EVOLUTION_STORAGE_KEY = 'trg_client_evolutions';

function loadAllEvolutions(): EvolutionRecord[] {
  try {
    const raw = localStorage.getItem(EVOLUTION_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAllEvolutions(records: EvolutionRecord[]) {
  try {
    localStorage.setItem(EVOLUTION_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Erro ao salvar evoluções no localStorage:', err);
  }
}

async function getDeterministicCloudUuid(userId: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode('trg_cloud_sync_prefix_' + (userId || 'marcondes_trg_owner'));
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
    return '003d1365-a35c-4ef2-8fb8-8be9b81d612d';
  }
}

async function syncEvolutionsToCloud(records: EvolutionRecord[]): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id;
    if (!userId) {
      const savedUser = localStorage.getItem('finance_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          userId = parsed.id;
        } catch {}
      }
    }
    if (!userId) {
      console.info('[CloudSync] Nenhum usuário conectado no momento. Dados mantidos localmente.');
      return false;
    }

    const syncUuid = await getDeterministicCloudUuid(userId);
    const payload = '[TRG_CLOUD_SYNC]' + JSON.stringify(records);

    // 1. Salvar no payload em nuvem garantido (tabela transactions)
    await supabase.from('transactions').upsert({
      id: syncUuid,
      user_id: userId,
      description: payload,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      type: 'income'
    });

    // 2. Se a tabela client_evolutions existir no Supabase, salvar lá também
    try {
      const recordsToUpsert = records.map(r => ({
        id: r.id,
        user_id: userId,
        client_key: r.clientKey,
        client_name: r.clientName,
        client_phone: r.clientPhone,
        date: r.date,
        time: r.time,
        session_number: r.sessionNumber,
        phase: r.phase,
        sud_initial: r.sudInitial,
        sud_final: r.sudFinal,
        chief_complaint: r.chiefComplaint,
        reprocessed_events: r.reprocessedEvents,
        post_session_observations: r.postSessionObservations,
        next_session_notes: r.nextSessionNotes,
        created_at: r.createdAt
      }));
      await supabase.from('client_evolutions').upsert(recordsToUpsert);
    } catch {
      // Tabela dedicada opcional ainda não criada
    }

    return true;
  } catch (err) {
    console.warn('[CloudSync] Aviso na sincronização em nuvem:', err);
    return false;
  }
}

async function fetchEvolutionsFromCloud(): Promise<EvolutionRecord[] | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id;
    if (!userId) {
      const savedUser = localStorage.getItem('finance_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          userId = parsed.id;
        } catch {}
      }
    }
    if (!userId) return null;

    // 1. Tentar ler de client_evolutions se existir
    try {
      const { data: directData, error: errDirect } = await supabase
        .from('client_evolutions')
        .select('*')
        .eq('user_id', userId);
      if (!errDirect && directData && directData.length > 0) {
        return directData.map((d: any) => ({
          id: d.id,
          clientKey: d.client_key,
          clientName: d.client_name,
          clientPhone: d.client_phone || '',
          date: d.date,
          time: d.time || '',
          sessionNumber: d.session_number || 1,
          phase: d.phase || 'cronologico',
          sudInitial: d.sud_initial || 8,
          sudFinal: d.sud_final || 1,
          chiefComplaint: d.chief_complaint || '',
          reprocessedEvents: d.reprocessed_events || '',
          postSessionObservations: d.post_session_observations || '',
          nextSessionNotes: d.next_session_notes || '',
          createdAt: d.created_at || new Date().toISOString()
        }));
      }
    } catch {}

    // 2. Ler do payload de sincronização
    const syncUuid = await getDeterministicCloudUuid(userId);
    const { data: txData, error: errTx } = await supabase
      .from('transactions')
      .select('description')
      .eq('id', syncUuid);

    if (!errTx && txData && txData.length > 0) {
      const desc = txData[0]?.description || '';
      if (desc.startsWith('[TRG_CLOUD_SYNC]')) {
        const rawJson = desc.replace('[TRG_CLOUD_SYNC]', '');
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          return parsed as EvolutionRecord[];
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[CloudSync] Aviso ao carregar dados da nuvem:', err);
    return null;
  }
}

export function ClientEvolutionModal({
  isOpen,
  onClose,
  appointment,
  allAppointments = [],
  darkMode,
  onOpenWhatsApp,
  onOpenQuickReturn,
  onOpenAnamnese
}: ClientEvolutionModalProps) {
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedClientPhone, setSelectedClientPhone] = useState('');
  const [evolutions, setEvolutions] = useState<EvolutionRecord[]>(() => loadAllEvolutions());
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [sessionNumber, setSessionNumber] = useState(1);
  const [phase, setPhase] = useState<TRGPhase>('cronologico');
  const [sudInitial, setSudInitial] = useState(8);
  const [sudFinal, setSudFinal] = useState(1);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [reprocessedEvents, setReprocessedEvents] = useState('');
  const [postSessionObservations, setPostSessionObservations] = useState('');
  const [nextSessionNotes, setNextSessionNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  // Estados de Sincronização em Nuvem & Backup
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const uniqueClients = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number }>();
    (allAppointments || []).forEach(apt => {
      const name = (apt.client_name || apt.title || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name, phone: apt.client_phone || '', count: 1 });
      } else {
        const item = map.get(key)!;
        item.count += 1;
        if (!item.phone && apt.client_phone) item.phone = apt.client_phone;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allAppointments]);

  useEffect(() => {
    if (isOpen) {
      setEvolutions(loadAllEvolutions());
      setSaveSuccess(false);

      if (appointment) {
        const name = (appointment.client_name || appointment.title || '').trim();
        setSelectedClientName(name);
        setSelectedClientPhone(appointment.client_phone || '');

        const sDate = (appointment.start_time || '').split('T')[0] || new Date().toISOString().split('T')[0];
        const sTime = appointment.start_time ? appointment.start_time.substring(11, 16) : '09:00';
        setSessionDate(sDate);
        setSessionTime(sTime);

        const clientKey = name.toLowerCase();
        const clientApts = (allAppointments || []).filter(a =>
          (a.client_name || a.title || '').trim().toLowerCase() === clientKey && a.status === 'COMPLETED'
        );
        const nextNum = Math.max(1, clientApts.length + 1);
        setSessionNumber(nextNum);

        setEditingRecordId(null);
        setChiefComplaint('');
        setReprocessedEvents('');
        setPostSessionObservations('');
        setNextSessionNotes('');
        setSudInitial(8);
        setSudFinal(1);
        setPhase('cronologico');
        setActiveTab('form');
      } else if (uniqueClients.length > 0) {
        setSelectedClientName(prev => (prev ? prev : uniqueClients[0].name));
        setSelectedClientPhone(prev => (prev ? prev : uniqueClients[0].phone));
        setSessionDate(new Date().toISOString().split('T')[0]);
        setSessionTime('09:00');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appointment, allAppointments, uniqueClients]);

  const currentClientKey = selectedClientName.trim().toLowerCase();

  const clientHistory = useMemo(() => {
    if (!currentClientKey) return [];
    return evolutions
      .filter(e => (e.clientKey || e.clientName.toLowerCase()) === currentClientKey)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [evolutions, currentClientKey]);

  const clientAppointments = useMemo(() => {
    if (!currentClientKey) return [];
    return (allAppointments || []).filter(a =>
      (a.client_name || a.title || '').trim().toLowerCase() === currentClientKey
    );
  }, [allAppointments, currentClientKey]);

  const handleSelectClient = (name: string) => {
    setSelectedClientName(name);
    const found = uniqueClients.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSelectedClientPhone(found.phone);
    }
    const clientKey = name.toLowerCase();
    const existing = evolutions.filter(e => (e.clientKey || e.clientName.toLowerCase()) === clientKey);
    setSessionNumber(existing.length + 1);
    setEditingRecordId(null);
  };

  const handleEditRecord = (record: EvolutionRecord) => {
    setEditingRecordId(record.id);
    setSelectedClientName(record.clientName);
    setSelectedClientPhone(record.clientPhone || '');
    setSessionDate(record.date);
    setSessionTime(record.time || '09:00');
    setSessionNumber(record.sessionNumber || 1);
    setPhase(record.phase || 'cronologico');
    setSudInitial(record.sudInitial ?? 8);
    setSudFinal(record.sudFinal ?? 1);
    setChiefComplaint(record.chiefComplaint || '');
    setReprocessedEvents(record.reprocessedEvents || '');
    setPostSessionObservations(record.postSessionObservations || '');
    setNextSessionNotes(record.nextSessionNotes || '');
    setActiveTab('form');
  };

  const handleSaveEvolution = () => {
    if (!selectedClientName.trim()) return;

    const recordId = editingRecordId || `evo-${Date.now()}`;
    const newRecord: EvolutionRecord = {
      id: recordId,
      clientKey: currentClientKey,
      clientName: selectedClientName.trim(),
      clientPhone: selectedClientPhone.trim(),
      appointmentId: appointment?.id,
      date: sessionDate || new Date().toISOString().split('T')[0],
      time: sessionTime || '09:00',
      sessionNumber: Number(sessionNumber) || 1,
      phase,
      sudInitial: Number(sudInitial) || 0,
      sudFinal: Number(sudFinal) || 0,
      chiefComplaint: chiefComplaint.trim(),
      reprocessedEvents: reprocessedEvents.trim(),
      postSessionObservations: postSessionObservations.trim(),
      nextSessionNotes: nextSessionNotes.trim(),
      createdAt: new Date().toISOString()
    };

    let updatedList: EvolutionRecord[];
    if (editingRecordId) {
      updatedList = evolutions.map(e => (e.id === editingRecordId ? newRecord : e));
    } else {
      updatedList = [newRecord, ...evolutions];
    }

    setEvolutions(updatedList);
    saveAllEvolutions(updatedList);
    syncEvolutionsToCloud(updatedList).then(ok => {
      if (ok) {
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      }
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteRecord = (id: string) => {
    let shouldDelete = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        shouldDelete = window.confirm('Deseja excluir esta anotação de evolução do prontuário?');
      }
    } catch {
      shouldDelete = true;
    }
    if (shouldDelete) {
      const updatedList = evolutions.filter(e => e.id !== id);
      setEvolutions(updatedList);
      saveAllEvolutions(updatedList);
      syncEvolutionsToCloud(updatedList).then(ok => {
        if (ok) {
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
      });
      if (editingRecordId === id) {
        setEditingRecordId(null);
      }
    }
  };

  // Sincronização automática com a nuvem ao abrir a Ficha de Evolução
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function loadCloudData() {
      setSyncStatus('syncing');
      try {
        const cloudRecords = await fetchEvolutionsFromCloud();
        if (isCancelled) return;

        if (cloudRecords && cloudRecords.length > 0) {
          const map = new Map<string, EvolutionRecord>();
          cloudRecords.forEach(r => map.set(r.id, r));
          evolutions.forEach(r => {
            if (!map.has(r.id)) map.set(r.id, r);
          });
          const merged = Array.from(map.values());
          setEvolutions(merged);
          saveAllEvolutions(merged);
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        } else {
          if (evolutions.length > 0) {
            await syncEvolutionsToCloud(evolutions);
          }
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.warn('Erro ao carregar dados da nuvem:', err);
        setSyncStatus('idle');
      }
    }

    loadCloudData();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleManualCloudSync = async () => {
    setSyncStatus('syncing');
    setCloudMessage('Sincronizando prontuários com a nuvem...');
    try {
      const cloudRecords = await fetchEvolutionsFromCloud();
      const map = new Map<string, EvolutionRecord>();
      if (cloudRecords) {
        cloudRecords.forEach(r => map.set(r.id, r));
      }
      evolutions.forEach(r => {
        if (!map.has(r.id)) map.set(r.id, r);
      });
      const merged = Array.from(map.values());
      setEvolutions(merged);
      saveAllEvolutions(merged);

      await syncEvolutionsToCloud(merged);
      setSyncStatus('synced');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      setCloudMessage(`Nuvem 100% atualizada! (${merged.length} evoluções salvas na nuvem)`);
      setTimeout(() => setCloudMessage(null), 4000);
    } catch {
      setSyncStatus('error');
      setCloudMessage('Não foi possível conectar à nuvem no momento. Seus dados estão salvos neste computador.');
      setTimeout(() => setCloudMessage(null), 4000);
    }
  };

  const handleDownloadBackupJson = () => {
    try {
      const backupPayload = {
        exportDate: new Date().toISOString(),
        appName: 'TRG - Ficha de Evolução & Prontuário Clínico',
        therapist: localStorage.getItem('trg_therapist_name') || 'Marcondes Lima',
        totalRecords: evolutions.length,
        evolutions: evolutions
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `Backup_Prontuarios_TRG_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCloudMessage('Arquivo de backup do prontuário baixado com sucesso!');
      setTimeout(() => setCloudMessage(null), 4000);
    } catch (err) {
      console.warn('Erro ao exportar backup:', err);
    }
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedRecords: EvolutionRecord[] = Array.isArray(parsed)
          ? parsed
          : (parsed.evolutions && Array.isArray(parsed.evolutions))
          ? parsed.evolutions
          : [];

        if (importedRecords.length === 0) {
          setCloudMessage('Nenhum registro de evolução encontrado no arquivo selecionado.');
          setTimeout(() => setCloudMessage(null), 4000);
          return;
        }

        const map = new Map<string, EvolutionRecord>();
        evolutions.forEach(r => map.set(r.id, r));
        importedRecords.forEach(r => map.set(r.id, r));
        const merged = Array.from(map.values());

        setEvolutions(merged);
        saveAllEvolutions(merged);
        await syncEvolutionsToCloud(merged);

        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setCloudMessage(`Sucesso! ${importedRecords.length} evoluções restauradas e sincronizadas na nuvem!`);
        setShowBackupModal(false);
        setTimeout(() => setCloudMessage(null), 5000);
      } catch (err: any) {
        setCloudMessage('Erro ao ler arquivo de backup: ' + err.message);
        setTimeout(() => setCloudMessage(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNewRecord = () => {
    setEditingRecordId(null);
    setSessionDate(new Date().toISOString().split('T')[0]);
    setSessionTime('09:00');
    setSessionNumber(clientHistory.length + 1);
    setChiefComplaint('');
    setReprocessedEvents('');
    setPostSessionObservations('');
    setNextSessionNotes('');
    setSudInitial(8);
    setSudFinal(1);
    setPhase('cronologico');
    setActiveTab('form');
  };

  const generateProntuarioHtml = (records: EvolutionRecord[], client: string, phone: string) => {
    const therapistName = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_name')) || 'Marcondes Lima';
    const therapistTitle = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_title')) || 'Terapeuta Emocional TRG';
    const therapistReg = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_reg')) || 'CITRG 00.000';
    const therapistPhone = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_phone')) || '';
    const therapistCity = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_city')) || 'Tangará da Serra - MT';
    const therapistLogo = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_receipt_logo')) || '';

    const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Ordenação cronológica (da 1ª sessão até a mais recente)
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalSessions = sorted.length;
    const avgInitialSud = totalSessions > 0
      ? (sorted.reduce((acc, curr) => acc + (curr.sudInitial || 0), 0) / totalSessions).toFixed(1)
      : '0';
    const avgFinalSud = totalSessions > 0
      ? (sorted.reduce((acc, curr) => acc + (curr.sudFinal || 0), 0) / totalSessions).toFixed(1)
      : '0';
    const totalReliefPoints = totalSessions > 0
      ? sorted.reduce((acc, curr) => acc + Math.max(0, (curr.sudInitial || 0) - (curr.sudFinal || 0)), 0)
      : 0;

    const latestPhase = totalSessions > 0 ? sorted[sorted.length - 1].phase : phase;
    const latestPhaseInfo = TRG_PHASES_INFO[latestPhase] || TRG_PHASES_INFO.cronologico;

    const logoHtml = therapistLogo
      ? `<img src="${therapistLogo}" alt="Logo" style="max-height: 52px; max-width: 140px; object-fit: contain;" />`
      : `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 15px;">
            TRG
          </div>
          <div>
            <div style="font-size: 12pt; font-weight: 800; color: #4c1d95; letter-spacing: -0.5px; line-height: 1.1;">TRG Clínico</div>
            <div style="font-size: 7.5pt; color: #64748b; font-weight: 600;">Reprocessamento Generativo</div>
          </div>
        </div>
      `;

    const sessionsHtml = sorted.map((rec, idx) => {
      const pInfo = TRG_PHASES_INFO[rec.phase] || TRG_PHASES_INFO.cronologico;
      const relief = Math.max(0, (rec.sudInitial || 0) - (rec.sudFinal || 0));
      const formattedDate = rec.date ? rec.date.split('-').reverse().join('/') : '-';

      return `
        <div class="session-card">
          <div class="session-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="session-num">${rec.sessionNumber || idx + 1}ª Sessão</span>
              <span class="session-badge">${pInfo.number} • ${pInfo.label}</span>
            </div>
            <div style="font-size: 8.5pt; color: #475569; font-weight: 700;">
              📅 ${formattedDate} ${rec.time ? `às ${rec.time}` : ''}
            </div>
          </div>
          <div class="session-body">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 5px 8px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="font-size: 8pt; font-weight: 800; color: #334155; text-transform: uppercase;">Nível de Incômodo Emocional (SUD 0-10):</span>
              <div>
                <span class="sud-badge">Inicial: <strong>${rec.sudInitial}/10</strong> ➔ Final: <strong>${rec.sudFinal}/10</strong></span>
                ${relief > 0 ? `<span class="sud-relief">(-${relief} pts de alívio)</span>` : ''}
              </div>
            </div>

            <div class="session-grid">
              ${rec.chiefComplaint ? `
                <div class="field-group">
                  <label>Queixa / Demanda Trabalhada:</label>
                  <p>${rec.chiefComplaint.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
              ` : ''}

              ${rec.reprocessedEvents ? `
                <div class="field-group" style="margin-top: 6px;">
                  <label>Eventos & Memórias Reprocessadas:</label>
                  <p>${rec.reprocessedEvents.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
              ` : ''}

              ${rec.postSessionObservations ? `
                <div class="field-group" style="margin-top: 6px;">
                  <label>Reações Físicas & Estado Pós-Sessão:</label>
                  <p>${rec.postSessionObservations.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
              ` : ''}

              ${rec.nextSessionNotes ? `
                <div class="field-group" style="margin-top: 6px;">
                  <label>Orientações / Próxima Sessão:</label>
                  <p style="color: #4338ca; font-weight: 600;">${rec.nextSessionNotes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Prontuário TRG - ${client.replace(/"/g, '')}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.45;
      font-size: 9.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print-bar {
      background: #6d28d9;
      color: #ffffff;
      padding: 10px 18px;
      margin-bottom: 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 10px rgba(109, 40, 217, 0.2);
    }
    .print-btn {
      background: #ffffff;
      color: #6d28d9;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 9pt;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover {
      background: #f3e8ff;
    }
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left h1 {
      font-size: 14pt;
      font-weight: 800;
      color: #4c1d95;
      letter-spacing: -0.4px;
      margin-top: 3px;
    }
    .header-left p {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      margin-top: 1px;
    }
    .header-right {
      text-align: right;
    }
    .therapist-name {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
    }
    .therapist-sub {
      font-size: 8pt;
      color: #64748b;
      line-height: 1.3;
    }
    .client-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 10px;
    }
    .client-item label {
      display: block;
      font-size: 6.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 1px;
    }
    .client-item span {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      display: block;
    }
    .summary-metrics {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }
    .metric-box {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #faf5ff;
      border-left: 3px solid #7c3aed;
    }
    .metric-title {
      font-size: 6.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #6b21a8;
      margin-bottom: 1px;
    }
    .metric-value {
      font-size: 11pt;
      font-weight: 800;
      color: #4c1d95;
    }
    .metric-desc {
      font-size: 7.5pt;
      color: #64748b;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #334155;
      margin-bottom: 10px;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .session-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 10px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
    }
    .session-header {
      background: #f1f5f9;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .session-num {
      font-weight: 800;
      font-size: 9pt;
      color: #4338ca;
    }
    .session-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 700;
      background: #ede9fe;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
    }
    .session-body {
      padding: 8px 10px;
    }
    .session-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 5px;
    }
    .field-group label {
      font-size: 7pt;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      display: block;
      margin-bottom: 1px;
    }
    .field-group p {
      font-size: 8.5pt;
      color: #1e293b;
      line-height: 1.35;
      white-space: pre-wrap;
    }
    .sud-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
      font-weight: 700;
      color: #334155;
    }
    .sud-relief {
      color: #15803d;
      font-weight: 800;
      font-size: 8pt;
      margin-left: 5px;
    }
    .footer {
      margin-top: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 16px;
      margin-bottom: 14px;
    }
    .signature-box {
      text-align: center;
      width: 240px;
    }
    .signature-line {
      border-bottom: 1px solid #475569;
      margin-bottom: 4px;
      height: 28px;
    }
    .disclaimer {
      font-size: 6.8pt;
      color: #94a3b8;
      text-align: justify;
      line-height: 1.3;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>📄 Prontuário Clínico TRG de ${client.replace(/"/g, '')}</strong>
      <div style="font-size: 8pt; opacity: 0.9; margin-top: 2px;">
        💡 Na janela de impressão, escolha o destino <strong>"Salvar como PDF"</strong> para baixar o arquivo no seu computador ou celular.
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="print-btn" onclick="window.print()">
        📥 Salvar como PDF
      </button>
      <button class="print-btn" style="background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.4);" onclick="window.close()">
        Fechar
      </button>
    </div>
  </div>

  <div class="container">
    <div class="header">
      <div class="header-left">
        ${logoHtml}
        <h1>Prontuário Clínico & Evolução TRG</h1>
        <p>Terapia de Reprocessamento Generativo • Documento Sigiloso & Privativo</p>
      </div>
      <div class="header-right">
        <div class="therapist-name">${therapistName}</div>
        <div class="therapist-sub">${therapistTitle}</div>
        <div class="therapist-sub">Registro: <strong>${therapistReg}</strong></div>
        ${therapistPhone ? `<div class="therapist-sub">Contato: ${therapistPhone}</div>` : ''}
        <div class="therapist-sub">${therapistCity}</div>
      </div>
    </div>

    <div class="client-card">
      <div class="client-item">
        <label>Cliente / Assistido</label>
        <span>${client}</span>
      </div>
      <div class="client-item">
        <label>Telefone / WhatsApp</label>
        <span>${phone || 'Não informado'}</span>
      </div>
      <div class="client-item">
        <label>Data de Emissão</label>
        <span>${todayStr}</span>
      </div>
    </div>

    <div class="summary-metrics">
      <div class="metric-box">
        <div class="metric-title">Total de Sessões</div>
        <div class="metric-value">${totalSessions} ${totalSessions === 1 ? 'Sessão' : 'Sessões'}</div>
        <div class="metric-desc">Registros arquivados no prontuário</div>
      </div>
      <div class="metric-box">
        <div class="metric-title">Fase Atual da TRG</div>
        <div class="metric-value" style="font-size: 10.5pt;">${latestPhaseInfo.label}</div>
        <div class="metric-desc">${latestPhaseInfo.number} do protocolo TRG</div>
      </div>
      <div class="metric-box">
        <div class="metric-title">Evolução do Alívio (SUD)</div>
        <div class="metric-value" style="font-size: 10.5pt;">${avgInitialSud}/10 ➔ ${avgFinalSud}/10</div>
        <div class="metric-desc">${totalReliefPoints} pontos de redução emocional</div>
      </div>
    </div>

    <div class="section-title">
      <span>Histórico Detalhado das Sessões de Reprocessamento</span>
      <span style="font-size: 7.5pt; font-weight: normal; color: #64748b;">Ordem Cronológica</span>
    </div>

    ${sessionsHtml || `
      <div style="text-align: center; padding: 25px; border: 1px dashed #cbd5e1; border-radius: 6px; color: #64748b; font-size: 8.5pt;">
        Nenhuma anotação de sessão gravada anteriormente para este cliente.
      </div>
    `}

    <div class="footer">
      <div class="signature-area">
        <div>
          <p style="font-size: 8pt; color: #475569;">
            Emissão: <strong>${therapistCity}</strong>, em <strong>${todayStr}</strong>.
          </p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div style="font-size: 9pt; font-weight: 700; color: #0f172a;">${therapistName}</div>
          <div style="font-size: 7.5pt; color: #64748b;">${therapistTitle} • ${therapistReg}</div>
        </div>
      </div>

      <p class="disclaimer">
        <strong>Aviso de Sigilo Profissional:</strong> Este prontuário contém informações pessoais e de saúde emocional protegidas pelo sigilo profissional terapêutico e pela Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). É vedada a reprodução total ou parcial, cópia ou divulgação sem autorização formal expressa do terapeuta e do cliente.
      </p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {
          console.warn('Auto-print dialog error:', e);
        }
      }, 350);
    };
  </script>
</body>
</html>`;
  };

  const handleExportPDF = (directDownload = false) => {
    try {
      setExportingPdf(true);
      let recordsToExport = [...clientHistory];

      // Se não há histórico salvo mas o terapeuta preencheu anotações na tela, incluir a sessão atual
      if (recordsToExport.length === 0 && (chiefComplaint.trim() || reprocessedEvents.trim() || postSessionObservations.trim())) {
        recordsToExport = [
          {
            id: 'draft-current',
            clientKey: currentClientKey,
            clientName: selectedClientName,
            clientPhone: selectedClientPhone,
            date: sessionDate || new Date().toISOString().split('T')[0],
            time: sessionTime || '09:00',
            sessionNumber: sessionNumber || 1,
            phase: phase,
            sudInitial: sudInitial,
            sudFinal: sudFinal,
            chiefComplaint: chiefComplaint,
            reprocessedEvents: reprocessedEvents,
            postSessionObservations: postSessionObservations,
            nextSessionNotes: nextSessionNotes,
            createdAt: new Date().toISOString()
          }
        ];
      }

      const htmlContent = generateProntuarioHtml(recordsToExport, selectedClientName || 'Cliente', selectedClientPhone);

      if (directDownload) {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = (selectedClientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `Prontuario_TRG_${cleanName}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setPdfFeedback('Arquivo do prontuário baixado com sucesso!');
        setTimeout(() => setPdfFeedback(null), 4000);
        setExportingPdf(false);
        return;
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setPdfFeedback('Janela aberta! Selecione "Salvar como PDF" em Destino.');
        setTimeout(() => setPdfFeedback(null), 5000);
      } else {
        // Fallback para iframe invisível
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(htmlContent);
        iframe.contentDocument?.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const cleanName = (selectedClientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
            a.download = `Prontuario_TRG_${cleanName}_${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 4000);
        }, 400);
        setPdfFeedback('Preparando impressão para Salvar como PDF...');
        setTimeout(() => setPdfFeedback(null), 5000);
      }
    } catch (err) {
      console.warn('Erro ao exportar PDF:', err);
      setPdfFeedback('Erro ao gerar PDF. Tente salvar ou imprimir.');
      setTimeout(() => setPdfFeedback(null), 4000);
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    handleExportPDF(false);
  };

  if (!isOpen) return null;

  const currentPhaseInfo = TRG_PHASES_INFO[phase] || TRG_PHASES_INFO.cronologico;
  const reliefPoints = Math.max(0, sudInitial - sudFinal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all ${
          darkMode ? 'bg-gray-850 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* CABEÇALHO */}
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-transparent flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black">
                  Ficha de Evolução & Prontuário TRG
                </h2>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Privativo • {currentPhaseInfo.number}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Acompanhamento clínico, fases da TRG e alívio emocional do cliente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Indicador de Nuvem */}
            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={syncStatus === 'syncing'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/60'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-950/40 text-blue-400 border-blue-500/30 animate-pulse'
                  : 'bg-purple-950/40 text-purple-300 border-purple-500/30 hover:bg-purple-950/60'
              }`}
              title="Clique para sincronizar o prontuário com a nuvem agora"
            >
              <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-bounce text-blue-400' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">
                {syncStatus === 'syncing'
                  ? 'Sincronizando...'
                  : syncStatus === 'synced'
                  ? `Nuvem Ativa • ${lastSyncTime || 'Sincronizado'}`
                  : 'Sincronizar Nuvem'}
              </span>
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>

            {/* Botão de Backup Nuvem / Outro PC */}
            <button
              type="button"
              onClick={() => setShowBackupModal(prev => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-600 hover:bg-gray-700/50 text-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Opções de Backup e Sincronização entre computadores"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Backup Nuvem / PC</span>
            </button>

            {/* Botão Anamnese & Alvos TRG */}
            {onOpenAnamnese && (
              <button
                type="button"
                onClick={() => {
                  const matched = allAppointments.find(a => a.client_name === selectedClientName) || appointment;
                  onClose();
                  onOpenAnamnese(matched);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 border border-teal-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir Anamnese & Mapeamento de Alvos deste assistido"
              >
                <Target className="w-3.5 h-3.5 text-teal-400" />
                <span>Anamnese & Alvos</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input Oculto para Importar Backup JSON */}
        <input
          type="file"
          ref={backupFileInputRef}
          onChange={handleImportBackupJson}
          accept=".json"
          className="hidden"
        />

        {/* MENSAGEM DE STATUS DA NUVEM */}
        {cloudMessage && (
          <div className="px-5 py-2.5 bg-indigo-950/80 border-b border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <span>{cloudMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setCloudMessage(null)}
              className="text-xs text-indigo-300 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* GAVETA DE BACKUP NUVEM / MULTI-PC */}
        {showBackupModal && (
          <div className="p-4 sm:p-5 border-b border-purple-500/30 bg-purple-950/40 animate-fadeIn space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Sincronização em Nuvem & Acesso em Outro Computador
                </h4>
                <p className="text-xs text-purple-200/80 mt-1 max-w-2xl leading-relaxed">
                  Suas anotações de evolução e prontuário clínico são <strong>salvas automaticamente na nuvem Supabase</strong> vinculada à sua conta. Ao abrir o aplicativo em outro PC e fazer login com seu e-mail (<strong>marcondestl@gmail.com</strong>), todos os prontuários são restaurados na hora!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleManualCloudSync}
                disabled={syncStatus === 'syncing'}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Forçar Sincronização Agora</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBackupJson}
                className="px-3.5 py-2 rounded-xl border border-purple-500/40 bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                title="Baixar arquivo JSON com todas as evoluções para pendrive ou Google Drive"
              >
                <FileDown className="w-3.5 h-3.5 text-purple-400" />
                <span>Baixar Backup do Prontuário (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl border border-gray-600 hover:bg-gray-700/50 text-gray-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                title="Importar arquivo JSON de backup salvo de outro PC"
              >
                <Upload className="w-3.5 h-3.5 text-gray-400" />
                <span>Restaurar Backup de Outro PC (.json)</span>
              </button>
            </div>
          </div>
        )}

        {pdfFeedback && (
          <div className="px-5 py-2.5 bg-purple-950/70 border-b border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-purple-400" />
              <span>{pdfFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => handleExportPDF(true)}
              className="text-[11px] underline text-purple-300 hover:text-white cursor-pointer"
              title="Baixar arquivo alternativo .html"
            >
              Baixar arquivo direto (.html)
            </button>
          </div>
        )}

        {/* BARRA DE SELEÇÃO DO CLIENTE & ABAS */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <User className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <select
              value={selectedClientName}
              onChange={e => handleSelectClient(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white focus:border-purple-500'
                  : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
              }`}
            >
              {uniqueClients.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count} sessão{c.count === 1 ? '' : 'ões'})
                </option>
              ))}
              {!uniqueClients.some(c => c.name.toLowerCase() === selectedClientName.toLowerCase()) && selectedClientName && (
                <option value={selectedClientName}>{selectedClientName}</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-purple-600 text-white shadow-md'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{editingRecordId ? 'Editar Evolução' : 'Nova Evolução'}</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-md'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico Clínico ({clientHistory.length})</span>
            </button>

            <button
              onClick={handleNewRecord}
              className="p-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold text-xs transition-colors cursor-pointer"
              title="Iniciar nova anotação de evolução"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <div
            className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-purple-400">
                  {selectedClientName || 'Cliente'}
                </h3>
                {selectedClientPhone && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-500" />
                    {selectedClientPhone}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Total de agendamentos no sistema: <strong>{clientAppointments.length}</strong> • Evoluções registradas: <strong>{clientHistory.length}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenWhatsApp && selectedClientPhone && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenWhatsApp(
                      {
                        id: appointment?.id || 'temp',
                        title: selectedClientName,
                        client_name: selectedClientName,
                        client_phone: selectedClientPhone,
                        start_time: `${sessionDate}T${sessionTime}:00`,
                        end_time: `${sessionDate}T${sessionTime}:00`,
                        service_value: appointment?.service_value || 0,
                        status: 'COMPLETED',
                        synced_google: false
                      },
                      'after'
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/15 text-emerald-500 hover:bg-emerald-600/25 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Enviar mensagem pós-sessão de 48h-72h no WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp Pós-Sessão</span>
                </button>
              )}

              {onOpenQuickReturn && appointment && (
                <button
                  type="button"
                  onClick={() => onOpenQuickReturn(appointment)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/15 text-blue-500 hover:bg-blue-600/25 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Agendar próximo retorno em 7 ou 14 dias"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                  <span>Agendar Retorno</span>
                </button>
              )}

              {onOpenAnamnese && (
                <button
                  type="button"
                  onClick={() => {
                    const matched = allAppointments.find(a => a.client_name === selectedClientName) || appointment;
                    onClose();
                    onOpenAnamnese(matched);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-600/15 text-teal-400 hover:bg-teal-600/25 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Abrir Anamnese & Mapeamento de Alvos deste assistido"
                >
                  <Target className="w-3.5 h-3.5 text-teal-400" />
                  <span>Ver Anamnese</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleExportPDF(false)}
                disabled={exportingPdf}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/25 cursor-pointer disabled:opacity-50"
                title="Baixar prontuário e anotações clínicas em PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{exportingPdf ? 'Gerando...' : 'Baixar em PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl border border-gray-600 hover:bg-gray-700/50 text-gray-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Imprimir prontuário do cliente"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* ABA 1: FORMULÁRIO DE EVOLUÇÃO */}
          {activeTab === 'form' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-purple-400 mb-2">
                  1. Fase Atual da TRG
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(TRG_PHASES_INFO) as TRGPhase[]).map(key => {
                    const info = TRG_PHASES_INFO[key];
                    const isSelected = phase === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPhase(key)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-purple-500 border-purple-500 bg-purple-950/40 shadow-md'
                            : darkMode
                            ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-gray-400">
                            {info.number}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold mt-1 text-white">
                          {info.label}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                          {info.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DADOS DA SESSÃO & NÚMERO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    Data da Sessão
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={sessionTime}
                    onChange={e => setSessionTime(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Número da Sessão
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={sessionNumber}
                      onChange={e => setSessionNumber(parseInt(e.target.value, 10) || 1)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">ª Sessão</span>
                  </div>
                </div>
              </div>

              {/* ESCALA DE INCÔMODO EMOCIONAL (SUD - 0 A 10) */}
              <div
                className={`p-4 rounded-2xl border ${
                  darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-purple-50/50 border-purple-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      2. Nível de Carga Emocional / Incômodo (Escala 0 a 10)
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Avalie o incômodo antes e depois do reprocessamento da sessão.
                    </p>
                  </div>
                  {reliefPoints > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ⚡ Alívio de {reliefPoints} pontos!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-700/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-300">Início da Sessão (Carga)</span>
                      <span className="text-sm font-black text-rose-400">{sudInitial} / 10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={sudInitial}
                      onChange={e => setSudInitial(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>0 (Sem dor)</span>
                      <span>5 (Moderado)</span>
                      <span>10 (Insuportável)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-700/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-300">Fim da Sessão (Pós-Reprocessamento)</span>
                      <span className="text-sm font-black text-emerald-400">{sudFinal} / 10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={sudFinal}
                      onChange={e => setSudFinal(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>0 (Paz total)</span>
                      <span>5 (Resíduo)</span>
                      <span>10 (Sem alívio)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CAMPOS DE ANOTAÇÃO CLÍNICA */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    3. Demanda / Queixa Trazida pelo Cliente Hoje
                  </label>
                  <textarea
                    rows={2}
                    value={chiefComplaint}
                    onChange={e => setChiefComplaint(e.target.value)}
                    placeholder="Ex: Chegou relatando aperto no peito, insônia e medo constante de abandono após discussão familiar recente..."
                    className={`w-full p-3 rounded-xl border text-xs sm:text-sm ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    4. Eventos e Memórias Reprocessadas na TRG
                  </label>
                  <textarea
                    rows={3}
                    value={reprocessedEvents}
                    onChange={e => setReprocessedEvents(e.target.value)}
                    placeholder="Ex: Reprocessado evento aos 7 anos na escola (rejeição). Conseguiu congelar a cena, mudar perspectiva e zerar o nó na garganta..."
                    className={`w-full p-3 rounded-xl border text-xs sm:text-sm ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      5. Reações Físicas & Estado Pós-Sessão
                    </label>
                    <textarea
                      rows={2}
                      value={postSessionObservations}
                      onChange={e => setPostSessionObservations(e.target.value)}
                      placeholder="Ex: Bocejos de liberação, choro de alívio, respiração profunda e sorriso ao final..."
                      className={`w-full p-3 rounded-xl border text-xs sm:text-sm ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      6. Orientações para a Próxima Sessão
                    </label>
                    <textarea
                      rows={2}
                      value={nextSessionNotes}
                      onChange={e => setNextSessionNotes(e.target.value)}
                      placeholder="Ex: Observar sonhos e manter hidratação. Retorno sugerido em 7 dias para iniciar o Método Somático..."
                      className={`w-full p-3 rounded-xl border text-xs sm:text-sm ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: HISTÓRICO COMPLETO DO CLIENTE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  Evoluções Anteriores ({clientHistory.length})
                </h4>
                <div className="flex items-center gap-2">
                  {clientHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExportPDF(false)}
                      disabled={exportingPdf}
                      className="px-3 py-1.5 rounded-xl border border-purple-500/40 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Exportar todas as sessões deste cliente em PDF"
                    >
                      <FileDown className="w-3.5 h-3.5 text-purple-400" />
                      <span>Baixar Prontuário (PDF)</span>
                    </button>
                  )}
                  <button
                    onClick={handleNewRecord}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Evolução</span>
                  </button>
                </div>
              </div>

              {clientHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border border-dashed border-gray-700 rounded-2xl p-6">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-400" />
                  <p className="font-semibold text-sm">
                    Nenhuma anotação de evolução registrada para {selectedClientName}.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Preencha o formulário e clique em "Salvar Evolução" para começar o prontuário.
                  </p>
                  <button
                    onClick={() => setActiveTab('form')}
                    className="mt-3 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
                  >
                    Registrar Primeira Sessão
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientHistory.map(rec => {
                    const phaseInfo = TRG_PHASES_INFO[rec.phase] || TRG_PHASES_INFO.cronologico;
                    const diff = (rec.sudInitial || 0) - (rec.sudFinal || 0);

                    return (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          editingRecordId === rec.id
                            ? 'border-purple-500 ring-2 ring-purple-500/50 bg-purple-950/20'
                            : darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-extrabold flex items-center justify-center text-xs">
                              {rec.sessionNumber}ª
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-sm text-white">
                                  Sessão {rec.sessionNumber} • {phaseInfo.label}
                                </h5>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${phaseInfo.badgeBg}`}>
                                  {phaseInfo.number}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {rec.date} {rec.time ? `às ${rec.time}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-300">
                              SUD: {rec.sudInitial} ➔ {rec.sudFinal}
                              {diff > 0 && <span className="text-emerald-400 ml-1">(-{diff})</span>}
                            </span>

                            <button
                              onClick={() => handleEditRecord(rec)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-xs font-bold cursor-pointer"
                              title="Editar esta anotação"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                              title="Excluir do prontuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {rec.chiefComplaint && (
                          <div className="mt-3 text-xs text-gray-300">
                            <strong className="text-purple-400">Demanda: </strong>
                            {rec.chiefComplaint}
                          </div>
                        )}

                        {rec.reprocessedEvents && (
                          <div className="mt-1.5 text-xs text-gray-300">
                            <strong className="text-purple-400">Reprocessamento: </strong>
                            {rec.reprocessedEvents}
                          </div>
                        )}

                        {rec.postSessionObservations && (
                          <div className="mt-1.5 text-xs text-gray-400">
                            <strong className="text-gray-300">Estado Final: </strong>
                            {rec.postSessionObservations}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Evolução salva no prontuário com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Fechar
            </button>

            {activeTab === 'form' && (
              <button
                type="button"
                onClick={handleSaveEvolution}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all transform active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingRecordId ? 'Atualizar Evolução' : 'Salvar no Prontuário'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* COMPONENTE INTERNO: FICHA DE ANAMNESE & MAPEAMENTO DE ALVOS TRG          */
/* (Primeira Consulta, Linha do Tempo e Alvos de Reprocessamento Clínico)    */
/* ========================================================================= */

export type LifeStage = 'infancia' | 'adolescencia' | 'adulta' | 'atual';
export type TargetStatus = 'pendente' | 'em_reprocessamento' | 'reprocessado';

export interface TRGTarget {
  id: string;
  description: string;
  lifeStage: LifeStage;
  dominantEmotion: string;
  initialSud: number;
  currentSud?: number;
  status: TargetStatus;
  notes?: string;
}

export interface AnamneseRecord {
  id: string;
  clientKey: string;
  clientName: string;
  clientPhone: string;
  date: string;
  birthDate?: string;
  age?: string;
  profession?: string;
  maritalStatus?: string;
  emergencyContact?: string;

  // Saúde & Medicamentos
  medications: string;
  medicalPsychiatricCare: string;
  sleepPattern: string;
  psychosomaticSymptoms: string;

  // Demanda e Queixa Principal
  chiefComplaint: string;
  impactOnDailyLife: string;
  previousTreatments: string;

  // Linha do Tempo da Vida (TRG Timeline)
  childhoodNotes: string;
  adolescenceNotes: string;
  adulthoodNotes: string;

  // Mapeamento de Alvos TRG
  targets: TRGTarget[];

  // Planejamento Terapêutico
  recommendedPhases: string;
  sessionFrequency: string;
  estimatedSessions: string;
  therapeuticGoals: string;
  therapistNotes: string;

  createdAt: string;
  updatedAt: string;
}

const ANAMNESE_STORAGE_KEY = 'trg_client_anamneses';

export function loadAllAnamneses(): AnamneseRecord[] {
  try {
    const raw = localStorage.getItem(ANAMNESE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[Anamnese] Erro ao carregar anamneses locais:', err);
    return [];
  }
}

export function saveAllAnamneses(records: AnamneseRecord[]): void {
  try {
    localStorage.setItem(ANAMNESE_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('[Anamnese] Erro ao salvar anamneses locais:', err);
  }
}

async function getDeterministicAnamneseUuid(userId: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + '_trg_anamneses_cloud_v1');
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

async function syncAnamnesesToCloud(records: AnamneseRecord[]): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id;
    if (!userId) {
      const savedUser = localStorage.getItem('finance_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          userId = parsed.id;
        } catch {}
      }
    }
    if (!userId) {
      console.info('[CloudSync Anamnese] Nenhum usuário conectado no momento.');
      return false;
    }

    const syncUuid = await getDeterministicAnamneseUuid(userId);
    const payload = '[TRG_ANAMNESE_SYNC]' + JSON.stringify(records);

    // Salvar no payload em nuvem garantido (tabela transactions)
    await supabase.from('transactions').upsert({
      id: syncUuid,
      user_id: userId,
      description: payload,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      type: 'income'
    });

    // Tentar salvar na tabela client_anamneses se existir
    try {
      const recordsToUpsert = records.map(a => ({
        id: a.id,
        user_id: userId,
        client_key: a.clientKey,
        client_name: a.clientName,
        client_phone: a.clientPhone,
        date: a.date,
        chief_complaint: a.chiefComplaint,
        updated_at: a.updatedAt
      }));
      await supabase.from('client_anamneses').upsert(recordsToUpsert);
    } catch {
      // Tabela dedicada opcional ainda não criada
    }

    return true;
  } catch (err) {
    console.warn('[CloudSync Anamnese] Erro ao sincronizar com nuvem:', err);
    return false;
  }
}

async function fetchAnamnesesFromCloud(): Promise<AnamneseRecord[] | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id;
    if (!userId) {
      const savedUser = localStorage.getItem('finance_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          userId = parsed.id;
        } catch {}
      }
    }
    if (!userId) return null;

    // 1. Ler do payload de sincronização
    const syncUuid = await getDeterministicAnamneseUuid(userId);
    const { data: txData, error: errTx } = await supabase
      .from('transactions')
      .select('description')
      .eq('id', syncUuid);

    if (!errTx && txData && txData.length > 0) {
      const desc = txData[0]?.description || '';
      if (desc.startsWith('[TRG_ANAMNESE_SYNC]')) {
        const rawJson = desc.replace('[TRG_ANAMNESE_SYNC]', '');
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          return parsed as AnamneseRecord[];
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[CloudSync Anamnese] Erro ao carregar da nuvem:', err);
    return null;
  }
}

export const LIFE_STAGE_LABELS: Record<LifeStage, { label: string; icon: string; color: string; badge: string }> = {
  infancia: { label: 'Infância (0 aos 12 anos)', icon: '👶', color: 'text-amber-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  adolescencia: { label: 'Adolescência (12 aos 18 anos)', icon: '🎒', color: 'text-purple-500', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  adulta: { label: 'Fase Adulta (18+ anos)', icon: '💼', color: 'text-blue-500', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  atual: { label: 'Gatilho / Momento Atual', icon: '⚡', color: 'text-rose-500', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
};

export const TARGET_STATUS_LABELS: Record<TargetStatus, { label: string; color: string; badge: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  em_reprocessamento: { label: 'Em Reprocessamento', color: 'text-blue-500', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  reprocessado: { label: 'Reprocessado (SUD 0)', color: 'text-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
};

interface ClientAnamneseModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  allAppointments: Appointment[];
  darkMode: boolean;
  onOpenEvolution?: (apt?: Appointment | null) => void;
}

export function ClientAnamneseModal({
  isOpen,
  onClose,
  appointment,
  allAppointments = [],
  darkMode,
  onOpenEvolution
}: ClientAnamneseModalProps) {
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedClientPhone, setSelectedClientPhone] = useState('');
  const [anamneses, setAnamneses] = useState<AnamneseRecord[]>(() => loadAllAnamneses());
  const [activeTab, setActiveTab] = useState<'dados' | 'queixa' | 'alvos' | 'plano' | 'resumo'>('dados');

  // Form Fields
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Solteiro(a)');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Saúde & Medicamentos
  const [medications, setMedications] = useState('');
  const [medicalPsychiatricCare, setMedicalPsychiatricCare] = useState('');
  const [sleepPattern, setSleepPattern] = useState('Normal / Reparador');
  const [psychosomaticSymptoms, setPsychosomaticSymptoms] = useState('');

  // Demanda e Queixa Principal
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [impactOnDailyLife, setImpactOnDailyLife] = useState('');
  const [previousTreatments, setPreviousTreatments] = useState('');

  // Linha do Tempo
  const [childhoodNotes, setChildhoodNotes] = useState('');
  const [adolescenceNotes, setAdolescenceNotes] = useState('');
  const [adulthoodNotes, setAdulthoodNotes] = useState('');

  // Alvos TRG
  const [targets, setTargets] = useState<TRGTarget[]>([]);

  // Novo Alvo (Inline Form)
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [newTargetDesc, setNewTargetDesc] = useState('');
  const [newTargetStage, setNewTargetStage] = useState<LifeStage>('infancia');
  const [newTargetEmotion, setNewTargetEmotion] = useState('Medo / Pânico');
  const [newTargetSud, setNewTargetSud] = useState(8);
  const [newTargetStatus, setNewTargetStatus] = useState<TargetStatus>('pendente');
  const [newTargetNotes, setNewTargetNotes] = useState('');
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

  // Plano Terapêutico
  const [recommendedPhases, setRecommendedPhases] = useState(
    '1. Cronológico -> 2. Somático -> 3. Temático -> 4. Futuro -> 5. Potencialização'
  );
  const [sessionFrequency, setSessionFrequency] = useState('Semanal (1x por semana)');
  const [estimatedSessions, setEstimatedSessions] = useState('8 a 12 sessões');
  const [therapeuticGoals, setTherapificGoals] = useState('');
  const [therapistNotes, setTherapistNotes] = useState('');

  // Feedback & Nuvem
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Lista única de clientes
  const uniqueClients = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number }>();
    allAppointments.forEach(a => {
      const name = a.client_name?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.phone && a.client_phone) existing.phone = a.client_phone;
      } else {
        map.set(key, { name, phone: a.client_phone || '', count: 1 });
      }
    });
    anamneses.forEach(rec => {
      const key = rec.clientKey || rec.clientName.trim().toLowerCase();
      if (!map.has(key) && rec.clientName) {
        map.set(key, { name: rec.clientName, phone: rec.clientPhone || '', count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allAppointments, anamneses]);

  // Carregar dados de Anamnese existente para o cliente selecionado
  const loadClientAnamneseData = (clientName: string, phone: string = '') => {
    const key = clientName.trim().toLowerCase();
    const existing = anamneses.find(a => a.clientKey === key || a.clientName.trim().toLowerCase() === key);
    if (existing) {
      setDate(existing.date || new Date().toISOString().split('T')[0]);
      setBirthDate(existing.birthDate || '');
      setAge(existing.age || '');
      setProfession(existing.profession || '');
      setMaritalStatus(existing.maritalStatus || 'Solteiro(a)');
      setEmergencyContact(existing.emergencyContact || '');
      setMedications(existing.medications || '');
      setMedicalPsychiatricCare(existing.medicalPsychiatricCare || '');
      setSleepPattern(existing.sleepPattern || 'Normal / Reparador');
      setPsychosomaticSymptoms(existing.psychosomaticSymptoms || '');
      setChiefComplaint(existing.chiefComplaint || '');
      setImpactOnDailyLife(existing.impactOnDailyLife || '');
      setPreviousTreatments(existing.previousTreatments || '');
      setChildhoodNotes(existing.childhoodNotes || '');
      setAdolescenceNotes(existing.adolescenceNotes || '');
      setAdulthoodNotes(existing.adulthoodNotes || '');
      setTargets(existing.targets || []);
      setRecommendedPhases(existing.recommendedPhases || '1. Cronológico -> 2. Somático -> 3. Temático -> 4. Futuro -> 5. Potencialização');
      setSessionFrequency(existing.sessionFrequency || 'Semanal (1x por semana)');
      setEstimatedSessions(existing.estimatedSessions || '8 a 12 sessões');
      setTherapificGoals(existing.therapeuticGoals || '');
      setTherapistNotes(existing.therapistNotes || '');
    } else {
      // Limpar formulário para novo cliente
      setDate(new Date().toISOString().split('T')[0]);
      setBirthDate('');
      setAge('');
      setProfession('');
      setMaritalStatus('Solteiro(a)');
      setEmergencyContact('');
      setMedications('');
      setMedicalPsychiatricCare('');
      setSleepPattern('Normal / Reparador');
      setPsychosomaticSymptoms('');
      setChiefComplaint('');
      setImpactOnDailyLife('');
      setPreviousTreatments('');
      setChildhoodNotes('');
      setAdolescenceNotes('');
      setAdulthoodNotes('');
      setTargets([]);
      setRecommendedPhases('1. Cronológico -> 2. Somático -> 3. Temático -> 4. Futuro -> 5. Potencialização');
      setSessionFrequency('Semanal (1x por semana)');
      setEstimatedSessions('8 a 12 sessões');
      setTherapificGoals('');
      setTherapistNotes('');
    }
    setSelectedClientName(clientName);
    setSelectedClientPhone(phone);
  };

  // Inicialização quando o modal abre
  useEffect(() => {
    if (!isOpen) return;

    // 1. Tentar sincronizar e buscar anamneses da nuvem
    setSyncStatus('syncing');
    fetchAnamnesesFromCloud()
      .then(cloudRecords => {
        if (cloudRecords && cloudRecords.length > 0) {
          const localRecords = loadAllAnamneses();
          const mergedMap = new Map<string, AnamneseRecord>();
          localRecords.forEach(r => mergedMap.set(r.id, r));
          cloudRecords.forEach(r => {
            const existing = mergedMap.get(r.id);
            if (!existing || new Date(r.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
              mergedMap.set(r.id, r);
            }
          });
          const merged = Array.from(mergedMap.values());
          saveAllAnamneses(merged);
          setAnamneses(merged);
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        } else {
          setSyncStatus('synced');
        }
      })
      .catch(() => {
        setSyncStatus('idle');
      });

    // 2. Selecionar cliente inicial
    if (appointment && appointment.client_name) {
      loadClientAnamneseData(appointment.client_name, appointment.client_phone || '');
    } else if (uniqueClients.length > 0 && !selectedClientName) {
      loadClientAnamneseData(uniqueClients[0].name, uniqueClients[0].phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appointment]);

  const existingAnamnese = useMemo(() => {
    const key = selectedClientName.trim().toLowerCase();
    return anamneses.find(a => a.clientKey === key || a.clientName.trim().toLowerCase() === key);
  }, [anamneses, selectedClientName]);

  const handleSelectClient = (name: string) => {
    const match = uniqueClients.find(c => c.name.toLowerCase() === name.toLowerCase());
    loadClientAnamneseData(name, match?.phone || '');
  };

  // Mapeamento de Alvos
  const handleSaveTarget = () => {
    if (!newTargetDesc.trim()) return;
    if (editingTargetId) {
      setTargets(prev =>
        prev.map(t =>
          t.id === editingTargetId
            ? {
                ...t,
                description: newTargetDesc.trim(),
                lifeStage: newTargetStage,
                dominantEmotion: newTargetEmotion,
                initialSud: newTargetSud,
                status: newTargetStatus,
                notes: newTargetNotes.trim()
              }
            : t
        )
      );
      setEditingTargetId(null);
    } else {
      const newTarget: TRGTarget = {
        id: 'target_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        description: newTargetDesc.trim(),
        lifeStage: newTargetStage,
        dominantEmotion: newTargetEmotion,
        initialSud: newTargetSud,
        status: newTargetStatus,
        notes: newTargetNotes.trim()
      };
      setTargets(prev => [...prev, newTarget]);
    }
    // Resetar campos de alvo
    setNewTargetDesc('');
    setNewTargetSud(8);
    setNewTargetNotes('');
    setNewTargetStatus('pendente');
    setIsAddingTarget(false);
  };

  const handleEditTarget = (target: TRGTarget) => {
    setEditingTargetId(target.id);
    setNewTargetDesc(target.description);
    setNewTargetStage(target.lifeStage);
    setNewTargetEmotion(target.dominantEmotion);
    setNewTargetSud(target.initialSud);
    setNewTargetStatus(target.status);
    setNewTargetNotes(target.notes || '');
    setIsAddingTarget(true);
  };

  const handleDeleteTarget = (targetId: string) => {
    setTargets(prev => prev.filter(t => t.id !== targetId));
  };

  const handleToggleTargetStatus = (targetId: string) => {
    setTargets(prev =>
      prev.map(t => {
        if (t.id !== targetId) return t;
        const nextStatus: TargetStatus =
          t.status === 'pendente'
            ? 'em_reprocessamento'
            : t.status === 'em_reprocessamento'
            ? 'reprocessado'
            : 'pendente';
        return {
          ...t,
          status: nextStatus,
          currentSud: nextStatus === 'reprocessado' ? 0 : t.currentSud
        };
      })
    );
  };

  // Estatísticas de Alvos
  const targetStats = useMemo(() => {
    const total = targets.length;
    const pendentes = targets.filter(t => t.status === 'pendente').length;
    const reprocessando = targets.filter(t => t.status === 'em_reprocessamento').length;
    const reprocessados = targets.filter(t => t.status === 'reprocessado').length;
    return { total, pendentes, reprocessando, reprocessados };
  }, [targets]);

  // Salvar Ficha de Anamnese Completa
  const handleSaveAnamnese = async () => {
    if (!selectedClientName.trim()) {
      alert('Por favor, informe ou selecione o nome do assistido.');
      return;
    }

    const clientKey = selectedClientName.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    const recordToSave: AnamneseRecord = {
      id: existingAnamnese?.id || 'anamnese_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      clientKey,
      clientName: selectedClientName.trim(),
      clientPhone: selectedClientPhone.trim(),
      date,
      birthDate,
      age,
      profession,
      maritalStatus,
      emergencyContact,
      medications,
      medicalPsychiatricCare,
      sleepPattern,
      psychosomaticSymptoms,
      chiefComplaint,
      impactOnDailyLife,
      previousTreatments,
      childhoodNotes,
      adolescenceNotes,
      adulthoodNotes,
      targets,
      recommendedPhases,
      sessionFrequency,
      estimatedSessions,
      therapeuticGoals,
      therapistNotes,
      createdAt: existingAnamnese?.createdAt || nowIso,
      updatedAt: nowIso
    };

    // 1. Salvar no localStorage
    const currentAll = loadAllAnamneses();
    const filtered = currentAll.filter(a => a.id !== recordToSave.id && a.clientKey !== clientKey);
    const updated = [recordToSave, ...filtered];
    saveAllAnamneses(updated);
    setAnamneses(updated);

    // 2. Feedback visual
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);

    // 3. Sincronizar na nuvem
    setSyncStatus('syncing');
    const cloudOk = await syncAnamnesesToCloud(updated);
    if (cloudOk) {
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setCloudMessage('Anamnese sincronizada com a nuvem com sucesso! Disponível em qualquer computador.');
    } else {
      setSyncStatus('idle');
      setCloudMessage('Anamnese salva no navegador local com sucesso.');
    }
    setTimeout(() => setCloudMessage(null), 5000);
  };

  // Sincronização manual com a nuvem
  const handleManualCloudSync = async () => {
    setSyncStatus('syncing');
    const current = loadAllAnamneses();
    const cloudRecords = await fetchAnamnesesFromCloud();
    const mergedMap = new Map<string, AnamneseRecord>();
    current.forEach(r => mergedMap.set(r.id, r));
    if (cloudRecords) {
      cloudRecords.forEach(r => {
        const existing = mergedMap.get(r.id);
        if (!existing || new Date(r.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
          mergedMap.set(r.id, r);
        }
      });
    }
    const merged = Array.from(mergedMap.values());
    saveAllAnamneses(merged);
    setAnamneses(merged);
    await syncAnamnesesToCloud(merged);
    setSyncStatus('synced');
    setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setCloudMessage('Sincronização com a nuvem concluída! Todas as anamneses estão atualizadas.');
    setTimeout(() => setCloudMessage(null), 4000);
  };

  // Exportar Backup JSON
  const handleExportBackupJson = () => {
    const data = loadAllAnamneses();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Anamneses_TRG_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar Backup JSON
  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const current = loadAllAnamneses();
          const map = new Map<string, AnamneseRecord>();
          current.forEach(r => map.set(r.id, r));
          parsed.forEach((r: AnamneseRecord) => map.set(r.id, r));
          const merged = Array.from(map.values());
          saveAllAnamneses(merged);
          setAnamneses(merged);
          await syncAnamnesesToCloud(merged);
          alert(`Backup importado com sucesso! ${parsed.length} anamneses restauradas.`);
          setShowBackupModal(false);
        } else {
          alert('Arquivo JSON inválido.');
        }
      } catch {
        alert('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Gerador de Documento A4 Timbrado em HTML para PDF
  const generateAnamneseHtml = () => {
    const therapistName = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_name')) || 'Marcondes Lima';
    const therapistTitle = 'Terapeuta Especialista em TRG';
    const therapistReg = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_reg')) || 'Registro CITRG: 08.452';
    const therapistPhone = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_phone')) || '(81) 98124-7493';
    const therapistCity = (typeof localStorage !== 'undefined' && localStorage.getItem('trg_therapist_city')) || 'Caruaru - PE';
    const todayStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Anamnese_TRG_${selectedClientName.replace(/\s+/g, '_')}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm 14mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #0d9488;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 14pt;
      font-weight: 900;
      color: #0f766e;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 8.5pt;
      color: #475569;
      margin: 2px 0 0 0;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-badge-title {
      display: inline-block;
      background: #0d9488;
      color: #ffffff;
      font-size: 8pt;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-badge-date {
      font-size: 8pt;
      color: #64748b;
      margin-top: 3px;
    }
    .client-box {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .client-title {
      font-size: 11pt;
      font-weight: 800;
      color: #115e59;
      margin: 0 0 6px 0;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      font-size: 8.5pt;
    }
    .grid-label {
      font-size: 7.5pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
    }
    .grid-val {
      font-weight: 600;
      color: #0f172a;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f766e;
      border-left: 3.5px solid #0d9488;
      padding-left: 8px;
      margin: 14px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .box-field {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 8.5pt;
    }
    .box-field strong {
      color: #334155;
    }
    table.targets-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 12px;
      font-size: 8pt;
    }
    table.targets-table th {
      background: #0f766e;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
    }
    table.targets-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    table.targets-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-pendente { background: #fef3c7; color: #b45309; }
    .badge-reprocessando { background: #dbeafe; color: #1d4ed8; }
    .badge-reprocessado { background: #d1fae5; color: #047857; }
    .badge-sud {
      display: inline-block;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      border-radius: 50%;
      font-weight: 800;
      color: #ffffff;
      font-size: 7.5pt;
    }
    .sud-high { background: #ef4444; }
    .sud-mid { background: #f59e0b; }
    .sud-low { background: #10b981; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      font-size: 7.5pt;
      color: #64748b;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .signature-box {
      text-align: center;
      width: 240px;
    }
    .signature-line {
      border-top: 1px solid #475569;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">${therapistName}</h1>
      <p class="brand-subtitle">${therapistTitle} • ${therapistReg} • ${therapistCity} • Tel: ${therapistPhone}</p>
    </div>
    <div class="doc-badge">
      <span class="doc-badge-title">Ficha de Anamnese TRG</span>
      <div class="doc-badge-date">Data da Consulta: <strong>${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></div>
    </div>
  </div>

  <div class="client-box">
    <div class="client-title">${selectedClientName}</div>
    <div class="grid-4">
      <div>
        <div class="grid-label">Telefone / WhatsApp</div>
        <div class="grid-val">${selectedClientPhone || 'Não informado'}</div>
      </div>
      <div>
        <div class="grid-label">Idade / Nasc.</div>
        <div class="grid-val">${age ? age + ' anos' : ''} ${birthDate ? '(' + new Date(birthDate + 'T12:00:00').toLocaleDateString('pt-BR') + ')' : 'Não informada'}</div>
      </div>
      <div>
        <div class="grid-label">Profissão</div>
        <div class="grid-val">${profession || 'Não informada'}</div>
      </div>
      <div>
        <div class="grid-label">Estado Civil</div>
        <div class="grid-val">${maritalStatus || 'Não informado'}</div>
      </div>
    </div>
  </div>

  <div class="section-title">1. Histórico de Saúde & Sintomas Psicossomáticos</div>
  <div class="box-field">
    <div><strong>Medicamentos em uso:</strong> ${medications || 'Nenhum medicamento informado.'}</div>
    <div><strong>Acompanhamento Médico / Psiquiátrico:</strong> ${medicalPsychiatricCare || 'Não informado.'}</div>
    <div><strong>Padrão de Sono:</strong> ${sleepPattern}</div>
    <div><strong>Sintomas Corporais / Psicossomáticos:</strong> ${psychosomaticSymptoms || 'Nenhum sintoma físico relatado.'}</div>
  </div>

  <div class="section-title">2. Queixa Principal & Demanda Terapêutica</div>
  <div class="box-field">
    <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${chiefComplaint || 'Queixa não detalhada.'}</div>
    ${impactOnDailyLife ? `<div><strong>Impacto no cotidiano:</strong> ${impactOnDailyLife}</div>` : ''}
    ${previousTreatments ? `<div><strong>Tratamentos anteriores:</strong> ${previousTreatments}</div>` : ''}
  </div>

  <div class="section-title">3. Linha do Tempo da Vida (Histórico Emocional)</div>
  <div class="box-field">
    <div style="margin-bottom: 4px;"><strong>👶 Infância (0 aos 12 anos):</strong> ${childhoodNotes || 'Sem anotações específicas registradas.'}</div>
    <div style="margin-bottom: 4px;"><strong>🎒 Adolescência (12 aos 18 anos):</strong> ${adolescenceNotes || 'Sem anotações específicas registradas.'}</div>
    <div><strong>💼 Fase Adulta (18+ anos):</strong> ${adulthoodNotes || 'Sem anotações específicas registradas.'}</div>
  </div>

  <div class="section-title">4. Mapeamento de Alvos e Gatilhos de Reprocessamento (${targets.length} Alvos Mapeados)</div>
  ${targets.length === 0 ? '<p style="font-size: 8.5pt; color: #64748b; font-style: italic;">Nenhum alvo cadastrado nesta anamnese até o momento.</p>' : `
    <table class="targets-table">
      <thead>
        <tr>
          <th style="width: 25px;">#</th>
          <th>Alvo / Trauma / Gatilho</th>
          <th style="width: 110px;">Fase da Vida</th>
          <th style="width: 120px;">Emoção Dominante</th>
          <th style="width: 45px; text-align: center;">SUD</th>
          <th style="width: 100px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${targets.map((t, idx) => {
          const sudColor = t.initialSud >= 8 ? 'sud-high' : t.initialSud >= 5 ? 'sud-mid' : 'sud-low';
          const badgeClass = t.status === 'reprocessado' ? 'badge-reprocessado' : t.status === 'em_reprocessamento' ? 'badge-reprocessando' : 'badge-pendente';
          const statusTxt = t.status === 'reprocessado' ? 'Reprocessado' : t.status === 'em_reprocessamento' ? 'Reprocessando' : 'Pendente';
          const stageTxt = LIFE_STAGE_LABELS[t.lifeStage]?.label || t.lifeStage;
          return `
            <tr>
              <td><strong>${idx + 1}</strong></td>
              <td><strong>${t.description}</strong>${t.notes ? `<div style="font-size: 7.5pt; color: #64748b;">${t.notes}</div>` : ''}</td>
              <td>${stageTxt}</td>
              <td>${t.dominantEmotion}</td>
              <td style="text-align: center;"><span class="badge-sud ${sudColor}">${t.initialSud}</span></td>
              <td style="text-align: center;"><span class="badge ${badgeClass}">${statusTxt}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `}

  <div class="section-title">5. Planejamento Terapêutico TRG & Metas</div>
  <div class="box-field">
    <div><strong>Ordem Recomendada das Fases TRG:</strong> ${recommendedPhases}</div>
    <div><strong>Frequência Recomendada:</strong> ${sessionFrequency} • <strong>Estimativa de Sessões:</strong> ${estimatedSessions}</div>
    ${therapeuticGoals ? `<div><strong>Metas Terapêuticas:</strong> ${therapeuticGoals}</div>` : ''}
    ${therapistNotes ? `<div><strong>Parecer / Orientações do Terapeuta:</strong> ${therapistNotes}</div>` : ''}
  </div>

  <div class="footer">
    <div class="signature-area">
      <div>
        <p style="margin: 0; font-size: 8pt; color: #475569;">
          Emitido em <strong>${therapistCity}</strong>, em <strong>${todayStr}</strong>.
        </p>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div style="font-size: 9pt; font-weight: 700; color: #0f172a;">${therapistName}</div>
        <div style="font-size: 7.5pt; color: #64748b;">${therapistTitle} • ${therapistReg}</div>
      </div>
    </div>
    <p style="font-size: 7pt; color: #94a3b8; margin: 4px 0 0 0;">
      <strong>Sigilo Profissional Terapêutico:</strong> Documento confidencial de uso privativo do terapeuta e do assistido, resguardado pelo Código de Ética da TRG e pela LGPD (Lei nº 13.709/2018).
    </p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 350);
    };
  </script>
</body>
</html>`;
  };

  const handleExportPDF = (directDownload = false) => {
    try {
      setExportingPdf(true);
      const htmlContent = generateAnamneseHtml();

      if (directDownload) {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Anamnese_TRG_${selectedClientName.replace(/\s+/g, '_')}_${date}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setPdfFeedback('Arquivo da Anamnese baixado com sucesso!');
        setTimeout(() => setPdfFeedback(null), 4000);
        setExportingPdf(false);
        return;
      }

      // Tentar abrir janela de impressão direta
      let printWindow: Window | null = null;
      try {
        printWindow = window.open('', '_blank', 'width=900,height=800,top=50,left=50');
      } catch {}

      if (printWindow && !printWindow.closed) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setPdfFeedback('Diálogo de impressão e salvamento em PDF aberto com sucesso!');
      } else {
        // Fallback seguro com iframe invisível
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {}
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 2000);
          }, 400);
        }
        setPdfFeedback('Preparando para salvar em PDF (selecione "Salvar como PDF" no diálogo de impressão).');
      }

      setTimeout(() => setPdfFeedback(null), 5000);
    } catch (err) {
      console.warn('Erro ao exportar PDF:', err);
      setPdfFeedback('Baixando arquivo da anamnese em HTML...');
      handleExportPDF(true);
    } finally {
      setExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`anamnese-modal-container w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all ${
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* ESTILO DEFINITIVO PARA INPUTS NO MODO ESCURO E CLARO */}
        <style dangerouslySetInnerHTML={{ __html: `
          .anamnese-modal-container input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
          .anamnese-modal-container textarea,
          .anamnese-modal-container select {
            background-color: ${darkMode ? '#1f2937' : '#ffffff'} !important;
            color: ${darkMode ? '#ffffff' : '#111827'} !important;
            border-color: ${darkMode ? '#4b5563' : '#d1d5db'} !important;
          }
          .anamnese-modal-container input::placeholder,
          .anamnese-modal-container textarea::placeholder {
            color: ${darkMode ? '#9ca3af' : '#6b7280'} !important;
            opacity: 1 !important;
          }
          .anamnese-modal-container input:focus,
          .anamnese-modal-container textarea:focus,
          .anamnese-modal-container select:focus {
            outline: none !important;
            border-color: #14b8a6 !important;
            box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.3) !important;
          }
        `}} />

        {/* CABEÇALHO */}
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-900/30 via-cyan-900/20 to-transparent flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 flex-shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black">
                  Ficha de Anamnese & Mapeamento de Alvos TRG
                </h2>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  {existingAnamnese ? 'Ficha Registrada' : 'Nova Anamnese'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Primeira consulta, levantamento do histórico emocional e alvos para reprocessamento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Indicador de Nuvem */}
            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={syncStatus === 'syncing'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/60'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-950/40 text-blue-400 border-blue-500/30 animate-pulse'
                  : 'bg-teal-950/40 text-teal-300 border-teal-500/30 hover:bg-teal-950/60'
              }`}
              title="Clique para sincronizar as anamneses com a nuvem agora"
            >
              <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-bounce text-blue-400' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">
                {syncStatus === 'syncing'
                  ? 'Sincronizando...'
                  : syncStatus === 'synced'
                  ? `Nuvem Ativa • ${lastSyncTime || 'Sincronizado'}`
                  : 'Sincronizar Nuvem'}
              </span>
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>

            {/* Backup Nuvem / PC */}
            <button
              type="button"
              onClick={() => setShowBackupModal(prev => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-600 hover:bg-gray-700/50 text-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Backup e Sincronização entre computadores"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Backup Nuvem / PC</span>
            </button>

            {/* Alternar para Evolução */}
            {onOpenEvolution && (
              <button
                type="button"
                onClick={() => {
                  const match = allAppointments.find(a => a.client_name === selectedClientName) || appointment;
                  onClose();
                  onOpenEvolution(match);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir Ficha de Evolução deste assistido"
              >
                <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
                <span>Ver Evoluções</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input Oculto para Importar Backup JSON */}
        <input
          type="file"
          ref={backupFileInputRef}
          onChange={handleImportBackupJson}
          accept=".json"
          className="hidden"
        />

        {/* MENSAGEM DE STATUS DA NUVEM */}
        {cloudMessage && (
          <div className="px-5 py-2.5 bg-teal-950/80 border-b border-teal-500/40 text-teal-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-teal-400" />
              <span>{cloudMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setCloudMessage(null)}
              className="p-1 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* FEEDBACK DO PDF */}
        {pdfFeedback && (
          <div className="px-5 py-2.5 bg-cyan-950/90 border-b border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-cyan-400" />
              <span>{pdfFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => handleExportPDF(true)}
              className="text-[11px] underline text-cyan-300 hover:text-white cursor-pointer"
              title="Baixar arquivo alternativo .html"
            >
              Baixar arquivo direto (.html)
            </button>
          </div>
        )}

        {/* SELEÇÃO DO ASSISTIDO & ABAS */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <User className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <select
              value={selectedClientName}
              onChange={e => handleSelectClient(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white focus:border-teal-500'
                  : 'bg-white border-gray-300 text-gray-800 focus:border-teal-500'
              }`}
            >
              {uniqueClients.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} {anamneses.some(a => a.clientKey === c.name.toLowerCase()) ? '• (Ficha Cadastrada)' : ''}
                </option>
              ))}
              {!uniqueClients.some(c => c.name.toLowerCase() === selectedClientName.toLowerCase()) && selectedClientName && (
                <option value={selectedClientName}>{selectedClientName}</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('dados')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'dados'
                  ? 'bg-teal-600 text-white shadow-md'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Identificação & Saúde</span>
            </button>

            <button
              onClick={() => setActiveTab('queixa')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'queixa'
                  ? 'bg-teal-600 text-white shadow-md'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>2. Queixa & Linha do Tempo</span>
            </button>

            <button
              onClick={() => setActiveTab('alvos')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'alvos'
                  ? 'bg-teal-600 text-white shadow-md'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>3. Mapeamento de Alvos ({targets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('plano')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'plano'
                  ? 'bg-teal-600 text-white shadow-md'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>4. Plano TRG</span>
            </button>

            <button
              onClick={() => setActiveTab('resumo')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'resumo'
                  ? 'bg-teal-600 text-white shadow-md'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>5. Visualizar & PDF</span>
            </button>
          </div>
        </div>

        {/* MODAL SUSPENSO DE BACKUP NUVEM / PC */}
        {showBackupModal && (
          <div className="p-4 bg-teal-950/90 border-b border-teal-500/40 text-white animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                Segurança, Nuvem e Troca de Computador
              </h4>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300 mb-3">
              Suas fichas de anamnese são salvas automaticamente na nuvem (Supabase) sob a sua conta e também no navegador.
              Ao abrir o aplicativo em outro PC conectado à sua conta, o sistema sincroniza tudo automaticamente.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleManualCloudSync}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Forçar Sincronização Agora
              </button>
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                Baixar Arquivo de Backup (.json)
              </button>
              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Restaurar Backup (.json)
              </button>
            </div>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL (ABAS) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ABA 1: IDENTIFICAÇÃO & SAÚDE */}
          {activeTab === 'dados' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Card de Dados do Assistido */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-500" />
                  Identificação do Assistido
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={selectedClientName}
                      onChange={e => setSelectedClientName(e.target.value)}
                      placeholder="Nome do cliente"
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={selectedClientPhone}
                      onChange={e => setSelectedClientPhone(e.target.value)}
                      placeholder="(81) 98765-4321"
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Data da Anamnese</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Data de Nascimento / Idade</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={birthDate}
                        onChange={e => {
                          setBirthDate(e.target.value);
                          if (e.target.value) {
                            const birth = new Date(e.target.value);
                            const now = new Date();
                            let calculatedAge = now.getFullYear() - birth.getFullYear();
                            const m = now.getMonth() - birth.getMonth();
                            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) calculatedAge--;
                            setAge(calculatedAge.toString());
                          }
                        }}
                        className={`w-2/3 px-3 py-2 rounded-xl text-xs font-semibold border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                        }`}
                      />
                      <input
                        type="text"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        placeholder="Idade"
                        className={`w-1/3 px-3 py-2 rounded-xl text-xs font-semibold border text-center ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Profissão / Ocupação</label>
                    <input
                      type="text"
                      value={profession}
                      onChange={e => setProfession(e.target.value)}
                      placeholder="Ex: Professor, Empresário..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Estado Civil</label>
                    <select
                      value={maritalStatus}
                      onChange={e => setMaritalStatus(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="União Estável">União Estável</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block text-xs font-bold text-gray-400 mb-1">Contato de Emergência / Familiar</label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={e => setEmergencyContact(e.target.value)}
                      placeholder="Ex: Maria (Esposa) - (81) 99999-1234"
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Card de Saúde & Medicamentos */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  Histórico de Saúde & Medicamentos
                </h3>

                <div className="space-y-4">
                  {/* Medicamentos */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-400">Medicamentos em Uso (Psiquiátricos / Contínuos)</label>
                      <span className="text-[11px] text-gray-500">Clique nas tags para adicionar rapidamente</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        'Nenhum',
                        'Clonazepam (Rivotril)',
                        'Sertralina',
                        'Escitalopram',
                        'Fluoxetina',
                        'Zolpidem',
                        'Venlafaxina',
                        'Quetiapina',
                        'Pregabalina'
                      ].map(med => (
                        <button
                          key={med}
                          type="button"
                          onClick={() => {
                            if (med === 'Nenhum') {
                              setMedications('Nenhum');
                            } else {
                              const cleaned = medications === 'Nenhum' ? '' : medications;
                              setMedications(cleaned ? `${cleaned}, ${med}` : med);
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-gray-700/50 hover:bg-teal-600/30 text-teal-300 border border-gray-600/60 transition-colors cursor-pointer"
                        >
                          + {med}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={medications}
                      onChange={e => setMedications(e.target.value)}
                      placeholder="Ex: Sertralina 50mg pela manhã, Rivotril 0.5mg se tiver crise..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  {/* Acompanhamento Médico */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Acompanhamento Psiquiátrico ou Médico</label>
                    <input
                      type="text"
                      value={medicalPsychiatricCare}
                      onChange={e => setMedicalPsychiatricCare(e.target.value)}
                      placeholder="Ex: Consulta regular com psiquiatra a cada 2 meses (Dr. Roberto)..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  {/* Padrão de Sono */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Padrão de Sono</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        'Normal / Reparador',
                        'Insônia Inicial (demora para dormir)',
                        'Despertares Noturnos Frequentes',
                        'Pesadelos / Sono Agitado',
                        'Insônia Terminal (acorda muito cedo)'
                      ].map(padrao => (
                        <button
                          key={padrao}
                          type="button"
                          onClick={() => setSleepPattern(padrao)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            sleepPattern === padrao
                              ? 'bg-teal-600 text-white border-teal-500 shadow'
                              : 'bg-gray-700/40 text-gray-300 border-gray-600 hover:bg-gray-700'
                          }`}
                        >
                          {padrao}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sintomas Psicossomáticos Corporais */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-400">Sintomas Psicossomáticos Corporais (Sensações Físicas)</label>
                      <span className="text-[11px] text-gray-500">Clique para selecionar</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        'Aperto no peito',
                        'Nó na garganta',
                        'Falta de ar',
                        'Taquicardia',
                        'Tensão cervical / ombros',
                        'Gastrite / dor no estômago',
                        'Bruxismo / maxilar travado',
                        'Sudorese nas mãos',
                        'Tontura / vertigem',
                        'Cansaço crônico'
                      ].map(sintoma => (
                        <button
                          key={sintoma}
                          type="button"
                          onClick={() => {
                            if (!psychosomaticSymptoms.includes(sintoma)) {
                              setPsychosomaticSymptoms(prev => prev ? `${prev}, ${sintoma}` : sintoma);
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-gray-700/50 hover:bg-rose-600/30 text-rose-300 border border-gray-600/60 transition-colors cursor-pointer"
                        >
                          + {sintoma}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={psychosomaticSymptoms}
                      onChange={e => setPsychosomaticSymptoms(e.target.value)}
                      placeholder="Descreva sensações no corpo quando fica ansioso(a) ou sob pressão..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: QUEIXA & LINHA DO TEMPO */}
          {activeTab === 'queixa' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Queixa Principal */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-teal-500" />
                  Queixa Principal & Motivação da Busca pela TRG
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Qual a queixa principal? O que mais incomoda e motivou a buscar ajuda agora?
                    </label>
                    <textarea
                      rows={3}
                      value={chiefComplaint}
                      onChange={e => setChiefComplaint(e.target.value)}
                      placeholder="Descreva a queixa central relatada pelo cliente (Ex: Crises de pânico repentinas, ansiedade generalizada no trabalho, sensação de medo constante)..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Há quanto tempo convive com esse sintoma e como ele impacta o dia a dia?
                    </label>
                    <textarea
                      rows={2}
                      value={impactOnDailyLife}
                      onChange={e => setImpactOnDailyLife(e.target.value)}
                      placeholder="Ex: Começou há 3 anos após perda de emprego; impede de dirigir sozinho e causa faltas no trabalho..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Já realizou outros tratamentos terapêuticos anteriormente?
                    </label>
                    <input
                      type="text"
                      value={previousTreatments}
                      onChange={e => setPreviousTreatments(e.target.value)}
                      placeholder="Ex: TCC por 1 ano com melhora parcial; nunca fez terapia antes..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Linha do Tempo da Vida (TRG Timeline) */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    Linha do Tempo Emocional (Origem dos Bloqueios)
                  </h3>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    Mapeie as raízes históricas desde o nascimento até a fase adulta
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Infância */}
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">👶</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                        Infância (0 aos 12 anos)
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Relação com pai, mãe ou cuidadores, brigas em casa, ambiente familiar, perdas precoces, castigos, medos da infância.
                    </p>
                    <textarea
                      rows={3}
                      value={childhoodNotes}
                      onChange={e => setChildhoodNotes(e.target.value)}
                      placeholder="Anotações sobre a infância do cliente..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  {/* Adolescência */}
                  <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">🎒</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">
                        Adolescência (12 aos 18 anos)
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Ambiente escolar, bullying, timidez extrema, aceitação social, separação dos pais, primeiros relacionamentos, inseguranças.
                    </p>
                    <textarea
                      rows={3}
                      value={adolescenceNotes}
                      onChange={e => setAdolescenceNotes(e.target.value)}
                      placeholder="Anotações sobre a adolescência do cliente..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  {/* Vida Adulta */}
                  <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">💼</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
                        Fase Adulta (18+ anos)
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Relacionamentos amorosos, casamento, traições, demissões, falências, lutos recentes, acidentes, cirurgias, sobrecargas.
                    </p>
                    <textarea
                      rows={3}
                      value={adulthoodNotes}
                      onChange={e => setAdulthoodNotes(e.target.value)}
                      placeholder="Anotações sobre a fase adulta e eventos traumáticos..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: MAPEAMENTO DE ALVOS TRG */}
          {activeTab === 'alvos' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Painel de Estatísticas de Alvos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl border border-teal-500/30 bg-teal-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Total de Alvos</p>
                    <p className="text-2xl font-black text-teal-400">{targetStats.total}</p>
                  </div>
                  <Target className="w-7 h-7 text-teal-500/40" />
                </div>

                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Pendentes</p>
                    <p className="text-2xl font-black text-amber-400">{targetStats.pendentes}</p>
                  </div>
                  <Clock className="w-7 h-7 text-amber-500/40" />
                </div>

                <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Reprocessando</p>
                    <p className="text-2xl font-black text-blue-400">{targetStats.reprocessando}</p>
                  </div>
                  <Activity className="w-7 h-7 text-blue-500/40" />
                </div>

                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Reprocessados</p>
                    <p className="text-2xl font-black text-emerald-400">{targetStats.reprocessados}</p>
                  </div>
                  <CheckCircle2 className="w-7 h-7 text-emerald-500/40" />
                </div>
              </div>

              {/* Botão de Adicionar Alvo */}
              {!isAddingTarget && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-wider">
                      Alvos e Gatilhos Específicos Mapeados
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Eventos específicos identificados na anamnese para reprocessar nas sessões de TRG.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTargetId(null);
                      setNewTargetDesc('');
                      setNewTargetSud(8);
                      setNewTargetNotes('');
                      setNewTargetStatus('pendente');
                      setIsAddingTarget(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Alvo</span>
                  </button>
                </div>
              )}

              {/* Formulário de Adicionar / Editar Alvo */}
              {isAddingTarget && (
                <div className={`p-4 sm:p-5 rounded-2xl border border-teal-500/40 shadow-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-teal-50/50'
                } animate-fadeIn`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-teal-400" />
                      {editingTargetId ? 'Editar Alvo Mapeado' : 'Novo Alvo para Reprocessamento'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingTarget(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">
                        Descrição do Evento / Trauma / Gatilho *
                      </label>
                      <input
                        type="text"
                        value={newTargetDesc}
                        onChange={e => setNewTargetDesc(e.target.value)}
                        placeholder="Ex: Acidente de carro em 2018, Bronca humilhante do pai aos 8 anos..."
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Fase da Vida</label>
                        <select
                          value={newTargetStage}
                          onChange={e => setNewTargetStage(e.target.value as LifeStage)}
                          className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                            darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                          }`}
                        >
                          <option value="infancia">👶 Infância (0 aos 12 anos)</option>
                          <option value="adolescencia">🎒 Adolescência (12 aos 18 anos)</option>
                          <option value="adulta">💼 Fase Adulta (18+ anos)</option>
                          <option value="atual">⚡ Gatilho / Momento Atual</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Emoção Dominante</label>
                        <select
                          value={newTargetEmotion}
                          onChange={e => setNewTargetEmotion(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                            darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                          }`}
                        >
                          <option value="Medo / Pânico">Medo / Pânico</option>
                          <option value="Culpa">Culpa</option>
                          <option value="Tristeza / Luto">Tristeza / Luto</option>
                          <option value="Raiva / Ressentimento">Raiva / Ressentimento</option>
                          <option value="Vergonha / Humilhação">Vergonha / Humilhação</option>
                          <option value="Rejeição / Abandono">Rejeição / Abandono</option>
                          <option value="Impotência">Impotência</option>
                          <option value="Insegurança">Insegurança</option>
                          <option value="Outra">Outra</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Status do Alvo</label>
                        <select
                          value={newTargetStatus}
                          onChange={e => setNewTargetStatus(e.target.value as TargetStatus)}
                          className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                            darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                          }`}
                        >
                          <option value="pendente">⏳ Pendente</option>
                          <option value="em_reprocessamento">🔄 Em Reprocessamento</option>
                          <option value="reprocessado">✅ Reprocessado (SUD 0)</option>
                        </select>
                      </div>
                    </div>

                    {/* Escala SUD Inicial */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-gray-400">Escala SUD Inicial (0 a 10)</label>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                          newTargetSud >= 8 ? 'bg-rose-500/20 text-rose-400' : newTargetSud >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          SUD {newTargetSud} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={newTargetSud}
                        onChange={e => setNewTargetSud(parseInt(e.target.value, 10))}
                        className="w-full accent-teal-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>0 (Neutro/Alívio)</span>
                        <span>5 (Moderado)</span>
                        <span>10 (Desespero Máximo)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Observações do Alvo (Opcional)</label>
                      <input
                        type="text"
                        value={newTargetNotes}
                        onChange={e => setNewTargetNotes(e.target.value)}
                        placeholder="Ex: Gatilho dispara ao ouvir sirenes de ambulância..."
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingTarget(false)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTarget}
                        disabled={!newTargetDesc.trim()}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{editingTargetId ? 'Atualizar Alvo' : 'Salvar Alvo'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Alvos Cadastrados */}
              <div className="space-y-3">
                {targets.length === 0 ? (
                  <div className={`p-8 rounded-2xl border text-center ${darkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <Target className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold text-gray-300">Nenhum alvo cadastrado ainda</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      Clique em &quot;Adicionar Alvo&quot; para registrar eventos marcantes, traumas e gatilhos emocionais identificados na anamnese do cliente.
                    </p>
                  </div>
                ) : (
                  targets.map((target, idx) => {
                    const stageInfo = LIFE_STAGE_LABELS[target.lifeStage];
                    const statusInfo = TARGET_STATUS_LABELS[target.status];
                    const sudColor = target.initialSud >= 8 ? 'bg-rose-500' : target.initialSud >= 5 ? 'bg-amber-500' : 'bg-emerald-500';

                    return (
                      <div
                        key={target.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          target.status === 'reprocessado'
                            ? 'border-emerald-500/30 bg-emerald-950/20'
                            : target.status === 'em_reprocessamento'
                            ? 'border-blue-500/30 bg-blue-950/20'
                            : darkMode ? 'border-gray-700 bg-gray-800/70' : 'border-gray-200 bg-white shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-black flex-shrink-0 ${sudColor}`}>
                              {target.initialSud}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                                <h4 className={`text-sm font-extrabold ${target.status === 'reprocessado' ? 'line-through text-gray-400' : 'text-white'}`}>
                                  {target.description}
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageInfo.badge}`}>
                                  {stageInfo.icon} {stageInfo.label}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300">
                                  {target.dominantEmotion}
                                </span>
                              </div>
                              {target.notes && (
                                <p className="text-xs text-gray-400 mt-1 italic">
                                  {target.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Botão de Alternar Status */}
                            <button
                              type="button"
                              onClick={() => handleToggleTargetStatus(target.id)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${statusInfo.badge}`}
                              title="Clique para avançar o status do alvo (Pendente -> Reprocessando -> Reprocessado)"
                            >
                              {statusInfo.label}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditTarget(target)}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700 transition-colors cursor-pointer"
                              title="Editar Alvo"
                            >
                              <Activity className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTarget(target.id)}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Excluir Alvo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ABA 4: PLANO TERAPÊUTICO */}
          {activeTab === 'plano' && (
            <div className="space-y-6 animate-fadeIn">
              <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className="text-sm font-extrabold text-teal-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-teal-500" />
                  Planejamento Clínico & Fases da TRG
                </h3>

                <div className="space-y-4">
                  {/* Ordem das Fases */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Ordem Recomendada das Fases TRG
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        'Padrão TRG: 1. Cronológico -> 2. Somático -> 3. Temático -> 4. Futuro -> 5. Potencialização',
                        'Foco em Trauma Agudo: 1. Temático -> 2. Cronológico -> 3. Somático -> 4. Futuro -> 5. Potencialização',
                        'Foco em Ansiedade / Pânico: 1. Somático -> 2. Cronológico -> 3. Futuro -> 4. Potencialização'
                      ].map(ordem => (
                        <button
                          key={ordem}
                          type="button"
                          onClick={() => setRecommendedPhases(ordem)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-gray-700/50 hover:bg-teal-600/30 text-teal-300 border border-gray-600 transition-colors cursor-pointer"
                        >
                          {ordem.split(':')[0]}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={recommendedPhases}
                      onChange={e => setRecommendedPhases(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Frequência Recomendada</label>
                      <select
                        value={sessionFrequency}
                        onChange={e => setSessionFrequency(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                        }`}
                      >
                        <option value="Semanal (1x por semana)">Semanal (1x por semana)</option>
                        <option value="Quinzenal (a cada 14 dias)">Quinzenal (a cada 14 dias)</option>
                        <option value="2x por semana (intensivo)">2x por semana (intensivo)</option>
                        <option value="Mensal (manutenção)">Mensal (manutenção)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Previsão Inicial de Sessões</label>
                      <select
                        value={estimatedSessions}
                        onChange={e => setEstimatedSessions(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                          darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                        }`}
                      >
                        <option value="5 a 8 sessões">5 a 8 sessões</option>
                        <option value="8 a 12 sessões">8 a 12 sessões</option>
                        <option value="12 a 16 sessões">12 a 16 sessões</option>
                        <option value="Conforme evolução clínica">Conforme evolução clínica</option>
                      </select>
                    </div>
                  </div>

                  {/* Metas Terapêuticas */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Metas Terapêuticas Acordadas com o Assistido
                    </label>
                    <textarea
                      rows={2}
                      value={therapeuticGoals}
                      onChange={e => setTherapificGoals(e.target.value)}
                      placeholder="Ex: Eliminar crises de pânico, voltar a dirigir sozinho, recuperar autonomia no trabalho..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>

                  {/* Observações e Orientações do Terapeuta */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">
                      Parecer e Orientações Iniciais do Terapeuta TRG
                    </label>
                    <textarea
                      rows={3}
                      value={therapistNotes}
                      onChange={e => setTherapistNotes(e.target.value)}
                      placeholder="Orientações dadas ao cliente sobre o processo de reprocessamento, possíveis reações nas primeiras 48h-72h..."
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: RESUMO & VISUALIZAR PDF */}
          {activeTab === 'resumo' && (
            <div className="space-y-6 animate-fadeIn">
              <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-teal-50 border-teal-200'
              }`}>
                <div>
                  <h3 className="text-base font-extrabold text-teal-400">
                    Resumo Geral da Anamnese de {selectedClientName}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Data da Consulta: <strong>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> • Total de Alvos Mapeados: <strong>{targets.length}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleExportPDF(false)}
                    disabled={exportingPdf}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Baixar em PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportPDF(false)}
                    className="px-3 py-2 rounded-xl border border-gray-600 hover:bg-gray-700/50 text-gray-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Preview Resumo */}
              <div className={`p-5 rounded-2xl border space-y-4 text-xs ${darkMode ? 'bg-gray-800/40 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-800'}`}>
                <div>
                  <h4 className="font-extrabold text-teal-400 uppercase text-[11px] mb-1">Queixa Principal:</h4>
                  <p className="bg-gray-800/80 p-2.5 rounded-xl border border-gray-700">{chiefComplaint || 'Não informada'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <h4 className="font-extrabold text-teal-400 uppercase text-[11px] mb-1">Medicamentos:</h4>
                    <p className="bg-gray-800/80 p-2.5 rounded-xl border border-gray-700">{medications || 'Nenhum'}</p>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-teal-400 uppercase text-[11px] mb-1">Padrão de Sono:</h4>
                    <p className="bg-gray-800/80 p-2.5 rounded-xl border border-gray-700">{sleepPattern}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-teal-400 uppercase text-[11px] mb-1">Alvos Mapeados ({targets.length}):</h4>
                  {targets.length === 0 ? (
                    <p className="text-gray-500 italic">Nenhum alvo cadastrado.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {targets.map((t, i) => (
                        <div key={t.id} className="p-2 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center justify-between">
                          <span className="font-semibold text-gray-200">#{i + 1} {t.description}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                            SUD {t.initialSud} • {t.dominantEmotion}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-teal-400 uppercase text-[11px] mb-1">Plano de Reprocessamento:</h4>
                  <p className="bg-gray-800/80 p-2.5 rounded-xl border border-gray-700">
                    <strong>Fases:</strong> {recommendedPhases} <br />
                    <strong>Frequência:</strong> {sessionFrequency} • <strong>Estimativa:</strong> {estimatedSessions}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Ficha de Anamnese salva com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={() => handleExportPDF(false)}
              disabled={exportingPdf}
              className="px-4 py-2.5 rounded-xl border border-teal-500/40 text-teal-300 hover:bg-teal-950/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar Anamnese em PDF timbrado"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Baixar em PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAnamnese}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{existingAnamnese ? 'Atualizar Anamnese' : 'Salvar Anamnese'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
