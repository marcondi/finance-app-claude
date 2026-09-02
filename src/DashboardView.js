import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  FileText, 
  FileSpreadsheet, 
  Sparkles, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3
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
  showTips,
  setShowTips,
  aiTips = [],
  isGeneratingTips,
  gerarDicasIA,
  setShowTransactionModal,
  handleExportPDF,
  handleExportExcel
}) {
  const [comparisonMode, setComparisonMode] = useState('mom'); // 'mom' ou '6months'

  // 1. Dados para o Gráfico Mês Anterior vs Mês Atual (100% infalível)
  const monthComparisonData = [
    {
      name: 'Entradas',
      prev: Number(prevIncome) || 0,
      current: Number(income) || 0,
      'Mês Anterior': Number(prevIncome) || 0,
      'Mês Atual': Number(income) || 0
    },
    {
      name: 'Saídas',
      prev: Number(prevExpenses) || 0,
      current: Number(expenses) || 0,
      'Mês Anterior': Number(prevExpenses) || 0,
      'Mês Atual': Number(expenses) || 0
    },
    {
      name: 'Saldo',
      prev: Number(prevBalance) || 0,
      current: Number(balance) || 0,
      'Mês Anterior': Number(prevBalance) || 0,
      'Mês Atual': Number(balance) || 0
    }
  ];

  // 2. Dados dos Últimos 6 Meses (Cálculo Direto e Infalível)
  const sixMonthsChartData = useMemo(() => {
    const base = currentDate ? new Date(currentDate) : new Date();
    const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;
      const label = `${monthsPt[d.getMonth()]}/${String(year).slice(2)}`;

      let inc = 0;
      let exp = 0;

      if (i === 5) {
        // Mês Atual selecionado
        inc = Number(income) || 0;
        exp = Number(expenses) || 0;
      } else if (i === 4) {
        // Mês Anterior
        inc = Number(prevIncome) || 0;
        exp = Number(prevExpenses) || 0;
      } else {
        // Meses anteriores
        const monthTx = (transactions || []).filter(t => {
          const tDate = String(t.date || '').split('T')[0];
          return tDate.startsWith(prefix) || tDate.includes(`-${month}-`) || tDate.includes(`/${month}/`);
        });
        inc = monthTx
          .filter(t => t.type === 'income')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        exp = monthTx
          .filter(t => t.type === 'expense')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      }

      return {
        label,
        income: inc,
        expenses: exp,
        balance: inc - exp,
        Entradas: inc,
        Saídas: exp,
        Saldo: inc - exp
      };
    });
  }, [income, expenses, prevIncome, prevExpenses, transactions, currentDate]);

  return (
    <>
      {/* Cards de Resumo com Comparativo Mês a Mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card Entradas - Clicável */}
        <div 
          onClick={() => {
            setFilterType('income');
            setHighlightedCategory(null);
            setSearchTerm('');
            setView('transactions');
          }}
          className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-100'} rounded-xl shadow-lg p-6 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 border group`}
          title="Clique para ver as transações de Entradas"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold group-hover:text-green-500 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Entradas
            </h3>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {showVal(income)}
          </p>

          {/* Comparativo Mês Anterior */}
          <div className="mt-3 flex items-center justify-between">
            {incomeChange && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                incomeChange.direction === 'up'
                  ? 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300'
                  : incomeChange.direction === 'down'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {incomeChange.direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> :
                 incomeChange.direction === 'down' ? <ArrowDownRight className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {incomeChange.text} vs mês anterior
              </span>
            )}
            <span className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Mês ant: {showVal(prevIncome)}
            </span>
          </div>

          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} group-hover:text-green-500 transition-colors`}>
            Ver entradas →
          </p>
        </div>

        {/* Card Saídas - Clicável */}
        <div 
          onClick={() => {
            setFilterType('expense');
            setHighlightedCategory(null);
            setSearchTerm('');
            setView('transactions');
          }}
          className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-100'} rounded-xl shadow-lg p-6 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 border group`}
          title="Clique para ver as transações de Saídas"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold group-hover:text-red-500 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Saídas
            </h3>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {showVal(expenses)}
          </p>

          {/* Comparativo Mês Anterior */}
          <div className="mt-3 flex items-center justify-between">
            {expensesChange && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                expensesChange.direction === 'down'
                  ? 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300'
                  : expensesChange.direction === 'up'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {expensesChange.direction === 'down' ? <ArrowDownRight className="w-3 h-3" /> :
                 expensesChange.direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {expensesChange.text} vs mês anterior
              </span>
            )}
            <span className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Mês ant: {showVal(prevExpenses)}
            </span>
          </div>

          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} group-hover:text-red-500 transition-colors`}>
            Ver saídas →
          </p>
        </div>

        {/* Card Saldo - Clicável */}
        <div 
          onClick={() => {
            setFilterType('all');
            setHighlightedCategory(null);
            setSearchTerm('');
            setView('transactions');
          }}
          className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-100'} rounded-xl shadow-lg p-6 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 border group`}
          title="Clique para ver todas as Transações"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold group-hover:text-blue-500 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Saldo
            </h3>
            <div className={`${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'} p-2 rounded-lg group-hover:scale-110 transition-transform`}>
              <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </div>

          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {showVal(balance)}
          </p>

          {/* Comparativo Mês Anterior */}
          <div className="mt-3 flex items-center justify-between">
            {balanceChange && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                balanceChange.direction === 'up'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                  : balanceChange.direction === 'down'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {balanceChange.direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> :
                 balanceChange.direction === 'down' ? <ArrowDownRight className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {balanceChange.text} vs mês anterior
              </span>
            )}
            <span className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Mês ant: {showVal(prevBalance)}
            </span>
          </div>

          <p className={`text-xs mt-3 flex items-center gap-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} group-hover:text-blue-500 transition-colors`}>
            Ver todas as transações →
          </p>
        </div>
      </div>

      {/* Grid de Gráficos: Gastos por Categoria + Gráfico Comparativo Mês a Mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico 1: Gastos por Categoria (Donut) */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Gastos por Categoria
            </h3>
            <button
              onClick={() => setView('reports')}
              className={`text-xs font-semibold ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              Relatórios →
            </button>
          </div>

          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  cursor="pointer"
                  onClick={(data) => {
                    if (!data) return;
                    setHighlightedCategory(data.name);
                    setFilterType('expense');
                    setView('transactions');
                  }}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={`h-[280px] flex items-center justify-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Nenhuma despesa registrada neste mês.
            </div>
          )}
        </div>

        {/* Gráfico 2: Comparativo Mês a Mês (Barras) */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 flex flex-col justify-between`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Comparativo Financeiro
              </h3>
            </div>

            <div className={`flex p-0.5 rounded-lg text-xs font-medium ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button
                onClick={() => setComparisonMode('mom')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  comparisonMode === 'mom'
                    ? 'bg-blue-600 text-white shadow'
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mês Ant. vs Atual
              </button>
              <button
                onClick={() => setComparisonMode('6months')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  comparisonMode === '6months'
                    ? 'bg-blue-600 text-white shadow'
                    : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Últimos 6 Meses
              </button>
            </div>
          </div>

          {comparisonMode === 'mom' ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
                <XAxis dataKey="name" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => v === 0 ? 'R$ 0' : `R$ ${(v/1000).toFixed(0)}k`} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="prev" name="Mês Anterior" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" name="Mês Atual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sixMonthsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
                <XAxis dataKey="label" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => v === 0 ? 'R$ 0' : `R$ ${(v/1000).toFixed(0)}k`} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="income" name="Entradas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Saídas" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Poupômetro */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            💰 Poupômetro
          </h3>
          <button
            onClick={() => setShowGoalModal(true)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {savingsGoal > 0 ? 'Editar Meta' : 'Definir Meta'}
          </button>
        </div>

        {savingsGoal > 0 ? (
          <>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Poupado: {showVal(savingsAmount)}
                </span>
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Meta: {showVal(savingsGoal)}
                </span>
              </div>
              <div className={`w-full h-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-4 rounded-full transition-all ${
                    savingsAmount >= savingsGoal ? 'bg-green-500' : savingsAmount >= savingsGoal * 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((savingsAmount / savingsGoal) * 100, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {savingsAmount >= savingsGoal 
                  ? '🎉 Parabéns! Você atingiu sua meta de poupança!' 
                  : `Faltam ${showVal(savingsGoal - savingsAmount)} para atingir a meta`}
              </p>
            </div>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              💡 Dica: Lance valores na categoria "Poupança" para alimentar o poupômetro
            </p>
          </>
        ) : (
          <div>
            <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Defina uma meta mensal de poupança para acompanhar seu progresso! 🎯
            </p>
          </div>
        )}
      </div>

      {/* Tetos e Orçamentos de Gastos por Categoria */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🎯 Tetos de Gastos por Categoria
            </h3>
          </div>
          <button
            onClick={() => setView('categories')}
            className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg transition-colors font-medium"
          >
            Gerenciar Tetos
          </button>
        </div>

        {(() => {
          const expenseCatsWithBudget = categories
            .filter(c => c.type === 'expense')
            .map(c => {
              const limit = categoryBudgets[c.id] || 0;
              const spent = currentMonthTransactions
                .filter(t => t.category_id === c.id && t.type === 'expense')
                .reduce((s, t) => s + (Number(t.amount) || 0), 0);
              const percent = limit > 0 ? (spent / limit) * 100 : 0;
              return { ...c, limit, spent, percent };
            })
            .filter(c => c.limit > 0);

          if (expenseCatsWithBudget.length === 0) {
            return (
              <div className={`text-center py-6 px-4 rounded-xl border border-dashed ${
                darkMode ? 'border-gray-700 bg-gray-750 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}>
                <p className="text-sm mb-2">
                  Você ainda não definiu tetos mensais para suas categorias de despesa.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Definir um teto (ex: R$ 1.200 para Alimentação) ajuda a evitar surpresas no final do mês!
                </p>
                <button
                  onClick={() => setView('categories')}
                  className="text-xs font-semibold text-blue-500 hover:underline"
                >
                  + Clique aqui para definir seu primeiro teto
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {expenseCatsWithBudget.map(cat => {
                const isOver = cat.spent > cat.limit;
                const isWarning = !isOver && cat.spent >= cat.limit * 0.8;
                const percentClamped = Math.min(cat.percent, 100);

                return (
                  <div key={cat.id} className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-gray-750/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {cat.name}
                        </span>
                        {isOver ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                            🚨 Estourou (+{showVal(cat.spent - cat.limit)})
                          </span>
                        ) : isWarning ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                            ⚠️ Atenção ({cat.percent.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/80 dark:text-green-300">
                            ✅ {cat.percent.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      <div className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Gasto: <strong className={isOver ? 'text-red-500' : darkMode ? 'text-white' : 'text-gray-800'}>{showVal(cat.spent)}</strong> de <span className="opacity-75">{showVal(cat.limit)}</span>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className={`w-full h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isOver
                            ? 'bg-red-500 animate-pulse'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentClamped}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-1 text-[11px] text-gray-400">
                      <span>0%</span>
                      <span>
                        {isOver
                          ? `Ultrapassado em ${((cat.spent / cat.limit - 1) * 100).toFixed(0)}%`
                          : `Resta: ${showVal(cat.limit - cat.spent)}`}
                      </span>
                      <span>Teto: {showVal(cat.limit)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Dicas Financeiras com IA */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Dicas Financeiras com IA
            </h3>
          </div>
        </div>
        
        {!showTips ? (
          <button
            onClick={async () => { setShowTips(true); await gerarDicasIA(); }}
            disabled={isGeneratingTips}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isGeneratingTips ? 'Analisando suas finanças...' : 'Gerar Dicas com IA'}
          </button>
        ) : (
          <div className="space-y-3">
            {isGeneratingTips ? (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} flex items-center gap-3`}>
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Analisando suas entradas, saídas e categorias...</p>
              </div>
            ) : (
              aiTips.map((tip, index) => (
                <div key={index} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/70 border border-gray-600' : 'bg-purple-50/70 border border-purple-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{tip}</p>
                </div>
              ))
            )}
            <div className="flex gap-4 pt-2">
              <button
                onClick={gerarDicasIA}
                disabled={isGeneratingTips}
                className={`text-sm font-semibold transition-opacity ${darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
              >
                🔄 Regerar novas dicas
              </button>
              <button
                onClick={() => setShowTips(false)}
                disabled={isGeneratingTips}
                className={`text-sm underline ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Ocultar dicas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowTransactionModal(true)}
          className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar Lançamento
        </button>

        <button
          onClick={handleExportPDF}
          className={`flex items-center justify-center gap-3 ${
            darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          } font-semibold py-4 rounded-xl shadow-lg transition-colors`}
        >
          <FileText className="w-5 h-5 text-red-500" />
          Exportar PDF
        </button>

        <button
          onClick={handleExportExcel}
          className={`flex items-center justify-center gap-3 ${
            darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          } font-semibold py-4 rounded-xl shadow-lg transition-colors`}
        >
          <FileSpreadsheet className="w-5 h-5 text-green-500" />
          Exportar Excel
        </button>
      </div>
    </>
  );
}
