import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend
} from 'recharts';
import { 
  FileText, 
  FileSpreadsheet, 
  CircleDot, 
  BarChart3,
  Calendar,
  Layers,
  TrendingUp,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export default function ReportsView({
  darkMode,
  currentDate,
  currentMonthTransactions,
  transactions,
  scheduled,
  categories,
  last6MonthsData,
  reportFilter,
  setReportFilter,
  reportChart,
  setReportChart,
  formatCurrency,
  showVal,
  handleExportPDF,
  handleExportExcel,
  setHighlightedCategory,
  setFilterType,
  setView
}) {
  // Parâmetros da Projeção de Fluxo Futuro
  const [projectionHorizon, setProjectionHorizon] = useState(6); // 3, 6 ou 12 meses
  const [manualIncome, setManualIncome] = useState('');
  const [manualCardExpense, setManualCardExpense] = useState('');

  // 1. Despesas por Categoria do Mês Atual
  const expensesByCategory = (() => {
    const categoryMap = new Map();
    let totalExpenses = 0;

    (currentMonthTransactions || [])
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const val = Number(t.amount) || 0;
        totalExpenses += val;
        const current = categoryMap.get(t.category_id) || 0;
        categoryMap.set(t.category_id, current + val);
      });

    return Array.from(categoryMap.entries())
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        const pct = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
        return {
          id: catId,
          name: cat?.name || 'Sem Categoria',
          fullName: `${cat?.name || 'Sem Categoria'} (${pct}%)`,
          value: amount,
          color: cat?.color || '#6b7280',
          percent: pct
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  })();

  // 2. Receitas por Categoria do Mês Atual
  const incomesByCategory = (() => {
    const categoryMap = new Map();
    let totalIncomes = 0;

    (currentMonthTransactions || [])
      .filter(t => t.type === 'income')
      .forEach(t => {
        const val = Number(t.amount) || 0;
        totalIncomes += val;
        const current = categoryMap.get(t.category_id) || 0;
        categoryMap.set(t.category_id, current + val);
      });

    return Array.from(categoryMap.entries())
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        const pct = totalIncomes > 0 ? ((amount / totalIncomes) * 100).toFixed(1) : 0;
        return {
          id: catId,
          name: cat?.name || 'Sem Categoria',
          fullName: `${cat?.name || 'Sem Categoria'} (${pct}%)`,
          value: amount,
          color: cat?.color || '#10b981',
          percent: pct
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  })();

  // 3. Cálculos de Médias Históricas para a Projeção Futura
  const { historicalAvgIncome, historicalAvgCard } = useMemo(() => {
    const monthsData = last6MonthsData || [];
    const validMonths = monthsData.filter(m => m.income > 0 || m.expenses > 0);
    const count = validMonths.length || 1;

    const totalInc = validMonths.reduce((s, m) => s + m.income, 0);
    const avgInc = totalInc > 0 ? Math.round(totalInc / count) : 0;

    // Calcular média das faturas de cartão nos últimos meses
    const cardCategoryIds = categories
      .filter(c => c.name.toLowerCase().includes('cart') || c.name.toLowerCase().includes('fatura') || c.name.toLowerCase().includes('crédito') || c.name.toLowerCase().includes('credito'))
      .map(c => c.id);

    let totalCardSpent = 0;
    (transactions || []).forEach(t => {
      const isCardCat = cardCategoryIds.includes(t.category_id);
      const isCardDesc = (t.description || '').toLowerCase().includes('fatura') || (t.description || '').toLowerCase().includes('cart') || (t.description || '').toLowerCase().includes('nubank') || (t.description || '').toLowerCase().includes('itaú') || (t.description || '').toLowerCase().includes('itau') || (t.description || '').toLowerCase().includes('bradesco') || (t.description || '').toLowerCase().includes('inter') || (t.description || '').toLowerCase().includes('santander') || (t.description || '').toLowerCase().includes('c6');
      
      if (t.type === 'expense' && (isCardCat || isCardDesc)) {
        totalCardSpent += Number(t.amount) || 0;
      }
    });

    const avgCard = totalCardSpent > 0 ? Math.round(totalCardSpent / Math.max(count, 1)) : 0;

    return {
      historicalAvgIncome: avgInc,
      historicalAvgCard: avgCard
    };
  }, [last6MonthsData, transactions, categories]);

  // Valores efetivos de projeção (manuais ou calculados por média)
  const effectiveIncome = manualIncome !== '' ? (parseFloat(manualIncome) || 0) : historicalAvgIncome;
  const effectiveCardExpense = manualCardExpense !== '' ? (parseFloat(manualCardExpense) || 0) : historicalAvgCard;

  // 4. Motor de Projeção Mês a Mês
  const projectionData = useMemo(() => {
    const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = [];
    const baseDate = currentDate ? new Date(currentDate) : new Date();

    let cumulativeBalance = 0;

    for (let i = 1; i <= projectionHorizon; i++) {
      const targetMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const targetYear = targetMonthDate.getFullYear();
      const targetMonth = targetMonthDate.getMonth();
      const targetPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
      const label = `${monthsPt[targetMonth]}/${String(targetYear).slice(2)}`;

      // Contas fixas e despesas agendadas no sistema para esse mês futuro
      const futureScheduledExpenses = (scheduled || [])
        .filter(s => {
          const sDate = (s.due_date || '').split('T')[0];
          return sDate.startsWith(targetPrefix);
        })
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      const futureTransactionsExpenses = (transactions || [])
        .filter(t => {
          const tDate = (t.date || '').split('T')[0];
          return tDate.startsWith(targetPrefix) && t.type === 'expense';
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const fixedBills = Math.max(futureScheduledExpenses, futureTransactionsExpenses);

      // Entradas Previstas para o Mês
      const futureIncomesScheduled = (transactions || [])
        .filter(t => {
          const tDate = (t.date || '').split('T')[0];
          return tDate.startsWith(targetPrefix) && t.type === 'income';
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const monthIncome = futureIncomesScheduled > 0 ? futureIncomesScheduled : effectiveIncome;
      const totalExpense = fixedBills + effectiveCardExpense;
      const monthBalance = monthIncome - totalExpense;
      cumulativeBalance += monthBalance;

      let status = 'healthy';
      if (monthBalance < 0) {
        status = 'deficit';
      } else if (monthIncome > 0 && monthBalance < monthIncome * 0.15) {
        status = 'tight';
      }

      result.push({
        index: i,
        label,
        monthName: targetMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        income: monthIncome,
        fixedBills,
        cardExpense: effectiveCardExpense,
        totalExpense,
        balance: monthBalance,
        cumulativeBalance,
        status,
        'Entradas Previstas': monthIncome,
        'Despesas Previstas': totalExpense,
        'Saldo Projetado': monthBalance
      });
    }

    return result;
  }, [currentDate, projectionHorizon, effectiveIncome, effectiveCardExpense, scheduled, transactions]);

  // Totais da Projeção
  const totalProjectedIncome = projectionData.reduce((s, m) => s + m.income, 0);
  const totalProjectedExpense = projectionData.reduce((s, m) => s + m.totalExpense, 0);
  const avgMonthlyBuffer = projectionData.length > 0 ? (totalProjectedIncome - totalProjectedExpense) / projectionData.length : 0;
  const finalCumulativeBalance = projectionData.length > 0 ? projectionData[projectionData.length - 1].cumulativeBalance : 0;

  const activeData = reportFilter === 'incomes-category' 
    ? incomesByCategory 
    : expensesByCategory;

  const totalReportValue = activeData.reduce((s, i) => s + i.value, 0);

  const handleBarClick = (entry) => {
    if (entry && entry.name) {
      setHighlightedCategory(entry.name);
      setFilterType(reportFilter === 'incomes-category' ? 'income' : 'expense');
      setView('transactions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Controles do Relatório */}
      <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Seletor de Tipo de Relatório */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setReportFilter('future-projection')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                reportFilter === 'future-projection'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                  : darkMode ? 'bg-gray-700 text-purple-300 hover:bg-gray-600' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              🔮 Projeção de Fluxo Futuro
            </button>

            <button
              onClick={() => setReportFilter('expenses-category')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                reportFilter === 'expenses-category'
                  ? 'bg-red-600 text-white shadow-md'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Gastos por Categoria
            </button>

            <button
              onClick={() => setReportFilter('incomes-category')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                reportFilter === 'incomes-category'
                  ? 'bg-green-600 text-white shadow-md'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Receitas por Categoria
            </button>

            <button
              onClick={() => setReportFilter('monthly-evolution')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                reportFilter === 'monthly-evolution'
                  ? 'bg-blue-600 text-white shadow-md'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Evolução dos Últimos 6 Meses
            </button>
          </div>

          {/* Botões de Ação e Tipo de Gráfico */}
          <div className="flex items-center gap-2 flex-wrap">
            {reportFilter !== 'monthly-evolution' && reportFilter !== 'future-projection' && (
              <div className={`flex rounded-xl p-1 border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'
              }`}>
                <button
                  onClick={() => setReportChart('pie')}
                  className={`p-1.5 rounded-lg transition-all ${
                    reportChart === 'pie'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Gráfico de Pizza"
                >
                  <CircleDot className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setReportChart('bar')}
                  className={`p-1.5 rounded-lg transition-all ${
                    reportChart === 'bar'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Gráfico de Barras"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              title="Exportar Relatório em PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              title="Exportar Planilha Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* ABA 1: PROJEÇÃO DE FLUXO DE CAIXA FUTURO */}
      {reportFilter === 'future-projection' ? (
        <div className="space-y-6">
          {/* Painel Interativo de Parâmetros e Simulação */}
          <div className={`p-6 rounded-2xl shadow-lg border ${
            darkMode ? 'bg-gray-800 border-purple-900/40' : 'bg-gradient-to-r from-purple-50/70 to-blue-50/70 border-purple-200'
          }`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Simulador de Projeção & Fluxo de Caixa Futuro
                </h3>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Ajuste os parâmetros abaixo para recalcular sua projeção financeira futura em tempo real.
                </p>
              </div>

              {/* Seletor de Horizonte de Meses */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-400 mr-1">Projetar para:</span>
                {[3, 6, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => setProjectionHorizon(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      projectionHorizon === n
                        ? 'bg-purple-600 text-white shadow-md scale-105'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {n} Meses
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs de Ajuste Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-gray-700/60 border-gray-600' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                    <DollarSign className="w-4 h-4" />
                    Renda Mensal Estimada (R$)
                  </label>
                  {historicalAvgIncome > 0 && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      Média recente: {formatCurrency(historicalAvgIncome)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="50"
                  value={manualIncome !== '' ? manualIncome : (historicalAvgIncome || '')}
                  onChange={(e) => setManualIncome(e.target.value)}
                  placeholder="Digite sua renda prevista (ex: 5000)..."
                  className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border ${
                    darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>

              <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-gray-700/60 border-gray-600' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                    <CreditCard className="w-4 h-4" />
                    Média Estimada de Faturas de Cartão (R$)
                  </label>
                  {historicalAvgCard > 0 && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      Média faturas: {formatCurrency(historicalAvgCard)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="50"
                  value={manualCardExpense !== '' ? manualCardExpense : (historicalAvgCard || '')}
                  onChange={(e) => setManualCardExpense(e.target.value)}
                  placeholder="Gasto previsto com cartões (ex: 3000)..."
                  className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border ${
                    darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
            </div>
          </div>

          {/* 4 Cards de Métricas Preditivas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl shadow-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Folga Média Mensal
                </span>
                <TrendingUp className={`w-4 h-4 ${avgMonthlyBuffer >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div className={`text-xl font-extrabold mt-1.5 ${avgMonthlyBuffer >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {showVal(avgMonthlyBuffer)}
              </div>
              <span className="text-[11px] text-gray-400">
                Estimativa de sobra mensal
              </span>
            </div>

            <div className={`p-5 rounded-2xl shadow-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Total Saídas ({projectionHorizon}M)
                </span>
                <CreditCard className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xl font-extrabold text-red-500 mt-1.5">
                {showVal(totalProjectedExpense)}
              </div>
              <span className="text-[11px] text-gray-400">
                Fixas ({formatCurrency(projectionData.reduce((s, m) => s + m.fixedBills, 0))}) + Cartões ({formatCurrency(projectionData.reduce((s, m) => s + m.cardExpense, 0))})
              </span>
            </div>

            <div className={`p-5 rounded-2xl shadow-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Total Entradas ({projectionHorizon}M)
                </span>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-extrabold text-blue-500 mt-1.5">
                {showVal(totalProjectedIncome)}
              </div>
              <span className="text-[11px] text-gray-400">
                Renda total estimada no período
              </span>
            </div>

            <div className={`p-5 rounded-2xl shadow-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Saldo Acumulado ({projectionHorizon}M)
                </span>
                {finalCumulativeBalance >= 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className={`text-xl font-extrabold mt-1.5 ${finalCumulativeBalance >= 0 ? 'text-purple-500' : 'text-red-500'}`}>
                {showVal(finalCumulativeBalance)}
              </div>
              <span className="text-[11px] text-gray-400">
                Reserva acumulada ao fim dos {projectionHorizon} meses
              </span>
            </div>
          </div>

          {/* Gráfico Visual de Projeção */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Comparativo Previsto Mês a Mês ({projectionHorizon} Meses)
                </h3>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Entradas Previstas vs Despesas Totais Previstas vs Saldo Projetado
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="label" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), '']}
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      borderColor: darkMode ? '#374151' : '#e5e7eb',
                      borderRadius: '0.75rem',
                      color: darkMode ? '#f9fafb' : '#111827'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Entradas Previstas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas Previstas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saldo Projetado" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Detalhamento Preditivo Mês a Mês */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-base font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Detalhamento Financeiro dos Próximos {projectionHorizon} Meses
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b font-bold uppercase ${
                    darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                  }`}>
                    <th className="py-3 px-3">Mês</th>
                    <th className="py-3 px-3 text-right">Renda Prevista</th>
                    <th className="py-3 px-3 text-right">Contas Fixas</th>
                    <th className="py-3 px-3 text-right">Faturas Estimadas</th>
                    <th className="py-3 px-3 text-right">Total Saídas</th>
                    <th className="py-3 px-3 text-right">Saldo do Mês</th>
                    <th className="py-3 px-3 text-right">Saldo Acumulado</th>
                    <th className="py-3 px-3 text-center">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {projectionData.map(m => (
                    <tr key={m.label} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className={`py-3 px-3 font-bold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {m.monthName}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-green-500">
                        {showVal(m.income)}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {showVal(m.fixedBills)}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {showVal(m.cardExpense)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-red-500">
                        {showVal(m.totalExpense)}
                      </td>
                      <td className={`py-3 px-3 text-right font-extrabold ${m.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {m.balance >= 0 ? '+' : ''} {showVal(m.balance)}
                      </td>
                      <td className={`py-3 px-3 text-right font-extrabold ${m.cumulativeBalance >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                        {showVal(m.cumulativeBalance)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {m.status === 'healthy' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300">
                            🟢 Folga
                          </span>
                        )}
                        {m.status === 'tight' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300">
                            🟡 Apertado
                          </span>
                        )}
                        {m.status === 'deficit' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
                            🔴 Déficit
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explicação Didática */}
            <div className={`mt-5 p-4 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 ${
              darkMode ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-50 text-gray-700'
            }`}>
              <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Como funciona a projeção:</strong> As contas fixas são lidas diretamente das contas agendadas na sua <strong>Agenda</strong> para cada mês futuro. As faturas de cartão e a renda são baseadas nas médias do seu histórico e podem ser ajustadas livremente por você no simulador acima.
              </div>
            </div>
          </div>
        </div>
      ) : reportFilter === 'monthly-evolution' ? (
        /* ABA 2: EVOLUÇÃO 6 MESES */
        <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-base font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Comparativo de Entradas, Saídas e Saldo (6 Meses)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6MonthsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="label" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), '']}
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
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* ABA 3 & 4: CATEGORIAS */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {reportFilter === 'incomes-category' ? 'Distribuição de Receitas' : 'Distribuição de Despesas'}
              </h3>
              <span className={`text-sm font-bold ${
                reportFilter === 'incomes-category' ? 'text-green-500' : 'text-red-500'
              }`}>
                Total: {showVal(totalReportValue)}
              </span>
            </div>

            {activeData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm font-semibold">
                Nenhum lançamento registrado neste período.
              </div>
            ) : reportChart === 'pie' ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeData}
                      dataKey="value"
                      nameKey="fullName"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={45}
                      paddingAngle={2}
                    >
                      {activeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [formatCurrency(val), 'Total']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        borderColor: darkMode ? '#374151' : '#e5e7eb',
                        borderRadius: '0.75rem',
                        color: darkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis type="number" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 11 }} width={80} />
                    <Tooltip
                      formatter={(val) => [formatCurrency(val), 'Valor']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        borderColor: darkMode ? '#374151' : '#e5e7eb',
                        borderRadius: '0.75rem',
                        color: darkMode ? '#f9fafb' : '#111827'
                      }}
                    />
                    <Bar dataKey="value" onClick={handleBarClick} radius={[0, 4, 4, 0]}>
                      {activeData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tabela de Detalhamento com Ranking */}
          <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-base font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Detalhamento por Categoria ({currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
            </h3>

            {activeData.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm font-semibold">
                Nenhum dado para exibir no momento.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-72 space-y-2.5 pr-1">
                {activeData.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setHighlightedCategory(item.name);
                      setFilterType(reportFilter === 'incomes-category' ? 'income' : 'expense');
                      setView('transactions');
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                      darkMode ? 'bg-gray-700/60 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div>
                        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {idx + 1}. {item.name}
                        </span>
                        <div className="text-[10px] text-gray-400">
                          {item.percent}% do total
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-extrabold ${
                        reportFilter === 'incomes-category' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {showVal(item.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
