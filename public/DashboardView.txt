import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Target,
  Clock,
  CheckCircle2,
  CalendarCheck,
  Filter,
  AlertTriangle,
  Check,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  CalendarDays,
  X,
  ClipboardList
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Appointment, Category, ExpenseByCategory, ScheduledBill, Transaction } from './types';

interface DashboardViewProps {
  darkMode: boolean;
  income?: number;
  expenses?: number;
  balance?: number;
  prevIncome?: number;
  prevExpenses?: number;
  prevBalance?: number;
  incomeChange?: { text: string; direction: 'up' | 'down' | 'flat' } | null;
  expensesChange?: { text: string; direction: 'up' | 'down' | 'flat' } | null;
  balanceChange?: { text: string; direction: 'up' | 'down' | 'flat' } | null;
  transactions?: Transaction[];
  currentDate?: Date;
  showVal: (val: number) => string;
  formatCurrency: (val: number) => string;
  setView: (view: string) => void;
  setFilterType: (filter: string) => void;
  setHighlightedCategory: (cat: string | null) => void;
  setSearchTerm: (term: string) => void;
  expensesByCategory?: ExpenseByCategory[];
  savingsGoal?: number;
  savingsAmount?: number;
  setShowGoalModal: (show: boolean) => void;
  categories?: Category[];
  categoryBudgets?: Record<string, number>;
  currentMonthTransactions?: Transaction[];
  scheduled?: ScheduledBill[];
  appointments?: Appointment[];
  showTips: boolean;
  setShowTips: (show: boolean) => void;
  aiTips?: string[];
  isGeneratingTips: boolean;
  gerarDicasIA: () => void;
  setShowTransactionModal: () => void;
  onOpenNewAppointment?: () => void;
  handleExportPDF: () => void;
  handleExportExcel: () => void;
  toggleTransactionPaid?: (transaction: Transaction) => void;
  onOpenAnamnese?: (apt?: Appointment | null) => void;
  onOpenEvolution?: (apt?: Appointment | null) => void;
}

