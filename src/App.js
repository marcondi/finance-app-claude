import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wallet, 
  Moon, 
  Sun, 
  LogOut, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Upload, 
  AlertCircle, 
  X, 
  FileText,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  Mail,
  LayoutDashboard,
  ArrowLeftRight,
  CalendarDays,
  BarChart2,
  Eye,
  EyeOff,
  Trash2,
  CreditCard,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
import AgendaView from './AgendaView';
import DashboardView from './DashboardView';
import TransactionsView from './TransactionsView';
import ReportsView from './ReportsView';
import CategoriesView from './CategoriesView';

const defaultCategories = [
  // RECEITAS
  { id: 'cat-1', name: 'Salário', color: '#10b981', type: 'income', user_id: null },
  { id: 'cat-2', name: 'Investimentos', color: '#059669', type: 'income', user_id: null },
  { id: 'cat-3', name: 'Cartão alimentação', color: '#22c55e', type: 'income', user_id: null },
  { id: 'cat-4', name: 'Férias', color: '#14b8a6', type: 'income', user_id: null },
  { id: 'cat-5', name: '13º Salário', color: '#0ea5e9', type: 'income', user_id: null },
  { id: 'cat-6', name: 'Poupança', color: '#6366f1', type: 'income', user_id: null },
  { id: 'cat-7', name: 'Freelance', color: '#84cc16', type: 'income', user_id: null },
  
  // DESPESAS
  { id: 'cat-8', name: 'Alimentação', color: '#ef4444', type: 'expense', user_id: null },
  { id: 'cat-9', name: 'Moradia', color: '#8b5cf6', type: 'expense', user_id: null },
  { id: 'cat-10', name: 'Transporte', color: '#f59e0b', type: 'expense', user_id: null },
  { id: 'cat-11', name: 'Saúde', color: '#14b8a6', type: 'expense', user_id: null },
  { id: 'cat-12', name: 'Lazer', color: '#ec4899', type: 'expense', user_id: null },
  { id: 'cat-13', name: 'Educação', color: '#3b82f6', type: 'expense', user_id: null },
  { id: 'cat-14', name: 'Cartão de Crédito', color: '#dc2626', type: 'expense', user_id: null },
  { id: 'cat-15', name: 'Internet / Telefone', color: '#0284c7', type: 'expense', user_id: null },
  { id: 'cat-16', name: 'Energia / Água', color: '#eab308', type: 'expense', user_id: null },
  { id: 'cat-17', name: 'Outros', color: '#6b7280', type: 'expense', user_id: null },
];

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getTodayDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

