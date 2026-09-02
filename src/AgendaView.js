import React, { useState } from 'react';
import { 
  Calendar, 
  CalendarDays, 
  Plus, 
  Check, 
  Clock, 
  ExternalLink 
} from 'lucide-react';

export default function AgendaView({
  darkMode,
  currentDate,
  scheduled,
  categories,
  currentUser,
  agendaSubTab,
  setAgendaSubTab,
  selectedCalendarDay,
  setSelectedCalendarDay,
  calendarEvents,
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
  hideValues
}) {
  const [filterPaid, setFilterPaid] = useState('all');

  const showAmount = (val) => hideValues ? 'R$ •••••' : formatCurrency(val);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = String(month + 1).padStart(2, '0');
  const targetPrefix = `${year}-${monthStr}`;
  const todayStr = getTodayDateString();

  const monthScheduled = scheduled.filter(s => {
    if (s.user_id !== currentUser.id) return false;
    const sDate = (s.due_date || '').split('T')[0];
    return sDate.startsWith(targetPrefix);
  });

  const totalMes = monthScheduled.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalPago = monthScheduled.filter(c => c.is_paid).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalPendente = totalMes - totalPago;

  const contasPorDia = {};
  monthScheduled.forEach(s => {
    const d = parseInt((s.due_date || '').split('T')[0].split('-')[2]);
    if (!isNaN(d)) {
      if (!contasPorDia[d]) contasPorDia[d] = [];
      contasPorDia[d].push(s);
    }
  });

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDayStatus = (day) => {
    if (!day) return null;
    const items = contasPorDia[day] || [];
    if (items.length === 0) return null;
    const allPaid = items.every(i => i.is_paid);
    const dayStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    const isLate = !allPaid && dayStr < todayStr;
    if (isLate) return 'late';
    if (allPaid) return 'paid';
    return 'pending';
  };

  const filteredBills = monthScheduled.filter(s => {
    if (filterPaid === 'pending') return !s.is_paid;
    if (filterPaid === 'paid') return s.is_paid;
    return true;
  });

  const selectedDayItems = selectedCalendarDay ? (contasPorDia[selectedCalendarDay] || []) : [];

  return (
    <div className="space-y-6">
      {/* Sub-abas da Agenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setAgendaSubTab('bills')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              agendaSubTab === 'bills'
                ? 'bg-blue-600 text-white shadow-md'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Contas a Pagar / Receber
          </button>
          <button
            onClick={() => setAgendaSubTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              agendaSubTab === 'calendar'
                ? 'bg-blue-600 text-white shadow-md'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendário Mensal
          </button>
          <button
            onClick={() => {
              setAgendaSubTab('google-calendar');
              if (hasGoogleToken) fetchCalendarEvents();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              agendaSubTab === 'google-calendar'
                ? 'bg-blue-600 text-white shadow-md'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-red-500" />
            Google Calendar
          </button>
        </div>

        <button
          onClick={() => setShowTransactionModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agendar Conta
        </button>
      </div>

      {/* SUB-ABA 1: Contas a Pagar / Receber */}
      {agendaSubTab === 'bills' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Agendado</p>
              <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{showAmount(totalMes)}</p>
              <p className="text-xs text-gray-400 mt-1">{monthScheduled.length} lançamentos no mês</p>
            </div>
            <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className={`text-xs font-semibold uppercase text-amber-500`}>Pendente / A Vencer</p>
              <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{showAmount(totalPendente)}</p>
              <p className="text-xs text-gray-400 mt-1">{monthScheduled.filter(c => !c.is_paid).length} contas restantes</p>
            </div>
            <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className={`text-xs font-semibold uppercase text-green-500`}>Já Pago / Liquidado</p>
              <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{showAmount(totalPago)}</p>
              <p className="text-xs text-gray-400 mt-1">{monthScheduled.filter(c => c.is_paid).length} contas liquidadas</p>
            </div>
          </div>

          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Contas do Mês
              </h3>
              <div className={`flex p-1 rounded-xl text-xs font-semibold ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {[
                  { key: 'all', label: 'Todas' },
                  { key: 'pending', label: 'Pendentes' },
                  { key: 'paid', label: 'Pagas' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterPaid(key)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterPaid === key
                        ? 'bg-blue-600 text-white shadow'
                        : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredBills.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-40" />
                <p className={`text-base font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nenhuma conta encontrada para o filtro selecionado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBills.map(item => {
                  const cat = categories.find(c => c.id === item.category_id);
                  const isLate = !item.is_paid && item.due_date < todayStr;
                  const isToday = !item.is_paid && item.due_date === todayStr;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        item.is_paid
                          ? darkMode ? 'bg-gray-750/40 border-gray-700 opacity-60' : 'bg-gray-50 border-gray-200 opacity-60'
                          : isLate
                          ? darkMode ? 'bg-red-950/20 border-red-800/60' : 'bg-red-50 border-red-200'
                          : isToday
                          ? darkMode ? 'bg-amber-950/20 border-amber-800/60' : 'bg-amber-50 border-amber-200'
                          : darkMode ? 'bg-gray-750 border-gray-700' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat?.color || '#3b82f6' }}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {item.description}
                            </span>
                            {isLate && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                                Atrasada
                              </span>
                            )}
                            {isToday && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                                Vence Hoje
                              </span>
                            )}
                            {item.is_paid && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/80 dark:text-green-300">
                                Paga
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {cat?.name || 'Geral'} • Vencimento: <strong>{formatDate(item.due_date)}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <span className={`text-lg font-bold ${
                          item.is_paid ? 'line-through text-gray-400' : darkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {showAmount(item.amount)}
                        </span>
                        {!item.is_paid && (
                          <button
                            onClick={() => payScheduled(item)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow"
                            title="Registrar pagamento"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* SUB-ABA 2: Visão Calendário Mensal */}
      {agendaSubTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-400 uppercase">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="h-20 rounded-xl bg-transparent" />;
                }

                const status = getDayStatus(day);
                const isSelected = selectedCalendarDay === day;
                const count = (contasPorDia[day] || []).length;
                const isToday = `${year}-${monthStr}-${String(day).padStart(2, '0')}` === todayStr;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedCalendarDay(isSelected ? null : day)}
                    className={`h-20 p-1.5 rounded-xl border flex flex-col justify-between transition-all text-left ${
                      isSelected
                        ? 'ring-2 ring-blue-500 border-transparent shadow-md'
                        : darkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                    } ${
                      status === 'late'
                        ? darkMode ? 'bg-red-950/20' : 'bg-red-50'
                        : status === 'paid'
                        ? darkMode ? 'bg-green-950/20' : 'bg-green-50'
                        : status === 'pending'
                        ? darkMode ? 'bg-amber-950/20' : 'bg-amber-50'
                        : darkMode ? 'bg-gray-750' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {day}
                      </span>
                      {count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          status === 'late' ? 'bg-red-500 text-white' :
                          status === 'paid' ? 'bg-green-600 text-white' :
                          'bg-amber-500 text-white'
                        }`}>
                          {count}
                        </span>
                      )}
                    </div>

                    {count > 0 && (
                      <div className="text-[10px] font-medium truncate opacity-80">
                        {contasPorDia[day][0].description}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-base font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {selectedCalendarDay
                ? `Contas do dia ${selectedCalendarDay}/${monthStr}`
                : 'Selecione um dia para ver os detalhes'}
            </h3>

            {selectedCalendarDay ? (
              selectedDayItems.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum agendamento para este dia.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayItems.map(item => (
                    <div key={item.id} className={`p-3 rounded-xl border ${
                      darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{item.description}</span>
                        <span className="font-bold text-sm">{showAmount(item.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                        <span>{item.is_paid ? '✅ Pago' : '⏳ Pendente'}</span>
                        {!item.is_paid && (
                          <button
                            onClick={() => payScheduled(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2 py-1 rounded"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-gray-400">
                💡 Clique em qualquer dia do calendário para listar as contas correspondentes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: Google Calendar */}
      {agendaSubTab === 'google-calendar' && (
        <>
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <CalendarDays className="w-6 h-6 text-red-500" />
                  Sincronização Google Calendar
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Veja seus compromissos e eventos diretamente ao lado das suas contas financeiras.
                </p>
              </div>

              {!hasGoogleToken ? (
                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow"
                >
                  <ExternalLink className="w-4 h-4" />
                  Conectar Google Calendar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className={`flex p-1 rounded-xl text-xs font-semibold ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {[
                      { key: 'today', label: 'Hoje' },
                      { key: 'tomorrow', label: 'Amanhã' },
                      { key: 'week', label: '7 Dias' },
                      { key: 'month', label: 'Mês' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => {
                          setCalendarFilter(key);
                          fetchCalendarEvents(key);
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          calendarFilter === key
                            ? 'bg-blue-600 text-white shadow'
                            : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => fetchCalendarEvents(calendarFilter)}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:opacity-80"
                    title="Recarregar"
                  >
                    🔄
                  </button>
                </div>
              )}
            </div>
          </div>

          {loadingCalendar ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-400">Carregando eventos da sua agenda Google...</p>
            </div>
          ) : !hasGoogleToken ? (
            <div className={`p-8 rounded-2xl text-center border border-dashed ${
              darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-300 bg-white text-gray-500'
            }`}>
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-red-500 opacity-60" />
              <p className="font-semibold text-base mb-1">Google Calendar não conectado</p>
              <p className="text-xs mb-4">Clique no botão acima para autenticar sua conta Google e visualizar seus eventos.</p>
            </div>
          ) : calendarEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calendarEvents.map(event => {
                const start = event.start?.dateTime || event.start?.date;
                const isAllDay = !event.start?.dateTime;

                return (
                  <div key={event.id} className={`p-4 rounded-xl border shadow-sm ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {event.summary || '(Sem título)'}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          📅 {isAllDay ? formatDate(start) : new Date(start).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title="Abrir no Google Agenda"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">
                Nenhum evento registrado no Google Calendar para o período selecionado.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
