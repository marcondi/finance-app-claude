import React from 'react';
import { FileText, FileSpreadsheet, Tag } from 'lucide-react';
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

  // Extração e agregação por Tags (#Viagem, #Reforma, etc.)
  const tagExpensesMap = {};
  currentMonthTransactions.forEach(t => {
    const rawMatches = (t.description || '').match(/#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g) || [];
    rawMatches.forEach(tag => {
      const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
      const key = formattedTag.toLowerCase();
      if (!tagExpensesMap[key]) {
        tagExpensesMap[key] = { name: formattedTag, value: 0, count: 0 };
      }
      tagExpensesMap[key].value += Number(t.amount || 0);
      tagExpensesMap[key].count += 1;
    });
  });

  const tagColors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#14b8a6', '#6366f1'];
  const tagData = Object.values(tagExpensesMap).map((item, idx) => ({
    ...item,
    color: tagColors[idx % tagColors.length]
  })).sort((a, b) => b.value - a.value);

  const activeData = reportFilter === 'expenses-category'
    ? pieExpenses
    : reportFilter === 'incomes-category'
    ? pieIncomes
    : reportFilter === 'tags'
    ? tagData
    : [];

  const totalActive = activeData.reduce((s, i) => s + (Number(i.value) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Controles de Relatório */}
      <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'expenses-category', label: 'Despesas por Categoria' },
              { key: 'incomes-category', label: 'Receitas por Categoria' },
              { key: 'tags', label: '🏷️ Gastos por Tag / Projeto' },
              { key: 'evolution', label: 'Evolução Mensal (6 Meses)' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setReportFilter(key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  reportFilter === key
                    ? 'bg-blue-600 text-white shadow'
                    : darkMode ? 'bg-gray-750 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {reportFilter !== 'evolution' && (
              <div className={`flex p-1 rounded-xl text-xs font-semibold ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setReportChart('pie')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    reportChart === 'pie'
                      ? 'bg-blue-600 text-white shadow'
                      : darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  Pizza
                </button>
                <button
                  onClick={() => setReportChart('bar')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    reportChart === 'bar'
                      ? 'bg-blue-600 text-white shadow'
                      : darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  Barras
                </button>
              </div>
            )}

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow transition-colors"
              title="Exportar PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow transition-colors"
              title="Exportar Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Exibição do Gráfico Selecionado */}
      <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {reportFilter === 'expenses-category' && 'Distribuição de Despesas por Categoria'}
              {reportFilter === 'incomes-category' && 'Distribuição de Receitas por Categoria'}
              {reportFilter === 'tags' && 'Distribuição de Gastos por Tag & Projeto'}
              {reportFilter === 'evolution' && 'Evolução Financeira dos Últimos 6 Meses'}
            </h3>
            {reportFilter !== 'evolution' && (
              <p className="text-xs text-gray-400 mt-1">
                Total acumulado no mês: <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{showVal(totalActive)}</strong>
              </p>
            )}
          </div>
        </div>

        {reportFilter === 'evolution' ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last6MonthsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="label" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tickFormatter={(v) => `R$ ${v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), '']}
                  contentStyle={{
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: 'none',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : activeData.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {reportFilter === 'tags' ? (
              <>
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-sm">Nenhuma tag cadastrada nas despesas deste mês.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Adicione tags como <code className="bg-purple-100 dark:bg-purple-950 text-purple-600 px-1 py-0.5 rounded">#Viagem</code> ou <code className="bg-purple-100 dark:bg-purple-950 text-purple-600 px-1 py-0.5 rounded">#Reforma</code> nos seus lançamentos.
                </p>
              </>
            ) : (
              <p className="font-semibold text-sm">Nenhum dado registrado para o período.</p>
            )}
          </div>
        ) : reportChart === 'pie' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Valor']}
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      border: 'none',
                      borderRadius: '0.75rem',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                      color: darkMode ? '#ffffff' : '#000000'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2">
              {activeData.map((item, idx) => {
                const pct = totalActive > 0 ? ((item.value / totalActive) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (reportFilter === 'expenses-category' || reportFilter === 'incomes-category') {
                        setHighlightedCategory(item.name);
                        setFilterType(reportFilter === 'expenses-category' ? 'expense' : 'income');
                        setView('transactions');
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      darkMode ? 'bg-gray-750 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div>
                        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {item.name}
                        </span>
                        {item.count && (
                          <span className="text-[10px] text-gray-400 ml-2">({item.count} lançamentos)</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {showVal(item.value)}
                      </span>
                      <span className="text-[11px] text-gray-400 ml-2 font-medium">
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tickFormatter={(v) => `R$ ${v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Total']}
                  contentStyle={{
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    border: 'none',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {activeData.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
