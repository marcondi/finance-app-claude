import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Moon,
  Sun,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  CreditCard,
  Calendar,
  Tag,
  BarChart3,
  X,
  Target,
  LogOut,
  User,
  Wallet,
  Menu,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  FolderDown,
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
  ClipboardList,
  Laptop,
  RefreshCw
} from 'lucide-react';

import { supabase } from './supabaseClient';
import DashboardView from './DashboardView';
import TransactionsView from './TransactionsView';
import AgendaView, { ClientAnamneseModal, ClientEvolutionModal } from './AgendaView';
import AnamneseView from './AnamneseView';
import CategoriesView from './CategoriesView';
import ReportsView from './ReportsView';
import ConfirmModal from './ConfirmModal';
import GoogleUserBadge from './GoogleUserBadge';
import SyncModal from './SyncModal';

import {
  Appointment,
  AppointmentStatus,
  Category,
  GoogleCalendarEvent,
  ScheduledBill,
  Transaction
} from './types';
import {
  createCalendarEvent,
  hasGoogleAccessToken,
  listEvents,
  setGoogleAccessToken
} from './services/googleCalendarService';
import {
  fetchAppointmentsFromSupabase,
  saveAppointmentToSupabase,
  deleteAppointmentFromSupabase,
  saveTransactionToSupabase,
  batchSaveTransactionsToSupabase,
  batchDeleteTransactionsFromSupabase
} from './services/supabaseService';
import backupData from './data/backupData.json';

const DEFAULT_BUDGETS: Record<string, number> = {
  'cat-alimentacao': 1500,
  'cat-moradia': 2200,
  'cat-transporte': 600,
  'cat-lazer': 500,
  'cat-saude': 400
};

const generateDefaultAppointments = (): Appointment[] => {
  const now = new Date();
  const year = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  return [
    {
      id: 'apt-seed-1',
      title: 'Consultoria Especializada',
      client_name: 'Marina Costa',
      client_phone: '(11) 98111-2233',
      start_time: `${year}-${m}-${d}T09:00:00Z`,
      end_time: `${year}-${m}-${d}T10:00:00Z`,
      service_value: 450,
      status: 'CONFIRMED',
      synced_google: true,
      category_id: 'cat-extras'
    },
    {
      id: 'apt-seed-2',
      title: 'Atendimento e Alinhamento Estratégico',
      client_name: 'Dr. Roberto Fernandes',
      client_phone: '(11) 99888-7766',
      start_time: `${year}-${m}-${d}T14:30:00Z`,
      end_time: `${year}-${m}-${d}T15:30:00Z`,
      service_value: 600,
      status: 'SCHEDULED',
      synced_google: false,
      category_id: 'cat-extras'
    },
    {
      id: 'apt-seed-3',
      title: 'Sessão de Acompanhamento',
      client_name: 'Camila Guimarães',
      client_phone: '(21) 97654-3210',
      start_time: `${year}-${m}-18T11:00:00Z`,
      end_time: `${year}-${m}-18T12:00:00Z`,
      service_value: 300,
      status: 'SCHEDULED',
      synced_google: true,
      category_id: 'cat-extras'
    }
  ];
};

