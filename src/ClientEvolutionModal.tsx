import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ClipboardList,
  User,
  Calendar,
  Clock,
  Save,
  Printer,
  RotateCcw,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Phone,
  Trash2,
  Plus,
  History,
  Activity
} from 'lucide-react';
import { Appointment } from './types';

export type TRGPhase =
  | 'cronologico'
  | 'somatico'
  | 'tematico'
  | 'futuro'
  | 'potencializacao'
  | 'manutencao';

export interface EvolutionRecord {
  id: string;
  clientKey: string; // client_name or client_phone normalized
  clientName: string;
  clientPhone: string;
  appointmentId?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  sessionNumber: number;
  phase: TRGPhase;
  sudInitial: number; // 0 to 10
  sudFinal: number;   // 0 to 10
  chiefComplaint: string; // Queixa principal / demanda
  reprocessedEvents: string; // Eventos ou memórias reprocessadas
  postSessionObservations: string; // Percepções, reações físicas e estado pós-sessão
  nextSessionNotes: string; // Orientações para o próximo encontro
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

const STORAGE_KEY = 'trg_client_evolutions';

function loadAllEvolutions(): EvolutionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAllEvolutions(records: EvolutionRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Erro ao salvar evoluções no localStorage:', err);
  }
}

export default function ClientEvolutionModal({
  isOpen,
  onClose,
  appointment,
  allAppointments = [],
  darkMode,
  onOpenWhatsApp,
  onOpenQuickReturn
}: ClientEvolutionModalProps) {
  // Cliente atual selecionado
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedClientPhone, setSelectedClientPhone] = useState('');

  // Lista de todos os registros salvos
  const [evolutions, setEvolutions] = useState<EvolutionRecord[]>(() => loadAllEvolutions());

  // Aba interna do modal: 'form' (preenchimento atual) ou 'history' (linha do tempo)
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Campos do formulário de evolução
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

  // Lista de clientes únicos do sistema para busca rápida
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

  // Inicialização ao abrir com um agendamento específico
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

        // Calcular número da sessão com base no histórico do cliente
        const clientKey = name.toLowerCase();
        const clientApts = (allAppointments || []).filter(a =>
          (a.client_name || a.title || '').trim().toLowerCase() === clientKey && a.status === 'COMPLETED'
        );
        const nextNum = Math.max(1, clientApts.length + 1);
        setSessionNumber(nextNum);

        // Reset dos campos para nova evolução
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

  // Normalização da chave do cliente
  const currentClientKey = selectedClientName.trim().toLowerCase();

  // Histórico de evoluções deste cliente
  const clientHistory = useMemo(() => {
    if (!currentClientKey) return [];
    return evolutions
      .filter(e => (e.clientKey || e.clientName.toLowerCase()) === currentClientKey)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [evolutions, currentClientKey]);

  // Histórico de agendamentos deste cliente no sistema
  const clientAppointments = useMemo(() => {
    if (!currentClientKey) return [];
    return (allAppointments || []).filter(a =>
      (a.client_name || a.title || '').trim().toLowerCase() === currentClientKey
    );
  }, [allAppointments, currentClientKey]);

  // Mudar cliente selecionado via combobox
  const handleSelectClient = (name: string) => {
    setSelectedClientName(name);
    const found = uniqueClients.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSelectedClientPhone(found.phone);
    }
    // Buscar histórico do cliente selecionado
    const clientKey = name.toLowerCase();
    const existing = evolutions.filter(e => (e.clientKey || e.clientName.toLowerCase()) === clientKey);
    setSessionNumber(existing.length + 1);
    setEditingRecordId(null);
  };

  // Carregar evolução para edição
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

  // Salvar registro de evolução
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
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Excluir registro
  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Deseja excluir esta anotação de evolução do prontuário?')) {
      const updatedList = evolutions.filter(e => e.id !== id);
      setEvolutions(updatedList);
      saveAllEvolutions(updatedList);
      if (editingRecordId === id) {
        setEditingRecordId(null);
      }
    }
  };

  // Limpar formulário para novo registro
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

  // Impressão da Ficha de Evolução
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const currentPhaseInfo = TRG_PHASES_INFO[phase] || TRG_PHASES_INFO.cronologico;
  const reliefPoints = Math.max(0, sudInitial - sudFinal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`evolution-modal-container w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all ${
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* ESTILO DEFINITIVO PARA INPUTS NO MODO ESCURO E CLARO */}
        <style dangerouslySetInnerHTML={{ __html: `
          .evolution-modal-container input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
          .evolution-modal-container textarea,
          .evolution-modal-container select {
            background-color: ${darkMode ? '#1f2937' : '#ffffff'} !important;
            color: ${darkMode ? '#ffffff' : '#111827'} !important;
            border-color: ${darkMode ? '#4b5563' : '#d1d5db'} !important;
          }
          .evolution-modal-container input::placeholder,
          .evolution-modal-container textarea::placeholder {
            color: ${darkMode ? '#9ca3af' : '#6b7280'} !important;
            opacity: 1 !important;
          }
          .evolution-modal-container input:focus,
          .evolution-modal-container textarea:focus,
          .evolution-modal-container select:focus {
            outline: none !important;
            border-color: #a855f7 !important;
            box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.3) !important;
          }
        `}} />

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

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE SELEÇÃO DO CLIENTE & ABAS */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Seletor do Cliente */}
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

          {/* Abas: Preencher Evolução vs Histórico */}
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

        {/* CONTEÚDO PRINCIPAL (SCROLLÁVEL) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* RESUMO DO CLIENTE */}
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

            {/* Ações Rápidas com o Cliente */}
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
              {/* SELEÇÃO DA FASE DA TRG */}
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
                  {/* SUD Inicial */}
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

                  {/* SUD Final */}
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
                {/* Queixa Principal */}
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

                {/* Eventos Reprocessados */}
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

                {/* Percepções e Reações Físicas */}
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
                <button
                  onClick={handleNewRecord}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Evolução</span>
                </button>
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

        {/* RODAPÉ COM BOTÕES */}
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
