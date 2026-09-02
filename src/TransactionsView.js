import React from 'react';
import { Search, Plus, Edit2, Trash2, Check } from 'lucide-react';

export default function TransactionsView({
  darkMode,
  currentMonthTransactions,
  categories,
  showVal,
  formatDate,
  toggleTransactionPaid,
  setEditingTransaction,
  setShowTransactionModal,
  deleteTransaction,
  highlightedCategory,
  setHighlightedCategory,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  sortBy,
  setSortBy,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage
}) {
  let filtered = currentMonthTransactions;

  if (searchTerm) {
    filtered = filtered.filter(t => {
      const category = categories.find(c => c.id === t.category_id);
      return (
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }

  if (filterType !== 'all') {
    filtered = filtered.filter(t => t.type === filterType);
  }

  if (highlightedCategory) {
    filtered = filtered.filter(t => {
      const category = categories.find(c => c.id === t.category_id);
      return category?.name === highlightedCategory;
    });
  }

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return (b.date || '').localeCompare(a.date || '');
      case 'date-asc':
        return (a.date || '').localeCompare(b.date || '');
      case 'description-asc':
        return (a.description || '').localeCompare(b.description || '');
      case 'description-desc':
        return (b.description || '').localeCompare(a.description || '');
      case 'amount-desc':
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      case 'amount-asc':
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      default:
        return 0;
    }
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      {highlightedCategory && (
        <div className={`flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl border ${
          darkMode ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            Filtrando por categoria: <strong>{highlightedCategory}</strong>
          </div>
          <button
            onClick={() => setHighlightedCategory(null)}
            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
              darkMode ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
            }`}
          >
            ✕ Limpar filtro
          </button>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Buscar por descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <button
            onClick={() => setShowTransactionModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Nova Transação
          </button>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tipo de Transação
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterType('income')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'income'
                      ? 'bg-green-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💚 Entradas
                </button>
                <button
                  onClick={() => setFilterType('expense')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'expense'
                      ? 'bg-red-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔴 Saídas
                </button>
              </div>
            </div>

            <div className="flex-1">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="date-desc">📅 Data (mais recente)</option>
                <option value="date-asc">📅 Data (mais antiga)</option>
                <option value="description-asc">🔤 Descrição (A-Z)</option>
                <option value="description-desc">🔤 Descrição (Z-A)</option>
                <option value="amount-desc">💰 Valor (maior)</option>
                <option value="amount-asc">💰 Valor (menor)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Data</th>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Descrição</th>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Categoria</th>
                <th className={`px-6 py-4 text-right text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Valor</th>
                <th className={`px-6 py-4 text-center text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                <th className={`px-6 py-4 text-center text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginated.length > 0 ? (
                paginated.map(transaction => {
                  const category = categories.find(c => c.id === transaction.category_id);
                  return (
                    <tr key={transaction.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(transaction.date)}
                      </td>
                      <td className={`px-6 py-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: category?.color || '#6b7280' }}
                        >
                          {category?.name || 'Geral'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'} {showVal(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {transaction.type === 'expense' ? (
                          <button
                            onClick={() => toggleTransactionPaid(transaction)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                              transaction.is_paid
                                ? 'bg-green-500 border-green-500 text-white'
                                : darkMode ? 'border-gray-500 text-gray-400 hover:border-green-400' : 'border-gray-300 text-gray-500 hover:border-green-500'
                            }`}
                          >
                            {transaction.is_paid ? <Check className="w-3 h-3" /> : null}
                            {transaction.is_paid ? 'Pago' : 'Pagar'}
                          </button>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">Recebido</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setShowTransactionModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm || filterType !== 'all'
                        ? 'Nenhuma transação encontrada com os filtros aplicados.'
                        : 'Nenhuma transação encontrada neste mês.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {currentMonthTransactions.length > 0 && (
          <div className={`px-6 py-3 border-t flex flex-wrap items-center justify-between gap-4 ${darkMode ? 'border-gray-700' : 'border-gray-200 bg-gray-50'}`}>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total: {currentMonthTransactions.length} transações
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Linhas por página:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className={`text-sm px-2 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
