import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Calendar,
  Clock,
  User,
  CalendarCheck,
  MessageCircle,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { Appointment, Category } from './types';

interface QuickReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAppointment: Appointment | null;
  darkMode: boolean;
  categories: Category[];
  hasGoogleToken: boolean;
  onConfirmReturn: (
    newAppointment: Appointment,
    syncGoogle: boolean,
    openWhatsApp: boolean
  ) => Promise<void>;
}

// Utilitário de adição de dias preservando timezone local
function addDays(baseDateStr: string, days: number): string {
  try {
    const dateOnly = baseDateStr.includes('T') ? baseDateStr.split('T')[0] : baseDateStr;
    const [y, m, d] = dateOnly.split('-').map(Number);
    if (y && m && d) {
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + days);
      const yStr = dt.getFullYear();
      const mStr = String(dt.getMonth() + 1).padStart(2, '0');
      const dStr = String(dt.getDate()).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    }
  } catch {}
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString().split('T')[0];
}

// Utilitário para formatar dia da semana e data em português
function formatFullDateDisplay(dateStr: string): { fullDate: string; weekday: string } {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y && m && d) {
      const dt = new Date(y, m - 1, d);
      const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      const dateFormatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      return { fullDate: dateFormatted, weekday: capitalizedWeekday };
    }
  } catch {}
  return { fullDate: dateStr, weekday: '' };
}

// Utilitário para calcular horário de término com duração
function calculateEndTime(startTime: string, durationMinutes: number): string {
  try {
    const [h, m] = startTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const totalMin = h * 60 + m + durationMinutes;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }
  } catch {}
  return startTime;
}

