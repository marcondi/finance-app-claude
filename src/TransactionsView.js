import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Check, CreditCard, Tag } from 'lucide-react';

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
  const [selectedTag, setSelectedTag] = useState(null);

  const isInstallment = (t) => {
    return Boolean(t.parent_id || /\(\d+\/\d+\)$/.test(t.description || ''));
  };

  const getInstallmentBadge = (description) => {
    const match = (description || '').match(/\((\d+\/\d+)\)$/);
    return match ? match[1] : null;
  };

  const extractTags = (description) => {
    const matches = (description || '').match(/#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g) || [];
    return matches;
  };

  const getCleanDescription = (description) => {
    return (description || '')
      .replace(/\s*\(\d+\/\d+\)$/, '')
      .replace(/#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g, '')
      .trim();
  };

  // Coletar todas as tags do mês para a barra de filtros rápidos
  const allMonthTags = {};
  currentMonthTransactions.forEach(t => {
    const tags = extractTags(t.description);
    tags.forEach(tag => {
      const formatted = tag.startsWith('#') ? tag : `#${tag}`;
      allMonthTags[formatted] = (allMonthTags[formatted] || 0) + 1;
    });
  });
  const tagList = Object.keys(allMonthTags);

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

  if (filterType === 'income' || filterType === 'expense') {
    filtered = filtered.filter(t => t.type === filterType);
  } else if (filterType === 'installment') {
    filtered = filtered.filter(t => isInstallment(t));
  }

  if (highlightedCategory) {
    filtered = filtered.filter(t => {
      const category = categories.find(c => c.id === t.category_id);
      return category?.name === highlightedCategory;
    });
  }

  if (selectedTag) {
    filtered = filtered.filter(t => {
      const tags = extractTags(t.description).map(tg => tg.toLowerCase());
      return tags.includes(selectedTag.toLowerCase());
    });
  }

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortBy === 'amount-desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    if (sortBy === 'amount-asc') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    return 0;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedTransactions = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'income', label: 'Entradas' },
            { key: 'expense', label: 'Saídas' },
            { key: 'installment', label: '💳 Parcelados' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setFilterType(key);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === key
                  ? 'bg-blue-600 text-white shadow'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar lançamento ou #tag..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="date-desc" className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>Mais recentes</option>
            <option value="date-asc" className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>Mais antigas</option>
            <option value="amount-desc" className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>Maior valor</option>
            <option value="amount-asc" className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>Menor valor</option>
          </select>

          <button
            onClick={() => setShowTransactionModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Barra Rápida de Tags do Mês */}
      {tagList.length > 0 && (
        <div className="mb-5 flex items-center gap-2 flex-wrap pb-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            Tags do mês:
          </span>
          {tagList.map(tag => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTag(selectedTag === tag ? null : tag);
                setCurrentPage(1);
              }}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                selectedTag === tag
                  ? 'bg-purple-600 text-white shadow-md'
                  : darkMode ? 'bg-gray-700 text-purple-300 hover:bg-gray-600' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              {tag} <span className="opacity-70 text-[10px]">({allMonthTags[tag]})</span>
            </button>
          ))}
        </div>
      )}

      {/* Alertas de Filtro Ativo */}
      {(highlightedCategory || selectedTag) && (
        <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            {highlightedCategory && `Categoria: ${highlightedCategory}`}
            {highlightedCategory && selectedTag && ' | '}
            {selectedTag && `Tag ativa: ${selectedTag}`}
          </span>
          <button
            onClick={() => {
              setHighlightedCategory(null);
              setSelectedTag(null);
            }}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Limpar filtro ✕
          </button>
        </div>
      )}

      {/* Tabela de Transações */}
      {paginatedTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">Nenhum lançamento encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase ${
                darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
              }`}>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {paginatedTransactions.map(t => {
                const cat = categories.find(c => c.id === t.category_id);
                const isIncome = t.type === 'income';
                const instBadge = getInstallmentBadge(t.description);
                const tags = extractTags(t.description);
                const cleanDesc = getCleanDescription(t.description);

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      t.is_paid === false ? 'opacity-75' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleTransactionPaid(t)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          t.is_paid !== false
                            ? 'bg-green-100 dark:bg-green-950/60 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                        }`}
                        title={t.is_paid !== false ? 'Pago (Clique para desmarcar)' : 'Pendente (Clique para marcar como pago)'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    <td className={`py-3 px-4 text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatDate(t.date)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {cleanDesc || t.description}
                        </span>
                        {instBadge && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                            💳 {instBadge}
                          </span>
                        )}
                        {tags.map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedTag(tag);
                              setCurrentPage(1);
                            }}
                            className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                            title={`Filtrar por ${tag}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                        style={{ backgroundColor: cat?.color || '#6b7280' }}
                      >
                        {cat?.name || 'Sem Categoria'}
                      </span>
                    </td>

                    <td className={`py-3 px-4 text-right font-bold ${
                      isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isIncome ? '+' : '-'} {showVal(t.amount)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTransaction(t);
                            setShowTransactionModal(true);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'
                          }`}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTransaction(t)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {filtered.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
          <div className="flex items-center gap-2">
            <span className={darkMode ? 'text-gray-300' : 'text-gray-500'}>Itens por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`px-2 py-1 rounded-lg border font-semibold ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'
              } focus:outline-none`}
            >
              <option value={5} className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>5</option>
              <option value={10} className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>10</option>
              <option value={20} className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>20</option>
              <option value={50} className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 font-medium ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              Anterior
            </button>
            <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 font-medium ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
