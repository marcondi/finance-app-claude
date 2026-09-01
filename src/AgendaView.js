import React, { useState } from 'react';
import { 
  Calendar, 
  CalendarDays, 
  Plus, 
  Check, 
  AlertCircle, 
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
  getTodayDateString
}) {
  const [filterPaid, setFilterPaid] = useState('all');

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

  const primeiroDiaSemana = new Date(year, month, 1).getDay();
  const totalDiasNoMes = new Date(year, month + 1, 0).getDate();
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const contasDiaSelecionado = selectedCalendarDay ? (contasPorDia[selectedCalendarDay] || []) : [];

  return (
    <div>
      {/* Alternador de Sub-Aba: Contas vs Google Calendar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className={`flex gap-2 p-1.5 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <button
            onClick={() => setAgendaSubTab('bills')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              agendaSubTab === 'bills'
                ? 'bg-blue-600 text-white shadow-lg'
                : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Contas Agendadas
          </button>

          <button
            onClick={() => {
              setAgendaSubTab('google-calendar');
              fetchCalendarEvents(calendarFilter);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              agendaSubTab === 'google-calendar'
                ? 'bg-blue-600 text-white shadow-lg'
                : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-red-500" />
            Google Calendar
          </button>
        </div>

        {agendaSubTab === 'bills' ? (
          <button
            onClick={() => setShowTransactionModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        ) : (
          !hasGoogleToken && (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Conectar Google Calendar
            </button>
          )
        )}
      </div>

      {/* CONTEÚDO: CONTAS AGENDADAS COM CALENDÁRIO */}
      {agendaSubTab === 'bills' && (
        <>
          {/* Resumo Financeiro do Mês */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow p-4 text-center`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>TOTAL AGENDADO</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(totalMes)}</p>
            </div>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow p-4 text-center`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>JÁ PAGO</p>
              <p className="text-xl font-bold text-green-500">{formatCurrency(totalPago)}</p>
            </div>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow p-4 text-center`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>A PAGAR</p>
              <p className="text-xl font-bold text-orange-500">{formatCurrency(totalPendente)}</p>
            </div>
          </div>

          {/* Calendário Interativo em Grid */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
            <div className="grid grid-cols-7 mb-3 text-center">
              {diasSemana.map(d => (
                <div key={d} className={`text-xs font-bold py-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square opacity-0" />
              ))}

              {Array.from({ length: totalDiasNoMes }, (_, i) => i + 1).map(dia => {
                const contas = contasPorDia[dia] || [];
                const ehHoje = new Date().getDate() === dia && new Date().getMonth() === month && new Date().getFullYear() === year;
                const temConta = contas.length > 0;
                const todasPagas = temConta && contas.every(c => c.is_paid);
                const selecionado = selectedCalendarDay === dia;

                return (
                  <button
                    key={dia}
                    onClick={() => setSelectedCalendarDay(selecionado ? null : dia)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-sm font-semibold transition-all border ${
                      selecionado 
                        ? 'ring-2 ring-blue-500 border-blue-500 scale-105 z-10' 
                        : 'border-transparent'
                    } ${
                      ehHoje
                        ? 'bg-blue-600 text-white font-bold shadow'
                        : temConta
                        ? todasPagas
                          ? darkMode ? 'bg-green-950/40 text-green-300 border-green-800' : 'bg-green-100 text-green-800 border-green-300'
                          : darkMode ? 'bg-orange-950/40 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-800 border-orange-300'
                        : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{dia}</span>
                    {temConta && (
                      <span className={`text-[10px] font-bold px-1 rounded-full ${
                        ehHoje ? 'text-white bg-blue-700' : todasPagas ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400 font-extrabold'
                      }`}>
                        {contas.length} {contas.length === 1 ? 'conta' : 'contas'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda do Calendário */}
            <div className="flex gap-4 mt-5 justify-center flex-wrap pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded bg-blue-600" />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Hoje</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded bg-orange-400" />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Contas a Pagar</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded bg-green-500" />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Contas Pagas</span>
              </div>
            </div>
          </div>

          {/* Detalhes do Dia Selecionado */}
          {selectedCalendarDay && (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  📅 Contas do Dia {selectedCalendarDay}/{monthStr}/{year}
                </h4>
                <button
                  onClick={() => setSelectedCalendarDay(null)}
                  className={`text-xs px-2.5 py-1 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  ✕ Fechar dia
                </button>
              </div>

              {contasDiaSelecionado.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Nenhuma conta cadastrada com vencimento neste dia.
                </p>
              ) : (
                <div className="space-y-3">
                  {contasDiaSelecionado.map(c => {
                    const cat = categories.find(category => category.id === c.category_id);
                    return (
                      <div key={c.id} className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          {cat && <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />}
                          <div>
                            <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{c.description}</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {cat?.name || 'Geral'} · {c.is_paid ? '✅ Pago' : '⏳ A pagar'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-base font-bold text-red-500">{formatCurrency(c.amount)}</span>
                          {!c.is_paid && (
                            <button
                              onClick={() => payScheduled(c)}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors"
                            >
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
          )}

          {/* Filtro de Status das Contas */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 mb-6`}>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Filtrar Lista de Contas
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterPaid('all')}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                  filterPaid === 'all'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterPaid('paid')}
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                  filterPaid === 'paid'
                    ? 'bg-green-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Check className="w-4 h-4" />
                Pagas
              </button>
              <button
                onClick={() => setFilterPaid('unpaid')}
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-full font-medium text-sm border transition-colors ${
                  filterPaid === 'unpaid'
                    ? darkMode ? 'bg-gray-600 text-white border-gray-500' : 'bg-gray-300 text-gray-800 border-gray-400'
                    : darkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                A pagar
              </button>
            </div>
          </div>

          {/* Lista de Contas Agendadas */}
          <div className="grid gap-4">
            {(() => {
              let filteredList = monthScheduled.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

              if (filterPaid === 'paid') {
                filteredList = filteredList.filter(s => s.is_paid);
              } else if (filterPaid === 'unpaid') {
                filteredList = filteredList.filter(s => !s.is_paid);
              }

              if (filteredList.length === 0) {
                return (
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
                    <Calendar className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {filterPaid !== 'all'
                        ? 'Nenhum agendamento encontrado com esse status.'
                        : 'Nenhum agendamento para este mês.'}
                    </p>
                  </div>
                );
              }

              return filteredList.map(scheduledItem => {
                const category = categories.find(c => c.id === scheduledItem.category_id);
                const sDateStr = (scheduledItem.due_date || '').split('T')[0];
                const isPastDue = sDateStr < todayStr && !scheduledItem.is_paid;

                return (
                  <div
                    key={scheduledItem.id}
                    className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 ${
                      isPastDue ? 'border-2 border-red-500' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {scheduledItem.description}
                          </h3>
                          {scheduledItem.is_paid ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <Check className="w-4 h-4 mr-1" />
                              Pago
                            </span>
                          ) : isPastDue ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Atrasado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <Calendar className="w-4 h-4 mr-1" />
                              Pendente
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-white font-medium"
                            style={{ backgroundColor: category?.color || '#6b7280' }}
                          >
                            {category?.name || 'Geral'}
                          </span>
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Vencimento: {formatDate(scheduledItem.due_date)}
                          </span>
                          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {formatCurrency(scheduledItem.amount)}
                          </span>
                        </div>
                      </div>

                      {!scheduledItem.is_paid && (
                        <button
                          onClick={() => payScheduled(scheduledItem)}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Marcar como Pago
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}

      {/* CONTEÚDO: GOOGLE CALENDAR */}
      {agendaSubTab === 'google-calendar' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'today', label: 'Hoje' },
                { key: 'tomorrow', label: 'Amanhã' },
                { key: 'week', label: 'Esta Semana' },
                { key: 'month', label: 'Este Mês' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setCalendarFilter(key);
                    fetchCalendarEvents(key);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
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
              className={`text-sm font-semibold flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
            >
              🔄 Atualizar Eventos
            </button>
          </div>

          {!hasGoogleToken && (
            <div className={`p-6 rounded-2xl border mb-6 text-center ${
              darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-blue-500" />
              <h3 className="text-lg font-bold mb-2">Conecte sua conta do Google</h3>
              <p className="text-sm mb-4 max-w-md mx-auto">
                Faça login com o Google para visualizar seus compromissos e eventos do Google Calendar diretamente no FinanceApp!
              </p>
              <button
                onClick={handleGoogleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow"
              >
                Conectar com o Google
              </button>
            </div>
          )}

          {loadingCalendar ? (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Carregando compromissos do Google Calendar...</p>
            </div>
          ) : calendarEvents.length > 0 ? (
            <div className="grid gap-4">
              {calendarEvents.map(event => (
                <div
                  key={event.id}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                >
                  <div>
                    <h4 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {event.summary || 'Sem título'}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>
                        {event.start?.dateTime
                          ? new Date(event.start.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                          : event.start?.date
                          ? formatDate(event.start.date)
                          : 'Data não informada'}
                      </span>
                    </div>
                    {event.description && (
                      <p className={`text-sm mt-2 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {event.description}
                      </p>
                    )}
                  </div>

                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                        darkMode ? 'border-gray-700 hover:bg-gray-700 text-blue-400' : 'border-gray-200 hover:bg-gray-50 text-blue-600'
                      }`}
                    >
                      Abrir no Google <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : hasGoogleToken ? (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
              <CalendarDays className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Nenhum evento encontrado no Google Calendar para o período selecionado.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