export default function QuickReturnModal({
  isOpen,
  onClose,
  sourceAppointment,
  darkMode,
  categories,
  hasGoogleToken,
  onConfirmReturn
}: QuickReturnModalProps) {
  // Estado de intervalo selecionado (dias de acréscimo)
  const [selectedIntervalDays, setSelectedIntervalDays] = useState<number>(7);
  const [returnDate, setReturnDate] = useState<string>('');
  const [returnStartTime, setReturnStartTime] = useState<string>('09:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(50);
  const [returnTitle, setReturnTitle] = useState<string>('Sessão de Retorno TRG');
  const [returnServiceValue, setReturnServiceValue] = useState<string>('150');
  const [returnCategoryId, setReturnCategoryId] = useState<string>('');
  const [syncGoogle, setSyncGoogle] = useState<boolean>(hasGoogleToken);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializar dados quando o modal abre baseado no agendamento de origem
  useEffect(() => {
    if (sourceAppointment && isOpen) {
      const baseDate = sourceAppointment.start_time
        ? sourceAppointment.start_time.split('T')[0]
        : new Date().toISOString().split('T')[0];

      const sTime = sourceAppointment.start_time
        ? sourceAppointment.start_time.substring(11, 16)
        : '09:00';

      const initialInterval = 7;
      setSelectedIntervalDays(initialInterval);
      setReturnDate(addDays(baseDate, initialInterval));
      setReturnStartTime(sTime);
      setDurationMinutes(50);
      setReturnTitle('Sessão de Retorno TRG');
      setReturnServiceValue(
        sourceAppointment.service_value ? String(sourceAppointment.service_value) : '150'
      );
      
      const incomeCat = categories.find(c => c.type === 'income');
      setReturnCategoryId(sourceAppointment.category_id || incomeCat?.id || categories[0]?.id || '');
      setSyncGoogle(hasGoogleToken);
    }
  }, [sourceAppointment, isOpen, hasGoogleToken, categories]);

  // Data base de referência (da sessão anterior ou de hoje)
  const baseDate = useMemo(() => {
    if (sourceAppointment?.start_time) {
      return sourceAppointment.start_time.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [sourceAppointment]);

  // Opções de intervalo predefinidas
  const intervalPresets = useMemo(() => {
    return [
      {
        days: 7,
        label: '+7 Dias',
        description: 'Próxima semana (mesmo dia)',
        targetDate: addDays(baseDate, 7)
      },
      {
        days: 14,
        label: '+14 Dias',
        description: 'Em 2 semanas (mesmo dia)',
        targetDate: addDays(baseDate, 14)
      },
      {
        days: 21,
        label: '+21 Dias',
        description: 'Em 3 semanas',
        targetDate: addDays(baseDate, 21)
      },
      {
        days: 30,
        label: '+30 Dias',
        description: 'Em 1 mês',
        targetDate: addDays(baseDate, 30)
      }
    ];
  }, [baseDate]);

  // Manipular seleção de preset
  const handleSelectPreset = (days: number, targetDate: string) => {
    setSelectedIntervalDays(days);
    setReturnDate(targetDate);
  };

  // Horário de término calculado
  const returnEndTime = useMemo(() => {
    return calculateEndTime(returnStartTime, durationMinutes);
  }, [returnStartTime, durationMinutes]);

  // Formatação visual da data do retorno
  const dateDisplay = useMemo(() => {
    return formatFullDateDisplay(returnDate);
  }, [returnDate]);

  // Formatação da sessão de origem
  const sourceDisplay = useMemo(() => {
    if (!sourceAppointment) return null;
    const sDate = sourceAppointment.start_time ? sourceAppointment.start_time.split('T')[0] : '';
    const sTime = sourceAppointment.start_time ? sourceAppointment.start_time.substring(11, 16) : '';
    return {
      formatted: formatFullDateDisplay(sDate),
      time: sTime
    };
  }, [sourceAppointment]);

  // Submissão do Retorno
  const handleSave = async (openWhatsApp: boolean) => {
    if (!sourceAppointment || !returnDate || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const startISO = new Date(`${returnDate}T${returnStartTime}:00`).toISOString();
      const endISO = new Date(`${returnDate}T${returnEndTime}:00`).toISOString();

      const newAppointment: Appointment = {
        id: `apt-${Date.now()}`,
        title: returnTitle.trim() || 'Sessão de Retorno TRG',
        client_name: sourceAppointment.client_name,
        client_phone: sourceAppointment.client_phone || '',
        start_time: startISO,
        end_time: endISO,
        service_value: parseFloat(returnServiceValue) || 150,
        status: 'SCHEDULED',
        synced_google: syncGoogle,
        google_event_id: null,
        linked_transaction_id: null,
        category_id: returnCategoryId,
        user_id: sourceAppointment.user_id
      };

      await onConfirmReturn(newAppointment, syncGoogle, openWhatsApp);
      onClose();
    } catch (err) {
      console.error('Erro ao agendar retorno:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !sourceAppointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-6 border transition-all ${
        darkMode ? 'bg-gray-850 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* CABEÇALHO */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Agendamento Rápido de Retorno TRG
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-blue-100">
                  7 ou 14 Dias
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium">
                Próxima sessão para continuidade do reprocessamento de <strong>{sourceAppointment.client_name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO */}
        <div className="p-6 space-y-5">
          {/* CARD DE SESSÃO ANTERIOR */}
          {sourceDisplay && (
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-blue-50/70 border-blue-200/80 text-blue-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/15 text-blue-500 font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">
                    {sourceAppointment.client_name}
                  </div>
                  <div className="text-[11px] opacity-75">
                    {sourceAppointment.client_phone || 'Sem telefone cadastrado'}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-200/50 dark:border-gray-700">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Sessão Anterior:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {sourceDisplay.formatted.weekday}, {sourceDisplay.formatted.fullDate} às {sourceDisplay.time}
                </span>
              </div>
            </div>
          )}

          {/* BOTÕES RÁPIDOS DE INTERVALO (+7, +14, +21, +30 DIAS) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Escolha o Intervalo de Retorno:
              </label>
              <span className="text-[11px] text-gray-400">Calculado automaticamente</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {intervalPresets.map((preset) => {
                const isSelected = selectedIntervalDays === preset.days && returnDate === preset.targetDate;
                const targetFormatted = formatFullDateDisplay(preset.targetDate);

                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handleSelectPreset(preset.days, preset.targetDate)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                        : darkMode
                        ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-extrabold ${isSelected ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {preset.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold truncate">
                        {targetFormatted.weekday.slice(0, 3)}, {targetFormatted.fullDate.slice(0, 5)}
                      </div>
                      <div className="text-[10px] opacity-70 mt-0.5 truncate">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DESTAQUE VISUAL DA DATA E HORÁRIO CALCULADOS */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            darkMode ? 'bg-gradient-to-r from-emerald-950/30 to-blue-950/30 border-emerald-800/50' : 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 font-extrabold flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Próxima Sessão Confirmada para:
                </span>
                <div className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                  {dateDisplay.weekday}, {dateDisplay.fullDate}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:border-l sm:pl-4 border-emerald-200 dark:border-emerald-800/40">
              <Clock className="w-4 h-4 text-emerald-500" />
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                <span>{returnStartTime}</span>
                <span className="text-gray-400 mx-1">até</span>
                <span>{returnEndTime}</span>
                <span className="text-[10px] text-gray-400 font-medium block">
                  ({durationMinutes} min • R$ {returnServiceValue},00)
                </span>
              </div>
            </div>
          </div>

          {/* AJUSTES FINOS (DATA, HORÁRIO, DURAÇÃO, VALOR E TÍTULO) */}
          <div className="space-y-3.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Data do Retorno */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Data do Retorno:
                </label>
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => {
                    setReturnDate(e.target.value);
                    setSelectedIntervalDays(-1); // Personalizado
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-bold ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>

              {/* Horário de Início */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Horário de Início:
                </label>
                <input
                  type="time"
                  required
                  value={returnStartTime}
                  onChange={(e) => setReturnStartTime(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-bold ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>

              {/* Duração da Sessão */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Duração:
                  </label>
                  <span className="text-[10px] text-emerald-500 font-bold">
                    Término: {returnEndTime}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: '50 min', mins: 50 },
                    { label: '1 hora', mins: 60 },
                    { label: '1h15', mins: 75 }
                  ].map((d) => (
                    <button
                      key={d.mins}
                      type="button"
                      onClick={() => setDurationMinutes(d.mins)}
                      className={`flex-1 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        durationMinutes === d.mins
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : darkMode
                          ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TÍTULO E VALOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Título do Atendimento:
                  </label>
                  <div className="flex items-center gap-1">
                    {['Sessão de Retorno TRG', 'Continuidade TRG'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setReturnTitle(t)}
                        className="text-[10px] text-blue-500 hover:underline cursor-pointer"
                      >
                        {t === 'Sessão de Retorno TRG' ? 'Retorno' : 'Continuidade'}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={returnTitle}
                  onChange={(e) => setReturnTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-medium ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Valor da Sessão (R$):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {['150', '120', '0'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setReturnServiceValue(val)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                          returnServiceValue === val
                            ? 'bg-emerald-500 text-white'
                            : 'text-gray-400 hover:text-emerald-500'
                        }`}
                      >
                        {val === '0' ? 'Cortesia' : `R$ ${val}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={returnServiceValue}
                    onChange={(e) => setReturnServiceValue(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border font-bold text-emerald-500 ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                    } focus:ring-2 focus:ring-emerald-500 outline-none`}
                  />
                </div>
              </div>
            </div>

            {/* CHECKBOX GOOGLE CALENDAR */}
            {hasGoogleToken && (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={syncGoogle}
                  onChange={(e) => setSyncGoogle(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Sincronizar retorno automaticamente no Google Agenda
                </span>
              </label>
            )}
          </div>
        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Cancelar
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                darkMode
                  ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-200'
                  : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              Apenas Salvar Retorno
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-green-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Salvar & Enviar WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
