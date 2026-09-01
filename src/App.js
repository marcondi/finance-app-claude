import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Moon, 
  Sun, 
  LogOut, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Upload, 
  Edit2, 
  Trash2, 
  Search, 
  AlertCircle, 
  Check, 
  X, 
  Calendar,
  FileText,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  Mail,
  LayoutDashboard,
  ArrowLeftRight,
  CalendarDays,
  BarChart2,
  Sparkles
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
  CartesianGrid, 
  LineChart, 
  Line 
} from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import AgendaView from './AgendaView';

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
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

  // Filtros de transações
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedCategory, setHighlightedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Agenda: Sub-aba (Contas vs Google Calendar) e Dia Selecionado
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

  // Gerenciamento do tema Dark/Light com persistência
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

  // Persistência e verificação de Sessão do Supabase Auth
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) {
          setCurrentUser(session.user);
          if (session.provider_token) {
            setHasGoogleToken(true);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        if (session.provider_token) {
          setHasGoogleToken(true);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setHasGoogleToken(false);
      }
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

  // Login com Google incluindo escopos do Google Calendar
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      showToast('Erro ao autenticar com Google: ' + error.message, 'error');
    }
  };

  // Buscar Eventos do Google Calendar
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
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error('Não foi possível obter eventos do Google Calendar.');
      }

      const data = await response.json();
      setCalendarEvents(data.items || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      showToast('Erro ao carregar eventos do Google: ' + error.message, 'warning');
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (currentUser && agendaSubTab === 'google-calendar') {
      fetchCalendarEvents(calendarFilter);
    }
  }, [agendaSubTab, calendarFilter, currentUser]);

  // Cálculos do Mês Selecionado
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

  // Histórico dos últimos 6 meses para os Gráficos
  const last6MonthsData = useMemo(() => {
    if (!currentUser) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      const monthTx = transactions.filter(t => {
        return t.user_id === currentUser.id && (t.date || '').startsWith(prefix);
      });

      const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

      return {
        label,
        Entradas: inc,
        Saídas: exp,
        Saldo: inc - exp
      };
    });
  }, [transactions, currentUser]);

  // Gerador de Dicas Financeiras com IA
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

  // Envio de Relatório Mensal por E-mail
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

      const supabaseUrl = 'https://oooegbbvrwifilavlvgt.supabase.co';

      const res = await fetch(`${supabaseUrl}/functions/v1/send-monthly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vb2VnYmJ2cndpZmlsYXZsdmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTk5NTAsImV4cCI6MjA4NTc5NTk1MH0.x6wDd7c8V3eb1gYgQcEILEBEJKkPfJuF4o2_UuAV7Gk',
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

  // Exportar Relatório em PDF
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

  // Exportar Relatório em Excel (.xlsx)
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

  // Exportar Backup Completo JSON
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

  // Importar Backup JSON
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

        showToast(`✅ Importação concluída com sucesso!`, 'success');
        await loadUserData();
      } catch (error) {
        console.error('Erro na importação:', error);
        showToast('Erro ao importar dados: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const deleteTransaction = (id) => {
    setConfirmModal({
      open: true,
      message: 'Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmModal({ open: false, message: '', onConfirm: null });
        try {
          const { error } = await supabase
            .from('finance_transactions')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          setTransactions(prev => prev.filter(t => t.id !== id));
          showToast('Lançamento excluído com sucesso.', 'success');
        } catch (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir: ' + error.message, 'error');
        }
      }
    });
  };

  const deleteCategory = (id) => {
    const hasTransactions = transactions.some(t => t.category_id === id);
    if (hasTransactions) {
      showToast('Não é possível excluir uma categoria que possui transações vinculadas.', 'warning');
      return;
    }

    setConfirmModal({
      open: true,
      message: 'Deseja realmente excluir esta categoria?',
      onConfirm: async () => {
        setConfirmModal({ open: false, message: '', onConfirm: null });
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

  // Modal de Transação
  const TransactionModal = () => {
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState(getTodayDateString());
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringMonths, setRecurringMonths] = useState('1');

    useEffect(() => {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmount(editingTransaction.amount.toString());
        setDescription(editingTransaction.description);
        setCategoryId(editingTransaction.category_id);
        setDate(editingTransaction.date);
        setIsRecurring(editingTransaction.is_recurring || false);
        setRecurringMonths((editingTransaction.recurring_months || 1).toString());
      }
    }, [editingTransaction]);

    const handleSubmit = async () => {
      if (!amount || !description || !categoryId) {
        showToast('Preencha todos os campos!', 'warning');
        return;
      }

      const numAmount = parseFloat(amount.toString().replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        showToast('Digite um valor numérico válido!', 'warning');
        return;
      }

      const baseTransaction = {
        user_id: currentUser.id,
        type: type === 'scheduled' ? 'expense' : type,
        amount: numAmount,
        description,
        category_id: categoryId,
        date,
        is_recurring: isRecurring,
        recurring_months: isRecurring ? parseInt(recurringMonths) : null,
        parent_id: null
      };

      try {
        if (type === 'scheduled') {
          const baseScheduled = {
            user_id: currentUser.id,
            amount: numAmount,
            description,
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
        } else {
          if (editingTransaction) {
            const { error } = await supabase
              .from('finance_transactions')
              .update(baseTransaction)
              .eq('id', editingTransaction.id);
            
            if (error) throw error;
            
            setTransactions(prev => prev.map(t =>
              t.id === editingTransaction.id ? { ...t, ...baseTransaction } : t
            ));
            showToast('Lançamento atualizado com sucesso!', 'success');
          } else {
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
      setCategoryId('');
      setDate(getTodayDateString());
      setIsRecurring(false);
      setRecurringMonths('1');
    };

    const availableCategories = categories.filter(c => {
      return type === 'scheduled' ? c.type === 'expense' : c.type === type;
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-lg rounded-xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
          <div className={`sticky top-0 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
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
              <div className="flex gap-2 mt-4">
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
                <button
                  onClick={() => setType('scheduled')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    type === 'scheduled'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Agendamento
                </button>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                placeholder="Ex: Compras no mercado"
                className={`w-full px-4 py-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
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
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {type !== 'scheduled' && !editingTransaction && (
              <>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="recurring" className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Repetir lançamento?
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
                      className={`w-full px-4 py-3 rounded-lg border ${
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
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Deixe 1 para criar apenas um agendamento único
                </p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {editingTransaction ? 'Salvar Alterações' : 'Adicionar'}
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

    useEffect(() => {
      if (editingCategory) {
        setName(editingCategory.name);
        setColor(editingCategory.color);
        setType(editingCategory.type);
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
          showToast('Categoria criada!', 'success');
        }

        setShowCategoryModal(false);
        setEditingCategory(null);
        setName('');
        setColor('#3b82f6');
        setType('expense');
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
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

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
      {/* Sistema de Toasts */}
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

        {/* ABA: DASHBOARD */}
        {view === 'dashboard' && (
          <>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold group-hover:text-green-500 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Entradas
                  </h3>
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(income)}
                </p>
                <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} group-hover:text-green-500 transition-colors`}>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold group-hover:text-red-500 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Saídas
                  </h3>
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(expenses)}
                </p>
                <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} group-hover:text-red-500 transition-colors`}>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold group-hover:text-blue-500 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Saldo
                  </h3>
                  <div className={`${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'} p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                    <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </p>
                <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} group-hover:text-blue-500 transition-colors`}>
                  Ver todas as transações →
                </p>
              </div>
            </div>

            {/* Gráfico de Gastos por Categoria no Dashboard */}
            {expensesByCategory.length > 0 && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Gastos por Categoria
                  </h3>
                  <button
                    onClick={() => setView('reports')}
                    className={`text-sm font-semibold ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    Ver Relatórios Completos →
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
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
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

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
                        Poupado: {formatCurrency(savingsAmount)}
                      </span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Meta: {formatCurrency(savingsGoal)}
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
                        : `Faltam ${formatCurrency(savingsGoal - savingsAmount)} para atingir a meta`}
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
        )}

        {/* ABA: TRANSAÇÕES */}
        {view === 'transactions' && (
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
                    {(() => {
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
                                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
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
                        </>
                      );
                    })()}
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
        )}

        {/* ABA: AGENDA & CALENDÁRIO / GOOGLE CALENDAR (Componente Modular) */}
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
          />
        )}

        {/* ABA: RELATÓRIOS E GRÁFICOS */}
        {view === 'reports' && (() => {
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
                              {formatCurrency(cat.value)}
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
        })()}

        {/* ABA: CATEGORIAS */}
        {view === 'categories' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Gerenciar Categorias
              </h2>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nova Categoria
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Categorias de Despesa
                </h3>
                <div className="space-y-3">
                  {categories
                    .filter(c => c.type === 'expense')
                    .map(category => (
                      <div
                        key={category.id}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {category.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(category);
                              setShowCategoryModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Categorias de Receita
                </h3>
                <div className="space-y-3">
                  {categories
                    .filter(c => c.type === 'income')
                    .map(category => (
                      <div
                        key={category.id}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {category.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(category);
                              setShowCategoryModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal de Nova / Editar Transação */}
      {showTransactionModal && <TransactionModal />}

      {/* Modal de Categoria */}
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
              {/* Relatório Mensal por E-mail */}
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

              {/* Conexão com Google Calendar */}
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

              {/* Exportar / Importar */}
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

      {/* Modal de Confirmação */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Confirmar exclusão</h3>
            </div>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}
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
          </div>
        </div>
      )}
    </div>
  );
}