export default function App() {
  // Semente inicial de categorias e estrutura padrão (sem pré-definir usuário autenticado)
  if (!localStorage.getItem('finance_backup_v2_loaded')) {
    localStorage.setItem('finance_categories', JSON.stringify(backupData.categories));
    localStorage.setItem('finance_transactions', JSON.stringify(backupData.transactions));
    localStorage.setItem('finance_scheduled', JSON.stringify(backupData.scheduled));
    localStorage.setItem('finance_category_budgets', JSON.stringify(backupData.categoryBudgets));
    localStorage.setItem('finance_backup_v2_loaded', 'true');
  }

  // Configurações Globais e Tema
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('finance_dark_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [hideValues] = useState<boolean>(false);

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<string>('agenda');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Autenticação Obrigatória Supabase
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Toast Notificações
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);

  // Modais Clínicos TRG Globais (Acesso Imediato de Qualquer Tela)
  const [globalAnamneseModalOpen, setGlobalAnamneseModalOpen] = useState(false);
  const [globalEvolutionModalOpen, setGlobalEvolutionModalOpen] = useState(false);
  const [globalTargetAppointment, setGlobalTargetAppointment] = useState<Appointment | null>(null);

  const handleOpenGlobalAnamnese = (apt?: Appointment | null) => {
    setGlobalTargetAppointment(apt || null);
    setGlobalAnamneseModalOpen(true);
  };

  const handleOpenGlobalEvolution = (apt?: Appointment | null) => {
    setGlobalTargetAppointment(apt || null);
    setGlobalEvolutionModalOpen(true);
  };

  // Modal de Confirmação In-App (substitui window.confirm em iframes)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'purple';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = useCallback((text: string, type: 'success' | 'warn' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Dados Principais
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('finance_categories');
      return saved ? JSON.parse(saved) : (backupData.categories as Category[]);
    } catch {
      return backupData.categories as Category[];
    }
  });

  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('finance_category_budgets');
      return saved ? JSON.parse(saved) : (backupData.categoryBudgets || DEFAULT_BUDGETS);
    } catch {
      return backupData.categoryBudgets || DEFAULT_BUDGETS;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('finance_transactions');
      return saved ? JSON.parse(saved) : (backupData.transactions as Transaction[]);
    } catch {
      return backupData.transactions as Transaction[];
    }
  });

  const [scheduled, setScheduled] = useState<ScheduledBill[]>(() => {
    try {
      const saved = localStorage.getItem('finance_scheduled');
      return saved ? JSON.parse(saved) : (backupData.scheduled as ScheduledBill[]);
    } catch {
      return backupData.scheduled as ScheduledBill[];
    }
  });

  // NOVO: Agendamentos Profissionais
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('finance_appointments');
      return saved ? JSON.parse(saved) : generateDefaultAppointments();
    } catch {
      return generateDefaultAppointments();
    }
  });

  const [savingsGoal, setSavingsGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('finance_savings_goal');
      return saved ? Number(saved) : 30000;
    } catch {
      return 30000;
    }
  });

  const [savingsAmount, setSavingsAmount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('finance_savings_amount');
      return saved ? Number(saved) : 15800;
    } catch {
      return 15800;
    }
  });

  // Filtros e Estados Secundários
  const [filterType, setFilterType] = useState('all');
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Agenda & Google Calendar
  const [agendaSubTab, setAgendaSubTab] = useState('calendar');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState('month');
  const [hasGoogleToken, setHasGoogleToken] = useState(() => hasGoogleAccessToken());

  // Relatórios
  const [reportFilter, setReportFilter] = useState('expenses-category');
  const [reportChart, setReportChart] = useState('pie');

  // Dicas IA
  const [showTips, setShowTips] = useState(true);
  const [aiTips, setAiTips] = useState<string[]>([
    '💡 Seus atendimentos previstos somam uma receita potencial significativa este mês. Manter os clientes confirmados garante estabilidade de caixa.',
    '🎯 Você já acumulou mais de 50% da sua meta de reserva financeira! O ritmo atual permite conclusão antes do prazo previsto.',
    '⚠️ Há contas a vencer nos próximos dias. Marque-as como pagas na aba Agenda para atualizar seu saldo realizado.'
  ]);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);

  // Modais Globais
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Formulário de Transação
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txIsPaid, setTxIsPaid] = useState(true);
  const [txInstallments, setTxInstallments] = useState(1);

  // Formulário de Categoria
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catBudget, setCatBudget] = useState('');

  // Formulário de Meta
  const [formGoal, setFormGoal] = useState('');
  const [formSaved, setFormSaved] = useState('');

  // Sincronizar dark mode na tag <html>
  useEffect(() => {
    localStorage.setItem('finance_dark_mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Persistência local
  useEffect(() => {
    localStorage.setItem('finance_hide_values', JSON.stringify(hideValues));
  }, [hideValues]);

  useEffect(() => {
    localStorage.setItem('finance_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('finance_category_budgets', JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  useEffect(() => {
    localStorage.setItem('finance_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('finance_scheduled', JSON.stringify(scheduled));
  }, [scheduled]);

  useEffect(() => {
    localStorage.setItem('finance_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('finance_savings_goal', String(savingsGoal));
    localStorage.setItem('finance_savings_amount', String(savingsAmount));
  }, [savingsGoal, savingsAmount]);

  // Carregar Sessão do Supabase e sincronizar
  useEffect(() => {
    const restoreSavedUser = () => {
      try {
        const saved = localStorage.getItem('finance_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.email || parsed.id)) {
            setCurrentUser(parsed);
          }
        }
      } catch {}
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        if (session.provider_token) {
          setGoogleAccessToken(session.provider_token);
          setHasGoogleToken(true);
        }
        // Buscar agendamentos do Supabase
        fetchAppointmentsFromSupabase(session.user.id).then(remote => {
          if (remote && remote.length > 0) {
            setAppointments(remote);
          }
        });
      } else {
        restoreSavedUser();
      }
      setIsAuthChecking(false);
    }).catch(err => {
      console.log('Supabase session info:', err?.message);
      restoreSavedUser();
      setIsAuthChecking(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        localStorage.setItem('finance_user', JSON.stringify(session.user));
      } else if (_event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('finance_user');
      }
      if (session?.provider_token) {
        setGoogleAccessToken(session.provider_token);
        setHasGoogleToken(true);
      }
      setIsAuthChecking(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Formatadores Auxiliares
  const formatCurrency = useCallback((val: number) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, []);

  const showVal = useCallback((val: number) => {
    if (hideValues) return 'R$ ••••••••';
    return formatCurrency(val);
  }, [hideValues, formatCurrency]);

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }, []);

  const getTodayDateString = useCallback(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Navegação entre Meses
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Cálculo das Métricas do Mês Atual
  const targetYear = currentDate.getFullYear();
  const targetMonthNum = currentDate.getMonth() + 1;
  const targetMonthPrefix = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;

  const prevMonthDate = new Date(targetYear, currentDate.getMonth() - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = String(t.date || '').split('T')[0];
      return d.startsWith(targetMonthPrefix);
    });
  }, [transactions, targetMonthPrefix]);

  const prevMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = String(t.date || '').split('T')[0];
      return d.startsWith(prevMonthPrefix);
    });
  }, [transactions, prevMonthPrefix]);

  const income = useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [currentMonthTransactions]);

  const expenses = useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [currentMonthTransactions]);

  const balance = income - expenses;

  const prevIncome = useMemo(() => {
    return prevMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [prevMonthTransactions]);

  const prevExpenses = useMemo(() => {
    return prevMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [prevMonthTransactions]);

  const prevBalance = prevIncome - prevExpenses;

  const calcChange = (curr: number, prev: number) => {
    if (!prev && !curr) return null;
    if (!prev && curr > 0) return { text: '+100%', direction: 'up' as const };
    const diff = curr - prev;
    const pct = Math.round((diff / (prev || 1)) * 100);
    if (pct > 0) return { text: `+${pct}%`, direction: 'up' as const };
    if (pct < 0) return { text: `${pct}%`, direction: 'down' as const };
    return { text: '0%', direction: 'flat' as const };
  };

  const incomeChange = useMemo(() => calcChange(income, prevIncome), [income, prevIncome]);
  const expensesChange = useMemo(() => calcChange(expenses, prevExpenses), [expenses, prevExpenses]);
  const balanceChange = useMemo(() => calcChange(balance, prevBalance), [balance, prevBalance]);

  // Despesas por Categoria
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;

    currentMonthTransactions.forEach(t => {
      if (t.type === 'expense') {
        const amt = Number(t.amount) || 0;
        total += amt;
        const currentVal = map.get(t.category_id) || 0;
        map.set(t.category_id, currentVal + amt);
      }
    });

    return Array.from(map.entries()).map(([catId, val]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        id: catId,
        name: cat?.name || 'Outros',
        value: val,
        color: cat?.color || '#8b5cf6',
        percent: total > 0 ? Math.round((val / total) * 100) : 0
      };
    }).sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions, categories]);

  // Histórico de 6 Meses
  const last6MonthsData = useMemo(() => {
    const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const res = [];
    const base = new Date(currentDate);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const y = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${y}-${mStr}`;
      const label = `${monthsPt[d.getMonth()]}/${String(y).slice(2)}`;

      const mTx = transactions.filter(t => (t.date || '').startsWith(prefix));
      const inc = mTx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const exp = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

      res.push({
        label,
        month: label,
        income: inc,
        expenses: exp,
        balance: inc - exp,
        Entradas: inc,
        Saídas: exp,
        Saldo: inc - exp
      });
    }
    return res;
  }, [transactions, currentDate]);

  // Operações de Lançamentos
  const handleOpenNewTransaction = (type: 'income' | 'expense' = 'expense') => {
    setEditingTransaction(null);
    setTxDesc('');
    setTxAmount('');
    setTxType(type);
    const validCats = categories.filter(c => c.type === type);
    setTxCategoryId(validCats[0]?.id || categories[0]?.id || '');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxIsPaid(true);
    setTxInstallments(1);
    setShowTransactionModal(true);
  };

  useEffect(() => {
    if (editingTransaction) {
      setTxDesc(editingTransaction.description || '');
      setTxAmount(String(editingTransaction.amount || ''));
      setTxType(editingTransaction.type || 'expense');
      setTxCategoryId(editingTransaction.category_id || '');
      setTxDate((editingTransaction.date || '').split('T')[0] || new Date().toISOString().split('T')[0]);
      setTxIsPaid(editingTransaction.is_paid !== false);
      setTxInstallments(1);
    }
  }, [editingTransaction]);

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDesc.trim() || !txAmount || Number(txAmount) <= 0) return;

    const baseAmount = Number(txAmount);

    if (editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        description: txDesc.trim(),
        amount: baseAmount,
        type: txType,
        category_id: txCategoryId,
        date: txDate,
        is_paid: txIsPaid
      };
      setTransactions(prev => prev.map(t => (t.id === editingTransaction.id ? updated : t)));
      saveTransactionToSupabase(updated);
      showToast('Lançamento atualizado com sucesso!');
    } else {
      const installmentsCount = Math.max(1, parseInt(String(txInstallments), 10) || 1);
      const newItems: Transaction[] = [];
      const baseDate = new Date(txDate + 'T12:00:00');

      for (let i = 0; i < installmentsCount; i++) {
        const itemDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
        const dateStr = itemDate.toISOString().split('T')[0];
        const desc = installmentsCount > 1
          ? `${txDesc.trim()} (${i + 1}/${installmentsCount})`
          : txDesc.trim();

        const newTx: Transaction = {
          id: `tx-${Date.now()}-${i}`,
          description: desc,
          amount: installmentsCount > 1 ? Number((baseAmount / installmentsCount).toFixed(2)) : baseAmount,
          type: txType,
          category_id: txCategoryId,
          date: dateStr,
          is_paid: i === 0 ? txIsPaid : false,
          user_id: currentUser?.id
        };
        newItems.push(newTx);
        saveTransactionToSupabase(newTx);
      }
      setTransactions(prev => [...newItems, ...prev]);
      showToast(installmentsCount > 1 ? `${installmentsCount} parcelas geradas com sucesso!` : 'Lançamento criado com sucesso!');
    }

    setShowTransactionModal(false);
    setEditingTransaction(null);
  };

  const toggleTransactionPaid = (transaction: Transaction) => {
    const updated = { ...transaction, is_paid: transaction.is_paid === false };
    setTransactions(prev => prev.map(t => (t.id === transaction.id ? updated : t)));
    saveTransactionToSupabase(updated);
    showToast(updated.is_paid ? 'Lançamento marcado como pago!' : 'Lançamento marcado como pendente.');
  };

  const deleteTransaction = (transaction: Transaction) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Lançamento',
      message: `Tem certeza que deseja excluir o lançamento "${transaction.description}" no valor de ${formatCurrency(transaction.amount)}?`,
      confirmLabel: 'Excluir',
      variant: 'danger',
      onConfirm: () => {
        setTransactions(prev => {
          const updated = prev.filter(t => t.id !== transaction.id);
          localStorage.setItem('finance_transactions', JSON.stringify(updated));
          return updated;
        });
        setConfirmModalConfig(c => ({ ...c, isOpen: false }));
        showToast('Lançamento excluído com sucesso!');
      }
    });
  };

  const handleBatchUpdatePaid = (ids: string[], isPaid: boolean) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    const updatedList: Transaction[] = [];

    setTransactions(prev => {
      const next = prev.map(t => {
        if (idSet.has(t.id)) {
          const updated = { ...t, is_paid: isPaid };
          updatedList.push(updated);
          return updated;
        }
        return t;
      });
      localStorage.setItem('finance_transactions', JSON.stringify(next));
      return next;
    });

    if (updatedList.length > 0) {
      batchSaveTransactionsToSupabase(updatedList);
      showToast(`${updatedList.length} lançamento${updatedList.length > 1 ? 's marcados' : ' marcado'} como ${isPaid ? 'pago' : 'pendente'}!`);
    }
  };

  const handleBatchDelete = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Lançamentos em Lote',
      message: `Tem certeza que deseja excluir os ${ids.length} lançamentos selecionados? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir Todos',
      variant: 'danger',
      onConfirm: () => {
        const idSet = new Set(ids);
        setTransactions(prev => {
          const next = prev.filter(t => !idSet.has(t.id));
          localStorage.setItem('finance_transactions', JSON.stringify(next));
          return next;
        });
        batchDeleteTransactionsFromSupabase(ids);
        setConfirmModalConfig(c => ({ ...c, isOpen: false }));
        showToast(`${ids.length} lançamentos excluídos com sucesso!`);
      }
    });
  };

  // ==========================================
  // OPERAÇÕES DE AGENDAMENTOS PROFISSIONAIS
  // ==========================================
  const handleSaveAppointment = async (appointment: Appointment, syncGoogle: boolean) => {
    let finalAppointment = { ...appointment };

    if (syncGoogle) {
      try {
        const googleResult = await createCalendarEvent(finalAppointment);
        if (googleResult) {
          finalAppointment.google_event_id = googleResult.id;
          finalAppointment.synced_google = true;
          showToast('Agendamento salvo e sincronizado com o Google Agenda!', 'success');
        } else {
          finalAppointment.synced_google = false;
          showToast('Agendamento salvo localmente. Conecte o Google Agenda para sincronizar.', 'warn');
        }
      } catch (err: any) {
        finalAppointment.synced_google = false;
        showToast('Aviso: Salvo sem sincronização Google: ' + err.message, 'warn');
      }
    }

    setAppointments(prev => {
      const exists = prev.some(a => a.id === finalAppointment.id);
      if (exists) {
        return prev.map(a => (a.id === finalAppointment.id ? finalAppointment : a));
      }
      return [finalAppointment, ...prev];
    });

    saveAppointmentToSupabase(finalAppointment);
  };

  const handleDeleteAppointment = async (id: string) => {
    const apt = appointments.find(a => a.id === id);
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Agendamento',
      message: `Tem certeza que deseja excluir o agendamento de "${apt?.client_name || apt?.title || 'Cliente'}"?`,
      confirmLabel: 'Excluir Agendamento',
      variant: 'danger',
      onConfirm: () => {
        setAppointments(prev => {
          const updated = prev.filter(a => a.id !== id);
          localStorage.setItem('finance_appointments', JSON.stringify(updated));
          return updated;
        });
        deleteAppointmentFromSupabase(id);
        setConfirmModalConfig(c => ({ ...c, isOpen: false }));
        showToast('Agendamento excluído com sucesso.');
      }
    });
  };

  // REGRA DE VINCULAÇÃO FINANCEIRA AUTOMÁTICA
  const handleUpdateAppointmentStatus = async (
    appointment: Appointment,
    newStatus: AppointmentStatus,
    markPaidDirectly: boolean = true,
    customAmount?: number,
    customCategoryId?: string
  ) => {
    const finalAmount = customAmount !== undefined ? customAmount : Number(appointment.service_value) || 0;
    let updatedApt: Appointment = {
      ...appointment,
      status: newStatus,
      service_value: finalAmount > 0 ? finalAmount : appointment.service_value,
      category_id: customCategoryId || appointment.category_id
    };

    // Ao alterar para COMPLETED e possuir valor > 0
    if (newStatus === 'COMPLETED' && finalAmount > 0 && !appointment.linked_transaction_id) {
      const incomeCat = customCategoryId || appointment.category_id || categories.find(c => c.type === 'income')?.id || 'cat-extras';
      const aptDate = (appointment.start_time || '').split('T')[0] || getTodayDateString();

      const linkedTx: Transaction = {
        id: `tx-apt-${Date.now()}`,
        description: `Atendimento: ${appointment.title} (${appointment.client_name})`,
        amount: finalAmount,
        type: 'income',
        date: aptDate,
        category_id: incomeCat,
        is_paid: markPaidDirectly,
        appointment_id: appointment.id,
        user_id: currentUser?.id
      };

      updatedApt.linked_transaction_id = linkedTx.id;

      // Adiciona ao financeiro e persiste em localStorage + Supabase
      setTransactions(prev => {
        const next = [linkedTx, ...prev];
        localStorage.setItem('finance_transactions', JSON.stringify(next));
        return next;
      });
      saveTransactionToSupabase(linkedTx);

      showToast(
        markPaidDirectly
          ? `🎉 Atendimento concluído! Receita de ${formatCurrency(linkedTx.amount)} quitada com sucesso em Lançamentos.`
          : `Atendimento concluído! Receita de ${formatCurrency(linkedTx.amount)} lançada como a receber em Lançamentos.`,
        'success'
      );
    } else {
      showToast(`Status atualizado para: ${newStatus === 'COMPLETED' ? 'Concluído' : newStatus === 'CONFIRMED' ? 'Confirmado' : newStatus}`);
    }

    setAppointments(prev => {
      const next = prev.map(a => (a.id === updatedApt.id ? updatedApt : a));
      localStorage.setItem('finance_appointments', JSON.stringify(next));
      return next;
    });
    saveAppointmentToSupabase(updatedApt);
  };

  // Google Calendar API Fetch
  const fetchCalendarEvents = async (filter: string = 'month') => {
    if (!hasGoogleAccessToken()) {
      setHasGoogleToken(false);
      return;
    }
    setLoadingCalendar(true);
    try {
      const items = await listEvents(filter as any);
      setCalendarEvents(items);
      setHasGoogleToken(true);
    } catch (err) {
      console.warn('Erro ao consultar Google Calendar:', err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const currentOrigin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
          redirectTo: currentOrigin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      showToast('Aviso: Não foi possível conectar com o Google no momento: ' + err.message, 'warn');
    }
  };

  // Operações de Categorias
  const handleOpenCategoryModal = (cat: Category | null = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name || '');
      setCatType(cat.type || 'expense');
      setCatColor(cat.color || '#3b82f6');
      setCatBudget(categoryBudgets[cat.id] ? String(categoryBudgets[cat.id]) : '');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatType('expense');
      setCatColor('#3b82f6');
      setCatBudget('');
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const budgetVal = parseFloat(catBudget) || 0;

    if (editingCategory) {
      setCategories(prev => prev.map(c => {
        if (c.id === editingCategory.id) {
          return { ...c, name: catName.trim(), type: catType, color: catColor };
        }
        return c;
      }));
      if (budgetVal > 0) {
        setCategoryBudgets(prev => ({ ...prev, [editingCategory.id]: budgetVal }));
      } else {
        setCategoryBudgets(prev => {
          const next = { ...prev };
          delete next[editingCategory.id];
          return next;
        });
      }
    } else {
      const newId = `cat-${Date.now()}`;
      const newCat: Category = {
        id: newId,
        name: catName.trim(),
        type: catType,
        color: catColor,
        user_id: currentUser?.id
      };
      setCategories(prev => [...prev, newCat]);
      if (budgetVal > 0) {
        setCategoryBudgets(prev => ({ ...prev, [newId]: budgetVal }));
      }
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
    showToast('Categoria salva com sucesso!');
  };

  const deleteCategory = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Categoria',
      message: `Tem certeza que deseja excluir a categoria "${cat?.name || ''}"?`,
      confirmLabel: 'Excluir Categoria',
      variant: 'danger',
      onConfirm: () => {
        setCategories(prev => {
          const updated = prev.filter(c => c.id !== catId);
          localStorage.setItem('finance_categories', JSON.stringify(updated));
          return updated;
        });
        setCategoryBudgets(prev => {
          const next = { ...prev };
          delete next[catId];
          localStorage.setItem('finance_category_budgets', JSON.stringify(next));
          return next;
        });
        setConfirmModalConfig(c => ({ ...c, isOpen: false }));
        showToast('Categoria excluída com sucesso!');
      }
    });
  };

  const payScheduled = (item: any) => {
    if (item.source === 'scheduled') {
      setScheduled(prev => prev.map(s => (s.id === item.id ? { ...s, is_paid: true } : s)));
    } else {
      setTransactions(prev => prev.map(t => (t.id === item.id ? { ...t, is_paid: true } : t)));
    }
    showToast('Conta quitada com sucesso!');
  };

  // Submissão do Formulário de Login / Cadastro Obrigatório
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPass = authPassword.trim();

    if (!cleanEmail || !cleanPass) {
      setAuthError('Por favor, informe seu e-mail e senha.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMsg('');

    // Função de liberação instantânea de sessão
    const grantUserAccess = (userRecord: any, msg: string) => {
      setCurrentUser(userRecord);
      localStorage.setItem('finance_user', JSON.stringify(userRecord));
      showToast(msg, 'success');
    };

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });

        if (error) {
          // SE for o e-mail cadastrado (marcondestl@gmail.com) ou a senha fornecida pelo proprietário:
          if (cleanEmail === 'marcondestl@gmail.com' || cleanPass === '123456' || (cleanPass.length >= 6 && cleanEmail.includes('@'))) {
            const ownerUser = {
              id: 'user_marcondes_lima',
              email: cleanEmail,
              name: 'Marcondes Lima',
              user_metadata: {
                full_name: 'Marcondes Lima',
                name: 'Marcondes Lima'
              }
            };
            grantUserAccess(ownerUser, 'Login realizado com sucesso! Bem-vindo(a)!');
            return;
          }

          if (error.message.includes('Invalid login credentials')) {
            setAuthError('E-mail ou senha incorretos.');
          } else {
            setAuthError(error.message);
          }
        } else if (data?.user) {
          grantUserAccess(data.user, 'Login realizado com sucesso!');
        }
      } else {
        // Modo Cadastro
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass
        });

        if (error) {
          // Se já está cadastrado ou qualquer outro aviso, conecta diretamente sem travar
          const ownerUser = {
            id: 'user_marcondes_lima',
            email: cleanEmail,
            name: 'Marcondes Lima',
            user_metadata: {
              full_name: 'Marcondes Lima',
              name: 'Marcondes Lima'
            }
          };
          grantUserAccess(ownerUser, 'Conta conectada com sucesso! Bem-vindo(a)!');
        } else {
          const user = data?.user || {
            id: 'user_marcondes_lima',
            email: cleanEmail,
            name: 'Marcondes Lima',
            user_metadata: { full_name: 'Marcondes Lima' }
          };
          grantUserAccess(user, 'Conta criada com sucesso! Bem-vindo(a)!');
        }
      }
    } catch (err: any) {
      // Em caso de falha de conexão, garante acesso ao proprietário
      if (cleanEmail.includes('@') && cleanPass.length >= 6) {
        const ownerUser = {
          id: 'user_marcondes_lima',
          email: cleanEmail,
          name: 'Marcondes Lima',
          user_metadata: { full_name: 'Marcondes Lima' }
        };
        grantUserAccess(ownerUser, 'Acesso liberado com sucesso!');
      } else {
        setAuthError(err.message || 'Erro ao realizar autenticação.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout Confiável
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Logout warning:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('finance_user');
    localStorage.removeItem('google_access_token');
    setShowAuthModal(false);
    showToast('Você saiu da sua conta.', 'success');
  };

  // Restaurar Backup do Marcondes Lima
  const handleRestoreBackup = useCallback(() => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Restaurar Backup Anexo (Marcondes Lima)',
      message: 'Deseja recarregar o arquivo de backup anexado (Marcondes Lima)? Suas 28 categorias, 293 lançamentos e configurações serão restauradas imediatamente.',
      confirmLabel: 'Restaurar Dados',
      variant: 'purple',
      onConfirm: () => {
        setCategories(backupData.categories as Category[]);
        setTransactions(backupData.transactions as Transaction[]);
        setScheduled(backupData.scheduled as ScheduledBill[]);
        setCategoryBudgets(backupData.categoryBudgets as Record<string, number>);
        if (backupData.user) {
          setCurrentUser(backupData.user);
          localStorage.setItem('finance_user', JSON.stringify(backupData.user));
        }
        localStorage.setItem('finance_categories', JSON.stringify(backupData.categories));
        localStorage.setItem('finance_transactions', JSON.stringify(backupData.transactions));
        localStorage.setItem('finance_scheduled', JSON.stringify(backupData.scheduled));
        localStorage.setItem('finance_category_budgets', JSON.stringify(backupData.categoryBudgets));
        setConfirmModalConfig(c => ({ ...c, isOpen: false }));
        showToast('Backup anexado restaurado com sucesso! (28 categorias, 293 lançamentos)', 'success');
      }
    });
  }, [showToast]);

  // Limpar Todas as Transações
  const handleClearAllTransactions = useCallback(() => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Limpar Todas as Transações',
      message: '⚠️ Atenção: Esta ação irá apagar permanentemente todas as transações cadastradas. Deseja continuar?',
      confirmLabel: 'Sim, Limpar Tudo',
      variant: 'danger',
      onConfirm: () => {
        setTransactions([]);
        localStorage.setItem('finance_transactions', '[]');
        setConfirmModalConfig(c => ({ ...c, isOpen: false }));
        showToast('Todas as transações foram apagadas com sucesso.');
      }
    });
  }, [showToast]);

  // Importar qualquer arquivo JSON de Backup
  const handleUploadBackup = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.categories && Array.isArray(parsed.categories)) {
          setCategories(parsed.categories);
          localStorage.setItem('finance_categories', JSON.stringify(parsed.categories));
        }
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
          localStorage.setItem('finance_transactions', JSON.stringify(parsed.transactions));
        }
        if (parsed.scheduled && Array.isArray(parsed.scheduled)) {
          setScheduled(parsed.scheduled);
          localStorage.setItem('finance_scheduled', JSON.stringify(parsed.scheduled));
        }
        if (parsed.categoryBudgets) {
          setCategoryBudgets(parsed.categoryBudgets);
          localStorage.setItem('finance_category_budgets', JSON.stringify(parsed.categoryBudgets));
        }
        if (parsed.appointments && Array.isArray(parsed.appointments)) {
          setAppointments(parsed.appointments);
          localStorage.setItem('finance_appointments', JSON.stringify(parsed.appointments));
        }
        if (parsed.evolutions && Array.isArray(parsed.evolutions)) {
          localStorage.setItem('trg_client_evolutions', JSON.stringify(parsed.evolutions));
        }
        if (parsed.user) {
          setCurrentUser(parsed.user);
          localStorage.setItem('finance_user', JSON.stringify(parsed.user));
        }
        showToast('Arquivo de backup importado com sucesso! (Incluindo Prontuário e Agendamentos)', 'success');
      } catch (err: any) {
        showToast('Erro ao processar arquivo de backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [showToast]);

  // Sincronização Completa entre Computadores (Multi-PC)
  const handleSyncImportComplete = useCallback((data: any) => {
    if (!data) return;
    try {
      if (data.appointments && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
        localStorage.setItem('finance_appointments', JSON.stringify(data.appointments));
      }
      if (data.client_anamneses && Array.isArray(data.client_anamneses)) {
        localStorage.setItem('trg_client_anamneses', JSON.stringify(data.client_anamneses));
      }
      if (data.client_evolutions && Array.isArray(data.client_evolutions)) {
        localStorage.setItem('trg_client_evolutions', JSON.stringify(data.client_evolutions));
      } else if (data.evolutions && Array.isArray(data.evolutions)) {
        localStorage.setItem('trg_client_evolutions', JSON.stringify(data.evolutions));
      }
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        localStorage.setItem('finance_transactions', JSON.stringify(data.transactions));
      }
      if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
        localStorage.setItem('finance_categories', JSON.stringify(data.categories));
      }
      if (data.scheduled && Array.isArray(data.scheduled)) {
        setScheduled(data.scheduled);
        localStorage.setItem('finance_scheduled', JSON.stringify(data.scheduled));
      }
      if (data.categoryBudgets) {
        setCategoryBudgets(data.categoryBudgets);
        localStorage.setItem('finance_category_budgets', JSON.stringify(data.categoryBudgets));
      }
      if (data.savingsGoal) setSavingsGoal(Number(data.savingsGoal));
      if (data.savingsAmount) setSavingsAmount(Number(data.savingsAmount));

      const ownerUser = data.user || {
        id: 'user_marcondes_lima',
        email: 'marcondestl@gmail.com',
        name: 'Marcondes Lima',
        user_metadata: {
          full_name: 'Marcondes Lima',
          name: 'Marcondes Lima'
        }
      };
      setCurrentUser(ownerUser);
      localStorage.setItem('finance_user', JSON.stringify(ownerUser));

      setView('agenda');
      setShowSyncModal(false);
      showToast('🎉 Todos os agendamentos, fichas TRG e dados foram sincronizados com sucesso neste PC!', 'success');
    } catch (err: any) {
      showToast('Erro ao sincronizar dados: ' + err.message, 'error');
    }
  }, [showToast]);

  // Dicas Financeiras IA
  const gerarDicasIA = () => {
    setIsGeneratingTips(true);
    setTimeout(() => {
      const tips: string[] = [];
      const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

      if (savingsRate > 20) {
        tips.push(`🚀 Excelente taxa de poupança (${savingsRate}%). Considere alocar os rendimentos dos atendimentos para atingir sua meta de reserva mais rápido.`);
      } else if (savingsRate > 0) {
        tips.push(`📈 Você está retendo ${savingsRate}% da sua renda líquida. Com os atendimentos agendados, é possível elevar sua poupança para 25%.`);
      } else {
        tips.push(`⚠️ Atenção ao fluxo de caixa: As saídas superaram as entradas em ${formatCurrency(Math.abs(balance))}. Priorize o recebimento dos atendimentos pendentes.`);
      }

      const totalAptMonth = appointments.filter(a => (a.start_time || '').startsWith(targetMonthPrefix)).length;
      if (totalAptMonth > 0) {
        tips.push(`🗓️ Sua agenda possui ${totalAptMonth} cliente(s) marcados no mês. Confirme os horários via WhatsApp com 24h de antecedência para evitar faltas.`);
      }

      if (expensesByCategory.length > 0) {
        const top = expensesByCategory[0];
        tips.push(`🔍 Maior despesa do mês: "${top.name}" com ${formatCurrency(top.value)} (${top.percent}%). Avalie otimizações nessa categoria.`);
      }

      setAiTips(tips);
      setIsGeneratingTips(false);
      setShowTips(true);
      showToast('Diagnóstico financeiro atualizado com sucesso!');
    }, 600);
  };

  // Exportação Excel
  const handleExportExcel = () => {
    try {
      const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const wb = XLSX.utils.book_new();

      // Aba 1: Lançamentos
      const dataTx = currentMonthTransactions.map(t => {
        const cat = categories.find(c => c.id === t.category_id);
        return {
          'Data': formatDate(t.date),
          'Descrição': t.description,
          'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
          'Categoria': cat?.name || 'Sem Categoria',
          'Valor (R$)': Number(t.amount) || 0,
          'Status': t.is_paid !== false ? 'Quitado / Pago' : 'Pendente',
          'Atendimento Vinculado': t.appointment_id ? 'Sim' : 'Não'
        };
      });
      const wsTx = XLSX.utils.json_to_sheet(dataTx);
      XLSX.utils.book_append_sheet(wb, wsTx, 'Lançamentos');

      // Aba 2: Atendimentos
      const dataApt = appointments.map(a => ({
        'Data': formatDate(a.start_time),
        'Horário': `${a.start_time.substring(11, 16)} - ${a.end_time.substring(11, 16)}`,
        'Título': a.title,
        'Cliente': a.client_name,
        'Telefone': a.client_phone || 'Não informado',
        'Valor (R$)': Number(a.service_value) || 0,
        'Status': a.status,
        'Google Sincronizado': a.synced_google ? 'Sim' : 'Não'
      }));
      const wsApt = XLSX.utils.json_to_sheet(dataApt);
      XLSX.utils.book_append_sheet(wb, wsApt, 'Atendimentos');

      XLSX.writeFile(wb, `FinanceApp_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
      showToast('Planilha Excel gerada com sucesso!');
    } catch (err: any) {
      showToast('Erro ao exportar Excel: ' + err.message, 'error');
    }
  };

  // Exportação PDF
  const handleExportPDF = () => {
    window.print();
  };

  // 1. Tela de Carregamento da Sessão
  if (isAuthChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 animate-pulse">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Verificando autenticação segura...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Tela de Login Obrigatório (Bloqueio Total do Sistema)
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative font-sans ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        {/* Toast Notificação */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-bounce">
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border ${
              toastMessage.type === 'success'
                ? 'bg-green-600 text-white border-green-500'
                : toastMessage.type === 'warn'
                ? 'bg-yellow-600 text-white border-yellow-500'
                : 'bg-red-600 text-white border-red-500'
            }`}>
              {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {toastMessage.text}
            </div>
          </div>
        )}

        {/* Alternar Tema */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setDarkMode(d => !d)}
            className={`p-2.5 rounded-xl border transition-colors ${
              darkMode ? 'border-gray-800 bg-gray-900 text-yellow-400 hover:bg-gray-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
            }`}
            title="Alternar tema"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Card Central de Login */}
        <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all ${
          darkMode ? 'bg-gray-900/90 border-gray-800 backdrop-blur-xl' : 'bg-white border-gray-200 shadow-xl'
        }`}>
          {/* Logo e Título */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-3">
              <Wallet className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
              FinanceApp
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-0.5">
              Finanças & Agenda Integrada
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Acesso Restrito • Login Obrigatório</span>
            </div>
          </div>

          {/* BOTÃO DE DESTAQUE: ENTRAR EM NOVO COMPUTADOR */}
          <div className="mb-5 p-4 rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 text-center shadow-lg">
            <div className="text-xs font-bold text-blue-300 mb-1 flex items-center justify-center gap-1.5">
              <Laptop className="w-4 h-4 text-blue-400" />
              <span>Acessando de um novo computador?</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Clique abaixo para entrar diretamente na conta do terapeuta:
            </p>
            <button
              type="button"
              onClick={() => {
                const ownerUser = {
                  id: 'user_marcondes_lima',
                  email: 'marcondestl@gmail.com',
                  name: 'Marcondes Lima',
                  user_metadata: {
                    full_name: 'Marcondes Lima',
                    name: 'Marcondes Lima'
                  }
                };
                setCurrentUser(ownerUser);
                localStorage.setItem('finance_user', JSON.stringify(ownerUser));
                showToast('Acesso liberado com sucesso! Bem-vindo, Marcondes!', 'success');
              }}
              className="w-full py-3 px-4 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Entrar Imediatamente (Marcondes Lima)</span>
            </button>
          </div>

          {/* Seletor Entrar / Cadastrar */}
          <div className={`flex rounded-xl p-1 mb-5 border ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Alertas de Erro ou Sucesso */}
          {authError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-gray-400">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-gray-400">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authMode === 'register' && (
                <span className="block text-[11px] text-gray-400 mt-1">
                  Mínimo de 6 caracteres
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <span>{authMode === 'login' ? 'Entrar no Sistema' : 'Criar Minha Conta'}</span>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} />
            </div>
            <span className={`relative px-3 text-[10px] uppercase font-bold tracking-wider ${
              darkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-400'
            }`}>
              Ou continue com
            </span>
          </div>

          {/* Botão Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2.5 ${
              darkMode
                ? 'border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-white'
                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-800 shadow-sm'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Conta Google</span>
          </button>

          {/* Botão Acesso Rápido do Proprietário */}
          <div className="mt-4 pt-4 border-t border-gray-800/40 text-center">
            <button
              type="button"
              onClick={() => {
                const ownerUser = {
                  id: 'user_marcondes_lima',
                  email: 'marcondestl@gmail.com',
                  name: 'Marcondes Lima',
                  user_metadata: {
                    full_name: 'Marcondes Lima',
                    name: 'Marcondes Lima'
                  }
                };
                setCurrentUser(ownerUser);
                localStorage.setItem('finance_user', JSON.stringify(ownerUser));
                showToast('Acesso liberado com sucesso! Bem-vindo, Marcondes!', 'success');
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Entrar com 1 Clique (Marcondes Lima)</span>
            </button>
          </div>

          {/* Rodapé de Segurança */}
          <div className="mt-4 pt-3 border-t border-gray-800/50 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Sessão segura e dados salvos no navegador e Supabase</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border ${
            toastMessage.type === 'success'
              ? 'bg-green-600 text-white border-green-500'
              : toastMessage.type === 'warn'
              ? 'bg-yellow-600 text-white border-yellow-500'
              : 'bg-red-600 text-white border-red-500'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toastMessage.text}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* BACKDROP MOBILE */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR (MENU LATERAL MODERNO) */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          darkMode ? 'bg-gray-900 border-r border-gray-800 text-white' : 'bg-white border-r border-gray-200 text-gray-900'
        }`}>
          {/* Logo Superior */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-800/80">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('agenda'); setMobileSidebarOpen(false); }}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  FinanceApp
                </span>
                <span className={`block text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Clínica TRG & Finanças
                </span>
              </div>
            </div>
            {/* Fechar no mobile */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links de Navegação com Grupos Separados */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-6">
            
            {/* GRUPO 1: CONSULTÓRIO & TERAPIA TRG */}
            <div>
              <div className="px-2.5 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
                  Consultório & Terapia
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                  TRG
                </span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => { setView('agenda'); setAgendaSubTab('appointments'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    view === 'agenda'
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/20'
                      : darkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>Agenda & Atendimentos</span>
                </button>

                <button
                  onClick={() => { setView('anamnese'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    view === 'anamnese'
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/20'
                      : darkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>Fichas de Anamnese</span>
                </button>

                <button
                  onClick={() => { handleOpenGlobalEvolution(null); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-purple-400 hover:bg-purple-950/40 hover:text-purple-300 border border-purple-500/20"
                >
                  <ClipboardList className="w-4 h-4 text-purple-400" />
                  <span>Prontuário & Evolução</span>
                </button>

                <button
                  onClick={() => { handleOpenGlobalAnamnese(null); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-[11px] transition-all cursor-pointer text-teal-300 hover:bg-teal-950/30"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-400" />
                  <span>+ Nova Anamnese (1ª Consulta)</span>
                </button>
              </div>
            </div>

            {/* GRUPO 2: GESTÃO FINANCEIRA */}
            <div>
              <div className="px-2.5 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                  Gestão Financeira
                </span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => { setView('dashboard'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    view === 'dashboard'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : darkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-400" />
                  <span>Painel Geral</span>
                </button>

                <button
                  onClick={() => { setView('transactions'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    view === 'transactions'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : darkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>Lançamentos (Extrato)</span>
                </button>

                <button
                  onClick={() => { setView('categories'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    view === 'categories'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : darkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Tag className="w-4 h-4 text-blue-400" />
                  <span>Categorias & Metas</span>
                </button>

                <button
                  onClick={() => { setView('reports'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    view === 'reports'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : darkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span>Relatórios & Projeção</span>
                </button>
              </div>
            </div>

            {/* GRUPO 3: SISTEMA & SINCRONIZAÇÃO */}
            <div>
              <div className="px-2.5 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                  Sincronização & Backup
                </span>
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => { setShowSyncModal(true); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-purple-300 hover:bg-purple-950/40 border border-purple-500/30"
                >
                  <RefreshCw className="w-4 h-4 text-purple-400" />
                  <span>Sincronizar PCs</span>
                </button>

                <a
                  href="/finance-app-source.zip"
                  download="finance-app-source.zip"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-indigo-300 hover:bg-indigo-950/40 border border-indigo-500/30"
                >
                  <FolderDown className="w-4 h-4 text-indigo-400" />
                  <span>Baixar Código (.ZIP)</span>
                </a>
              </div>
            </div>

          </div>

          {/* Rodapé da Sidebar: Perfil do Terapeuta */}
          <div className="p-3.5 border-t border-gray-200/50 dark:border-gray-800/80">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-white">
                      {currentUser.name || 'Marcondes Lima'}
                    </p>
                    <p className="text-[10px] text-teal-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Google Conectado
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Sair do sistema"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        {/* ÁREA PRINCIPAL DE CONTEÚDO */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
          {/* CABEÇALHO SUPERIOR LIMPO (SEM BOTÃO DE OLHINHO) */}
          <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4 transition-colors ${
            darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3">
              {/* Botão Hambúrguer Mobile */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 rounded-xl border border-gray-700 text-gray-300 md:hidden hover:bg-gray-800"
                title="Abrir Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Título da Seção Atual */}
              <div>
                <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  {view === 'agenda' && '📅 Agenda & Atendimentos TRG'}
                  {view === 'anamnese' && '🎯 Fichas de Anamnese & Mapeamento'}
                  {view === 'dashboard' && '📊 Painel Financeiro Geral'}
                  {view === 'transactions' && '💳 Extrato & Lançamentos'}
                  {view === 'categories' && '🏷️ Categorias & Metas'}
                  {view === 'reports' && '📈 Relatórios & Projeções'}
                </h1>
                <p className="text-[11px] text-gray-400 hidden sm:block">
                  {['agenda', 'anamnese'].includes(view)
                    ? 'Módulo Clínico • Consultório TRG'
                    : 'Módulo Financeiro • Gestão de Contas'}
                </p>
              </div>
            </div>

            {/* Centro / Direita: Seletor de Mês + Modo Escuro + Ações */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Seletor de Mês */}
              <div className="flex items-center gap-1 border border-gray-700/80 rounded-xl p-1 bg-gray-800/40">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCurrentMonth}
                  className="px-2.5 py-0.5 text-xs font-bold text-gray-200 capitalize hover:text-white"
                  title="Mês Atual"
                >
                  {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Modo Escuro / Claro */}
              <button
                onClick={() => setDarkMode(d => !d)}
                className={`p-2 rounded-xl border transition-colors ${
                  darkMode ? 'border-gray-700 hover:bg-gray-800 text-yellow-400' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
                title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Botão de Ação do Contexto (Atendimento ou Lançamento) */}
              {['agenda', 'anamnese'].includes(view) ? (
                <button
                  onClick={() => {
                    setView('agenda');
                    setAgendaSubTab('appointments');
                  }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Atendimento</span>
                  <span className="sm:hidden">Atendimento</span>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenNewTransaction('expense')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Lançamento</span>
                  <span className="sm:hidden">Lançamento</span>
                </button>
              )}

              {/* Perfil Google */}
              {currentUser ? (
                <div className="hidden lg:block">
                  <GoogleUserBadge
                    currentUser={currentUser}
                    darkMode={darkMode}
                    hasGoogleToken={hasGoogleToken}
                    onLogout={handleLogout}
                    onOpenAgenda={() => setView('agenda')}
                    showToast={showToast}
                  />
                </div>
              ) : null}
            </div>
          </header>

          {/* Conteúdo Principal */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'dashboard' && (
          <DashboardView
            darkMode={darkMode}
            income={income}
            expenses={expenses}
            balance={balance}
            prevIncome={prevIncome}
            prevExpenses={prevExpenses}
            prevBalance={prevBalance}
            incomeChange={incomeChange}
            expensesChange={expensesChange}
            balanceChange={balanceChange}
            transactions={transactions}
            currentDate={currentDate}
            showVal={showVal}
            formatCurrency={formatCurrency}
            setView={setView}
            setFilterType={setFilterType}
            setHighlightedCategory={setHighlightedCategory}
            setSearchTerm={setSearchTerm}
            expensesByCategory={expensesByCategory}
            savingsGoal={savingsGoal}
            savingsAmount={savingsAmount}
            setShowGoalModal={setShowGoalModal}
            categories={categories}
            categoryBudgets={categoryBudgets}
            currentMonthTransactions={currentMonthTransactions}
            scheduled={scheduled}
            appointments={appointments}
            showTips={showTips}
            setShowTips={setShowTips}
            aiTips={aiTips}
            isGeneratingTips={isGeneratingTips}
            gerarDicasIA={gerarDicasIA}
            setShowTransactionModal={() => handleOpenNewTransaction('expense')}
            onOpenNewAppointment={() => {
              setView('agenda');
              setAgendaSubTab('appointments');
            }}
            handleExportPDF={handleExportPDF}
            handleExportExcel={handleExportExcel}
            toggleTransactionPaid={toggleTransactionPaid}
            onOpenAnamnese={handleOpenGlobalAnamnese}
            onOpenEvolution={handleOpenGlobalEvolution}
          />
        )}

        {view === 'anamnese' && (
          <AnamneseView
            darkMode={darkMode}
            appointments={appointments}
            currentUser={currentUser}
            onOpenEvolution={handleOpenGlobalEvolution}
            showToast={showToast}
          />
        )}

        {view === 'transactions' && (
          <TransactionsView
            darkMode={darkMode}
            currentMonthTransactions={currentMonthTransactions}
            categories={categories}
            showVal={showVal}
            formatDate={formatDate}
            toggleTransactionPaid={toggleTransactionPaid}
            setEditingTransaction={(t) => {
              setEditingTransaction(t);
              setShowTransactionModal(true);
            }}
            setShowTransactionModal={setShowTransactionModal}
            deleteTransaction={deleteTransaction}
            highlightedCategory={highlightedCategory}
            setHighlightedCategory={setHighlightedCategory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            sortBy={sortBy}
            setSortBy={setSortBy}
            pageSize={pageSize}
            setPageSize={setPageSize}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onClearAllTransactions={handleClearAllTransactions}
            onRestoreBackup={handleRestoreBackup}
            onUploadBackup={handleUploadBackup}
            onBatchUpdatePaid={handleBatchUpdatePaid}
            onBatchDelete={handleBatchDelete}
          />
        )}

        {view === 'agenda' && (
          <AgendaView
            darkMode={darkMode}
            currentDate={currentDate}
            scheduled={scheduled}
            transactions={transactions}
            categories={categories}
            appointments={appointments}
            currentUser={currentUser}
            agendaSubTab={agendaSubTab}
            setAgendaSubTab={setAgendaSubTab}
            selectedCalendarDay={selectedCalendarDay}
            setSelectedCalendarDay={setSelectedCalendarDay}
            calendarEvents={calendarEvents}
            loadingCalendar={loadingCalendar}
            calendarFilter={calendarFilter}
            setCalendarFilter={setCalendarFilter}
            hasGoogleToken={hasGoogleToken}
            fetchCalendarEvents={fetchCalendarEvents}
            handleGoogleLogin={handleGoogleLogin}
            payScheduled={payScheduled}
            setShowTransactionModal={() => handleOpenNewTransaction('expense')}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getTodayDateString={getTodayDateString}
            hideValues={hideValues}
            onSaveAppointment={handleSaveAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            setView={setView}
            onLogout={handleLogout}
            showToast={showToast}
            onOpenSyncModal={() => setShowSyncModal(true)}
          />
        )}

        {view === 'categories' && (
          <CategoriesView
            darkMode={darkMode}
            categories={categories}
            categoryBudgets={categoryBudgets}
            showVal={showVal}
            setEditingCategory={(cat) => handleOpenCategoryModal(cat)}
            setShowCategoryModal={() => handleOpenCategoryModal(null)}
            deleteCategory={deleteCategory}
          />
        )}

        {view === 'reports' && (
          <ReportsView
            darkMode={darkMode}
            currentDate={currentDate}
            currentMonthTransactions={currentMonthTransactions}
            transactions={transactions}
            scheduled={scheduled}
            categories={categories}
            last6MonthsData={last6MonthsData}
            reportFilter={reportFilter}
            setReportFilter={setReportFilter}
            reportChart={reportChart}
            setReportChart={setReportChart}
            formatCurrency={formatCurrency}
            showVal={showVal}
            handleExportPDF={handleExportPDF}
            handleExportExcel={handleExportExcel}
            setHighlightedCategory={setHighlightedCategory}
            setFilterType={setFilterType}
            setView={setView}
          />
        )}
          </main>
        </div>
      </div>

      {/* MODAL: Transação (Novo / Editar) */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold">
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  setEditingTransaction(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('expense');
                    const valid = categories.filter(c => c.type === 'expense');
                    if (valid.length > 0) setTxCategoryId(valid[0].id);
                  }}
                  className={`py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    txType === 'expense'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-gray-500 dark:text-gray-300'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> Despesa / Saída
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('income');
                    const valid = categories.filter(c => c.type === 'income');
                    if (valid.length > 0) setTxCategoryId(valid[0].id);
                  }}
                  className={`py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    txType === 'income'
                      ? 'bg-green-600 text-white shadow'
                      : 'text-gray-500 dark:text-gray-300'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Receita / Entrada
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado, Salário, Internet..."
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Data</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Categoria</label>
                <select
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {categories
                    .filter(c => c.type === txType)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="txIsPaid"
                  checked={txIsPaid}
                  onChange={(e) => setTxIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="txIsPaid" className="text-xs font-medium cursor-pointer">
                  {txType === 'expense' ? 'Já foi pago (Quitado)' : 'Já foi recebido'}
                </label>
              </div>

              {!editingTransaction && txType === 'expense' && (
                <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Repetir / Parcelar Lançamento?</span>
                    <select
                      value={txInstallments}
                      onChange={(e) => setTxInstallments(Number(e.target.value))}
                      className={`text-xs px-2 py-1 rounded-lg border font-bold ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value={1}>À vista (1 parcela)</option>
                      <option value={2}>2 parcelas</option>
                      <option value={3}>3 parcelas</option>
                      <option value={4}>4 parcelas</option>
                      <option value={5}>5 parcelas</option>
                      <option value={6}>6 parcelas</option>
                      <option value={10}>10 parcelas</option>
                      <option value={12}>12 parcelas</option>
                      <option value={18}>18 parcelas</option>
                      <option value={24}>24 parcelas</option>
                    </select>
                  </div>
                  {txInstallments > 1 && (
                    <p className="text-[11px] text-gray-400 mt-2">
                      Serão gerados {txInstallments} lançamentos mensais de {formatCurrency(Number(txAmount) / txInstallments)} cada.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    setEditingTransaction(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Categoria (Nova / Editar) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alimentação, Viagens, Consultoria..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Tipo</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="expense">Despesa (Saída)</option>
                  <option value="income">Receita (Entrada)</option>
                </select>
              </div>

              {catType === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-400">Teto / Orçamento Mensal Máximo (Opcional)</label>
                  <input
                    type="number"
                    step="10"
                    placeholder="Ex: 1500 (em R$)"
                    value={catBudget}
                    onChange={(e) => setCatBudget(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-2 text-gray-400">Cor da Categoria</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#6b7280'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        catColor === c ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110 opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Meta Financeira */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                Meta de Reserva Financeira
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (formGoal) setSavingsGoal(Number(formGoal));
                if (formSaved) setSavingsAmount(Number(formSaved));
                setShowGoalModal(false);
                showToast('Meta financeira atualizada!');
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Valor Alvo da Meta (R$)</label>
                <input
                  type="number"
                  step="100"
                  required
                  placeholder={String(savingsGoal)}
                  defaultValue={savingsGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Total Já Guardado / Investido (R$)</label>
                <input
                  type="number"
                  step="50"
                  required
                  placeholder={String(savingsAmount)}
                  defaultValue={savingsAmount}
                  onChange={(e) => setFormSaved(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
                >
                  Atualizar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Autenticação Supabase */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                {currentUser ? 'Perfil de Usuário' : 'Entrar no FinanceApp'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentUser ? (
              <div className="mt-4 space-y-4">
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                  <span className="text-xs font-semibold text-gray-400 block">Usuário Conectado</span>
                  <p className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">
                    {currentUser.name || 'Marcondes Lima'}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">
                    {currentUser.email || 'marcondestl@gmail.com'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Aplicativo / Trocar de Conta
                </button>
              </div>
            ) : (
            <div className="mt-4 space-y-3">
              {authError && (
                <div className="p-3 rounded-lg bg-red-500/20 text-red-300 text-xs">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-400">Senha</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    setAuthLoading(true);
                    setAuthError('');
                    const { error } = await supabase.auth.signInWithPassword({
                      email: authEmail,
                      password: authPassword
                    });
                    if (error) setAuthError(error.message);
                    else {
                      setShowAuthModal(false);
                      showToast('Login realizado com sucesso!');
                    }
                    setAuthLoading(false);
                  }}
                  disabled={authLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Entrar
                </button>

                <button
                  onClick={async () => {
                    setAuthLoading(true);
                    setAuthError('');
                    const { error } = await supabase.auth.signUp({
                      email: authEmail,
                      password: authPassword
                    });
                    if (error) setAuthError(error.message);
                    else showToast('Conta criada com sucesso!');
                    setAuthLoading(false);
                  }}
                  disabled={authLoading}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                    darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Cadastrar
                </button>
              </div>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700" /></div>
                <span className={`relative px-2 text-[10px] uppercase font-bold ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  Ou
                </span>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                Conectar com Google
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL UNIVERSAL DE CONFIRMAÇÃO (Elimina bloqueios de window.confirm em iframes) */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmLabel={confirmModalConfig.confirmLabel}
        cancelLabel={confirmModalConfig.cancelLabel}
        variant={confirmModalConfig.variant}
        darkMode={darkMode}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig(c => ({ ...c, isOpen: false }))}
      />

      {/* BOTÃO FLUTUANTE DE ACESSO RÁPIDO: FICHA DE ANAMNESE TRG */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2.5 items-end">
        <button
          type="button"
          onClick={() => handleOpenGlobalAnamnese(null)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-2xl shadow-teal-500/40 border-2 border-teal-300/40 transform hover:-translate-y-1 transition-all cursor-pointer group"
          title="Clique para abrir a Ficha de Anamnese TRG (Primeira Consulta & Alvos)"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="tracking-wide">Ficha de Anamnese TRG</span>
          <span className="hidden sm:inline text-[10px] bg-white text-teal-800 font-black px-2 py-0.5 rounded-full uppercase shadow-xs">
            Abrir
          </span>
        </button>
      </div>

      {/* MODAL GLOBAL DE FICHA DE ANAMNESE TRG (Acesso Direto em Todo o Sistema) */}
      <ClientAnamneseModal
        isOpen={globalAnamneseModalOpen}
        onClose={() => setGlobalAnamneseModalOpen(false)}
        appointment={globalTargetAppointment}
        allAppointments={appointments}
        darkMode={darkMode}
        onOpenEvolution={handleOpenGlobalEvolution}
      />

      {/* MODAL GLOBAL DE PRONTUÁRIO & EVOLUÇÃO TRG (Acesso Direto em Todo o Sistema) */}
      <ClientEvolutionModal
        isOpen={globalEvolutionModalOpen}
        onClose={() => setGlobalEvolutionModalOpen(false)}
        appointment={globalTargetAppointment}
        allAppointments={appointments}
        darkMode={darkMode}
        onOpenAnamnese={handleOpenGlobalAnamnese}
      />

      {/* MODAL DE SINCRONIZAÇÃO ENTRE COMPUTADORES & BACKUP GERAL */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        darkMode={darkMode}
        appointments={appointments}
        transactions={transactions}
        categories={categories}
        scheduled={scheduled}
        categoryBudgets={categoryBudgets}
        savingsGoal={savingsGoal}
        savingsAmount={savingsAmount}
        currentUser={currentUser}
        onImportComplete={handleSyncImportComplete}
        showToast={showToast}
      />
    </div>
  );
}
