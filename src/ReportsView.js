import React from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
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
  CartesianGrid, 
  LineChart, 
  Line 
} from 'recharts';

export default function ReportsView({
  darkMode,
  currentDate,
  currentMonthTransactions,
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
  const pieExpenses = categories
    .filter(c => c.type === 'expense')
    .map(c => ({
      name: c.name,
      color: c.color,
      value: currentMonthTransactions.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
    })).filter(c => c.value > 0);

  const pieIncomes = categories
    .filter(c => c.type === 'income')
    .map(c => ({
      name: c.name,
      color: c.color,
      value: currentMonthTransactions.filter(t => t.category_id === c.id && t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
    })).filter(c => c.value > 0);

  const pieData = reportFilter === 'expenses-category' ? pieExpenses : pieIncomes;
  const totalPie = pieData.reduce((s, c) => s + c.value, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Relatórios e Análise Financeira
        </h2>

        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Seletores de Tipo de Gráfico e Filtro */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className={`flex gap-2 p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {[
            { key: 'pie', label: 'Pizza' },
            { key: 'line', label: 'Linha' },
            { key: 'bar', label: 'Barras' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setReportChart(key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                reportChart === key
                  ? 'bg-blue-600 text-white shadow'
                  : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={`flex gap-2 p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {[
            { key: 'expenses-category', label: 'Despesas por Categoria' },
            { key: 'income-category', label: 'Receitas por Categoria' },
            { key: 'balance', label: 'Evolução do Saldo' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setReportFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                reportFilter === key
                  ? 'bg-blue-600 text-white shadow'
                  : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Card do Gráfico */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
        <h3 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {reportFilter === 'expenses-category' ? 'Despesas por Categoria' :
           reportFilter === 'income-category' ? 'Receitas por Categoria' :
           'Evolução Mensal (Últimos 6 meses)'}
        </h3>

        {/* Gráfico de Pizza */}
        {reportChart === 'pie' && reportFilter !== 'balance' && (
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/2">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(data) => {
                      if (!data) return;
                      setHighlightedCategory(data.name);
                      setFilterType(reportFilter === 'expenses-category' ? 'expense' : 'income');
                      setView('transactions');
                    }}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-2 max-h-80 overflow-y-auto pr-2">
              {pieData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-semibold ${reportFilter === 'expenses-category' ? 'text-red-500' : 'text-green-500'}`}>
                      {showVal(cat.value)}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {totalPie > 0 ? ((cat.value / totalPie) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gráfico de Barras */}
        {(reportChart === 'bar' || (reportChart === 'pie' && reportFilter === 'balance')) && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={reportFilter === 'balance' ? last6MonthsData : pieData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey={reportFilter === 'balance' ? 'label' : 'name'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              {reportFilter === 'balance' ? (
                <>
                  <Legend />
                  <Bar dataKey="Entradas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </>
              ) : (
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Gráfico de Linha */}
        {reportChart === 'line' && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={last6MonthsData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="label" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="Entradas" stroke="#16a34a" strokeWidth={3} />
              <Line type="monotone" dataKey="Saídas" stroke="#dc2626" strokeWidth={3} />
              <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