export default function DashboardView({
  darkMode,
  income = 0,
  expenses = 0,
  balance = 0,
  prevIncome = 0,
  prevExpenses = 0,
  prevBalance = 0,
  incomeChange,
  expensesChange,
  balanceChange,
  transactions = [],
  currentDate = new Date(),
  showVal,
  formatCurrency,
  setView,
  setFilterType,
  setHighlightedCategory,
  setSearchTerm,
  expensesByCategory = [],
  savingsGoal = 0,
  savingsAmount = 0,
  setShowGoalModal,
  categories = [],
  categoryBudgets = {},
  currentMonthTransactions = [],
  scheduled = [],
  appointments = [],
  showTips,
  setShowTips,
  aiTips = [],
  isGeneratingTips,
  gerarDicasIA,
  setShowTransactionModal,
  onOpenNewAppointment,
  handleExportPDF,
  handleExportExcel,
  toggleTransactionPaid,
  onOpenAnamnese,
  onOpenEvolution
}: DashboardViewProps) {
  const [chartFlowType, setChartFlowType] = useState<'calendar' | 'daily' | 'monthly'>('calendar');
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    dayNumber: number;
    dateStr: string;
    txs: Transaction[];
    incomes: number;
    expenses: number;
    balance: number;
  } | null>(null);

  // CÁLCULO DE DATAS PARA O ALERTA ANTI-JUROS
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const sevenDaysStr = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + 7);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Consideramos todas as despesas não pagas cadastradas
  const allUnpaidExpenses = useMemo(() => {
    const list = transactions && transactions.length > 0 ? transactions : currentMonthTransactions;
    return list.filter(t => t.type === 'expense' && t.is_paid === false);
  }, [transactions, currentMonthTransactions]);

  // Contas Vencidas (data anterior a hoje)
  const overdueTransactions = useMemo(() => {
    return allUnpaidExpenses
      .filter(t => (t.date || '').split('T')[0] < todayStr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allUnpaidExpenses, todayStr]);

  // Contas Vencendo Hoje
  const dueTodayTransactions = useMemo(() => {
    return allUnpaidExpenses.filter(t => (t.date || '').split('T')[0] === todayStr);
  }, [allUnpaidExpenses, todayStr]);

  // Contas Vencendo nos Próximos 7 Dias
  const dueNext7DaysTransactions = useMemo(() => {
    return allUnpaidExpenses
      .filter(t => {
        const d = (t.date || '').split('T')[0];
        return d > todayStr && d <= sevenDaysStr;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allUnpaidExpenses, todayStr, sevenDaysStr]);

  const overdueTotal = useMemo(() => {
    return overdueTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [overdueTransactions]);

  const dueTodayTotal = useMemo(() => {
    return dueTodayTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [dueTodayTransactions]);

  const dueNext7DaysTotal = useMemo(() => {
    return dueNext7DaysTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [dueNext7DaysTransactions]);

  const getDaysDiffText = (dateStr: string) => {
    const d = (dateStr || '').split('T')[0];
    if (d < todayStr) {
      const diffTime = new Date(todayStr + 'T00:00:00').getTime() - new Date(d + 'T00:00:00').getTime();
      const days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      return `Atrasada há ${days} dia${days > 1 ? 's' : ''}`;
    }
    if (d === todayStr) {
      return 'Vence hoje!';
    }
    const diffTime = new Date(d + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime();
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return `Vence em ${days} dia${days > 1 ? 's' : ''}`;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = String(month + 1).padStart(2, '0');
  const targetPrefix = `${year}-${monthStr}`;

  // 1. CÁLCULO DOS 4 CARDS DE KPI EXECUTIVOS:
  // a) Saldo Realizado (Receitas pagas - Despesas pagas)
  const paidIncomes = currentMonthTransactions
    .filter(t => t.type === 'income' && t.is_paid !== false)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const paidExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' && t.is_paid !== false)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const saldoRealizado = paidIncomes - paidExpenses;

  // b) Previsão de Despesas Pendentes (A Pagar)
  const unpaidExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' && t.is_paid === false)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const unpaidScheduled = (scheduled || [])
    .filter(s => {
      const d = (s.due_date || '').split('T')[0];
      return d.startsWith(targetPrefix) && !s.is_paid;
    })
    .reduce((s, b) => s + (Number(b.amount) || 0), 0);

  const totalDespesasPendentes = unpaidExpenses + unpaidScheduled;

  // c) Previsão de Receitas Pendentes (A Receber + Atendimentos Agendados)
  const unpaidIncomes = currentMonthTransactions
    .filter(t => t.type === 'income' && t.is_paid === false)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const atendimentosAgendadosValor = (appointments || [])
    .filter(a => {
      const d = (a.start_time || '').split('T')[0];
      return d.startsWith(targetPrefix) && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED');
    })
    .reduce((s, a) => s + (Number(a.service_value) || 0), 0);

  const totalReceitasPendentes = unpaidIncomes + atendimentosAgendadosValor;

  // d) Próximos Atendimentos do Dia
  const todayAppointments = (appointments || []).filter(a => {
    const d = (a.start_time || '').split('T')[0];
    return d === todayStr && a.status !== 'CANCELLED';
  }).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const nextAppointment = todayAppointments.find(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED') || todayAppointments[0];

  // 2. DADOS DO GRÁFICO DIÁRIO DE FLUXO DO MÊS (Entradas vs Saídas por dia)
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyFlowData = useMemo(() => {
    const daysData = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const datePrefix = `${year}-${monthStr}-${dayStr}`;

      let dayIncome = 0;
      let dayExpense = 0;

      currentMonthTransactions.forEach(t => {
        const tDate = (t.date || '').split('T')[0];
        if (tDate === datePrefix) {
          if (t.type === 'income') dayIncome += Number(t.amount) || 0;
          if (t.type === 'expense') dayExpense += Number(t.amount) || 0;
        }
      });

      daysData.push({
        day: `${day}`,
        label: `Dia ${day}`,
        Entradas: dayIncome,
        Saídas: dayExpense,
        Saldo: dayIncome - dayExpense
      });
    }

    return daysData;
  }, [currentMonthTransactions, year, monthStr, totalDaysInMonth]);

  // CÁLCULO DOS DIAS DO CALENDÁRIO FINANCEIRO MENSAL
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Seg...
  const calendarDays = useMemo(() => {
    const days: Array<{
      dayNumber: number | null;
      dateStr: string | null;
      txs: Transaction[];
      incomes: number;
      expenses: number;
      balance: number;
      hasUnpaid: boolean;
      hasOverdue: boolean;
    }> = [];

    // Preenchimento de dias vazios antes do dia 1
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        dayNumber: null,
        dateStr: null,
        txs: [],
        incomes: 0,
        expenses: 0,
        balance: 0,
        hasUnpaid: false,
        hasOverdue: false
      });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const datePrefix = `${year}-${monthStr}-${dayStr}`;

      const dayTxs = currentMonthTransactions.filter(t => (t.date || '').split('T')[0] === datePrefix);
      const dayIncomes = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const dayExpenses = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      const hasUnpaid = dayTxs.some(t => t.type === 'expense' && t.is_paid === false);
      const hasOverdue = dayTxs.some(t => t.type === 'expense' && t.is_paid === false && datePrefix < todayStr);

      days.push({
        dayNumber: day,
        dateStr: datePrefix,
        txs: dayTxs,
        incomes: dayIncomes,
        expenses: dayExpenses,
        balance: dayIncomes - dayExpenses,
        hasUnpaid,
        hasOverdue
      });
    }

    return days;
  }, [year, monthStr, firstDayOfWeek, totalDaysInMonth, currentMonthTransactions, todayStr]);

  // 3. COMPARATIVO ÚLTIMOS 6 MESES
  const sixMonthsChartData = useMemo(() => {
    const base = currentDate ? new Date(currentDate) : new Date();
    const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return Array.from({ length: 6 }).map((_, idx) => {
      const i = 5 - idx;
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${y}-${m}`;
      const label = `${monthsPt[d.getMonth()]}/${String(y).slice(2)}`;

      let inc = 0;
      let exp = 0;

      if (i === 0) {
        inc = Number(income) || 0;
        exp = Number(expenses) || 0;
      } else if (i === 1) {
        inc = Number(prevIncome) || 0;
        exp = Number(prevExpenses) || 0;
      } else {
        const monthTx = (transactions || []).filter(t => (t.date || '').startsWith(prefix));
        inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      }

      return {
        label,
        Entradas: inc,
        Saídas: exp,
        Saldo: inc - exp
      };
    });
  }, [income, expenses, prevIncome, prevExpenses, transactions, currentDate]);

  // 4. DADOS DO GRÁFICO DONUT / PIE DE CATEGORIAS
  const donutData = useMemo(() => {
    if (!expensesByCategory || expensesByCategory.length === 0) return [];
    return expensesByCategory.map(cat => ({
      name: cat.name,
      value: cat.value,
      color: cat.color || '#3b82f6',
      percent: cat.percent
    }));
  }, [expensesByCategory]);

  return (
    <div className="space-y-6">
      {/* 4 CARDS DE KPI EXECUTIVOS NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Saldo Realizado */}
        <div
          onClick={() => {
            setFilterType('paid');
            setView('transactions');
          }}
          className={`p-5 rounded-2xl border shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all group ${
            darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:bg-gray-50'
          }`}
          title="Clique para ver os lançamentos pagos"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Saldo Realizado
            </span>
            <div className={`p-2 rounded-xl ${saldoRealizado >= 0 ? 'bg-green-100 dark:bg-green-950/60 text-green-600' : 'bg-red-100 dark:bg-red-950/60 text-red-600'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className={`text-2xl sm:text-3xl font-extrabold ${saldoRealizado >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {showVal(saldoRealizado)}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span>Quitadas: +{showVal(paidIncomes)}</span>
            <span className="text-red-400">-{showVal(paidExpenses)}</span>
          </div>
        </div>

        {/* KPI 2: Previsão de Despesas Pendentes */}
        <div
          onClick={() => {
            setFilterType('unpaid');
            setView('transactions');
          }}
          className={`p-5 rounded-2xl border shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all group ${
            darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:bg-gray-50'
          }`}
          title="Clique para ver contas a pagar"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              A Pagar (Pendentes)
            </span>
            <div className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-yellow-500">
            {showVal(totalDespesasPendentes)}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span>Contas a vencer no mês</span>
            <span className="text-blue-400 group-hover:underline">Ver contas →</span>
          </div>
        </div>

        {/* KPI 3: Previsão de Receitas Pendentes */}
        <div
          onClick={() => {
            setView('agenda');
          }}
          className={`p-5 rounded-2xl border shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all group ${
            darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:bg-gray-50'
          }`}
          title="Clique para ver agendamentos na Agenda"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              A Receber + Atendimentos
            </span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-blue-500">
            {showVal(totalReceitasPendentes)}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span>{showVal(atendimentosAgendadosValor)} em serviços</span>
            <span className="text-blue-400 group-hover:underline">Agenda →</span>
          </div>
        </div>

        {/* KPI 4: Próximos Atendimentos do Dia */}
        <div
          onClick={() => {
            setView('agenda');
          }}
          className={`p-5 rounded-2xl border shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all group ${
            darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:bg-gray-50'
          }`}
          title="Clique para gerenciar a agenda de hoje"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Atendimentos de Hoje
            </span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-purple-500">
            {todayAppointments.length} cliente{todayAppointments.length !== 1 ? 's' : ''}
          </div>

          <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 truncate">
            {nextAppointment ? (
              <div className="flex items-center justify-between gap-1">
                <span className="truncate block">
                  Próximo: <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{nextAppointment.client_name}</strong> ({nextAppointment.start_time?.substring(11, 16)})
                </span>
                {setView && (
                  <button
                    type="button"
                    onClick={() => setView('agenda')}
                    className="text-purple-500 font-bold hover:underline inline-flex items-center text-[11px] flex-shrink-0 cursor-pointer"
                    title="Ver Agenda"
                  >
                    Ver Agenda
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>Nenhum agendado hoje</span>
                {setView && (
                  <button
                    type="button"
                    onClick={() => setView('agenda')}
                    className="text-purple-500 font-bold hover:underline text-[11px] cursor-pointer"
                  >
                    Abrir Agenda
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📋 BANNER DE DESTAQUE: FICHA DE ANAMNESE TRG */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900/90 via-teal-800/80 to-cyan-900/90 border border-teal-500/40 p-4 sm:p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-400 text-teal-950 px-2 py-0.5 rounded-full">
                Módulo Clínico TRG
              </span>
              <span className="text-xs text-teal-200">1ª Consulta & Alvos</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Ficha de Anamnese & Mapeamento de Alvos
            </h3>
            <p className="text-xs text-teal-100/80 line-clamp-1">
              Linha do tempo (Infância, Adolescência, Adulta), avaliação do SUD e planejamento terapêutico.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              if (setView) setView('anamnese');
              else if (onOpenAnamnese) onOpenAnamnese(null);
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-teal-400 hover:bg-teal-300 text-teal-950 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>Acessar Fichas de Anamnese</span>
          </button>
          {onOpenAnamnese && (
            <button
              type="button"
              onClick={() => onOpenAnamnese(null)}
              className="px-3 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-teal-100 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Nova Ficha"
            >
              <Plus className="w-4 h-4" />
              <span>Nova</span>
            </button>
          )}
        </div>
      </div>

      {/* 🛡️ PAINEL ANTI-JUROS: CONTAS VENCIDAS & VENCENDO HOJE */}
      <div className={`p-5 sm:p-6 rounded-2xl border shadow-xl transition-all ${
        overdueTransactions.length > 0
          ? darkMode
            ? 'bg-gradient-to-r from-red-950/40 via-gray-900 to-amber-950/30 border-red-500/40'
            : 'bg-gradient-to-r from-red-50 via-white to-amber-50 border-red-200'
          : dueTodayTransactions.length > 0
          ? darkMode
            ? 'bg-gradient-to-r from-yellow-950/40 via-gray-900 to-amber-950/30 border-yellow-500/40'
            : 'bg-gradient-to-r from-yellow-50 via-white to-amber-50 border-yellow-200'
          : darkMode
          ? 'bg-gray-800/80 border-gray-700'
          : 'bg-white border-gray-100'
      }`}>
        {/* Cabeçalho do Alerta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              overdueTransactions.length > 0
                ? 'bg-red-500/20 text-red-500 animate-pulse'
                : dueTodayTransactions.length > 0
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-green-500/20 text-green-500'
            }`}>
              {overdueTransactions.length > 0 ? (
                <ShieldAlert className="w-6 h-6" />
              ) : dueTodayTransactions.length > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Alerta Anti-Juros & Vencimentos
                </h3>
                {overdueTransactions.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-sm shadow-red-500/30">
                    🔴 {overdueTransactions.length} VENCIDA{overdueTransactions.length > 1 ? 'S' : ''}
                  </span>
                ) : dueTodayTransactions.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-yellow-500 text-gray-950 shadow-sm shadow-yellow-500/30">
                    🟡 {dueTodayTransactions.length} HOJE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/20 text-green-400">
                    ✅ 100% Em Dia
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {overdueTransactions.length > 0
                  ? 'Atenção imediata: Quite as contas atrasadas para não pagar juros ou multas bancárias!'
                  : dueTodayTransactions.length > 0
                  ? 'Você tem contas com vencimento para hoje! Não deixe para a última hora.'
                  : 'Parabéns! Não há contas em atraso. Próximos vencimentos monitorados.'}
              </p>
            </div>
          </div>

          {/* Cards Mini de Contadores */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setFilterType('overdue');
                setView('transactions');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                overdueTransactions.length > 0
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-gray-700/30 border-gray-600/30 text-gray-400'
              }`}
            >
              <div className="text-[10px] uppercase font-semibold">Vencidas</div>
              <div className="text-sm font-black">{overdueTransactions.length} • {showVal(overdueTotal)}</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterType('due_today');
                setView('transactions');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                dueTodayTransactions.length > 0
                  ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30'
                  : 'bg-gray-700/30 border-gray-600/30 text-gray-400'
              }`}
            >
              <div className="text-[10px] uppercase font-semibold">Vence Hoje</div>
              <div className="text-sm font-black">{dueTodayTransactions.length} • {showVal(dueTodayTotal)}</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterType('unpaid');
                setView('transactions');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold border bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer"
            >
              <div className="text-[10px] uppercase font-semibold">Próx. 7 Dias</div>
              <div className="text-sm font-black">{dueNext7DaysTransactions.length} • {showVal(dueNext7DaysTotal)}</div>
            </button>
          </div>
        </div>

        {/* Lista de Contas que Exigem Atenção Imediata (Top 4) */}
        {(overdueTransactions.length > 0 || dueTodayTransactions.length > 0) ? (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-400">
              <span>Contas que precisam de pagamento urgente:</span>
              <button
                type="button"
                onClick={() => {
                  setFilterType('unpaid');
                  setView('transactions');
                }}
                className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <span>Ver todas a pagar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[...overdueTransactions, ...dueTodayTransactions].slice(0, 4).map((t) => {
                const cat = categories.find(c => c.id === t.category_id);
                const isOver = (t.date || '').split('T')[0] < todayStr;
                const statusText = getDaysDiffText(t.date);

                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isOver
                        ? darkMode
                          ? 'bg-red-950/30 border-red-800/50 hover:bg-red-950/50'
                          : 'bg-red-50/80 border-red-200 hover:bg-red-100/60'
                        : darkMode
                        ? 'bg-yellow-950/30 border-yellow-800/50 hover:bg-yellow-950/50'
                        : 'bg-yellow-50/80 border-yellow-200 hover:bg-yellow-100/60'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm truncate">
                          {t.description}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isOver
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-500 text-gray-950'
                        }`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                        <span>Vencimento: <strong>{(t.date || '').split('T')[0].split('-').reverse().join('/')}</strong></span>
                        {cat && <span>• {cat.name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-sm sm:text-base font-black text-red-400">
                        {showVal(Number(t.amount) || 0)}
                      </span>
                      {toggleTransactionPaid && (
                        <button
                          type="button"
                          onClick={() => toggleTransactionPaid(t)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 active:scale-95 text-white shadow-md shadow-green-600/30 transition-all flex items-center gap-1 cursor-pointer"
                          title="Marcar conta como paga agora"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Pagar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Tudo tranquilo! Você não possui nenhuma conta atrasada para hoje. Parabéns pela organização!</span>
          </div>
        )}
      </div>

      {/* BARRA DE ATALHOS RÁPIDOS DE FILTRO PARA LANÇAMENTOS */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-md ${
        darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-500" />
          <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Filtros Rápidos de Lançamentos:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overdueTransactions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterType('overdue');
                setView('transactions');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ver contas atrasadas"
            >
              <span>🔴 Vencidas ({overdueTransactions.length})</span>
            </button>
          )}

          {dueTodayTransactions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterType('due_today');
                setView('transactions');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-gray-950 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Ver contas vencendo hoje"
            >
              <span>🟡 Vence Hoje ({dueTodayTransactions.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setFilterType('unpaid');
              setView('transactions');
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ver lançamentos que ainda faltam pagar"
          >
            <span>⏳ Todas A Pagar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterType('paid');
              setView('transactions');
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ver lançamentos já quitados"
          >
            <span>✅ Pagos (Quitados)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterType('all');
              setView('transactions');
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ir para a tela de lançamentos com todos os filtros"
          >
            <span>📋 Ver Todos os Lançamentos →</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FLUXO DO MÊS: CALENDÁRIO FINANCEIRO DIÁRIO / GRÁFICOS */}
        <div className={`lg:col-span-2 p-6 rounded-2xl shadow-lg border transition-all ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                {chartFlowType === 'calendar' ? (
                  <CalendarDays className="w-5 h-5 text-blue-500" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                )}
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {chartFlowType === 'calendar'
                    ? `Calendário Financeiro Diário (${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`
                    : chartFlowType === 'daily'
                    ? `Fluxo Financeiro Diário (${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`
                    : 'Evolução Semestral (Últimos 6 Meses)'}
                </h3>
              </div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                {chartFlowType === 'calendar'
                  ? 'Entradas e Saídas distribuídas no calendário mês a mês. Clique no dia para ver detalhes.'
                  : chartFlowType === 'daily'
                  ? 'Gráfico de barras com entradas e saídas de cada dia'
                  : 'Histórico consolidado mês a mês'}
              </p>
            </div>

            {/* Seletor de 3 Modos: Calendário, Gráfico Diário, Últimos 6 Meses */}
            <div className={`flex rounded-xl p-1 border text-xs font-bold ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'
            }`}>
              <button
                type="button"
                onClick={() => setChartFlowType('calendar')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartFlowType === 'calendar'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Ver calendário do mês com entradas e saídas por dia"
              >
                🗓️ Calendário
              </button>
              <button
                type="button"
                onClick={() => setChartFlowType('daily')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartFlowType === 'daily'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Ver gráfico de barras diário"
              >
                📊 Gráfico
              </button>
              <button
                type="button"
                onClick={() => setChartFlowType('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartFlowType === 'monthly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Ver últimos 6 meses"
              >
                📈 6 Meses
              </button>
            </div>
          </div>

          {/* VISUALIZAÇÃO 1: CALENDÁRIO MENSAL */}
          {chartFlowType === 'calendar' ? (
            <div className="space-y-3">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 pb-1 border-b border-gray-100 dark:border-gray-700/80">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid dos dias do mês */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarDays.map((item, idx) => {
                  if (!item.dayNumber) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[56px] sm:min-h-[70px] rounded-xl opacity-20 pointer-events-none"
                      />
                    );
                  }

                  const isToday = item.dateStr === todayStr;
                  const hasTxs = item.txs.length > 0;

                  return (
                    <div
                      key={item.dateStr}
                      onClick={() => setSelectedDayDetails(item)}
                      className={`min-h-[56px] sm:min-h-[70px] p-1 sm:p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group hover:scale-[1.03] hover:shadow-lg ${
                        isToday
                          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                          : item.hasOverdue
                          ? darkMode ? 'border-red-700/60 bg-red-950/20 hover:border-red-500' : 'border-red-200 bg-red-50/60 hover:border-red-300'
                          : item.hasUnpaid
                          ? darkMode ? 'border-yellow-700/60 bg-yellow-950/20 hover:border-yellow-500' : 'border-yellow-200 bg-yellow-50/60 hover:border-yellow-300'
                          : darkMode
                          ? 'border-gray-700/80 bg-gray-800/60 hover:border-gray-500'
                          : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
                      }`}
                      title={`Clique para ver os ${item.txs.length} lançamentos do dia ${item.dayNumber}`}
                    >
                      {/* Topo do dia: número + tag hoje ou alerta */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black rounded-full w-5 h-5 flex items-center justify-center ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : darkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-700'
                        }`}>
                          {item.dayNumber}
                        </span>

                        {item.hasOverdue ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Conta vencida neste dia" />
                        ) : item.hasUnpaid ? (
                          <span className="w-2 h-2 rounded-full bg-yellow-500" title="Conta a pagar neste dia" />
                        ) : isToday ? (
                          <span className="text-[9px] font-bold uppercase text-blue-400 hidden sm:inline">Hoje</span>
                        ) : null}
                      </div>

                      {/* Valores do dia */}
                      <div className="space-y-0.5 mt-1 overflow-hidden text-left">
                        {item.incomes > 0 && (
                          <div className="text-[10px] sm:text-[11px] font-extrabold text-green-500 truncate" title={`Entradas: +${showVal(item.incomes)}`}>
                            <span className="hidden sm:inline">+</span>{showVal(item.incomes)}
                          </div>
                        )}
                        {item.expenses > 0 && (
                          <div className="text-[10px] sm:text-[11px] font-extrabold text-red-400 truncate" title={`Saídas: -${showVal(item.expenses)}`}>
                            <span className="hidden sm:inline">-</span>{showVal(item.expenses)}
                          </div>
                        )}
                        {!hasTxs && (
                          <span className="text-[10px] text-gray-500/40 hidden sm:block">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legenda do Calendário */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/80 text-[11px] text-gray-400">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Entradas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Saídas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" /> A Pagar
                  </span>
                </div>
                <span className="italic text-gray-500 hidden sm:inline">
                  💡 Clique em qualquer dia para ver os lançamentos
                </span>
              </div>
            </div>
          ) : (
            /* VISUALIZAÇÃO 2 E 3: GRÁFICO DIÁRIO OU 6 MESES */
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartFlowType === 'daily' ? (
                  <BarChart data={dailyFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="day" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 11 }} />
                    <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(val), '']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        borderColor: darkMode ? '#374151' : '#e5e7eb',
                        borderRadius: '0.75rem',
                        color: darkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={sixMonthsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="label" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                    <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(val), '']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        borderColor: darkMode ? '#374151' : '#e5e7eb',
                        borderRadius: '0.75rem',
                        color: darkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Saldo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRÁFICO 2: DONUT / PIE DE GASTOS POR CATEGORIA */}
        <div className={`p-6 rounded-2xl shadow-lg border flex flex-col justify-between ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Gastos por Categoria
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Composição proporcional das saídas
                </p>
              </div>
              <span className="text-xs font-bold text-red-500">
                Total: {showVal(expenses)}
              </span>
            </div>

            {donutData.length === 0 ? (
              <div className="py-20 text-center text-gray-400 text-xs">
                Nenhuma despesa registrada para este mês.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(val), 'Valor']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        borderColor: darkMode ? '#374151' : '#e5e7eb',
                        borderRadius: '0.75rem',
                        color: darkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Mini lista com as 3 maiores despesas */}
          {donutData.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {donutData.slice(0, 3).map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.name}
                    </span>
                  </div>
                  <span className="font-extrabold text-red-400">
                    {showVal(item.value)} ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO: ATENDIMENTOS RECENTES & META FINANCEIRA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atendimentos Agendados para os Próximos Dias */}
        <div className={`p-6 rounded-2xl shadow-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <CalendarCheck className="w-5 h-5 text-blue-500" />
              Agenda Próxima & Clientes
            </h3>
            <button
              onClick={() => setView('agenda')}
              className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"
            >
              Ver agenda completa →
            </button>
          </div>

          {(appointments || []).length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              Nenhum agendamento cadastrado.{' '}
              <button
                onClick={onOpenNewAppointment}
                className="text-blue-500 font-bold hover:underline"
              >
                Clique para agendar.
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(appointments || [])
                .slice(0, 4)
                .map(apt => (
                  <div
                    key={apt.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 font-bold flex flex-col items-center justify-center text-xs">
                        <span>{(apt.start_time || '').substring(8, 10)}</span>
                        <span className="text-[9px] opacity-75">{(apt.start_time || '').substring(11, 16)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {apt.title}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {apt.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {apt.client_name} {apt.client_phone ? `• ${apt.client_phone}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botões de Prontuário & Anamnese */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        {onOpenAnamnese && (
                          <button
                            type="button"
                            onClick={() => onOpenAnamnese(apt)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Abrir Ficha de Anamnese deste assistido"
                          >
                            <Target className="w-3 h-3" />
                            <span>Anamnese</span>
                          </button>
                        )}
                        {onOpenEvolution && (
                          <button
                            type="button"
                            onClick={() => onOpenEvolution(apt)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Abrir Ficha de Evolução deste assistido"
                          >
                            <ClipboardList className="w-3 h-3" />
                            <span>Evolução</span>
                          </button>
                        )}
                      </div>

                      <div className="text-right">
                        {apt.service_value > 0 && (
                          <span className="text-xs font-extrabold text-emerald-500 block">
                            {showVal(apt.service_value)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {apt.synced_google ? 'Google sync' : 'Local'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Card de Meta de Reserva Financeira */}
        <div className={`p-6 rounded-2xl shadow-lg border flex flex-col justify-between ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <Target className="w-5 h-5 text-indigo-500" />
                Meta de Reserva Financeira
              </h3>
              <button
                onClick={() => setShowGoalModal(true)}
                className="text-xs font-bold text-indigo-500 hover:underline"
              >
                Ajustar Meta
              </button>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-gray-400">Guardado até o momento</span>
              <span className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {showVal(savingsAmount)} / <span className="text-gray-400 text-sm">{showVal(savingsGoal)}</span>
              </span>
            </div>

            {/* Barra de Progresso */}
            {(() => {
              const pct = savingsGoal > 0 ? Math.min(100, Math.round((savingsAmount / savingsGoal) * 100)) : 0;
              return (
                <div>
                  <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2 font-semibold">
                    <span>{pct}% concluído</span>
                    <span>Faltam {showVal(Math.max(0, savingsGoal - savingsAmount))}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className={`p-4 rounded-xl text-xs mt-6 ${
            darkMode ? 'bg-gray-750 text-gray-300' : 'bg-indigo-50 text-indigo-900'
          }`}>
            💡 <strong>Dica de Planejamento:</strong> Seus rendimentos e saldo mensal positivo podem ser alocados automaticamente para acelerar a conclusão da sua meta.
          </div>
        </div>
      </div>

      {/* DICAS FINANCEIRAS IA */}
      <div className={`p-6 rounded-2xl shadow-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-purple-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Dicas & Diagnóstico Financeiro Inteligente
              </h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Recomendações geradas com base nas suas receitas, despesas e atendimentos do mês
              </p>
            </div>
          </div>

          <button
            onClick={gerarDicasIA}
            disabled={isGeneratingTips}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            {isGeneratingTips ? 'Analisando...' : 'Atualizar Dicas'}
          </button>
        </div>

        {showTips && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiTips.map((tip, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  darkMode ? 'bg-gray-750 border-gray-700 text-gray-300' : 'bg-purple-50/60 border-purple-100 text-gray-800'
                }`}
              >
                {tip}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTÕES DE AÇÃO RÁPIDA EXECUTIVA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={setShowTransactionModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>Novo Lançamento</span>
        </button>

        <button
          onClick={onOpenNewAppointment}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 text-xs cursor-pointer"
        >
          <CalendarCheck className="w-4 h-4 flex-shrink-0" />
          <span>Novo Agendamento</span>
        </button>

        {/* BOTÃO FICHA DE ANAMNESE TRG */}
        <button
          onClick={() => {
            if (setView) setView('anamnese');
            else if (onOpenAnamnese) onOpenAnamnese(null);
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-3.5 px-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all transform hover:-translate-y-0.5 text-xs cursor-pointer"
          title="Abrir Ficha de Anamnese TRG (Primeira Consulta & Mapeamento de Alvos)"
        >
          <Target className="w-4 h-4 flex-shrink-0" />
          <span>Ficha de Anamnese TRG</span>
        </button>

        {/* BOTÃO PRONTUÁRIO & EVOLUÇÃO TRG */}
        <button
          onClick={() => onOpenEvolution && onOpenEvolution(null)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 px-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5 text-xs cursor-pointer"
          title="Abrir Prontuário Clínico & Evoluções TRG"
        >
          <ClipboardList className="w-4 h-4 flex-shrink-0" />
          <span>Prontuário TRG</span>
        </button>

        <button
          onClick={handleExportPDF}
          className={`flex items-center justify-center gap-2 font-bold py-3.5 px-3 rounded-xl shadow border transition-all text-xs cursor-pointer ${
            darkMode
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-200'
              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>Exportar PDF</span>
        </button>

        <button
          onClick={handleExportExcel}
          className={`flex items-center justify-center gap-2 font-bold py-3.5 px-3 rounded-xl shadow border transition-all text-xs cursor-pointer ${
            darkMode
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-200'
              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* MODAL DE DETALHES DO DIA SELECIONADO NO CALENDÁRIO */}
      {selectedDayDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 border ${
            darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-900'
          }`}>
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    Lançamentos do Dia {selectedDayDetails.dayNumber}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedDayDetails.dateStr?.split('-').reverse().join('/')} ({currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayDetails(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Dia */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Entradas</span>
                <span className="text-sm font-black text-green-400">+{showVal(selectedDayDetails.incomes)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Saídas</span>
                <span className="text-sm font-black text-red-400">-{showVal(selectedDayDetails.expenses)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Saldo</span>
                <span className={`text-sm font-black ${selectedDayDetails.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {showVal(selectedDayDetails.balance)}
                </span>
              </div>
            </div>

            {/* Lista de Lançamentos do Dia */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 my-3">
              {selectedDayDetails.txs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Nenhum lançamento registrado neste dia.
                </div>
              ) : (
                selectedDayDetails.txs.map(t => {
                  const cat = categories.find(c => c.id === t.category_id);
                  const isIncome = t.type === 'income';

                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        darkMode ? 'bg-gray-900/60 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold truncate">
                            {t.description}
                          </span>
                          {t.is_paid === false ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                              A Pagar
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
                              {isIncome ? 'Recebido' : 'Pago'}
                            </span>
                          )}
                        </div>
                        {cat && (
                          <span className="text-[10px] text-gray-400 mt-0.5 block">
                            {cat.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs sm:text-sm font-black ${
                          isIncome ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {isIncome ? '+' : '-'} {showVal(Number(t.amount) || 0)}
                        </span>

                        {toggleTransactionPaid && (
                          <button
                            type="button"
                            onClick={() => {
                              toggleTransactionPaid(t);
                              setSelectedDayDetails(prev => {
                                if (!prev) return null;
                                const nextTxs = prev.txs.map(item => item.id === t.id ? { ...item, is_paid: !item.is_paid } : item);
                                return { ...prev, txs: nextTxs };
                              });
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              t.is_paid !== false
                                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-green-600 hover:text-white'
                            }`}
                            title={t.is_paid !== false ? 'Pago (Clique para marcar pendente)' : 'Pendente (Clique para quitar)'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé com Ações */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDayDetails(null);
                  setShowTransactionModal();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Lançamento</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDayDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
