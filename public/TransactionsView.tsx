import React from 'react';
import { Search, Edit2, Trash2, Check, CreditCard, CheckCircle2, Clock, DollarSign, X, CalendarCheck, Upload, Download, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ShieldAlert, CheckSquare } from 'lucide-react';
import { Category, Transaction } from './types';

interface TransactionsViewProps {
  darkMode: boolean;
  currentMonthTransactions: Transaction[];
  categories: Category[];
  showVal: (val: number) => string;
  formatDate: (dateStr: string) => string;
  toggleTransactionPaid: (transaction: Transaction) => void;
  setEditingTransaction: (transaction: Transaction) => void;
  setShowTransactionModal: (show: boolean) => void;
  deleteTransaction: (transaction: Transaction) => void;
  highlightedCategory: string | null;
  setHighlightedCategory: (cat: string | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (filter: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  onClearAllTransactions?: () => void;
  onRestoreBackup?: () => void;
  onUploadBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBatchUpdatePaid?: (ids: string[], isPaid: boolean) => void;
  onBatchDelete?: (ids: string[]) => void;
}

export default function TransactionsView({
  darkMode,
  currentMonthTransactions = [],
  categories = [],
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
  setCurrentPage,
  onClearAllTransactions,
  onRestoreBackup,
  onUploadBackup,
  onBatchUpdatePaid,
  onBatchDelete
}: TransactionsViewProps) {
  // Estado para Seleção Múltipla (Ações em Lote)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const isInstallment = (t: Transaction) => {
    return Boolean(t.parent_id || /\(\d+\/\d+\)$/.test(t.description || ''));
  };

  const getInstallmentBadge = (description: string) => {
    const match = (description || '').match(/\((\d+\/\d+)\)$/);
    return match ? match[1] : null;
  };

  const getCleanDescription = (description: string) => {
    return (description || '')
      .replace(/\s*\(\d+\/\d+\)$/, '')
      .replace(/#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g, '')
      .trim();
  };

  // CÁLCULO DE DATAS PARA O ALERTA ANTI-JUROS
  const todayStr = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Listas de Contas Vencidas e Vencendo Hoje do Mês
  const overdueList = currentMonthTransactions.filter(
    t => t.type === 'expense' && t.is_paid === false && (t.date || '').split('T')[0] < todayStr
  );
  const dueTodayList = currentMonthTransactions.filter(
    t => t.type === 'expense' && t.is_paid === false && (t.date || '').split('T')[0] === todayStr
  );

  const getOverdueDaysText = (dateStr: string) => {
    const d = (dateStr || '').split('T')[0];
    if (d < todayStr) {
      const diffTime = new Date(todayStr + 'T00:00:00').getTime() - new Date(d + 'T00:00:00').getTime();
      const days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      return `há ${days}d`;
    }
    return '';
  };

  // Cálculos de Resumo de Pagos e A Pagar do Mês
  const paidExpensesList = currentMonthTransactions.filter(t => t.type === 'expense' && t.is_paid !== false);
  const unpaidExpensesList = currentMonthTransactions.filter(t => t.type === 'expense' && t.is_paid === false);
  const paidIncomesList = currentMonthTransactions.filter(t => t.type === 'income' && t.is_paid !== false);
  const unpaidIncomesList = currentMonthTransactions.filter(t => t.type === 'income' && t.is_paid === false);

  const paidExpensesTotal = paidExpensesList.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const unpaidExpensesTotal = unpaidExpensesList.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const paidIncomesTotal = paidIncomesList.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const currentPaidBalance = paidIncomesTotal - paidExpensesTotal;

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
  } else if (filterType === 'paid') {
    filtered = filtered.filter(t => t.is_paid !== false);
  } else if (filterType === 'unpaid') {
    filtered = filtered.filter(t => t.is_paid === false);
  } else if (filterType === 'overdue') {
    filtered = filtered.filter(t => t.type === 'expense' && t.is_paid === false && (t.date || '').split('T')[0] < todayStr);
  } else if (filterType === 'due_today') {
    filtered = filtered.filter(t => t.type === 'expense' && t.is_paid === false && (t.date || '').split('T')[0] === todayStr);
  } else if (filterType === 'installment') {
    filtered = filtered.filter(t => isInstallment(t));
  }

  if (highlightedCategory) {
    filtered = filtered.filter(t => {
      const category = categories.find(c => c.id === t.category_id);
      return category?.name === highlightedCategory;
    });
  }

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'alpha-asc') return (a.description || '').localeCompare(b.description || '', 'pt-BR', { sensitivity: 'base' });
    if (sortBy === 'alpha-desc') return (b.description || '').localeCompare(a.description || '', 'pt-BR', { sensitivity: 'base' });
    if (sortBy === 'amount-desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    if (sortBy === 'amount-asc') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    return 0;
  });

  const totalFilteredAmount = filtered.reduce((acc, t) => {
    const val = Number(t.amount) || 0;
    return t.type === 'expense' ? acc - val : acc + val;
  }, 0);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedTransactions = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Alternar ordenação ao clicar no cabeçalho
  const handleSortToggle = (column: 'date' | 'alpha' | 'amount') => {
    if (column === 'date') {
      setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc');
    } else if (column === 'alpha') {
      setSortBy(sortBy === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc');
    } else if (column === 'amount') {
      setSortBy(sortBy === 'amount-desc' ? 'amount-asc' : 'amount-desc');
    }
    setCurrentPage(1);
  };

  // Lógica e Métricas para Ações em Lote (Batch Actions)
  const currentPageIds = React.useMemo(() => {
    return paginatedTransactions.map(t => t.id);
  }, [paginatedTransactions]);

  const isAllCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
  const isSomeCurrentPageSelected = currentPageIds.some(id => selectedIds.includes(id));

  const handleToggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(filtered.map(t => t.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleToggleRowSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedTransactions = React.useMemo(() => {
    const set = new Set(selectedIds);
    return currentMonthTransactions.filter(t => set.has(t.id));
  }, [selectedIds, currentMonthTransactions]);

  const selectedTotalAmount = React.useMemo(() => {
    return selectedTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [selectedTransactions]);

  const handleBatchMarkPaid = (isPaid: boolean) => {
    if (onBatchUpdatePaid && selectedIds.length > 0) {
      onBatchUpdatePaid(selectedIds, isPaid);
      setSelectedIds([]);
    }
  };

  const handleBatchDeleteSelected = () => {
    if (onBatchDelete && selectedIds.length > 0) {
      onBatchDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-2xl shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        
        {/* BANNER DE ALERTA ANTI-JUROS */}
        {(overdueList.length > 0 || dueTodayList.length > 0) && (
          <div className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${
            overdueList.length > 0
              ? darkMode
                ? 'bg-red-950/40 border-red-800/60 text-red-200'
                : 'bg-red-50 border-red-200 text-red-900'
              : darkMode
              ? 'bg-yellow-950/40 border-yellow-800/60 text-yellow-200'
              : 'bg-yellow-50 border-yellow-200 text-yellow-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                overdueList.length > 0 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold flex items-center gap-2 flex-wrap">
                  <span>Alerta Anti-Juros:</span>
                  {overdueList.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-sm shadow-red-500/30">
                      🔴 {overdueList.length} Vencida{overdueList.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {dueTodayList.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-500 text-gray-950 shadow-sm shadow-yellow-500/30">
                      🟡 {dueTodayList.length} Vence Hoje
                    </span>
                  )}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Evite pagar juros ou multas bancárias quitando essas despesas com prioridade.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {overdueList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterType('overdue');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-sm transition-all cursor-pointer flex-1 sm:flex-none text-center"
                >
                  Filtrar Vencidas ({overdueList.length})
                </button>
              )}
              {dueTodayList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterType('due_today');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-gray-950 shadow-sm transition-all cursor-pointer flex-1 sm:flex-none text-center"
                >
                  Filtrar Vence Hoje ({dueTodayList.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            {/* Pílulas de Filtro de Status com Contadores */}
            <div className="flex flex-wrap gap-2 items-center">
              {[
                {
                  key: 'all',
                  label: 'Todos',
                  count: currentMonthTransactions.length,
                  badgeClass: 'bg-gray-500/20 text-gray-300'
                },
                ...(overdueList.length > 0
                  ? [
                      {
                        key: 'overdue',
                        label: '🔴 Vencidas',
                        count: overdueList.length,
                        badgeClass: 'bg-red-500/20 text-red-300'
                      }
                    ]
                  : []),
                ...(dueTodayList.length > 0
                  ? [
                      {
                        key: 'due_today',
                        label: '🟡 Vence Hoje',
                        count: dueTodayList.length,
                        badgeClass: 'bg-yellow-500/20 text-yellow-300'
                      }
                    ]
                  : []),
                {
                  key: 'unpaid',
                  label: '⏳ A Pagar',
                  count: unpaidExpensesList.length + unpaidIncomesList.length,
                  badgeClass: 'bg-yellow-500/20 text-yellow-300'
                },
                {
                  key: 'paid',
                  label: '✅ Pagos',
                  count: paidExpensesList.length + paidIncomesList.length,
                  badgeClass: 'bg-green-500/20 text-green-300'
                },
                {
                  key: 'expense',
                  label: 'Saídas',
                  count: currentMonthTransactions.filter(t => t.type === 'expense').length,
                  badgeClass: 'bg-red-500/20 text-red-300'
                },
                {
                  key: 'income',
                  label: 'Entradas',
                  count: currentMonthTransactions.filter(t => t.type === 'income').length,
                  badgeClass: 'bg-emerald-500/20 text-emerald-300'
                },
                {
                  key: 'installment',
                  label: '💳 Parcelados',
                  count: currentMonthTransactions.filter(isInstallment).length,
                  badgeClass: 'bg-purple-500/20 text-purple-300'
                }
              ].map(({ key, label, count, badgeClass }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilterType(key);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterType === key
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                      : darkMode
                      ? 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    filterType === key ? 'bg-white/20 text-white' : badgeClass
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Controles de Busca e Ordenação */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              {/* Campo de Busca */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar descrição ou categoria..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Seletor de Ordenação */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`text-xs px-3 py-2 rounded-xl border font-semibold cursor-pointer ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  title="Ordenar lançamentos"
                >
                  <option value="date-desc">📅 Data: Mais recentes</option>
                  <option value="date-asc">📅 Data: Mais antigos</option>
                  <option value="alpha-asc">🔤 Ordem Alfabética (A → Z)</option>
                  <option value="alpha-desc">🔤 Ordem Alfabética (Z → A)</option>
                  <option value="amount-desc">💰 Maior valor</option>
                  <option value="amount-asc">💰 Menor valor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resumo do Filtro Ativo */}
          <div className="flex items-center justify-between text-xs px-1 text-gray-400">
            <span>
              Mostrando <strong>{filtered.length}</strong> de {currentMonthTransactions.length} lançamentos
              {filterType === 'unpaid' && <span className="text-yellow-400 font-bold ml-1.5">• ⏳ Pendentes de pagamento</span>}
              {filterType === 'paid' && <span className="text-green-400 font-bold ml-1.5">• ✅ Totalmente pagos</span>}
            </span>
            <span className="font-semibold">
              Total listado: <strong className={totalFilteredAmount >= 0 ? 'text-green-400' : 'text-red-400'}>{showVal(totalFilteredAmount)}</strong>
            </span>
          </div>
        </div>

        {/* Barra de Ações de Backup e Limpeza */}
        <div className={`flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900/80 border-gray-700/80 text-white' : 'bg-gray-100/90 border-gray-200 text-gray-900'
        }`}>
          <div className="flex items-center gap-2.5 flex-wrap">
            {onRestoreBackup && (
              <button
                type="button"
                onClick={onRestoreBackup}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 active:scale-95 transition-all"
                title="Carregar todos os dados do backup anexado de Marcondes Lima"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Restaurar Backup Anexo</span>
              </button>
            )}

            {onUploadBackup && (
              <label
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 transition-all"
                title="Importar outro arquivo JSON de backup"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>Importar Backup JSON</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={onUploadBackup}
                />
              </label>
            )}
          </div>

          {onClearAllTransactions && (
            <button
              type="button"
              onClick={onClearAllTransactions}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-95 transition-all ml-auto"
              title="Apagar todas as transações cadastradas"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Limpar Transações</span>
            </button>
          )}
        </div>

        {highlightedCategory && (
          <div className="mb-4 flex items-center gap-2 p-2 px-3 rounded-lg bg-blue-500/10 text-blue-400 text-xs">
            <span>Filtrando por categoria: <strong>{highlightedCategory}</strong></span>
            <button
              onClick={() => {
                setHighlightedCategory(null);
                setCurrentPage(1);
              }}
              className="text-xs text-blue-500 hover:underline font-bold flex items-center gap-1 ml-auto"
            >
              <X className="w-3.5 h-3.5" /> Limpar filtro
            </button>
          </div>
        )}

        {/* Aviso e Ações Rápidas de Seleção em Massa */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-between text-xs text-blue-400 flex-wrap gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-500" />
              <span>
                <strong>{selectedIds.length}</strong> de {filtered.length} lançamentos selecionados • Total: <strong>{showVal(selectedTotalAmount)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.length < filtered.length && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  Selecionar todos os {filtered.length} filtrados
                </button>
              )}
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Limpar seleção
              </button>
            </div>
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
                  {/* Checkbox para Selecionar Todos da Página */}
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      ref={input => {
                        if (input) {
                          input.indeterminate = !isAllCurrentPageSelected && isSomeCurrentPageSelected;
                        }
                      }}
                      onChange={handleToggleSelectAllCurrentPage}
                      className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      title={isAllCurrentPageSelected ? "Desmarcar todos desta página" : "Selecionar todos desta página"}
                    />
                  </th>

                  <th className="py-3 px-4">Status</th>
                  
                  {/* Ordenação por Data */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('date')}
                      className="flex items-center gap-1 hover:text-blue-400 transition-colors uppercase font-bold text-xs cursor-pointer group"
                      title="Clique para alternar ordenação por data"
                    >
                      <span>Data</span>
                      {sortBy === 'date-desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                      ) : sortBy === 'date-asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  {/* Ordenação por Descrição (Alfabética) */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('alpha')}
                      className="flex items-center gap-1 hover:text-blue-400 transition-colors uppercase font-bold text-xs cursor-pointer group"
                      title="Clique para alternar ordenação alfabética (A-Z / Z-A)"
                    >
                      <span>Descrição</span>
                      {sortBy === 'alpha-asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                      ) : sortBy === 'alpha-desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-4">Categoria</th>

                  {/* Ordenação por Valor */}
                  <th className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('amount')}
                      className="inline-flex items-center gap-1 hover:text-blue-400 transition-colors uppercase font-bold text-xs cursor-pointer group ml-auto"
                      title="Clique para alternar ordenação por valor"
                    >
                      <span>Valor</span>
                      {sortBy === 'amount-desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                      ) : sortBy === 'amount-asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {paginatedTransactions.map(t => {
                  const cat = categories.find(c => c.id === t.category_id);
                  const isIncome = t.type === 'income';
                  const instBadge = getInstallmentBadge(t.description);
                  const cleanDesc = getCleanDescription(t.description);

                  const isOverdue = t.type === 'expense' && t.is_paid === false && (t.date || '').split('T')[0] < todayStr;
                  const isDueToday = t.type === 'expense' && t.is_paid === false && (t.date || '').split('T')[0] === todayStr;
                  const isSelected = selectedIds.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isSelected
                          ? 'bg-blue-500/15 dark:bg-blue-900/30'
                          : isOverdue
                          ? 'bg-red-500/10 dark:bg-red-950/25'
                          : isDueToday
                          ? 'bg-yellow-500/10 dark:bg-yellow-950/20'
                          : t.is_paid === false
                          ? 'opacity-85'
                          : ''
                      }`}
                    >
                      {/* Checkbox Individual da Linha */}
                      <td className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRowSelect(t.id)}
                          className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          title="Selecionar lançamento"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleTransactionPaid(t)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            t.is_paid !== false
                              ? 'bg-green-100 dark:bg-green-950/60 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                              : isOverdue
                              ? 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                              : 'bg-yellow-100 dark:bg-yellow-950/60 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
                          }`}
                          title={t.is_paid !== false ? 'Pago (Clique para marcar como pendente)' : 'Pendente (Clique para marcar como pago)'}
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
                          {t.is_paid === false ? (
                            isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/90 text-red-700 dark:text-red-300 border border-red-400 dark:border-red-700">
                                <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                Atrasada ({getOverdueDaysText(t.date)})
                              </span>
                            ) : isDueToday ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-950/90 text-yellow-800 dark:text-yellow-300 border border-yellow-400 dark:border-yellow-600">
                                <Clock className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                Vence Hoje!
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-950/80 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700/50">
                                A Pagar
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700/50">
                              {isIncome ? 'Recebido' : 'Pago'}
                            </span>
                          )}
                          {instBadge && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                              💳 {instBadge}
                            </span>
                          )}
                          {t.appointment_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              <CalendarCheck className="w-3 h-3" /> Atendimento
                            </span>
                          )}
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
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
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

      {/* Card de Resumo Financeiro do Mês (Pagos vs A Pagar) */}
      <div className={`p-6 rounded-2xl shadow-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <DollarSign className="w-5 h-5 text-blue-500" />
            Resumo Financeiro do Mês (Pagos vs A Pagar)
          </h3>
          <span className="text-xs text-gray-400">
            Total de {currentMonthTransactions.length} lançamentos no período
          </span>
        </div>

        {/* 4 Cards de Métricas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-green-950/20 border-green-900/60' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">
                Despesas Pagas
              </span>
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-lg font-extrabold text-green-600 dark:text-green-400 mt-1">
              {showVal(paidExpensesTotal)}
            </div>
            <span className="text-[11px] text-gray-400">
              {paidExpensesList.length} conta{paidExpensesList.length !== 1 ? 's' : ''} quitada{paidExpensesList.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-yellow-950/20 border-yellow-900/60' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300 uppercase tracking-wider">
                Despesas a Pagar
              </span>
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-lg font-extrabold text-yellow-600 dark:text-yellow-400 mt-1">
              {showVal(unpaidExpensesTotal)}
            </div>
            <span className="text-[11px] text-gray-400">
              {unpaidExpensesList.length} conta{unpaidExpensesList.length !== 1 ? 's' : ''} pendente{unpaidExpensesList.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-blue-950/20 border-blue-900/60' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Receitas Recebidas
              </span>
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {showVal(paidIncomesTotal)}
            </div>
            <span className="text-[11px] text-gray-400">
              {paidIncomesList.length} entrada{paidIncomesList.length !== 1 ? 's' : ''} confirmada{paidIncomesList.length !== 1 ? 's' : ''}
              {unpaidIncomesList.length > 0 && ` (${unpaidIncomesList.length} a receber)`}
            </span>
          </div>

          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-purple-950/20 border-purple-900/60' : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Saldo Realizado
              </span>
              <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className={`text-lg font-extrabold mt-1 ${
              currentPaidBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {showVal(currentPaidBalance)}
            </div>
            <span className="text-[11px] text-gray-400">
              Entradas pagas - Saídas pagas
            </span>
          </div>
        </div>
      </div>

      {/* BARRA FLUTUANTE DE AÇÕES EM LOTE (BATCH ACTIONS) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-2xl px-2">
          <div className={`p-3.5 sm:p-4 rounded-2xl shadow-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md ${
            darkMode ? 'bg-gray-900/95 border-gray-700 text-white' : 'bg-white/95 border-gray-200 text-gray-900 shadow-xl'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <CheckSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold">
                  {selectedIds.length} lançamento{selectedIds.length > 1 ? 's selecionados' : ' selecionado'}
                </p>
                <p className="text-[11px] text-gray-400">
                  Total selecionado: <strong className="text-blue-400">{showVal(selectedTotalAmount)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleBatchMarkPaid(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 active:scale-95 text-white shadow-md shadow-green-600/30 transition-all cursor-pointer"
                title="Marcar todos os selecionados como pagos"
              >
                <Check className="w-4 h-4" />
                <span>Quitar ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchMarkPaid(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-gray-950 shadow-md shadow-yellow-500/30 transition-all cursor-pointer"
                title="Marcar todos os selecionados como pendentes"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pendentes</span>
              </button>

              <button
                type="button"
                onClick={handleBatchDeleteSelected}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 active:scale-95 transition-all cursor-pointer"
                title="Excluir selecionados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="p-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all cursor-pointer"
                title="Desmarcar todos"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