const formatDate = (date) => {
  if (!date) return '';
  const dateStr = String(date).split('T')[0];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function FinanceApp() {
  const [hideValues, setHideValues] = useState(() => {
    const saved = localStorage.getItem('hide_values');
    return saved === 'true';
  });

  const toggleHideValues = () => {
    setHideValues(prev => {
      const next = !prev;
      localStorage.setItem('hide_values', String(next));
      return next;
    });
  };

  const showVal = (value) => hideValues ? 'R$ •••••' : formatCurrency(value);

  // Tetos de Gastos por Categoria (Orçamento Mensal)
  const [categoryBudgets, setCategoryBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem('category_budgets');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const updateCategoryBudget = (catId, limit) => {
    setCategoryBudgets(prev => {
      const next = { ...prev };
      if (!limit || limit <= 0) {
        delete next[catId];
      } else {
        next[catId] = limit;
      }
      localStorage.setItem('category_budgets', JSON.stringify(next));
      return next;
    });
  };

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== null ? saved === 'dark' : true;
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('dashboard');
  
  // Modais e navegação
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null, isInstallmentChoice: false, onDeleteSingle: null, onDeleteAll: null });

  // Filtros de transações
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedCategory, setHighlightedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Agenda: Sub-aba e Dia Selecionado
  const [agendaSubTab, setAgendaSubTab] = useState('bills');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  // Google Calendar State
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState('week');
  const [hasGoogleToken, setHasGoogleToken] = useState(false);

  // Poupômetro e Metas
  const [savingsGoal, setSavingsGoal] = useState(() => {
    const saved = localStorage.getItem('savings_goal');
    return saved ? parseFloat(saved) : 0;
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Dicas de IA
  const [showTips, setShowTips] = useState(false);
  const [aiTips, setAiTips] = useState([]);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const shownTipIndexesRef = useRef([]);

  // Relatórios e Gráficos
  const [reportFilter, setReportFilter] = useState('expenses-category');
  const [reportChart, setReportChart] = useState('pie');
  const [sendingReport, setSendingReport] = useState(false);

  // Sistema de Toasts
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Tema Dark/Light com persistência
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f9fafb';
    }
  }, [darkMode]);

  // Sessão Supabase Auth
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setCurrentUser(session?.user || null);
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data: cats, error: catsError } = await supabase
        .from('finance_categories')
        .select('*')
        .or(`user_id.eq.${currentUser.id},user_id.is.null`);
      
      if (catsError) throw catsError;
      
      if (!cats || cats.length === 0) {
        const categoriesToInsert = defaultCategories.map(cat => ({
          id: generateId(),
          name: cat.name,
          color: cat.color,
          type: cat.type,
          user_id: currentUser.id
        }));
        
        const { data: newCats, error: insertError } = await supabase
          .from('finance_categories')
          .insert(categoriesToInsert)
          .select();
        
        if (insertError) {
          console.warn('Categorias:', insertError);
        }
        setCategories(newCats || defaultCategories);
      } else {
        setCategories(cats);
      }

      const { data: trans, error: transError } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (transError) throw transError;
      setTransactions(trans || []);

      const { data: sched, error: schedError } = await supabase
        .from('finance_scheduled')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (schedError) throw schedError;
      setScheduled(sched || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setShowUserMenu(false);
      await supabase.auth.signOut();
      setCurrentUser(null);
      setTransactions([]);
      setScheduled([]);
      setCategories([]);
      setCalendarEvents([]);
      setHasGoogleToken(false);
    } catch (error) {
      console.error('Erro ao sair:', error);
      showToast('Erro ao sair: ' + error.message, 'error');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      showToast('Erro ao autenticar com Google: ' + error.message, 'error');
    }
  };

  const fetchCalendarEvents = async (filter = calendarFilter) => {
    setLoadingCalendar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      
      if (!token) {
        setHasGoogleToken(false);
        setCalendarEvents([]);
        return;
      }

      setHasGoogleToken(true);

      const now = new Date();
      let timeMin = now.toISOString();
      let timeMax;

      if (filter === 'today') {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        timeMax = endOfDay.toISOString();
      } else if (filter === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        timeMin = tomorrow.toISOString();
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        timeMax = endOfTomorrow.toISOString();
      } else if (filter === 'week') {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 7);
        timeMax = endOfWeek.toISOString();
      } else if (filter === 'month') {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        timeMax = endOfMonth.toISOString();
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 401 || response.status === 403) {
        setHasGoogleToken(false);
        setCalendarEvents([]);
        showToast('Permissão do Google Calendar necessária. Clique em "Conectar Google Calendar" para autorizar o acesso.', 'warning');
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Não foi possível obter eventos do Google Calendar.');
      }

      const data = await response.json();
      setCalendarEvents(data.items || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      showToast('Google Calendar: ' + error.message, 'warning');
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (currentUser && agendaSubTab === 'google-calendar') {
      fetchCalendarEvents(calendarFilter);
    }
  }, [agendaSubTab, calendarFilter, currentUser]);

  // Cálculos do Mês
  const currentMonthTransactions = useMemo(() => {
    if (!currentUser) return [];
    
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const targetPrefix = `${year}-${month}`;
    
    return transactions.filter(t => {
      if (t.user_id !== currentUser.id) return false;
      const tDate = (t.date || '').split('T')[0];
      return tDate.startsWith(targetPrefix);
    });
  }, [transactions, currentUser, currentDate]);

  const income = useMemo(() => 
    currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  , [currentMonthTransactions]);

  const expenses = useMemo(() => 
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  , [currentMonthTransactions]);

  const balance = income - expenses;

  // Cálculos do Mês Anterior para Comparativo
  const previousMonthTransactions = useMemo(() => {
    if (!currentUser) return [];
    
    const prevDate = new Date(currentDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const year = prevDate.getFullYear();
    const month = String(prevDate.getMonth() + 1).padStart(2, '0');
    const targetPrefix = `${year}-${month}`;
    
    return transactions.filter(t => {
      if (t.user_id !== currentUser.id) return false;
      const tDate = (t.date || '').split('T')[0];
      return tDate.startsWith(targetPrefix);
    });
  }, [transactions, currentUser, currentDate]);

  const prevIncome = useMemo(() => 
    previousMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  , [previousMonthTransactions]);

  const prevExpenses = useMemo(() => 
    previousMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  , [previousMonthTransactions]);

  const prevBalance = prevIncome - prevExpenses;

  const calculateChange = (current, previous) => {
    if (previous === 0) {
      if (current === 0) return { percent: 0, text: '0%', direction: 'neutral' };
      return { percent: 100, text: '+100%', direction: 'up' };
    }
    const diff = ((current - previous) / previous) * 100;
    const sign = diff > 0 ? '+' : '';
    return {
      percent: diff,
      text: `${sign}${diff.toFixed(1)}%`,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
    };
  };

  const incomeChange = useMemo(() => calculateChange(income, prevIncome), [income, prevIncome]);
  const expensesChange = useMemo(() => calculateChange(expenses, prevExpenses), [expenses, prevExpenses]);
  const balanceChange = useMemo(() => calculateChange(balance, prevBalance), [balance, prevBalance]);

  const savingsAmount = useMemo(() => {
    const savingsCategory = categories.find(c => 
      c.name.toLowerCase() === 'poupança' || c.name.toLowerCase() === 'poupanca'
    );
    
    if (!savingsCategory) return 0;
    
    return currentMonthTransactions
      .filter(t => t.category_id === savingsCategory.id)
      .reduce((sum, t) => sum + (t.type === 'income' ? (Number(t.amount) || 0) : -(Number(t.amount) || 0)), 0);
  }, [currentMonthTransactions, categories]);

  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map();
    
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = categoryMap.get(t.category_id) || 0;
        categoryMap.set(t.category_id, current + (Number(t.amount) || 0));
      });

    const total = expenses;

    return Array.from(categoryMap.entries())
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c.id === categoryId);
        const percent = total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
        return {
          id: categoryId,
          name: category?.name || 'Sem categoria',
          fullName: `${category?.name || 'Sem categoria'} (${percent}%)`,
          value: amount,
          color: category?.color || '#666'
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions, categories, expenses]);

  const upcomingDueDates = useMemo(() => {
    if (!currentUser) return [];
    
    const todayStr = getTodayDateString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    const maxDateStr = getTodayDateString(fiveDaysFromNow);

    return scheduled.filter(s => {
      if (s.user_id !== currentUser.id || s.is_paid) return false;
      const sDateStr = (s.due_date || '').split('T')[0];
      return sDateStr >= todayStr && sDateStr <= maxDateStr;
    });
  }, [scheduled, currentUser]);

  const last6MonthsData = useMemo(() => {
    if (!currentUser) return [];
    const base = currentDate ? new Date(currentDate) : new Date();
    const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;
      const label = `${monthsPt[d.getMonth()]}/${String(year).slice(2)}`;

      const monthTx = transactions.filter(t => {
        const tDate = String(t.date || '').split('T')[0];
        return t.user_id === currentUser.id && tDate.startsWith(prefix);
      });

      const inc = monthTx
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const exp = monthTx
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

      return {
        label,
        income: inc,
        expenses: exp,
        balance: inc - exp,
        Entradas: inc,
        Saidas: exp,
        'Saídas': exp,
        Saldo: inc - exp
      };
    });
  }, [transactions, currentUser, currentDate]);

  const gerarDicasIA = async () => {
    setIsGeneratingTips(true);
    setAiTips([]);

    await new Promise(r => setTimeout(r, 600));

    const inc = income;
    const exp = expenses;
    const saldo = inc - exp;
    const pct = (v) => inc > 0 ? ((v / inc) * 100).toFixed(0) : 0;
    const top1 = expensesByCategory[0];
    const top2 = expensesByCategory[1];

    const pool = [
      exp > inc
        ? `⚠️ Atenção: suas saídas (${formatCurrency(exp)}) superam as entradas (${formatCurrency(inc)}) em ${formatCurrency(exp - inc)}. Revise os maiores gastos antes do fim do mês.`
        : `✅ Parabéns! Você está com saldo positivo em ${formatCurrency(saldo)} (${pct(saldo)}% da renda). Continue mantendo o foco.`,

      inc > 0
        ? `📈 Sua taxa de poupança este mês é de ${pct(saldo)}%. O recomendado por especialistas é manter acima de 20% para construir reservas sólidas.`
        : `💡 Registre todas as suas entradas para calcular com precisão sua taxa de poupança mensal.`,

      `🎯 Meta de reserva de emergência: acumule ${formatCurrency(inc * 6)} (6 meses de renda). Reserve ${formatCurrency(inc * 0.1)} ao mês para atingir esse objetivo com segurança.`,

      top1
        ? `📊 Seu maior gasto este mês é "${top1.name}" somando ${formatCurrency(top1.value)} (${pct(top1.value)}% da sua renda). Avalie oportunidades de economia nessa categoria.`
        : `📂 Categorize todos os seus gastos para identificar facilmente onde é possível economizar.`,

      top2
        ? `🔍 Seu segundo maior gasto é "${top2.name}" com ${formatCurrency(top2.value)}. Manter essa categoria controlada protege seu orçamento.`
        : `🏷️ Crie categorias detalhadas para seus gastos fixos e variáveis para acompanhar a evolução.`,

      expensesByCategory.length >= 3
        ? `💡 Suas 3 maiores despesas somam ${formatCurrency(expensesByCategory.slice(0, 3).reduce((s, c) => s + c.value, 0))} (${pct(expensesByCategory.slice(0, 3).reduce((s, c) => s + c.value, 0))}% da renda). Ajustes nelas geram o maior impacto financeiro.`
        : `📋 Quanto mais detalhadas suas categorias, mais rápida é a identificação de gastos supérfluos.`,

      `💳 A regra 50/30/20 recomenda: 50% para necessidades básicas (${formatCurrency(inc * 0.5)}), 30% para desejos (${formatCurrency(inc * 0.3)}) e 20% para poupança/investimentos (${formatCurrency(inc * 0.2)}).`,

      `⏱️ Pagamentos no dia do vencimento eliminam juros e multas desnecessárias. Use a aba "Agenda" para nunca perder um prazo.`,

      `🏦 Pratique o "pague-se primeiro": assim que o salário entrar, separe ao menos ${formatCurrency(inc * 0.1)} diretamente na poupança antes de iniciar os gastos do mês.`,

      `💳 Se usa cartão de crédito, liquide sempre o valor integral da fatura para evitar juros rotativos elevados.`,

      `🚀 Com saldo positivo de ${formatCurrency(Math.max(saldo, 0))}, avalie aplicações de renda fixa com liquidez diária como Tesouro Selic ou CDBs a 100% do CDI.`
    ];

    categories.filter(c => c.type === 'expense').forEach(cat => {
      const limit = categoryBudgets[cat.id];
      if (limit && limit > 0) {
        const spent = currentMonthTransactions
          .filter(t => t.category_id === cat.id && t.type === 'expense')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const pctBudget = ((spent / limit) * 100).toFixed(0);

        if (spent > limit) {
          pool.push(`🚨 Alerta de Orçamento: A categoria "${cat.name}" ultrapassou o teto mensal em ${formatCurrency(spent - limit)} (${pctBudget}% do limite de ${formatCurrency(limit)}).`);
        } else if (spent >= limit * 0.8) {
          pool.push(`⚠️ Atenção ao Teto: Você já consumiu ${pctBudget}% do orçamento mensal de "${cat.name}" (${formatCurrency(spent)} de ${formatCurrency(limit)}).`);
        }
      }
    });

    const prev = shownTipIndexesRef.current;
    const available = pool.map((_, i) => i).filter(i => !prev.includes(i));
    const source = available.length >= 3 ? available : pool.map((_, i) => i);

    const chosen = [];
    const temp = [...source];
    while (chosen.length < 3 && temp.length > 0) {
      const ri = Math.floor(Math.random() * temp.length);
      chosen.push(temp.splice(ri, 1)[0]);
    }

    shownTipIndexesRef.current = chosen;
    setAiTips(chosen.map(i => pool[i]));
    setIsGeneratingTips(false);
  };

  const handleSendMonthlyReport = async () => {
    if (sendingReport) return;
    setSendingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const month = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();

      const txList = currentMonthTransactions.map(t => {
        const cat = categories.find(c => c.id === t.category_id);
        return {
          date: formatDate(t.date),
          description: t.description,
          category: cat?.name || '-',
          amount: Number(t.amount) || 0,
          type: t.type
        };
      });

      const res = await fetch(`${supabaseUrl}/functions/v1/send-monthly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          to: currentUser.email,
          userName: currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
          month,
          year,
          income,
          expenses,
          balance,
          transactions: txList,
        }),
      });

      if (res.ok) {
        showToast(`✅ Relatório enviado com sucesso para ${currentUser.email}!`, 'success');
      } else {
        showToast('ℹ️ Relatório processado. Verifique sua caixa de entrada.', 'success');
      }
    } catch (err) {
      console.error('Erro no envio:', err);
      showToast('Relatório gerado! ' + err.message, 'success');
    } finally {
      setSendingReport(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const periodo = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório Financeiro - ${periodo}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1f2937; }
            h1 { text-align: center; color: #2563eb; margin-bottom: 5px; }
            .periodo { text-align: center; color: #6b7280; margin-bottom: 25px; font-size: 16px; }
            .cards { display: flex; gap: 15px; margin-bottom: 30px; }
            .card { flex: 1; padding: 15px; border-radius: 10px; border: 1px solid #e5e7eb; }
            .card-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #6b7280; }
            .card-val { font-size: 20px; font-weight: bold; margin-top: 5px; }
            .income { color: #16a34a; }
            .expense { color: #dc2626; }
            .balance { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; color: #374151; padding: 10px; text-align: left; font-size: 13px; border-bottom: 2px solid #e5e7eb; }
            td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
            tr:nth-child(even) { background: #fafafa; }
            .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; color: #fff; }
          </style>
        </head>
        <body>
          <h1>FinanceApp - Relatório Mensal</h1>
          <p class="periodo">Período: ${periodo}</p>
          
          <div class="cards">
            <div class="card"><div class="card-title">Entradas</div><div class="card-val income">${formatCurrency(income)}</div></div>
            <div class="card"><div class="card-title">Saídas</div><div class="card-val expense">${formatCurrency(expenses)}</div></div>
            <div class="card"><div class="card-title">Saldo</div><div class="card-val balance">${formatCurrency(balance)}</div></div>
          </div>
          
          <h2>Lançamentos do Mês</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${currentMonthTransactions.map(t => {
                const cat = categories.find(c => c.id === t.category_id);
                return `
                  <tr>
                    <td>${formatDate(t.date)}</td>
                    <td>${t.description}</td>
                    <td><span class="tag" style="background:${cat?.color || '#6b7280'};">${cat?.name || 'Geral'}</span></td>
                    <td class="${t.type === 'income' ? 'income' : 'expense'}" style="font-weight: 600;">
                      ${t.type === 'income' ? 'Receita' : 'Despesa'}
                    </td>
                    <td style="text-align: right; font-weight: bold;" class="${t.type === 'income' ? 'income' : 'expense'}">
                      ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
      showToast('Janela de impressão aberta. Selecione "Salvar como PDF".', 'success');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      showToast('Erro ao exportar PDF: ' + error.message, 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      const periodo = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      const wsResumo = XLSX.utils.aoa_to_sheet([
        ['RELATÓRIO FINANCEIRO - FINANCEAPP'],
        [`Período: ${periodo}`],
        [],
        ['TIPO', 'VALOR'],
        ['Entradas', income],
        ['Saídas', expenses],
        ['Saldo', balance]
      ]);
      
      const transData = currentMonthTransactions.map(t => {
        const cat = categories.find(c => c.id === t.category_id);
        return {
          'Data': formatDate(t.date),
          'Descrição': t.description,
          'Categoria': cat?.name || '-',
          'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
          'Valor (R$)': Number(t.amount) || 0
        };
      });
      const wsTrans = XLSX.utils.json_to_sheet(transData);
      
      const catData = expensesByCategory.map(cat => ({
        'Categoria': cat.name,
        'Tipo': 'Despesa',
        'Total Gasto (R$)': cat.value
      }));
      const wsCats = XLSX.utils.json_to_sheet(catData);
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      XLSX.utils.book_append_sheet(wb, wsTrans, 'Transações');
      XLSX.utils.book_append_sheet(wb, wsCats, 'Categorias');
      
      const fileName = `relatorio-financeiro-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showToast('Planilha Excel exportada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      showToast('Erro ao exportar Excel: ' + error.message, 'error');
    }
  };

  const handleExport = async () => {
    try {
      if (!currentUser) return;

      const userRelatedData = {
        user: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.user_metadata?.name || 'Usuário'
        },
        categories: categories.filter(c => c.user_id === currentUser.id || !c.user_id),
        transactions: transactions.filter(t => t.user_id === currentUser.id),
        scheduled: scheduled.filter(s => s.user_id === currentUser.id),
        categoryBudgets,
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(userRelatedData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-backup-${getTodayDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Backup JSON criado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      showToast('Erro ao criar backup: ' + error.message, 'error');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result);
        
        const defaultColors = [
          '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', 
          '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
        ];
        
        const processedCategories = (imported.categories || []).map((cat, index) => ({
          id: cat.id || generateId(),
          name: cat.name,
          color: cat.color || defaultColors[index % defaultColors.length],
          type: cat.type,
          user_id: currentUser.id
        }));
        
        const processedTransactions = (imported.transactions || []).map(t => ({
          id: generateId(),
          user_id: currentUser.id,
          type: t.type,
          amount: parseFloat(t.amount),
          description: t.description,
          category_id: t.category || t.categoryId || t.category_id,
          date: String(t.date).split('T')[0],
          is_recurring: t.isRecurring || t.is_recurring || false,
          recurring_months: t.recurringMonths || t.recurring_months || null,
          parent_id: t.parentId || t.parent_id || null
        }));
        
        const existingCategoryNames = categories.map(c => c.name.toLowerCase());
        const newCategories = processedCategories.filter(
          cat => !existingCategoryNames.includes(cat.name.toLowerCase())
        );
        
        if (newCategories.length > 0) {
          const { data: insertedCats, error: catsError } = await supabase
            .from('finance_categories')
            .insert(newCategories)
            .select();
          
          if (catsError) throw catsError;
          setCategories(prev => [...prev, ...insertedCats]);
        }
        
        if (processedTransactions.length > 0) {
          const { data: insertedTrans, error: transError } = await supabase
            .from('finance_transactions')
            .insert(processedTransactions)
            .select();
          
          if (transError) throw transError;
          setTransactions(prev => [...prev, ...insertedTrans]);
        }
        
        if (imported.scheduled && imported.scheduled.length > 0) {
          const processedScheduled = imported.scheduled.map(s => ({
            id: generateId(),
            user_id: currentUser.id,
            amount: parseFloat(s.amount),
            description: s.description,
            category_id: s.category || s.categoryId || s.category_id,
            due_date: String(s.dueDate || s.due_date).split('T')[0],
            is_paid: s.isPaid || s.is_paid || false
          }));
          
          const { data: insertedSched, error: schedError } = await supabase
            .from('finance_scheduled')
            .insert(processedScheduled)
            .select();
          
          if (schedError) throw schedError;
          setScheduled(prev => [...prev, ...insertedSched]);
        }

        if (imported.categoryBudgets) {
          setCategoryBudgets(imported.categoryBudgets);
          localStorage.setItem('category_budgets', JSON.stringify(imported.categoryBudgets));
        }

        showToast(`✅ Importação concluída com sucesso!`, 'success');
        await loadUserData();
      } catch (error) {
        console.error('Erro na importação:', error);
        showToast('Erro ao importar dados: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const deleteTransaction = (itemOrId) => {
    const item = typeof itemOrId === 'object' ? itemOrId : transactions.find(t => t.id === itemOrId);
    if (!item) return;

    // Verificar se faz parte de um grupo de parcelas
    const siblings = transactions.filter(t => 
      t.id !== item.id && (
        (item.parent_id && t.parent_id === item.parent_id) ||
        (t.parent_id === item.id) ||
        (item.parent_id && t.id === item.parent_id)
      )
    );

    if (siblings.length > 0) {
      setConfirmModal({
        open: true,
        isInstallmentChoice: true,
        message: `Este lançamento faz parte de uma compra em ${siblings.length + 1} parcelas. Como deseja proceder?`,
        onDeleteSingle: async () => {
          setConfirmModal({ open: false, message: '', onConfirm: null, isInstallmentChoice: false, onDeleteSingle: null, onDeleteAll: null });
          try {
            const { error } = await supabase
              .from('finance_transactions')
              .delete()
              .eq('id', item.id);
            
            if (error) throw error;
            setTransactions(prev => prev.filter(t => t.id !== item.id));
            showToast('Parcela excluída com sucesso.', 'success');
          } catch (error) {
            console.error('Erro ao excluir parcela:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
          }
        },
        onDeleteAll: async () => {
          setConfirmModal({ open: false, message: '', onConfirm: null, isInstallmentChoice: false, onDeleteSingle: null, onDeleteAll: null });
          try {
            const allIds = [item.id, ...siblings.map(s => s.id)];
            const { error } = await supabase
              .from('finance_transactions')
              .delete()
              .in('id', allIds);
            
            if (error) throw error;
            setTransactions(prev => prev.filter(t => !allIds.includes(t.id)));
            showToast(`Todas as ${allIds.length} parcelas foram excluídas com sucesso!`, 'success');
          } catch (error) {
            console.error('Erro ao excluir parcelas:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
          }
        }
      });
    } else {
      setConfirmModal({
        open: true,
        isInstallmentChoice: false,
        message: 'Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita.',
        onConfirm: async () => {
          setConfirmModal({ open: false, message: '', onConfirm: null, isInstallmentChoice: false, onDeleteSingle: null, onDeleteAll: null });
          try {
            const { error } = await supabase
              .from('finance_transactions')
              .delete()
              .eq('id', item.id);
            
            if (error) throw error;
            setTransactions(prev => prev.filter(t => t.id !== item.id));
            showToast('Lançamento excluído com sucesso.', 'success');
          } catch (error) {
            console.error('Erro ao excluir:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
          }
        }
      });
    }
  };

  const deleteCategory = (id) => {
    const hasTransactions = transactions.some(t => t.category_id === id);
    if (hasTransactions) {
      showToast('Não é possível excluir uma categoria que possui transações vinculadas.', 'warning');
      return;
    }

    setConfirmModal({
      open: true,
      isInstallmentChoice: false,
      message: 'Deseja realmente excluir esta categoria?',
      onConfirm: async () => {
        setConfirmModal({ open: false, message: '', onConfirm: null, isInstallmentChoice: false, onDeleteSingle: null, onDeleteAll: null });
        try {
          const { error } = await supabase
            .from('finance_categories')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          setCategories(prev => prev.filter(c => c.id !== id));
          showToast('Categoria excluída com sucesso.', 'success');
        } catch (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir: ' + error.message, 'error');
        }
      }
    });
  };

  const payScheduled = async (scheduledItem) => {
    try {
      const category = categories.find(c => c.id === scheduledItem.category_id);
      const transactionType = category?.type || 'expense';

      const newTransaction = {
        id: generateId(),
        user_id: currentUser.id,
        type: transactionType,
        amount: scheduledItem.amount,
        description: scheduledItem.description,
        category_id: scheduledItem.category_id,
        date: getTodayDateString(),
        is_recurring: false,
        recurring_months: null,
        parent_id: null
      };

      const { data: transData, error: transError } = await supabase
        .from('finance_transactions')
        .insert([newTransaction])
        .select();
      
      if (transError) throw transError;

      const { error: schedError } = await supabase
        .from('finance_scheduled')
        .update({ is_paid: true })
        .eq('id', scheduledItem.id);
      
      if (schedError) throw schedError;

      setTransactions(prev => [...prev, ...transData]);
      setScheduled(prev => prev.map(s =>
        s.id === scheduledItem.id ? { ...s, is_paid: true } : s
      ));
      showToast('Conta marcada como paga e registrada nas suas transações de hoje!', 'success');
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      showToast('Erro ao marcar como pago: ' + error.message, 'error');
    }
  };

  const toggleTransactionPaid = async (transaction) => {
    try {
      const newPaid = !transaction.is_paid;
      const { error } = await supabase
        .from('finance_transactions')
        .update({ is_paid: newPaid })
        .eq('id', transaction.id);
      if (error) throw error;
      setTransactions(transactions.map(t =>
        t.id === transaction.id ? { ...t, is_paid: newPaid } : t
      ));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showToast('Erro ao atualizar status: ' + error.message, 'error');
    }
  };

  // Tela de Autenticação
  const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loadingAuth, setLoadingAuth] = useState(false);

    const handleAuth = async (e) => {
      if (e) e.preventDefault();
      if (!email || !password) {
        showToast('Preencha e-mail e senha!', 'warning');
        return;
      }

      setLoadingAuth(true);
      try {
        if (isLogin) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });

          if (error) throw error;
          setCurrentUser(data.user);
        } else {
          if (!name.trim()) {
            showToast('Por favor, informe seu nome!', 'warning');
            setLoadingAuth(false);
            return;
          }

          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim()
              }
            }
          });

          if (error) throw error;

          if (data.user && !data.session) {
            showToast('Cadastro realizado! Verifique seu e-mail para confirmar a conta.', 'success');
            setIsLogin(true);
          } else if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (error) {
        console.error('Erro na autenticação:', error);
        showToast('Erro: ' + (error.message || 'Falha ao autenticar'), 'error');
      } finally {
        setLoadingAuth(false);
      }
    };

    const handleForgotPassword = async (e) => {
      if (e) e.preventDefault();
      if (!email.trim()) {
        showToast('Digite seu e-mail cadastrado!', 'warning');
        return;
      }

      setLoadingAuth(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });

        if (error) throw error;

        showToast('Link de recuperação enviado para seu e-mail!', 'success');
        setIsForgotPassword(false);
      } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        showToast('Erro ao recuperar senha: ' + error.message, 'error');
      } finally {
        setLoadingAuth(false);
      }
    };

    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
        <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-center mb-8">
            <Wallet className={`w-12 h-12 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className={`ml-3 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>FinanceApp</h1>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className={`text-xl font-semibold mb-6 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Recuperar Senha
              </h2>
              <p className={`text-sm text-center mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Enviaremos um link de acesso seguro para o seu e-mail.
              </p>
              <input
                type="email"
                placeholder="E-mail cadastrado"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button
                type="submit"
                disabled={loadingAuth}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loadingAuth ? 'Enviando...' : 'Enviar Link por E-mail'}
              </button>
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className={`w-full ${
                  darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
                } font-medium py-2 transition-colors`}
              >
                ← Voltar ao login
              </button>
            </form>
          ) : (
            <>
              <div className="flex mb-6 border-b border-gray-300 dark:border-gray-700">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 text-center font-medium transition-colors ${
                    isLogin
                      ? `border-b-2 ${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600'}`
                      : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 text-center font-medium transition-colors ${
                    !isLogin
                      ? `border-b-2 ${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600'}`
                      : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Cadastro
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <input
                    type="text"
                    placeholder="Seu Nome"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                )}
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <input
                  type="password"
                  placeholder="Senha (mínimo 6 caracteres)"
                  value={password}
                  required
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  type="submit"
                  disabled={loadingAuth}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {loadingAuth ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                      ou
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loadingAuth}
                  className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border font-medium transition-colors ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continuar com o Google
                </button>
                
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className={`w-full ${
                      darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                    } text-sm font-medium py-2 transition-colors`}
                  >
                    Esqueci minha senha
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    );
  };

  // Modal de Transação com 4 Botões e Gerenciador Inteligente de Tags (#Viagem, #Reforma, etc.)
  const TransactionModal = () => {
    const [type, setType] = useState('expense'); // 'expense' | 'installment' | 'income' | 'scheduled'
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState(getTodayDateString());
    
    // Tags / Marcadores
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // Configurações de Parcelamento
    const [installmentMode, setInstallmentMode] = useState('total'); // 'total' | 'per_installment'
    const [installmentCount, setInstallmentCount] = useState(3);
    
    // Repetição simples
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringMonths, setRecurringMonths] = useState('1');

    const popularTags = ['#Viagem', '#Reforma', '#Trabalho', '#Presente', '#Casa', '#Carro', '#Saúde', '#Lazer'];

    useEffect(() => {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmount(editingTransaction.amount.toString());
        
        // Extrair tags existentes da descrição
        const extracted = (editingTransaction.description || '').match(/#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g) || [];
        setSelectedTags(extracted);
        
        const cleanDesc = (editingTransaction.description || '')
          .replace(/#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g, '')
          .replace(/\s*\(\d+\/\d+\)$/, '')
          .trim();
        setDescription(cleanDesc);
        
        setCategoryId(editingTransaction.category_id);
        setDate(editingTransaction.date);
        setIsRecurring(editingTransaction.is_recurring || false);
        setRecurringMonths((editingTransaction.recurring_months || 1).toString());
      }
    }, [editingTransaction]);

    const addTag = (raw) => {
      const clean = raw.trim().replace(/^#+/, '');
      if (!clean) return;
      const formatted = `#${clean}`;
      if (!selectedTags.some(t => t.toLowerCase() === formatted.toLowerCase())) {
        setSelectedTags([...selectedTags, formatted]);
      }
      setTagInput('');
    };

    const removeTag = (tagToRemove) => {
      setSelectedTags(selectedTags.filter(t => t !== tagToRemove));
    };

    // Cálculos de resumo do parcelamento em tempo real
    const parsedAmount = parseFloat(amount.toString().replace(',', '.')) || 0;
    const installmentsNum = parseInt(installmentCount) || 1;
    const amountPerInstallment = installmentMode === 'total' 
      ? (installmentsNum > 0 ? parsedAmount / installmentsNum : 0)
      : parsedAmount;
    const totalInstallmentAmount = installmentMode === 'total' 
      ? parsedAmount 
      : parsedAmount * installmentsNum;

    const handleSubmit = async () => {
      if (!amount || !description.trim() || !categoryId) {
        showToast('Preencha todos os campos obrigatórios!', 'warning');
        return;
      }

      const numAmount = parseFloat(amount.toString().replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        showToast('Digite um valor numérico válido!', 'warning');
        return;
      }

      const tagSuffix = selectedTags.length > 0 ? ` ${selectedTags.join(' ')}` : '';
      const finalCleanDesc = description.trim();

      try {
        if (type === 'scheduled') {
          const baseScheduled = {
            user_id: currentUser.id,
            amount: numAmount,
            description: `${finalCleanDesc}${tagSuffix}`.trim(),
            category_id: categoryId,
            is_paid: false
          };
          
          const scheduledList = [];
          const months = parseInt(recurringMonths) || 1;
          
          for (let i = 0; i < months; i++) {
            const scheduledDate = new Date(date + 'T00:00:00');
            scheduledDate.setMonth(scheduledDate.getMonth() + i);
            
            scheduledList.push({
              id: generateId(),
              ...baseScheduled,
              due_date: scheduledDate.toISOString().split('T')[0]
            });
          }
          
          const { data, error } = await supabase
            .from('finance_scheduled')
            .insert(scheduledList)
            .select();
          
          if (error) throw error;
          
          setScheduled(prev => [...prev, ...data]);
          showToast('Agendamento criado com sucesso!', 'success');
        } else if (editingTransaction) {
          const updatedTx = {
            user_id: currentUser.id,
            type: type === 'installment' ? 'expense' : type,
            amount: numAmount,
            description: `${finalCleanDesc}${tagSuffix}`.trim(),
            category_id: categoryId,
            date,
            is_recurring: isRecurring,
            recurring_months: isRecurring ? parseInt(recurringMonths) : null,
            parent_id: editingTransaction.parent_id || null
          };

          const { error } = await supabase
            .from('finance_transactions')
            .update(updatedTx)
            .eq('id', editingTransaction.id);
          
          if (error) throw error;
          
          setTransactions(prev => prev.map(t =>
            t.id === editingTransaction.id ? { ...t, ...updatedTx } : t
          ));
          showToast('Lançamento atualizado com sucesso!', 'success');
        } else if (type === 'installment' && installmentsNum > 1) {
          // Geração Automática das Parcelas da Compra
          const groupId = generateId();
          const dateParts = date.split('-');
          const startYear = parseInt(dateParts[0]);
          const startMonth = parseInt(dateParts[1]) - 1;
          const startDay = parseInt(dateParts[2]);

          const transactionsToInsert = [];
          for (let i = 0; i < installmentsNum; i++) {
            const targetMonthDate = new Date(startYear, startMonth + i, 1);
            const maxDays = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
            const clampedDay = Math.min(startDay, maxDays);
            const finalDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), clampedDay);
            const finalDateStr = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}-${String(finalDate.getDate()).padStart(2, '0')}`;

            transactionsToInsert.push({
              id: generateId(),
              user_id: currentUser.id,
              type: 'expense',
              amount: parseFloat(amountPerInstallment.toFixed(2)),
              description: `${finalCleanDesc} (${i + 1}/${installmentsNum})${tagSuffix}`.trim(),
              category_id: categoryId,
              date: finalDateStr,
              is_recurring: false,
              recurring_months: installmentsNum,
              parent_id: groupId
            });
          }

          const { data, error } = await supabase
            .from('finance_transactions')
            .insert(transactionsToInsert)
            .select();
          
          if (error) throw error;
          
          setTransactions(prev => [...prev, ...data]);
          showToast(`💳 Compra em ${installmentsNum}x criada com sucesso!`, 'success');

          const transactionDate = new Date(startYear, startMonth, startDay);
          setCurrentDate(transactionDate);
          setView('transactions');
        } else {
          // Lançamento normal à vista (ou recorrente)
          const baseTransaction = {
            user_id: currentUser.id,
            type: type === 'installment' ? 'expense' : type,
            amount: numAmount,
            description: `${finalCleanDesc}${tagSuffix}`.trim(),
            category_id: categoryId,
            date,
            is_recurring: isRecurring,
            recurring_months: isRecurring ? parseInt(recurringMonths) : null,
            parent_id: null
          };

          const transactionsToInsert = [];
          const firstTransaction = {
            ...baseTransaction,
            id: generateId()
          };
          transactionsToInsert.push(firstTransaction);

          if (isRecurring && recurringMonths) {
            const months = parseInt(recurringMonths);
            for (let i = 1; i < months; i++) {
              const futureDate = new Date(date + 'T00:00:00');
              futureDate.setMonth(futureDate.getMonth() + i);
              transactionsToInsert.push({
                ...baseTransaction,
                id: generateId(),
                date: futureDate.toISOString().split('T')[0],
                parent_id: firstTransaction.id
              });
            }
          }

          const { data, error } = await supabase
            .from('finance_transactions')
            .insert(transactionsToInsert)
            .select();
          
          if (error) throw error;
          
          setTransactions(prev => [...prev, ...data]);
          showToast('Lançamento adicionado com sucesso!', 'success');
          
          const dateParts = date.split('-');
          const transactionDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          setCurrentDate(transactionDate);
          setView('dashboard');
        }

        setShowTransactionModal(false);
        setEditingTransaction(null);
        resetForm();
      } catch (error) {
        console.error('Erro ao salvar transação:', error);
        showToast('Erro ao salvar: ' + error.message, 'error');
      }
    };

    const resetForm = () => {
      setAmount('');
      setDescription('');
      setSelectedTags([]);
      setTagInput('');
      setCategoryId('');
      setDate(getTodayDateString());
      setInstallmentMode('total');
      setInstallmentCount(3);
      setIsRecurring(false);
      setRecurringMonths('1');
    };

    const availableCategories = categories.filter(c => {
      return (type === 'scheduled' || type === 'installment' || type === 'expense')
        ? c.type === 'expense'
        : c.type === 'income';
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
          <div className={`sticky top-0 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 z-10`}>
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <button onClick={() => {
                setShowTransactionModal(false);
                setEditingTransaction(null);
                resetForm();
              }}>
                <X className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>

            {!editingTransaction && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-xs text-center ${
                    type === 'expense'
                      ? 'bg-red-600 text-white shadow-md'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-650' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType('installment')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-xs text-center flex items-center justify-center gap-1 ${
                    type === 'installment'
                      ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                      : darkMode ? 'bg-gray-700 text-purple-300 hover:bg-gray-650' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  💳 Parcelado
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-xs text-center ${
                    type === 'income'
                      ? 'bg-green-600 text-white shadow-md'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-650' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setType('scheduled')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-xs text-center ${
                    type === 'scheduled'
                      ? 'bg-blue-600 text-white shadow-md'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-650' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Agenda
                </button>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Opções Avançadas quando a aba '💳 Parcelado' estiver ativa */}
            {type === 'installment' && !editingTransaction && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                darkMode ? 'bg-purple-950/20 border-purple-800/60' : 'bg-purple-50/70 border-purple-200'
              }`}>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                    1. Modo do Valor
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInstallmentMode('total')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        installmentMode === 'total'
                          ? 'bg-purple-600 text-white shadow'
                          : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      Valor Total da Compra
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallmentMode('per_installment')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        installmentMode === 'per_installment'
                          ? 'bg-purple-600 text-white shadow'
                          : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      Valor de Cada Parcela
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                    2. Número de Parcelas
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[2, 3, 4, 5, 6, 10, 12, 18, 24].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setInstallmentCount(n)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          installmentCount === n
                            ? 'bg-purple-600 text-white scale-105 shadow'
                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="2"
                    max="48"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Ou digite outra quantidade (ex: 8)..."
                  />
                </div>

                {parsedAmount > 0 && (
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-100 text-xs flex items-center gap-2 font-medium">
                    <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <div>
                      Serão criadas <strong>{installmentsNum} parcelas</strong> de <strong>{formatCurrency(amountPerInstallment)}</strong> (Total: {formatCurrency(totalInstallmentAmount)}).
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {type === 'installment' && installmentMode === 'per_installment'
                  ? 'Valor de Cada Parcela (R$)'
                  : type === 'installment' && installmentMode === 'total'
                  ? 'Valor Total da Compra (R$)'
                  : 'Valor (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 rounded-xl border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold`}
                autoFocus
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Descrição
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'installment' ? "Ex: Notebook Dell, TV Sala..." : "Ex: Passagens aéreas, Almoço..."}
                className={`w-full px-4 py-3 rounded-xl border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {/* Gerenciador de Tags & Marcadores */}
            <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-gray-750/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                🏷️ Tags & Marcadores (Opcional)
              </label>
              
              {/* Tags selecionadas */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:bg-indigo-700 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input para adicionar nova tag */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Digitar nova tag (ex: #Viagem-Chile)..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  + Tag
                </button>
              </div>

              {/* Sugestões Rápidas */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-gray-400 font-medium">Sugestões:</span>
                {popularTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-600 text-white opacity-50'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Selecione uma categoria</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {type === 'installment' ? 'Data da 1ª Parcela' : 'Data'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {type === 'expense' && !editingTransaction && (
              <>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="recurring" className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Repetir lançamento mensal fixo?
                  </label>
                </div>

                {isRecurring && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Repetir por quantos meses?
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={recurringMonths}
                      onChange={(e) => setRecurringMonths(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                )}
              </>
            )}

            {type === 'scheduled' && !editingTransaction && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Repetir por quantos meses?
                </label>
                <input
                  type="number"
                  min="1"
                  value={recurringMonths}
                  onChange={(e) => setRecurringMonths(e.target.value)}
                  placeholder="Ex: 12 para repetir por 1 ano"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              className={`w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-base ${
                type === 'installment'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {editingTransaction
                ? 'Salvar Alterações'
                : type === 'installment'
                ? `Confirmar Compra em ${installmentsNum}x`
                : 'Adicionar Lançamento'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal de Categoria
  const CategoryModal = () => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [type, setType] = useState('expense');
    const [monthlyLimit, setMonthlyLimit] = useState('');

    useEffect(() => {
      if (editingCategory) {
        setName(editingCategory.name);
        setColor(editingCategory.color);
        setType(editingCategory.type);
        const lim = categoryBudgets[editingCategory.id];
        setMonthlyLimit(lim ? lim.toString() : '');
      }
    }, [editingCategory]);

    const handleSubmit = async () => {
      if (!name.trim()) {
        showToast('Digite um nome para a categoria!', 'warning');
        return;
      }

      try {
        if (editingCategory) {
          const { error } = await supabase
            .from('finance_categories')
            .update({ name: name.trim(), color, type })
            .eq('id', editingCategory.id);
          
          if (error) throw error;
          
          setCategories(prev => prev.map(c =>
            c.id === editingCategory.id ? { ...c, name: name.trim(), color, type } : c
          ));
          const limVal = parseFloat(monthlyLimit.replace(',', '.'));
          updateCategoryBudget(editingCategory.id, !isNaN(limVal) && limVal > 0 ? limVal : null);
          showToast('Categoria atualizada!', 'success');
        } else {
          const newCategory = {
            id: generateId(),
            name: name.trim(),
            color,
            type,
            user_id: currentUser.id
          };

          const { data, error } = await supabase
            .from('finance_categories')
            .insert([newCategory])
            .select();
          
          if (error) throw error;
          
          setCategories(prev => [...prev, ...data]);
          if (data && data[0]) {
            const limVal = parseFloat(monthlyLimit.replace(',', '.'));
            updateCategoryBudget(data[0].id, !isNaN(limVal) && limVal > 0 ? limVal : null);
          }
          showToast('Categoria criada!', 'success');
        }

        setShowCategoryModal(false);
        setEditingCategory(null);
        setName('');
        setColor('#3b82f6');
        setType('expense');
        setMonthlyLimit('');
      } catch (error) {
        console.error('Erro ao salvar categoria:', error);
        showToast('Erro ao salvar categoria: ' + error.message, 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-md rounded-xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button onClick={() => {
                setShowCategoryModal(false);
                setEditingCategory(null);
              }}>
                <X className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Restaurantes"
                className={`w-full px-4 py-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {type === 'expense' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🎯 Teto Mensal de Gasto (Opcional - R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="Ex: 1500.00 (deixe em branco se não houver teto)"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  O FinanceApp avisará no Dashboard quando você atingir 80% ou estourar este limite.
                </p>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Cor
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tipo
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    type === 'expense'
                      ? 'bg-red-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Despesa
                </button>
                <button
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    type === 'income'
                      ? 'bg-green-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Receita
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {editingCategory ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
        <div className="text-xl font-semibold flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Carregando FinanceApp...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`p-4 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto border transition-all ${
              t.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                : t.type === 'warning'
                ? 'bg-yellow-50 dark:bg-yellow-950/80 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                : 'bg-green-50 dark:bg-green-950/80 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            }`}
          >
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header Principal */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
                <Wallet className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  FinanceApp
                </h1>
              </div>

              {/* Menu Desktop */}
              <nav className="hidden md:flex items-center gap-2">
                {[
                  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
                  { key: 'transactions', label: 'Transações', Icon: ArrowLeftRight },
                  { key: 'scheduled', label: 'Agenda', Icon: CalendarDays },
                  { key: 'reports', label: 'Relatórios', Icon: BarChart2 },
                  { key: 'categories', label: 'Categorias', Icon: Plus },
                ].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      view === key
                        ? 'bg-blue-600 text-white shadow'
                        : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Menu Lateral / Usuário */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleHideValues}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
                title={hideValues ? 'Mostrar Valores' : 'Ocultar Valores (Modo Privacidade)'}
              >
                {hideValues ? <EyeOff className="w-5 h-5 text-blue-500" /> : <Eye className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
                title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {(currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl z-50 py-1 ${
                      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                      <button
                        onClick={() => { setShowSettings(true); setShowUserMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Settings className="w-4 h-4" />
                        Configurações
                      </button>
                      <div className={`my-1 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />
                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navegação Mobile */}
          <div className="flex md:hidden gap-2 mt-4 overflow-x-auto pb-1">
            {[
              { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
              { key: 'transactions', label: 'Transações', Icon: ArrowLeftRight },
              { key: 'scheduled', label: 'Agenda', Icon: CalendarDays },
              { key: 'reports', label: 'Relatórios', Icon: BarChart2 },
              { key: 'categories', label: 'Categorias', Icon: Plus },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium whitespace-nowrap text-sm transition-colors ${
                  view === key
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Seletor de Mês */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setCurrentDate(newDate);
            }}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
          </h2>
          
          <button
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setCurrentDate(newDate);
            }}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de Contas Vencendo */}
        {upcomingDueDates.length > 0 && view === 'dashboard' && (
          <div className="mb-6 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-300">
                Atenção: Você tem {upcomingDueDates.length} conta{upcomingDueDates.length > 1 ? 's' : ''} vencendo nos próximos 5 dias.
              </p>
              <button
                onClick={() => { setView('scheduled'); setAgendaSubTab('bills'); }}
                className="text-sm text-orange-700 dark:text-orange-400 underline mt-1 font-semibold"
              >
                Ver detalhes na Agenda
              </button>
            </div>
          </div>
        )}

        {/* Views Modulares */}
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
            last6MonthsData={last6MonthsData}
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
            showTips={showTips}
            setShowTips={setShowTips}
            aiTips={aiTips}
            isGeneratingTips={isGeneratingTips}
            gerarDicasIA={gerarDicasIA}
            setShowTransactionModal={setShowTransactionModal}
            handleExportPDF={handleExportPDF}
            handleExportExcel={handleExportExcel}
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
            setEditingTransaction={setEditingTransaction}
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
          />
        )}

        {view === 'scheduled' && (
          <AgendaView
            darkMode={darkMode}
            currentDate={currentDate}
            scheduled={scheduled}
            categories={categories}
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
            setShowTransactionModal={setShowTransactionModal}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getTodayDateString={getTodayDateString}
            hideValues={hideValues}
          />
        )}

        {view === 'reports' && (
          <ReportsView
            darkMode={darkMode}
            currentDate={currentDate}
            currentMonthTransactions={currentMonthTransactions}
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

        {view === 'categories' && (
          <CategoriesView
            darkMode={darkMode}
            categories={categories}
            categoryBudgets={categoryBudgets}
            showVal={showVal}
            setEditingCategory={setEditingCategory}
            setShowCategoryModal={setShowCategoryModal}
            deleteCategory={deleteCategory}
          />
        )}
      </main>

      {/* Modais */}
      {showTransactionModal && <TransactionModal />}
      {showCategoryModal && <CategoryModal />}

      {/* Modal de Configurações */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <Settings className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Configurações
                </h2>
              </div>
              <button onClick={() => setShowSettings(false)}>
                <X className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  RELATÓRIO MENSAL POR E-MAIL
                </p>
                <button
                  onClick={handleSendMonthlyReport}
                  disabled={sendingReport}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${
                    sendingReport
                      ? 'bg-blue-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  {sendingReport ? 'Enviando Relatório...' : 'Enviar Resumo do Mês por E-mail'}
                </button>
                <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Será enviado para <strong>{currentUser?.email}</strong>
                </p>
              </div>

              <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  GOOGLE CALENDAR
                </p>
                <button
                  onClick={handleGoogleLogin}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold border transition-colors ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                      : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 text-red-500" />
                  {hasGoogleToken ? 'Sincronizar Google Calendar novamente' : 'Conectar Google Calendar'}
                </button>
              </div>

              <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  EXPORTAÇÃO E BACKUP
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { handleExportPDF(); setShowSettings(false); }}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Exportar PDF
                  </button>

                  <button
                    onClick={() => { handleExportExcel(); setShowSettings(false); }}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Exportar Excel
                  </button>

                  <button
                    onClick={() => { handleExport(); setShowSettings(false); }}
                    className={`flex items-center justify-center gap-2 ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    } font-semibold py-3 rounded-xl transition-colors text-sm`}
                  >
                    <Download className="w-4 h-4" />
                    Backup JSON
                  </button>

                  <label className={`flex items-center justify-center gap-2 ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } font-semibold py-3 rounded-xl transition-colors cursor-pointer text-sm`}>
                    <Upload className="w-4 h-4" />
                    Importar Backup
                    <input type="file" accept=".json" onChange={(e) => { handleImport(e); setShowSettings(false); }} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Meta de Poupança */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  💰 Definir Meta de Economia
                </h2>
                <button onClick={() => {
                  setShowGoalModal(false);
                  setGoalInput('');
                }}>
                  <X className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Quanto você quer poupar por mês?
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Ex: 1000.00"
                  className={`w-full px-4 py-3 rounded-lg border text-lg ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  autoFocus
                />
              </div>

              <button
                onClick={() => {
                  const val = parseFloat(goalInput.replace(',', '.'));
                  if (!isNaN(val) && val > 0) {
                    setSavingsGoal(val);
                    localStorage.setItem('savings_goal', val.toString());
                    setShowGoalModal(false);
                    setGoalInput('');
                    showToast('Meta de poupança atualizada!', 'success');
                  } else {
                    showToast('Por favor, digite um valor válido!', 'warning');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Inteligente (Simples ou Parcelas) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {confirmModal.isInstallmentChoice ? 'Excluir Compra Parcelada' : 'Confirmar exclusão'}
              </h3>
            </div>
            <p className={`text-sm mb-6 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {confirmModal.message}
            </p>

            {confirmModal.isInstallmentChoice ? (
              <div className="space-y-2.5">
                <button
                  onClick={confirmModal.onDeleteSingle}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                    darkMode
                      ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-650'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Excluir apenas esta parcela
                </button>
                <button
                  onClick={confirmModal.onDeleteAll}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow"
                >
                  Excluir todas as parcelas da compra
                </button>
                <button
                  onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null, isInstallmentChoice: false, onDeleteSingle: null, onDeleteAll: null })}
                  className={`w-full py-2 text-xs font-medium text-center ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null, isInstallmentChoice: false, onDeleteSingle: null, onDeleteAll: null })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
