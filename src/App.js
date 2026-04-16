import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
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
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

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
  { id: 'cat-12', name: 'Outros', color: '#6b7280', type: 'expense', user_id: null },
  { id: 'cat-13', name: 'Advogada', color: '#7c3aed', type: 'expense', user_id: null },
  { id: 'cat-14', name: 'Cartão Crédito Caixa', color: '#dc2626', type: 'expense', user_id: null },
  { id: 'cat-15', name: 'Cartão Crédito C6', color: '#9333ea', type: 'expense', user_id: null },
  { id: 'cat-16', name: 'Cartão Crédito Merc. Pago', color: '#0891b2', type: 'expense', user_id: null },
  { id: 'cat-17', name: 'Cartão Crédito Neon', color: '#f97316', type: 'expense', user_id: null },
  { id: 'cat-18', name: 'Internet+Balcão', color: '#0284c7', type: 'expense', user_id: null },
  { id: 'cat-19', name: 'Aux. Mãe', color: '#ec4899', type: 'expense', user_id: null },
  { id: 'cat-20', name: 'Fisioterapia Mãe', color: '#db2777', type: 'expense', user_id: null },
  { id: 'cat-21', name: 'Empréstimo', color: '#b91c1c', type: 'expense', user_id: null },
  { id: 'cat-22', name: 'Energia', color: '#eab308', type: 'expense', user_id: null },
  { id: 'cat-23', name: 'Lazer', color: '#ec4899', type: 'expense', user_id: null },
  { id: 'cat-24', name: 'Educação', color: '#3b82f6', type: 'expense', user_id: null },
];

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (date) => {
  const dateParts = date.split('-');
  const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  return dateObj.toLocaleDateString('pt-BR');
};

export default function FinanceApp() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0=hidden, 1=welcome, 2=category, 3=done
  const [isLoggingOut, setIsLoggingOut] = useState(false); // eslint-disable-line no-unused-vars
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [googlePhotoUrl, setGooglePhotoUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [aiTips, setAiTips] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [eventStatus, setEventStatus] = useState(() => {
    try { return JSON.parse(localStorage.getItem('financeapp_event_status') || '{}'); }
    catch { return {}; }
  });

  const toggleEventStatus = (eventId) => {
    setEventStatus(prev => {
      const next = { ...prev, [eventId]: !prev[eventId] };
      try { localStorage.setItem('financeapp_event_status', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState('week'); // 'today', 'tomorrow', 'week', 'month'
  const [todayEvents, setTodayEvents] = useState([]);
  const [tomorrowEvents, setTomorrowEvents] = useState([]);
  const [reportFilter, setReportFilter] = useState('expenses-category');
  const [reportChart, setReportChart] = useState('pie');

  // ── Sistema de Toast (substitui alert()) ─────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  // ─────────────────────────────────────────────────────────────────────────

  // Detecta login/logout/refresh automaticamente — substitui o restoreSession
  useEffect(() => {
    let resolved = false;

    // Timeout de segurança: resolve o loading se nada disparar em 3s
    const sessionTimeout = setTimeout(() => {
      if (!resolved) { resolved = true; setCheckingSession(false); }
    }, 3000);

    // Verifica sessão imediatamente — resolve o loading quando não há sessão ativa
    // (onAuthStateChange sozinho não dispara se o usuário não estiver logado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !resolved) {
        resolved = true;
        clearTimeout(sessionTimeout);
        setCheckingSession(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setGooglePhotoUrl(null);
          setIsLoggingOut(false);
          if (!resolved) { resolved = true; clearTimeout(sessionTimeout); }
          setCheckingSession(false);
          return;
        }

        if (session?.user) {
          const user = session.user;
          // Busca o registro existente em finance_users (compatível com dados já existentes)
          const { data: existingUser } = await supabase
            .from('finance_users')
            .select('*')
            .eq('email', user.email)
            .limit(1);

          if (existingUser && existingUser.length > 0) {
            setCurrentUser(existingUser[0]);
          } else {
            // Usuário novo ainda sem registro em finance_users
            setCurrentUser({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
            });
          }
          setGooglePhotoUrl(
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture    ||
            null
          );
          if (session?.provider_token) {
            localStorage.setItem('financeapp_gtoken', session.provider_token);
          }
        }

        if (!resolved) { resolved = true; clearTimeout(sessionTimeout); }
        setCheckingSession(false);
      }
    );
    return () => { subscription.unsubscribe(); clearTimeout(sessionTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUser) return;

    loadUserData();
    requestNotificationPermission();

    let isActive = true;
    let retryTimeout = null;
    let stopEventChecks = null;
    let refreshInterval = null;

    // Aguarda provider_token do Google OAuth antes de carregar eventos/notificacoes
    const initWithSession = async () => {
      let attempts = 0;

      const tryInit = async () => {
        if (!isActive) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token || attempts >= 10) {
          // loadBannerEvents retorna os eventos e ja dispara notificacoes
          // evitando depender do state todayEvents/tomorrowEvents que ainda esta vazio
          const { todayEvts, tomorrowEvts } = await loadBannerEvents();
          if (isActive) {
            stopEventChecks = checkUpcomingEvents(todayEvts, tomorrowEvts);
          }
        } else {
          attempts++;
          retryTimeout = setTimeout(tryInit, 500);
        }
      };

      await tryInit();
    };

    // Recarrega contas vencendo a cada 30 minutos e mostra toast se houver pendências
    const runPeriodicCheck = async () => {
      if (!isActive) return;
      await loadBannerEvents();
      // upcomingDueDates é recalculado via useMemo após loadBannerEvents atualizar o state
      // Usamos uma leitura direta das transações para o toast, sem depender do state assíncrono
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fiveDays = new Date(today);
      fiveDays.setDate(today.getDate() + 5);
      fiveDays.setHours(23, 59, 59, 999);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: pendentes } = await supabase
        .from('finance_scheduled')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_paid', false);
      const count = (pendentes || []).filter(s => {
        const [y, m, d] = s.due_date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt >= today && dt <= fiveDays;
      }).length;
      if (count > 0) {
        showToast(`Lembrete: você tem ${count} conta${count > 1 ? 's' : ''} vencendo nos próximos 5 dias.`, 'warning');
      }
    };

    refreshInterval = setInterval(runPeriodicCheck, 30 * 60 * 1000);

    initWithSession();

    return () => {
      isActive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (typeof stopEventChecks === 'function') stopEventChecks();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Resetar pagina ao mudar filtro ou ordenacao
  useEffect(() => { setCurrentPage(1); }, [filterType, sortBy, searchTerm]);

  // Carregar eventos do Google Calendar automaticamente ao entrar na aba Agenda
  useEffect(() => {
    if (view === 'scheduled' && googlePhotoUrl) {
      fetchCalendarEvents(calendarFilter);
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recarregar dados ao voltar o foco para a janela (resolve perda de funções após inatividade)
  useEffect(() => {
    if (!currentUser) return;
    const onFocus = () => { loadUserData(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (showUserMenu) setShowUserMenu(false);
      if (showSettings) setShowSettings(false);
      if (showGoalModal) {
        setShowGoalModal(false);
        setGoalInput('');
      }
      if (showTransactionModal) {
        setShowTransactionModal(false);
        setEditingTransaction(null);
      }
      if (showCategoryModal) {
        setShowCategoryModal(false);
        setEditingCategory(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showUserMenu, showSettings, showGoalModal, showTransactionModal, showCategoryModal]);

  // Pedir permissão para notificações
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Verificar eventos e contas proximas.
  // todayEvts/tomorrowEvts sao passados diretamente no login para evitar
  // ler o state React que ainda esta vazio no primeiro render apos OAuth redirect.
  const checkUpcomingEvents = (todayEvts, tomorrowEvts) => {
    // Dispara imediatamente com os eventos ja carregados
    checkEventsSoonAndNotify();
    checkDueDatesAndNotify(todayEvts, tomorrowEvts);

    // Continua verificando a cada 15 minutos (state ja populado)
    const interval = setInterval(() => {
      checkEventsSoonAndNotify();
      checkDueDatesAndNotify();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  };

  // Notificar eventos em 1 hora
  const checkEventsSoonAndNotify = async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) return;

      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneHourLater.toISOString()}&singleEvents=true`,
        { headers: { Authorization: `Bearer ${session.provider_token}` } }
      );

      const data = await response.json();
      const events = data.items || [];

      events.forEach(event => {
        if (event.start?.dateTime) {
          const eventTime = new Date(event.start.dateTime);
          const diffMinutes = Math.floor((eventTime - now) / (1000 * 60));

          if (diffMinutes >= 55 && diffMinutes <= 65) {
            new Notification('Evento proximo', {
              body: `${event.summary} começa em cerca de 1 hora`,
              icon: '/favicon.ico'
            });
          }
        }
      });
    } catch (error) {
      console.error('Erro ao verificar eventos:', error);
    }
  };

  // Notificar contas vencendo.
  // Aceita eventos como parametros (chamada no login) ou usa o state (chamadas do intervalo).
  const checkDueDatesAndNotify = (todayEvts, tomorrowEvts) => {
    if (Notification.permission !== 'granted') return;

    const eventsToday    = todayEvts    ?? todayEvents;
    const eventsTomorrow = tomorrowEvts ?? tomorrowEvents;

    eventsToday.forEach(event => {
      new Notification('Conta vencendo hoje', {
        body: event.summary || 'Evento sem título',
        icon: '/favicon.ico'
      });
    });

    eventsTomorrow.forEach(event => {
      new Notification('Conta vence amanha', {
        body: event.summary || 'Evento sem título',
        icon: '/favicon.ico'
      });
    });
  };

  const loadBannerEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) return { todayEvts: [], tomorrowEvts: [] };

      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      // Buscar eventos de hoje
      const todayResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${endOfToday.toISOString()}&orderBy=startTime&singleEvents=true&maxResults=3`,
        {
          headers: { Authorization: `Bearer ${session.provider_token}` }
        }
      );
      const todayData = await todayResponse.json();
      setTodayEvents(todayData.items || []);

      // Buscar eventos de amanhã
      const tomorrowResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${tomorrow.toISOString()}&timeMax=${endOfTomorrow.toISOString()}&orderBy=startTime&singleEvents=true&maxResults=3`,
        {
          headers: { Authorization: `Bearer ${session.provider_token}` }
        }
      );
      const tomorrowData = await tomorrowResponse.json();
      const todayEvts    = todayData.items    || [];
      const tomorrowEvts = tomorrowData.items || [];
      setTodayEvents(todayEvts);
      setTomorrowEvents(tomorrowEvts);
      // Retorna os eventos para uso imediato (evita depender do state ainda vazio)
      return { todayEvts, tomorrowEvts };
    } catch (error) {
      console.error('Erro ao carregar eventos do banner:', error);
      return { todayEvts: [], tomorrowEvts: [] };
    }
  };

  const loadUserData = async () => {
    setLoading(true);
    // Timeout de segurança: garante que loading nunca trava o app indefinidamente
    const safetyTimer = setTimeout(() => setLoading(false), 15000);
    try {
      // Carregar categorias
      const { data: cats, error: catsError } = await supabase
        .from('finance_categories')
        .select('*')
        .or(`user_id.eq.${currentUser.id},user_id.is.null`);
      
      if (catsError) throw catsError;
      
      // Se não houver categorias, criar as padrões
      if (!cats || cats.length === 0) {
        const categoriesToInsert = defaultCategories.map(cat => {
          const { id, ...rest } = cat; // Remove o ID fixo
          return {
            ...rest,
            id: generateId(), // Gera ID único
            user_id: null
          };
        });
        
        const { data: newCats, error: insertError } = await supabase
          .from('finance_categories')
          .insert(categoriesToInsert)
          .select();
        
        if (insertError) {
          console.error('Erro ao inserir categorias:', insertError);
          // Se der erro, tenta carregar novamente (pode ser que já existam)
          const { data: existingCats } = await supabase
            .from('finance_categories')
            .select('*')
            .or(`user_id.eq.${currentUser.id},user_id.is.null`);
          setCategories(existingCats || []);
        } else {
          setCategories(newCats);
        }
      } else {
        setCategories(cats);
      }

      // Carregar transações
      const { data: trans, error: transError } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (transError) throw transError;
      setTransactions(trans || []);

      // Carregar agendamentos
      const { data: sched, error: schedError } = await supabase
        .from('finance_scheduled')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (schedError) throw schedError;
      setScheduled(sched || []);

      // Onboarding para novos usuarios
      if (!trans || trans.length === 0) {
        setTimeout(() => setOnboardingStep(1), 800);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    const inputClass = `w-full px-4 py-3 rounded-lg border ${
      darkMode
        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
        : 'bg-white border-gray-300 text-gray-900'
    } focus:outline-none focus:ring-2 focus:ring-blue-500`;

    const handleGoogleLogin = async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            scopes: 'https://www.googleapis.com/auth/calendar.events'
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Erro no login com Google:', error);
        showToast('Erro ao fazer login com Google: ' + error.message, 'error');
      }
    };

    const handleAuth = async () => {
      if (isAuthLoading) return;
      if (!email || !password) { showToast('Preencha e-mail e senha.', 'warning'); return; }
      if (!isLogin && !name) { showToast('Preencha seu nome.', 'warning'); return; }
      if (!isLogin && password.length < 6) { showToast('A senha deve ter no mínimo 6 caracteres.', 'warning'); return; }

      setIsAuthLoading(true);
      try {
        if (isLogin) {
          // Senha verificada pelo Supabase Auth — nunca comparada em texto puro
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) showToast('E-mail ou senha incorretos.', 'warning');
          // onAuthStateChange detecta o login e carrega o usuário automaticamente
        } else {
          // Cadastro: cria no Supabase Auth + registro em finance_users para compatibilidade
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name }, emailRedirectTo: window.location.origin }
          });
          if (signUpError) throw signUpError;

          if (authData?.user) {
            await supabase.from('finance_users').insert([{
              id: authData.user.id,
              name,
              email,
              password: 'supabase-auth'
            }]);
          }
          showToast('Conta criada! Verifique seu e-mail se solicitado.', 'success');
        }
      } catch (error) {
        console.error('Erro na autenticação:', error);
        showToast('Erro: ' + error.message, 'error');
      } finally {
        setIsAuthLoading(false);
      }
    };

    const handleForgotPassword = async () => {
      if (!email) { showToast('Digite seu e-mail para receber o link de recuperação.', 'warning'); return; }
      setIsAuthLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setForgotSent(true);
      } catch (error) {
        console.error('Erro ao enviar recuperação:', error);
        showToast('Erro: ' + error.message, 'error');
      } finally {
        setIsAuthLoading(false);
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
            <>
              <h2 className={`text-xl font-semibold mb-6 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Recuperar Senha
              </h2>
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <div className="text-5xl mb-2">📬</div>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Link enviado para <strong>{email}</strong>.<br />
                    Clique no link do e-mail para criar uma nova senha.
                  </p>
                  <button
                    onClick={() => { setIsForgotPassword(false); setForgotSent(false); setEmail(''); }}
                    className={`w-full py-2 rounded-xl text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Digite seu e-mail e enviaremos um link seguro para redefinir sua senha.
                  </p>
                  <input
                    type="email"
                    placeholder="E-mail cadastrado"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                    className={inputClass}
                  />
                  <button
                    onClick={handleForgotPassword}
                    disabled={isAuthLoading}
                    className={`w-full bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${isAuthLoading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  >
                    {isAuthLoading && (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                    Enviar link de recuperação
                  </button>
                  <button
                    onClick={() => { setIsForgotPassword(false); setEmail(''); }}
                    className={`w-full ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'} font-medium py-2 transition-colors`}
                  >
                    Voltar ao login
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex mb-6 border-b border-gray-300">
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

              <div className="space-y-4">
                {!isLogin && (
                  <input
                    type="text"
                    placeholder="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                )}
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className={inputClass}
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showPassword
                      ? <EyeOff className="w-5 h-5" />
                      : <Eye className="w-5 h-5" />
                    }
                  </button>
                </div>
                <button
                  onClick={handleAuth}
                  disabled={isAuthLoading}
                  className={`w-full bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${isAuthLoading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                >
                  {isAuthLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      {isLogin ? 'Entrando...' : 'Criando conta...'}
                    </>
                  ) : (
                    isLogin ? 'Entrar' : 'Criar Conta'
                  )}
                </button>

                {/* Divisor "OU" */}
                <div className="relative flex items-center justify-center my-4">
                  <div className={`absolute w-full h-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <span className={`relative px-4 text-sm ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                    ou
                  </span>
                </div>

                {/* Botão Google */}
                <button
                  onClick={handleGoogleLogin}
                  className={`w-full flex items-center justify-center gap-3 ${
                    darkMode 
                      ? 'bg-white hover:bg-gray-100 text-gray-800' 
                      : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300'
                  } font-semibold py-3 rounded-lg transition-colors shadow-sm`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Entrar com Google
                </button>
                
                {isLogin && (
                  <button
                    onClick={() => setIsForgotPassword(true)}
                    className={`w-full ${
                      darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                    } text-sm font-medium py-2 transition-colors`}
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

    const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'https://www.googleapis.com/auth/calendar.events'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      showToast('Erro ao fazer login com Google: ' + error.message, 'error');
    }
  };

  const AgendaCalendario = ({ darkMode, scheduled, transactions, currentDate, categories, formatCurrency, setShowTransactionModal, setEditingTransaction, googlePhotoUrl, handleGoogleLogin }) => {
    const [selectedDay, setSelectedDay] = useState(null);
    const [viewMonth, setViewMonth] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));

    const ano = viewMonth.getFullYear();
    const mes = viewMonth.getMonth();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const nomeMes = viewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const hoje = new Date();

    // Mapear contas por dia
    const contasPorDia = {};
    scheduled.forEach(s => {
      if (!s.due_date) return;
      const [y, m, d] = s.due_date.split('-').map(Number);
      if (y === ano && m - 1 === mes) {
        if (!contasPorDia[d]) contasPorDia[d] = [];
        contasPorDia[d].push({ ...s, _tipo: 'agendado' });
      }
    });
    transactions.filter(t => t.is_recurring && t.type === 'expense').forEach(t => {
      const [y, m, d] = t.date.split('-').map(Number);
      if (y === ano && m - 1 === mes) {
        if (!contasPorDia[d]) contasPorDia[d] = [];
        contasPorDia[d].push({ ...t, _tipo: 'recorrente', description: t.description, amount: t.amount });
      }
    });

    const contasDiaSelecionado = selectedDay ? (contasPorDia[selectedDay] || []) : [];
    const totalMes = Object.values(contasPorDia).flat().reduce((s, c) => s + (c.amount || 0), 0);
    const totalPago = Object.values(contasPorDia).flat().filter(c => c.is_paid).reduce((s, c) => s + (c.amount || 0), 0);

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>📅 Agenda de Contas</h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Suas contas agendadas e recorrentes do mês
            </p>
          </div>
          {!googlePhotoUrl && (
            <button
              onClick={handleGoogleLogin}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <span>🔗</span> Conectar Google Calendar
            </button>
          )}
        </div>

        {/* Resumo do mês */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total do mês', value: formatCurrency(totalMes), color: 'text-gray-700', bg: darkMode ? 'bg-gray-800' : 'bg-white' },
            { label: 'Já pago', value: formatCurrency(totalPago), color: 'text-green-500', bg: darkMode ? 'bg-gray-800' : 'bg-white' },
            { label: 'A pagar', value: formatCurrency(totalMes - totalPago), color: 'text-orange-500', bg: darkMode ? 'bg-gray-800' : 'bg-white' },
          ].map((item, i) => (
            <div key={i} className={`${item.bg} rounded-xl shadow p-4 text-center`}>
              <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Calendário */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 mb-4`}>
          {/* Header navegação */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewMonth(new Date(ano, mes - 1, 1))}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>◄</button>
            <h3 className={`text-lg font-bold capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>{nomeMes}</h3>
            <button onClick={() => setViewMonth(new Date(ano, mes + 1, 1))}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>►</button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {diasSemana.map(d => (
              <div key={d} className={`text-center text-xs font-semibold py-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{d}</div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={'e'+i} />)}
            {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(dia => {
              const contas = contasPorDia[dia] || [];
              const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
              const temConta = contas.length > 0;
              const todoPago = temConta && contas.every(c => c.is_paid);
              const selecionado = selectedDay === dia;
              return (
                <button key={dia} onClick={() => setSelectedDay(selecionado ? null : dia)}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all
                    ${selecionado ? 'ring-2 ring-blue-500' : ''}
                    ${ehHoje ? 'bg-blue-600 text-white' : temConta
                      ? todoPago
                        ? darkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-50 text-green-700'
                        : darkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-50 text-orange-700'
                      : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  {dia}
                  {temConta && (
                    <span className={`text-[9px] font-bold ${ehHoje ? 'text-white/80' : todoPago ? 'text-green-500' : 'text-orange-500'}`}>
                      {contas.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex gap-4 mt-3 justify-center flex-wrap">
            {[
              { color: 'bg-blue-600', label: 'Hoje' },
              { color: darkMode ? 'bg-orange-900/60' : 'bg-orange-50 border border-orange-200', label: 'A pagar' },
              { color: darkMode ? 'bg-green-900/60' : 'bg-green-50 border border-green-200', label: 'Pago' },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${l.color}`} />
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contas do dia selecionado */}
        {selectedDay && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
            <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Contas do dia {selectedDay}/{String(mes+1).padStart(2,'0')}/{ano}
            </h4>
            {contasDiaSelecionado.length === 0 ? (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhuma conta neste dia.</p>
            ) : (
              <div className="space-y-2">
                {contasDiaSelecionado.map((c, i) => {
                  const cat = categories.find(cat => cat.id === c.category_id);
                  return (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        {cat && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />}
                        <div>
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{c.description}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {c._tipo === 'recorrente' ? '🔄 Recorrente' : '📌 Agendada'}
                            {c.is_paid ? ' · ✅ Pago' : ' · ⏳ A pagar'}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-red-500">{formatCurrency(c.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Se não tem contas no mês */}
        {Object.keys(contasPorDia).length === 0 && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-10 text-center`}>
            <div className="text-5xl mb-3">📅</div>
            <p className={`text-lg font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhuma conta agendada neste mês</p>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Adicione uma transação com lançamento recorrente ou use o tipo "Agendado"</p>
            <button
              onClick={() => { setEditingTransaction(null); setShowTransactionModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              + Nova Transação
            </button>
          </div>
        )}
      </div>
    );
  };

  const TransactionModal = () => {
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const today = new Date();
    const localDate = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    const [date, setDate] = useState(localDate);
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
        showToast('Preencha todos os campos.', 'warning');
        return;
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        showToast('Digite um valor válido maior que zero.', 'warning');
        return;
      }

      const months = Math.max(1, parseInt(recurringMonths, 10) || 1);

      const baseTransaction = {
        user_id: currentUser.id,
        type: type === 'scheduled' ? 'expense' : type,
        amount: parsedAmount,
        description: description.trim(),
        category_id: categoryId,
        date,
        is_recurring: isRecurring,
        recurring_months: isRecurring ? months : null,
        parent_id: null
      };

      try {
        if (type === 'scheduled') {
          const baseScheduled = {
            user_id: currentUser.id,
            amount: parsedAmount,
            description: description.trim(),
            category_id: categoryId,
            is_paid: false
          };
          
          const scheduledList = [];
          
          for (let i = 0; i < months; i++) {
            const scheduledDate = new Date(date);
            scheduledDate.setMonth(scheduledDate.getMonth() + i);
            
            scheduledList.push({
              ...baseScheduled,
              id: generateId(), // ADICIONAR ID UNICO
              due_date: scheduledDate.toISOString().split('T')[0]
            });
          }
          
          const { data, error } = await supabase
            .from('finance_scheduled')
            .insert(scheduledList)
            .select();
          
          if (error) throw error;
          
          setScheduled(prev => [...prev, ...data]);
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
                const futureDate = new Date(date);
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
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurringMonths('1');
    };

    const availableCategories = categories.filter(c => {
      const matchesType = type === 'scheduled' ? c.type === 'expense' : c.type === type;
      return matchesType;
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-lg rounded-xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
          <div className={`sticky top-0 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <button aria-label="Fechar modal de transacao" onClick={() => {
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
                Valor
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
                size="8"
                className={`w-full px-4 py-2 rounded-lg border overflow-y-auto ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                style={{ maxHeight: '200px' }}
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
      if (!name) {
        showToast('Digite um nome para a categoria.', 'warning');
        return;
      }

      try {
        if (editingCategory) {
          const { error } = await supabase
            .from('finance_categories')
            .update({ name, color, type })
            .eq('id', editingCategory.id);
          
          if (error) throw error;
          
          setCategories(categories.map(c =>
            c.id === editingCategory.id ? { ...c, name, color, type } : c
          ));
        } else {
          const newCategory = {
            id: generateId(),
            name,
            color,
            type,
            user_id: currentUser.id
          };

          const { data, error } = await supabase
            .from('finance_categories')
            .insert([newCategory])
            .select();
          
          if (error) throw error;
          
          setCategories([...categories, ...data]);
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
              <button aria-label="Fechar modal de categoria" onClick={() => {
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

  const currentMonthTransactions = useMemo(() => {
    if (!currentUser) return [];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    return transactions.filter(t => {
      if (t.user_id !== currentUser.id) return false;
      
      const dateParts = t.date.split('-');
      const tDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }, [transactions, currentUser, currentDate]);

  const income = useMemo(() => 
    currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  , [currentMonthTransactions]);

  const expenses = useMemo(() => 
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  , [currentMonthTransactions]);

  const balance = income - expenses;

  // Transações do mês anterior para calcular variação %
  const prevMonthTransactions = useMemo(() => {
    if (!currentUser) return [];
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const year = prevDate.getFullYear();
    const month = prevDate.getMonth();
    return transactions.filter(t => {
      if (t.user_id !== currentUser.id) return false;
      const [y, m] = t.date.split('-').map(Number);
      return y === year && m - 1 === month;
    });
  }, [transactions, currentUser, currentDate]);

  const prevIncome = useMemo(() =>
    prevMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  , [prevMonthTransactions]);

  const prevExpenses = useMemo(() =>
    prevMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  , [prevMonthTransactions]);

  const prevBalance = prevIncome - prevExpenses;

  // Calcula badge de variação: { pct, up, isFirst }
  const calcVariation = (current, previous) => {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) return { pct: 100, up: true, isFirst: true };
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    return { pct: Math.abs(pct).toFixed(1), up: pct >= 0, isFirst: false };
  };

  const incomeVar   = calcVariation(income,   prevIncome);
  const expensesVar = calcVariation(expenses, prevExpenses);
  const balanceVar  = calcVariation(balance,  prevBalance);

  const savingsAmount = useMemo(() => {
    const savingsCategory = categories.find(c => 
      c.name.toLowerCase() === 'poupança' || c.name.toLowerCase() === 'poupança'
    );
    
    if (!savingsCategory) return 0;
    
    return currentMonthTransactions
      .filter(t => t.category_id === savingsCategory.id)
      .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  }, [currentMonthTransactions, categories]);

  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map();

    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = categoryMap.get(t.category_id) || 0;
        categoryMap.set(t.category_id, current + t.amount);
      });

    const all = Array.from(categoryMap.entries()).map(([categoryId, amount]) => {
      const category = categories.find(c => c.id === categoryId);
      return {
        name: category?.name || 'Sem categoria',
        value: amount,
        color: category?.color || '#666'
      };
    }).sort((a, b) => b.value - a.value);

    // Top 6 + agrupar restante em "Outros"
    if (all.length <= 6) return all;
    const top6 = all.slice(0, 6);
    const others = all.slice(6);
    const othersValue = others.reduce((s, c) => s + c.value, 0);
    return [...top6, { name: `Outros (${others.length})`, value: othersValue, color: '#9ca3af' }];
  }, [currentMonthTransactions, categories]);

  const upcomingDueDates = useMemo(() => {
    if (!currentUser) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    fiveDaysFromNow.setHours(23, 59, 59, 999);

    const parseLocalDate = (str) => {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    // Contas agendadas (finance_scheduled) não pagas
    const fromScheduled = scheduled
      .filter(s => {
        if (s.user_id !== currentUser.id || s.is_paid) return false;
        const dueDate = parseLocalDate(s.due_date);
        return dueDate >= today && dueDate <= fiveDaysFromNow;
      })
      .map(s => ({ ...s, _source: 'scheduled', label: s.description }));

    // Transações normais (finance_transactions) do tipo despesa nos próximos 5 dias
    const fromTransactions = transactions
      .filter(t => {
        if (t.user_id !== currentUser.id || t.type !== 'expense' || t.is_paid) return false;
        const txDate = parseLocalDate(t.date);
        return txDate >= today && txDate <= fiveDaysFromNow;
      })
      .map(t => ({ ...t, _source: 'transaction', label: t.description }));

    // Juntar e remover duplicatas por descrição + data
    const seen = new Set();
    return [...fromScheduled, ...fromTransactions].filter(item => {
      const key = (item.label || '') + '|' + (item.due_date || item.date);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [scheduled, transactions, currentUser]);

  const handleExport = async () => {
    try {
      if (!currentUser) {
        showToast('Usuário não identificado. Faça login novamente.', 'error');
        return;
      }

      const userRelatedData = {
        user: currentUser,
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
      link.download = `finance-backup-${new Date().toISOString().split('T')[0]}_${new Date().getHours()}${new Date().getMinutes()}${new Date().getSeconds()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Backup criado com sucesso!', 'success');
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
        
        // Gerar IDs únicos para categorias
        const processedCategories = (imported.categories || []).map((cat, index) => ({
          id: generateId(), // Gera ID único em vez de usar o ID do backup
          name: cat.name,
          color: cat.color || defaultColors[index % defaultColors.length],
          type: cat.type,
          user_id: currentUser.id
        }));
        
        const processedTransactions = (imported.transactions || []).map(t => ({
          id: generateId(),
          user_id: currentUser.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category_id: t.category || t.categoryId || t.category_id,
          date: t.date.split('T')[0],
          is_recurring: t.isRecurring || t.is_recurring || false,
          recurring_months: t.recurringMonths || t.recurring_months || null,
          parent_id: t.parentId || t.parent_id || null
        }));
        
        // Inserir categorias apenas as que não existem (por nome)
        const existingCategoryNames = categories.map(c => c.name.toLowerCase());
        const newCategories = processedCategories.filter(
          cat => !existingCategoryNames.includes(cat.name.toLowerCase())
        );
        
        let categoryMapping = {}; // Mapear IDs antigos para novos
        
        if (newCategories.length > 0) {
          const { data: insertedCats, error: catsError } = await supabase
            .from('finance_categories')
            .insert(newCategories)
            .select();
          
          if (catsError) throw catsError;
          
          // Criar mapeamento de categoria antiga para nova
          imported.categories.forEach((oldCat, index) => {
            const newCat = insertedCats.find(c => c.name === oldCat.name);
            if (newCat) {
              categoryMapping[oldCat.id] = newCat.id;
            }
          });
          
          setCategories([...categories, ...insertedCats]);
        }
        
        // Atualizar category_id nas transações para usar os IDs novos
        const mappedTransactions = processedTransactions.map(t => {
          // Procurar a categoria correspondente no mapeamento ou nas existentes
          const existingCat = categories.find(c => c.name === imported.categories.find(ic => ic.id === t.category_id)?.name);
          const newCatId = categoryMapping[t.category_id] || existingCat?.id || t.category_id;
          
          return {
            ...t,
            category_id: newCatId
          };
        });
        
        // Inserir transações
        if (mappedTransactions.length > 0) {
          const { data: insertedTrans, error: transError } = await supabase
            .from('finance_transactions')
            .insert(mappedTransactions)
            .select();
          
          if (transError) throw transError;
          setTransactions([...transactions, ...insertedTrans]);
        }
        
        // Inserir agendamentos
        if (imported.scheduled && imported.scheduled.length > 0) {
          const processedScheduled = imported.scheduled.map(s => {
            const existingCat = categories.find(c => c.name === imported.categories.find(ic => ic.id === (s.category || s.categoryId || s.category_id))?.name);
            const newCatId = categoryMapping[s.category || s.categoryId || s.category_id] || existingCat?.id;
            
            return {
            id: generateId(), // ADICIONAR ID UNICO
              user_id: currentUser.id,
              amount: s.amount,
              description: s.description,
              category_id: newCatId,
              due_date: s.dueDate || s.due_date,
              is_paid: s.isPaid || s.is_paid || false
            };
          });
          
          const { data: insertedSched, error: schedError } = await supabase
            .from('finance_scheduled')
            .insert(processedScheduled)
            .select();
          
          if (schedError) throw schedError;
          setScheduled([...scheduled, ...insertedSched]);
        }

        showToast(`Importação concluída: ${mappedTransactions.length} transações e ${newCategories.length} categorias.`, 'success');
        
        await loadUserData();
      } catch (error) {
        console.error('Erro na importação:', error);
        showToast('Erro ao importar dados: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExportPDF = () => {
    try {
      // Criar conteúdo HTML para o PDF
      const periodo = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #1e40af; }
            h2 { color: #374151; margin-top: 20px; }
            .periodo { text-align: center; color: #6b7280; margin-bottom: 30px; }
            .resumo { margin: 20px 0; }
            .resumo-item { padding: 10px; margin: 5px 0; border-radius: 8px; }
            .entrada { background: #dcfce7; color: #166534; font-weight: bold; }
            .saida { background: #fee2e2; color: #991b1b; font-weight: bold; }
            .saldo-positivo { background: #dbeafe; color: #1e40af; font-weight: bold; }
            .saldo-negativo { background: #fee2e2; color: #991b1b; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #1e40af; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            tr:nth-child(even) { background: #f9fafb; }
            .tipo-entrada { color: #059669; font-weight: bold; }
            .tipo-saida { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Relatório Financeiro</h1>
          <p class="periodo">Período: ${periodo}</p>
          
          <h2>Resumo</h2>
          <div class="resumo">
            <div class="resumo-item entrada">Entradas: ${formatCurrency(income)}</div>
            <div class="resumo-item saida">Saídas: ${formatCurrency(expenses)}</div>
            <div class="resumo-item ${balance >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">
              Saldo: ${formatCurrency(balance)}
            </div>
          </div>
          
          <h2>Transações</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${currentMonthTransactions.map(t => {
                const cat = categories.find(c => c.id === t.category_id);
                return `
                  <tr>
                    <td>${formatDate(t.date)}</td>
                    <td>${t.description}</td>
                    <td>${cat?.name || '-'}</td>
                    <td class="${t.type === 'income' ? 'tipo-entrada' : 'tipo-saida'}">
                      ${t.type === 'income' ? 'Entrada' : 'Saída'}
                    </td>
                    <td>${formatCurrency(t.amount)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      // Abrir em nova janela para imprimir como PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Aguardar carregamento e abrir diálogo de impressão
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      showToast('Janela de impressão aberta. Use "Salvar como PDF".', 'success');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      showToast('Erro ao exportar PDF: ' + error.message, 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      const periodo = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      // Aba 1: Resumo
      const wsResumo = XLSX.utils.aoa_to_sheet([
        ['RELATORIO FINANCEIRO'],
        [`Período: ${periodo}`],
        [],
        ['TIPO', 'VALOR'],
        ['Entradas', income],
        ['Saídas', expenses],
        ['Saldo', balance]
      ]);
      
      // Aba 2: Transações (formato tabela)
      const transData = currentMonthTransactions.map(t => {
        const cat = categories.find(c => c.id === t.category_id);
        return {
          Data: t.date,
          Descrição: t.description,
          Categoria: cat?.name || '-',
          Tipo: t.type === 'income' ? 'Entrada' : 'Saída',
          Valor: t.amount
        };
      });
      
      const wsTransações = XLSX.utils.json_to_sheet(transData);
      
      // Adicionar ref de tabela para Excel reconhecer
      if (!wsTransações['!ref']) {
        wsTransações['!ref'] = 'A1:E' + (transData.length + 1);
      }
      
      // Aba 3: Categorias
      const catData = expensesByCategory.map(cat => ({
        Categoria: cat.name,
        Tipo: 'Despesa',
        'Total Gasto': cat.value
      }));
      
      const wsCategorias = XLSX.utils.json_to_sheet(catData);
      
      // Criar workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      XLSX.utils.book_append_sheet(wb, wsTransações, 'Transações');
      XLSX.utils.book_append_sheet(wb, wsCategorias, 'Categorias');
      
      // Exportar
      const fileName = `relatório-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showToast('Relatório Excel exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      showToast('Erro ao exportar Excel: ' + error.message, 'error');
    }
  };

  const gerarDicasIA = async () => {
    setAiTips(['⏳ Analisando suas finanças...']);
    const focos = ['economia no dia a dia', 'investimentos e reserva de emergência', 'controle de gastos por categoria', 'metas financeiras de longo prazo', 'redução de despesas fixas'];
    const foco = focos[Math.floor(Math.random() * focos.length)];
    try {
      const mes = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const gastos = expensesByCategory.slice(0, 5).map(c => c.name + ': ' + formatCurrency(c.value)).join(', ');
      const resumo = 'Mes: ' + mes + '\nEntradas: ' + formatCurrency(income) + '\nSaídas: ' + formatCurrency(expenses) + '\nSaldo: ' + formatCurrency(income - expenses) + '\nPrincipais gastos: ' + (gastos || 'nenhum') + '\nFoco desta analise: ' + foco;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://oooegbbvrwifilavlvgt.supabase.co';
      const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
      const res = await fetch(SUPABASE_URL + '/functions/v1/financial-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + (token || SUPABASE_ANON_KEY),
        },
        body: JSON.stringify({ resumo })
      });
      const json = await res.json();
      console.log('financial-tips status:', res.status, 'response:', json);
      if (json.tips && json.tips.length > 0) {
        setAiTips(json.tips);
      } else {
        throw new Error(json.error || 'Resposta vazia da API');
      }
    } catch (err) {
      console.error('Erro dicas IA:', err);
      // Fallback dinâmico baseado nos dados reais
      const fallback = [];
      if (expenses > income) {
        fallback.push('⚠️ Suas saídas (' + formatCurrency(expenses) + ') superam as entradas (' + formatCurrency(income) + '). Revise os maiores gastos urgentemente.');
      } else {
        fallback.push('✅ Você economizou ' + formatCurrency(income - expenses) + ' este mês (' + (income > 0 ? ((( income - expenses) / income) * 100).toFixed(0) : 0) + '% da renda). Excelente!');
      }
      if (expensesByCategory.length > 0) {
        const top = expensesByCategory[0];
        fallback.push('📊 Seu maior gasto é "' + top.name + '" com ' + formatCurrency(top.value) + ' (' + (income > 0 ? ((top.value / income) * 100).toFixed(0) : 0) + '% da renda). Veja se há como reduzir.');
      }
      fallback.push('🎯 Meta recomendada: reserve ' + formatCurrency(income * 0.1) + ' (10% da renda) todo mês como poupança de emergência.');
      setAiTips(fallback);
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

  const deleteTransaction = (id) => {
    setConfirmModal({
      open: true,
      message: 'Deseja realmente excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmModal({ open: false, message: '', onConfirm: null });
        try {
          const { error } = await supabase
            .from('finance_transactions')
            .delete()
            .eq('id', id);
          if (error) throw error;
          setTransactions(prev => prev.filter(t => t.id !== id));
          showToast('Transação excluída com sucesso.', 'success');
        } catch (error) {
          console.error('Erro ao excluir transação:', error);
          showToast('Erro ao excluir transação: ' + error.message, 'error');
        }
      }
    });
  };

  const deleteCategory = (id) => {
    const hasTransactions = transactions.some(t => t.category_id === id);
    if (hasTransactions) {
      showToast('Não é possível excluir uma categoria com transações associadas.', 'warning');
      return;
    }
    setConfirmModal({
      open: true,
      message: 'Deseja realmente excluir esta categoria? Esta ação não pode ser desfeita.',
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
          console.error('Erro ao excluir categoria:', error);
          showToast('Erro ao excluir categoria: ' + error.message, 'error');
        }
      }
    });
  };

  // Enviar relatório mensal por e-mail via Supabase Edge Function
  const handleSendMonthlyReport = async () => {
    if (sendingReport) return;
    setSendingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const now = new Date();
      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();

      // Totais do relatório são calculados após o fetch completo do Supabase (veja abaixo)

      // Busca TODAS as transações do mês diretamente do Supabase para garantir
      // que o relatório não seja limitado pela paginação da tela (pageSize)
      const reportYear  = now.getFullYear();
      const reportMonth = now.getMonth();
      const firstDay = new Date(reportYear, reportMonth, 1).toISOString().split('T')[0];
      const lastDay  = new Date(reportYear, reportMonth + 1, 0).toISOString().split('T')[0];

      const { data: allMonthTx } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false });

      const allTx = allMonthTx || [];
      // Recalcular totais com todos os dados do mês (ignora filtro de mês da UI)
      const reportIncome   = allTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const reportExpenses = allTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const reportBalance  = reportIncome - reportExpenses;

      const txList = allTx.map(t => {
          const cat = categories.find(c => c.id === t.category_id);
          const [y, m, d] = t.date.split('-');
          return {
            date: d + '/' + m + '/' + y,
            description: t.description,
            category: cat?.name || '-',
            amount: t.amount,
            type: t.type,
          };
        });

      const { data: { session: sess2 } } = await supabase.auth.getSession();
      // Extrair URL base do cliente Supabase (funciona independente de env vars)
      const supabaseUrl = (supabase).supabaseUrl
        || (supabase).restUrl?.replace('/rest/v1','')
        || process.env.REACT_APP_SUPABASE_URL
        || '';

      const res = await fetch(supabaseUrl + '/functions/v1/send-monthly-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (sess2?.access_token || token || ''),
          'apikey': (supabase).supabaseKey || process.env.REACT_APP_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          to: currentUser.email,
          userName: currentUser.name || currentUser.email.split('@')[0],
          month,
          year,
          income: reportIncome,
          expenses: reportExpenses,
          balance: reportBalance,
          transactions: txList,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast('Relatório enviado para ' + currentUser.email, 'success');
      } else {
        showToast('Erro ao enviar relatório. Tente novamente.', 'error');
      }
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    } finally {
      setSendingReport(false);
    }
  };

  // ── Relatório mensal automático ─────────────────────────────────────────────
  // Verifica 1x por hora se é o último dia do mês e envia o relatório automaticamente
  // se ainda não foi enviado hoje (controle via localStorage por usuário).
  useEffect(() => {
    if (!currentUser) return;

    const tryAutoReport = async () => {
      const today = new Date();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      if (today.getDate() !== lastDayOfMonth) return; // não é o último dia

      const storageKey = `financeapp_autoreport_${currentUser.id}_${today.getFullYear()}_${today.getMonth()}`;
      try {
        const alreadySent = localStorage.getItem(storageKey);
        if (alreadySent) return; // já enviou este mês
      } catch {}

      // Buscar todas as transações do mês
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { data: allTx } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false });

      const txs = allTx || [];
      if (txs.length === 0) return; // mês sem transações, não envia

      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const autoIncome   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const autoExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const autoBalance  = autoIncome - autoExpenses;

      const txList = txs.map(t => {
        const cat = categories.find(c => c.id === t.category_id);
        const [y, m, d] = t.date.split('-');
        return { date: d+'/'+m+'/'+y, description: t.description, category: cat?.name||'-', amount: t.amount, type: t.type };
      });

      try {
        const supabaseUrl = (supabase).supabaseUrl || process.env.REACT_APP_SUPABASE_URL || '';
        const res = await fetch(supabaseUrl + '/functions/v1/send-monthly-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token,
            'apikey': (supabase).supabaseKey || process.env.REACT_APP_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            to: currentUser.email,
            userName: currentUser.name || currentUser.email.split('@')[0],
            month: monthNames[today.getMonth()],
            year: today.getFullYear(),
            income: autoIncome,
            expenses: autoExpenses,
            balance: autoBalance,
            transactions: txList,
          }),
        });
        if (res.ok) {
          try { localStorage.setItem(storageKey, '1'); } catch {}
          showToast('Relatório mensal enviado automaticamente para ' + currentUser.email, 'success');
        }
      } catch (err) {
        console.error('Erro no relatório automático:', err);
      }
    };

    tryAutoReport(); // verifica ao carregar
    const autoInterval = setInterval(tryAutoReport, 60 * 60 * 1000); // e a cada 1 hora
    return () => clearInterval(autoInterval);
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // ─────────────────────────────────────────────────────────────────────────

  // Busca eventos do Google Calendar com base no filtro selecionado
  const fetchCalendarEvents = async (filter) => {
    setLoadingCalendar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Tenta provider_token da sessão atual, senão usa o salvo no localStorage
      const token = session?.provider_token || localStorage.getItem('financeapp_gtoken');

      if (!token) {
        showToast('Sessão do Google expirada. Faça login novamente para usar a Agenda.', 'warning');
        setLoadingCalendar(false);
        return;
      }

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

      // Token expirado (401) — limpa o cache e avisa
      if (response.status === 401) {
        localStorage.removeItem('financeapp_gtoken');
        showToast('Sessão do Google expirada. Faça login novamente para usar a Agenda.', 'warning');
        setLoadingCalendar(false);
        return;
      }

      const data = await response.json();
      setCalendarEvents(data.items || []);
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao carregar eventos do Google Calendar', 'error');
    } finally {
      setLoadingCalendar(false);
    }
  };

  // ── Toast helpers (dentro do componente para evitar erro ESLint no-undef) ─
  const toastIcons = {
    success: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{flexShrink:0,marginTop:1}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    warning: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    error:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  };
  const toastBorder = { success: '#16a34a', warning: '#d97706', error: '#dc2626' };
  const toastLabel  = { success: 'Sucesso', warning: 'Aviso', error: 'Erro' };
  // ─────────────────────────────────────────────────────────────────────────

  if (checkingSession) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-10 h-10 text-blue-500 animate-pulse" />
          <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>FinanceApp</span>
        </div>
        <div className="flex gap-1.5 mt-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* Banner de instalação PWA */}
      {showInstallBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex items-center justify-between gap-3 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1e40af, #7c3aed)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-white font-semibold text-sm">Instalar FinanceApp</p>
              <p className="text-blue-200 text-xs">Acesse rápido pela tela inicial do celular</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Instalar
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-blue-200 hover:text-white text-xl px-2"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Wallet className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  FinanceApp
                </h1>
              </div>

              <nav className="hidden md:flex items-center gap-2">
                {[
                  { key: 'dashboard',    label: 'Dashboard',  Icon: LayoutDashboard },
                  { key: 'transactions', label: 'Transações', Icon: ArrowLeftRight  },
                  { key: 'scheduled',    label: 'Agenda',     Icon: CalendarDays    },
                  { key: 'reports',      label: 'Relatórios', Icon: BarChart2       },
                ].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      view === key
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
                {/* Seletor de mês no lugar de Categorias */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <button
                  aria-label="Mes anterior"
                  onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
                  className={`p-1 rounded transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`text-sm font-semibold min-w-[110px] text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                <button
                  aria-label="Proximo mes"
                  onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}
                  className={`p-1 rounded transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {/* Botão Nova Transação no header - visível só na aba Transações */}
                {view === 'transactions' && (
                  <button
                    onClick={() => setShowTransactionModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Transação
                  </button>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Botão modo escuro */}
              <button
                aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Menu do usuário */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(m => !m)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {/* Avatar */}
                  {googlePhotoUrl ? (
                    <img src={googlePhotoUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {(currentUser?.name || currentUser?.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuário'}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    {/* Overlay para fechar */}
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
                        onClick={async () => {
                          setShowUserMenu(false);
                          setIsLoggingOut(true);
                          try {
                            await supabase.auth.signOut();
                            // setCurrentUser(null) chamado automaticamente pelo onAuthStateChange
                          } catch (error) {
                            console.error('Erro ao fazer logout:', error);
                            setIsLoggingOut(false);
                          }
                        }}
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

          <div className="flex md:hidden gap-2 mt-4 overflow-x-auto">
            {[
              { key: 'dashboard',    label: 'Dashboard',  Icon: LayoutDashboard },
              { key: 'transactions', label: 'Transações', Icon: ArrowLeftRight  },
              { key: 'scheduled',    label: 'Agenda',     Icon: CalendarDays    },
              { key: 'reports',      label: 'Relatórios', Icon: BarChart2       },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  view === key
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            {/* Seletor de mês mobile */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border whitespace-nowrap ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <button aria-label="Mes anterior" onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className={`p-1 rounded ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
              </span>
              <button aria-label="Proximo mes" onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className={`p-1 rounded ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Banner de Agenda - Apenas no Dashboard */}
        {view === 'dashboard' && (todayEvents.length > 0 || tomorrowEvents.length > 0) && (
          <div className={`mb-6 rounded-xl backdrop-blur-sm ${
            darkMode 
              ? 'bg-blue-900/20 border border-blue-700/30' 
              : 'bg-blue-50/80 border border-blue-200/50'
          } p-4 shadow-lg`}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Sua Agenda
              </h3>
              <button
                onClick={() => setView('scheduled')}
                className={`ml-auto text-xs font-medium ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                } underline`}
              >
                Ver completa ->
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Hoje */}
              <div>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Hoje
                </p>
                {todayEvents.length > 0 ? (
                  <div className="space-y-1.5">
                    {todayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`p-2 rounded-lg ${
                          darkMode ? 'bg-gray-800/50' : 'bg-white/70'
                        } backdrop-blur-sm`}
                      >
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {event.summary || 'Sem título'}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Horario: {event.start?.dateTime 
                            ? new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            : 'Dia inteiro'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Nenhum evento
                  </p>
                )}
              </div>

              {/* Amanhã */}
              <div>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Amanha
                </p>
                {tomorrowEvents.length > 0 ? (
                  <div className="space-y-1.5">
                    {tomorrowEvents.map(event => (
                      <div
                        key={event.id}
                        className={`p-2 rounded-lg ${
                          darkMode ? 'bg-gray-800/50' : 'bg-white/70'
                        } backdrop-blur-sm`}
                      >
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {event.summary || 'Sem título'}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Horario: {event.start?.dateTime 
                            ? new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            : 'Dia inteiro'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Nenhum evento
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Banner de alerta - nova posição: antes dos cards */}
        {upcomingDueDates.length > 0 && view === 'dashboard' && (
          <div className="mb-6 rounded-lg p-4 flex items-start gap-3"
            style={{ background: darkMode ? 'rgba(124,45,18,0.3)' : '#f97316', border: darkMode ? '2px solid #c2410c' : '2px solid #ea580c' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ffffff' }} />
            <div>
              <p className="font-semibold" style={{ color: '#ffffff' }}>
                Atenção: Você tem {upcomingDueDates.length} conta{upcomingDueDates.length > 1 ? 's' : ''} vencendo nos próximos 5 dias.
              </p>
              <button
                onClick={() => setView('scheduled')}
                className="text-sm underline mt-1 font-medium"
                style={{ color: '#ffffff', opacity: 0.9 }}
              >
                Ver detalhes
              </button>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Card Entradas - Clicável */}
              <button
                onClick={() => { setView('transactions'); setFilterType('income'); }}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Entradas</h3>
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600 mb-3">{formatCurrency(income)}</p>
                {incomeVar === null ? null : incomeVar.isFirst ? (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Primeiro registro</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${incomeVar.up ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                      {incomeVar.up ? '▲' : '▼'} {incomeVar.pct}%
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs mês anterior</span>
                  </div>
                )}
              </button>

              {/* Card Saídas - Clicável */}
              <button
                onClick={() => { setView('transactions'); setFilterType('expense'); }}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Saídas</h3>
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600 mb-3">{formatCurrency(expenses)}</p>
                {expensesVar === null ? null : expensesVar.isFirst ? (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Primeiro registro</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${expensesVar.up ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                      {expensesVar.up ? '▲' : '▼'} {expensesVar.pct}%
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs mês anterior</span>
                  </div>
                )}
              </button>

              {/* Card Saldo - Clicável */}
              <button
                onClick={() => { setView('transactions'); setFilterType('all'); }}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Saldo</h3>
                  <div className={`${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'} p-2 rounded-lg`}>
                    <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold mb-3 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
                {balanceVar === null ? null : balanceVar.isFirst ? (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Primeiro registro</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${balanceVar.up ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                      {balanceVar.up ? '▲' : '▼'} {balanceVar.pct}%
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs mês anterior</span>
                  </div>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Card Gastos por Categoria */}
              {expensesByCategory.length > 0 && (
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
                  <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Gastos por Categoria
                  </h3>
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
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [formatCurrency(value), name]}
                        contentStyle={{
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          border: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: darkMode ? '#f9fafb' : '#111827',
                          fontSize: '13px',
                        }}
                        labelStyle={{ color: darkMode ? '#f9fafb' : '#111827', fontWeight: 600 }}
                        itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span style={{ color: darkMode ? '#d1d5db' : '#374151', fontSize: '13px' }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Card Balanço Mensal */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 flex flex-col`}>
                <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Balanço Mensal
                </h3>

                {/* Gráfico de barras */}
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={[{ name: currentDate.toLocaleDateString('pt-BR', { month: 'short' }), Receitas: income, Despesas: expenses }]}
                      barCategoryGap="40%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
                      <XAxis dataKey="name" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: darkMode ? '#ffffff' : '#000000'
                        }}
                      />
                      <Bar dataKey="Receitas" fill="#16a34a" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Resumo */}
                <div className={`mt-4 rounded-xl p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center py-2">
                    <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Receitas</span>
                    <span className="font-bold text-green-500">{formatCurrency(income)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Despesas</span>
                    <span className="font-bold text-red-500">{formatCurrency(expenses)}</span>
                  </div>
                  <div className={`flex justify-between items-center py-2 mt-1 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Balanço</span>
                    <span className={`font-bold text-lg ${(income - expenses) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                      {formatCurrency(income - expenses)}
                    </span>
                  </div>
                </div>

                {/* Ver mais */}
                <button
                  onClick={() => setView('transactions')}
                  className={`mt-4 text-sm font-semibold tracking-wide transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  VER MAIS
                </button>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Poupometro
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
                        ? 'Parabéns! Você atingiu sua meta de poupança.' 
                        : `Faltam ${formatCurrency(savingsGoal - savingsAmount)} para atingir a meta`}
                    </p>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Dica: lance valores na categoria "Poupanca" para alimentar o poupometro.
                  </p>
                </>
              ) : (
                <div>
                  <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Defina uma meta mensal de poupança para acompanhar seu progresso.
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Crie lancamentos na categoria "Poupanca" e veja sua evolucao aqui.
                  </p>
                </div>
              )}
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Dicas Financeiras Personalizadas
              </h3>
              
              {!showTips ? (
                <button
                  onClick={async () => { setShowTips(true); await gerarDicasIA(); }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  ✨ Gerar Dicas com IA
                </button>
              ) : (
                <div className="space-y-3">
                  {aiTips.map((tip, index) => (
                    <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                      <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{tip}</p>
                    </div>
                  ))}
                  <div className="flex gap-4 mt-1">
                    <button
                      onClick={gerarDicasIA}
                      className={`text-sm font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      🔄 Regerar dicas
                    </button>
                    <button
                      onClick={() => setShowTips(false)}
                      className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} underline`}
                    >
                      Ocultar dicas
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setShowTransactionModal(true)}
                className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Adicionar Lançamento
              </button>
            </div>
          </>
        )}

        {view === 'transactions' && (
          <>
            <div className="mb-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
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
                    Entradas
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterType === 'expense'
                        ? 'bg-red-600 text-white'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Saídas
                  </button>
                </div>

                {/* Campo de busca */}
                <div className="mt-3 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por descricao..."
                    className={`w-full pl-9 pr-9 py-2 rounded-lg text-sm border transition-colors outline-none ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400'
                    }`}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      {/* Data - clicavel, alterna asc/desc */}
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold cursor-pointer select-none ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setSortBy(sortBy === 'date-asc' ? 'date-desc' : 'date-asc')}
                      >
                        <span className="flex items-center gap-1">
                          Data
                          <span className="text-xs">
                            {sortBy === 'date-asc' ? '↑' : sortBy === 'date-desc' ? '↓' : '↕'}
                          </span>
                        </span>
                      </th>
                      {/* Descricao - clicavel */}
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold cursor-pointer select-none ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setSortBy(sortBy === 'description-asc' ? 'description-desc' : 'description-asc')}
                      >
                        <span className="flex items-center gap-1">
                          Descrição
                          <span className="text-xs">
                            {sortBy === 'description-asc' ? '↑' : sortBy === 'description-desc' ? '↓' : '↕'}
                          </span>
                        </span>
                      </th>
                      {/* Categoria - clicavel */}
                      <th
                        className={`px-6 py-4 text-left text-sm font-semibold cursor-pointer select-none ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setSortBy(sortBy === 'category-asc' ? 'category-desc' : 'category-asc')}
                      >
                        <span className="flex items-center gap-1">
                          Categoria
                          <span className="text-xs">
                            {sortBy === 'category-asc' ? '↑' : sortBy === 'category-desc' ? '↓' : '↕'}
                          </span>
                        </span>
                      </th>
                      {/* Valor - clicavel */}
                      <th
                        className={`px-6 py-4 text-right text-sm font-semibold cursor-pointer select-none ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setSortBy(sortBy === 'amount-asc' ? 'amount-desc' : 'amount-asc')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Valor
                          <span className="text-xs">
                            {sortBy === 'amount-asc' ? '↑' : sortBy === 'amount-desc' ? '↓' : '↕'}
                          </span>
                        </span>
                      </th>
                      {filterType !== 'income' && (
                        <th className={`w-24 py-4 text-center text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pago?</th>
                      )}
                      <th className={`px-6 py-4 text-center text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      let filtered = currentMonthTransactions;

                      if (filterType !== 'all') {
                        filtered = filtered.filter(t => t.type === filterType);
                      }

                      if (searchTerm.trim()) {
                        const term = searchTerm.trim().toLowerCase();
                        filtered = filtered.filter(t =>
                          (t.description || '').toLowerCase().includes(term)
                        );
                      }

                      filtered = [...filtered].sort((a, b) => {
                        switch (sortBy) {
                          case 'date-desc':
                            return new Date(b.date).getTime() - new Date(a.date).getTime();
                          case 'date-asc':
                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                          case 'description-asc':
                            return a.description.localeCompare(b.description);
                          case 'description-desc':
                            return b.description.localeCompare(a.description);
                          case 'amount-desc':
                            return b.amount - a.amount;
                          case 'amount-asc':
                            return a.amount - b.amount;
                          case 'category-asc': {
                            const catA = categories.find(c => c.id === a.category_id)?.name || '';
                            const catB = categories.find(c => c.id === b.category_id)?.name || '';
                            return catA.localeCompare(catB);
                          }
                          case 'category-desc': {
                            const catA = categories.find(c => c.id === a.category_id)?.name || '';
                            const catB = categories.find(c => c.id === b.category_id)?.name || '';
                            return catB.localeCompare(catA);
                          }
                          default:
                            return 0;
                        }
                      });

                      const totalFiltered = filtered.length;
                      const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
                      const safePage = Math.min(currentPage, totalPages);
                      const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

                      return (
                        <>
                          {paginated.length > 0 ? (
                            paginated.map(transaction => {
                              const category = categories.find(c => c.id === transaction.category_id);
                              return (
                                <tr key={transaction.id} className={`transition-colors ${
                                  transaction.is_paid
                                    ? darkMode ? 'bg-green-900/20 hover:bg-green-900/30' : 'bg-green-50 hover:bg-green-100'
                                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                                }`}>
                                  <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {formatDate(transaction.date)}
                                  </td>
                                  <td className={`px-6 py-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {transaction.description}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                                      style={{ backgroundColor: category?.color }}
                                    >
                                      {category?.name}
                                    </span>
                                  </td>
                                  <td className={`px-6 py-4 text-right font-semibold ${
                                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                                  </td>
                                  {transaction.type === 'expense' && filterType !== 'income' ? (
                                    <td className="w-28 py-4 text-center">
                                      <button
                                        onClick={() => toggleTransactionPaid(transaction)}
                                        title={transaction.is_paid ? 'Clique para desmarcar' : 'Clique para marcar como pago'}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                          transaction.is_paid
                                            ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                                            : darkMode
                                              ? 'border-gray-500 text-gray-400 hover:border-green-400 hover:text-green-400'
                                              : 'border-gray-300 text-gray-400 hover:border-green-500 hover:text-green-600'
                                        }`}
                                      >
                                        {transaction.is_paid ? (
                                          <>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Pago
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                            </svg>
                                            Pagar
                                          </>
                                        )}
                                      </button>
                                    </td>
                                  ) : filterType !== 'income' ? (
                                    <td className="w-24 py-4" />
                                  ) : null}
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        aria-label="Editar transacao"
                                        onClick={() => {
                                          // Setar editingTransaction ANTES de abrir o modal
                                          // evita que o modal monte com state vazio
                                          setEditingTransaction(transaction);
                                          setTimeout(() => setShowTransactionModal(true), 0);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        aria-label="Excluir transacao"
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
                                  {filterType !== 'all'
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

                {/* Resumo de pagamentos */}
                {currentMonthTransactions.filter(t => t.type === 'expense').length > 0 && (() => {
                  const despesas = currentMonthTransactions.filter(t => t.type === 'expense' && (filterType === 'all' || filterType === 'expense'));
                  const totalDespesas = despesas.reduce((s, t) => s + t.amount, 0);
                  const totalPago = despesas.filter(t => t.is_paid).reduce((s, t) => s + t.amount, 0);
                  const totalAPagar = totalDespesas - totalPago;
                  const pct = totalDespesas > 0 ? (totalPago / totalDespesas) * 100 : 0;
                  if (filterType === 'income') return null;
                  return (
                    <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex flex-wrap gap-4 justify-between items-center mb-3">
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pago:</span>
                            <span className="text-sm font-bold text-green-500">{formatCurrency(totalPago)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>A pagar:</span>
                            <span className="text-sm font-bold text-orange-400">{formatCurrency(totalAPagar)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`} />
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total:</span>
                            <span className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{formatCurrency(totalDespesas)}</span>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold ${pct === 100 ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {pct.toFixed(0)}% pago
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: pct + '%' }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {currentMonthTransactions.length > 0 && (
                  <div className={`px-6 py-3 border-t flex flex-wrap items-center justify-end gap-4 ${darkMode ? 'border-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Linhas por página:</span>
                      <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className={`text-sm px-2 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    {(() => {
                      let count = currentMonthTransactions;
                      if (filterType !== 'all') count = count.filter(t => t.type === filterType);
                      const total = count.length;
                      const totalPages = Math.max(1, Math.ceil(total / pageSize));
                      const safePage = Math.min(currentPage, totalPages);
                      const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
                      const to = Math.min(safePage * pageSize, total);
                      return (
                        <>
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{from}-{to} de {total}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} className={`px-2 py-1 rounded text-sm font-bold ${safePage === 1 ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>⏮</button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className={`px-2 py-1 rounded text-sm font-bold ${safePage === 1 ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>◄</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className={`px-2 py-1 rounded text-sm font-bold ${safePage === totalPages ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>►</button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className={`px-2 py-1 rounded text-sm font-bold ${safePage === totalPages ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>⏭</button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {view === 'scheduled' && (() => {
          const isGoogleConnected = !!googlePhotoUrl;

          if (!isGoogleConnected) {
            return (
              <AgendaCalendario
                darkMode={darkMode}
                scheduled={scheduled}
                transactions={transactions}
                currentDate={currentDate}
                categories={categories}
                formatCurrency={formatCurrency}
                setShowTransactionModal={setShowTransactionModal}
                setEditingTransaction={setEditingTransaction}
                googlePhotoUrl={googlePhotoUrl}
                handleGoogleLogin={handleGoogleLogin}
              />
            );
          }

          // ── GOOGLE CALENDAR (com Google conectado) ───────────────────────
          return (
            <>
              <div className="mb-6">
                <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Agenda Google Calendar
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { key: 'today',    label: 'Hoje' },
                    { key: 'tomorrow', label: 'Amanhã' },
                    { key: 'week',     label: 'Esta Semana' },
                    { key: 'month',    label: 'Este Mês' },
                  ].map(({ key, label }) => (
                    <button key={key}
                      onClick={() => { setCalendarFilter(key); fetchCalendarEvents(key); }}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        calendarFilter === key ? 'bg-blue-600 text-white'
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {loadingCalendar && calendarFilter === key ? '⏳ Carregando...' : label}
                    </button>
                  ))}
                </div>
                <p className={`text-sm mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {calendarFilter === 'today' && 'Mostrando: eventos de hoje'}
                  {calendarFilter === 'tomorrow' && 'Mostrando: eventos de amanhã'}
                  {calendarFilter === 'week' && 'Mostrando: eventos dos próximos 7 dias'}
                  {calendarFilter === 'month' && 'Mostrando: eventos deste mês'}
                </p>
              </div>
              <div className="grid gap-4">
                {calendarEvents.length === 0 ? (
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
                    <Calendar className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={`text-lg mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Selecione um período acima para carregar os eventos</p>
                  </div>
                ) : (
                  <>
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {calendarEvents.length} evento{calendarEvents.length !== 1 ? 's' : ''} encontrado{calendarEvents.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {calendarEvents.map(event => {
                      const done = !!eventStatus[event.id];
                      return (
                        <div key={event.id}
                          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}
                          style={{ border: done ? '1px solid #166534' : '1px solid transparent', transition: 'border-color 0.2s' }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold mb-2`}
                                style={{ color: done ? '#6b7280' : (darkMode ? '#f9fafb' : '#1f2937'), textDecoration: done ? 'line-through' : 'none', transition: 'all 0.2s' }}
                              >
                                {event.summary || 'Sem título'}
                              </h3>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Data: {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString('pt-BR') : event.start?.date || 'Data não definida'}
                              </p>
                              {event.description && <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.description}</p>}
                            </div>
                            <button
                              onClick={() => toggleEventStatus(event.id)}
                              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                              style={{
                                background: done ? '#166534' : '#78350f',
                                color: done ? '#bbf7d0' : '#fde68a',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {done ? '✓ Realizada' : '● Pendente'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          );
        })()}

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
                            aria-label="Editar categoria"
                            onClick={() => {
                              setEditingCategory(category);
                              setShowCategoryModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            aria-label="Excluir categoria"
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
                            aria-label="Editar categoria"
                            onClick={() => {
                              setEditingCategory(category);
                              setShowCategoryModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            aria-label="Excluir categoria"
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

      {showTransactionModal && <TransactionModal />}
      {showCategoryModal && <CategoryModal />}

      {/* Modal Configurações */}
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
              <button aria-label="Fechar configuracoes" onClick={() => setShowSettings(false)}>
                <X className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'} />
              </button>
            </div>

            <div className="p-6">
              <p className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                EXPORTAR / IMPORTAR DADOS
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { handleExportPDF(); setShowSettings(false); }}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </button>

                <button
                  onClick={() => { handleExportExcel(); setShowSettings(false); }}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar Excel
                </button>

                <button
                  onClick={() => { handleExport(); setShowSettings(false); }}
                  className={`flex items-center justify-center gap-2 ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } font-semibold py-3 rounded-xl transition-colors`}
                >
                  <Download className="w-4 h-4" />
                  Exportar Backup
                </button>

                <label className={`flex items-center justify-center gap-2 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                } font-semibold py-3 rounded-xl transition-colors cursor-pointer`}>
                  <Upload className="w-4 h-4" />
                  Importar Dados
                  <input type="file" accept=".json" onChange={(e) => { handleImport(e); setShowSettings(false); }} className="hidden" />
                </label>
              </div>

              {/* Relatório mensal por e-mail */}
              <div className={`mt-5 pt-5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  RELATORIO MENSAL
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
                  {sendingReport ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Enviar Relatório por E-mail
                    </>
                  )}
                </button>
                <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Será enviado para {currentUser?.email}
                </p>
              </div>

              {/* Categorias dentro das Configurações */}
              <div className={`mt-5 pt-5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  CATEGORIAS
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Despesas</p>
                    {categories.filter(c => c.type === 'expense').map(cat => (
                      <div key={cat.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: cat.color}} />
                          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button aria-label="Editar categoria" onClick={() => { setEditingCategory(cat); setShowSettings(false); setShowCategoryModal(true); }} className="p-1 opacity-50 hover:opacity-100"><Edit2 className="w-3 h-3 text-blue-500" /></button>
                          <button aria-label="Excluir categoria" onClick={() => deleteCategory(cat.id)} className="p-1 opacity-50 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-500" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Receitas</p>
                    {categories.filter(c => c.type === 'income').map(cat => (
                      <div key={cat.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: cat.color}} />
                          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button aria-label="Editar categoria" onClick={() => { setEditingCategory(cat); setShowSettings(false); setShowCategoryModal(true); }} className="p-1 opacity-50 hover:opacity-100"><Edit2 className="w-3 h-3 text-blue-500" /></button>
                          <button aria-label="Excluir categoria" onClick={() => deleteCategory(cat.id)} className="p-1 opacity-50 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-500" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setEditingCategory(null); setShowSettings(false); setShowCategoryModal(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nova Categoria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Definir Meta de Economia
                </h2>
                <button aria-label="Fechar meta de economia" onClick={() => {
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
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Lance valores na categoria "Poupanca" (entrada ou saida) para alimentar o poupometro
                </p>
              </div>

              <button
                onClick={() => {
                  if (goalInput && !isNaN(parseFloat(goalInput)) && parseFloat(goalInput) > 0) {
                    setSavingsGoal(parseFloat(goalInput));
                    setShowGoalModal(false);
                    setGoalInput('');
                  } else {
                    showToast('Digite um valor válido.', 'warning');
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

        {view === 'reports' && (() => {
          // Last 6 months data for line/bar charts
          const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - (5 - i));
            const y = d.getFullYear();
            const m = d.getMonth();
            const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            const monthTx = transactions.filter(t => {
              // Parseia YYYY-MM-DD diretamente para evitar shift de timezone UTC
              const [ty, tm] = t.date.split('-').map(Number);
              return ty === y && (tm - 1) === m && t.user_id === currentUser.id;
            });
            const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            return { label, Entradas: inc, Saídas: exp, Saldo: inc - exp };
          });

          // Pie data
          const pieExpenses = categories
            .filter(c => c.type === 'expense')
            .map(c => ({
              name: c.name, color: c.color,
              value: currentMonthTransactions.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            })).filter(c => c.value > 0);

          const pieIncomes = categories
            .filter(c => c.type === 'income')
            .map(c => ({
              name: c.name, color: c.color,
              value: currentMonthTransactions.filter(t => t.category_id === c.id && t.type === 'income').reduce((s, t) => s + t.amount, 0)
            })).filter(c => c.value > 0);

          const pieData = reportFilter === 'expenses-category' ? pieExpenses : pieIncomes;
          const totalPie = pieData.reduce((s, c) => s + c.value, 0);

          return (
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Relatórios
              </h2>

              {/* Chart type selector + filter */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                {/* Chart type buttons */}
                <div className={`flex gap-2 p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  {[
                    { key: 'pie',  icon: '', label: 'Pizza' },
                    { key: 'line', icon: '', label: 'Linha' },
                    { key: 'bar',  icon: '', label: 'Barras' },
                  ].map(({ key, icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setReportChart(key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        reportChart === key
                          ? 'bg-blue-600 text-white shadow'
                          : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span>{icon}</span> {label}
                    </button>
                  ))}
                </div>

                {/* Filter selector */}
                <div className={`flex gap-2 p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  {[
                    { key: 'expenses-category', label: 'Despesas por categoria' },
                    { key: 'income-category',   label: 'Receitas por categoria' },
                    { key: 'balance',            label: 'Saldo mensal' },
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

              {/* Chart card */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
                <h3 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  {reportFilter === 'expenses-category' ? 'Despesas por Categoria' :
                   reportFilter === 'income-category'   ? 'Receitas por Categoria' :
                   'Evolucao Mensal - Ultimos 6 meses'}
                  {reportFilter !== 'balance' && (
                    <span className={`ml-3 text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </span>
                  )}
                </h3>

                {/* PIE CHART */}
                {reportChart === 'pie' && reportFilter !== 'balance' && (
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={130} paddingAngle={3} dataKey="value">
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb', borderRadius: '8px', color: darkMode ? '#f9fafb' : '#111827', fontSize: '13px' }} labelStyle={{ color: darkMode ? '#f9fafb' : '#111827', fontWeight: 600 }} itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 self-center">
                      {pieData.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            <span className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm font-semibold ${reportFilter === 'expenses-category' ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(cat.value)}</div>
                            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{totalPie > 0 ? ((cat.value / totalPie) * 100).toFixed(1) : 0}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PIE for balance - show bar instead */}
                {reportChart === 'pie' && reportFilter === 'balance' && (
                  <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                    <div style={{ minWidth: 500 }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={last6Months} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
                          <XAxis dataKey="label" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb', borderRadius: '8px', color: darkMode ? '#f9fafb' : '#111827', fontSize: '13px' }} labelStyle={{ color: darkMode ? '#f9fafb' : '#111827', fontWeight: 600 }} itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} />
                          <Legend />
                          <Bar dataKey="Entradas" fill="#16a34a" radius={[4,4,0,0]} />
                          <Bar dataKey="Saídas" fill="#dc2626" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* LINE CHART */}
                {reportChart === 'line' && (
                  <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                    <div style={{ minWidth: 500 }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={last6Months}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
                          <XAxis dataKey="label" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb', borderRadius: '8px', color: darkMode ? '#f9fafb' : '#111827', fontSize: '13px' }} labelStyle={{ color: darkMode ? '#f9fafb' : '#111827', fontWeight: 600 }} itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} />
                          <Legend />
                          {reportFilter === 'balance' ? (
                            <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6' }} />
                          ) : reportFilter === 'expenses-category' ? (
                            <Line type="monotone" dataKey="Saídas" stroke="#dc2626" strokeWidth={3} dot={{ r: 5, fill: '#dc2626' }} />
                          ) : (
                            <Line type="monotone" dataKey="Entradas" stroke="#16a34a" strokeWidth={3} dot={{ r: 5, fill: '#16a34a' }} />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* BAR CHART */}
                {reportChart === 'bar' && (
                  <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                    <div style={{ minWidth: Math.max(500, pieData.length * 80) }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={reportFilter !== 'balance' ? pieData.map(d => ({ name: d.name, Valor: d.value, color: d.color })) : last6Months} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
                          <XAxis dataKey="name" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                          <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb', borderRadius: '8px', color: darkMode ? '#f9fafb' : '#111827', fontSize: '13px' }} labelStyle={{ color: darkMode ? '#f9fafb' : '#111827', fontWeight: 600 }} itemStyle={{ color: darkMode ? '#e5e7eb' : '#374151' }} />
                          {reportFilter === 'balance' ? (
                            <>
                              <Legend />
                              <Bar dataKey="Entradas" fill="#16a34a" radius={[4,4,0,0]} />
                              <Bar dataKey="Saídas" fill="#dc2626" radius={[4,4,0,0]} />
                              <Bar dataKey="Saldo" fill="#3b82f6" radius={[4,4,0,0]} />
                            </>
                          ) : (
                            <Bar dataKey="Valor" radius={[4,4,0,0]}>
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}


      {/* ── Modal de confirmação (substitui window.confirm) ──────────────── */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60 p-4">
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

      {/* Onboarding modal para novos usuários */}
      {onboardingStep > 0 && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {onboardingStep === 1 && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">👋</div>
                  <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Bem-vindo ao FinanceApp!</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vamos configurar seu app em 2 passos rápidos para você começar a controlar suas finanças.</p>
                </div>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: '🏷️', title: 'Crie suas categorias', desc: 'Ex: Moradia, Alimentação, Salário' },
                    { icon: '💸', title: 'Registre transações', desc: 'Entradas e saídas do mês' },
                    { icon: '📊', title: 'Acompanhe seus gastos', desc: 'Gráficos e relatórios automáticos' },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-700'}`}>{item.title}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setOnboardingStep(0)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    Pular
                  </button>
                  <button onClick={() => setOnboardingStep(2)} className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                    Começar →
                  </button>
                </div>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🏷️</div>
                  <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Suas Categorias</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Já criamos categorias padrão para você! Vá em <strong>Configurações</strong> para personalizar.</p>
                </div>
                <div className={`p-4 rounded-xl mb-6 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>💡 Dica rápida:</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Use o botão <strong>"+ Nova Transação"</strong> no topo para registrar sua primeira entrada ou saída. No celular, use o botão <strong>+</strong> no canto inferior direito!</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setOnboardingStep(1)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    ← Voltar
                  </button>
                  <button
                    onClick={() => { setOnboardingStep(0); setEditingTransaction(null); setShowTransactionModal(true); }}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    + Primeira transação!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toast container ─────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{minWidth: 300, maxWidth: 380}}>
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto flex items-start gap-3 rounded-r-xl p-3 pr-4 shadow-lg"
            style={{
              background: darkMode ? '#1f2937' : '#ffffff',
              border: `0.5px solid ${toastBorder[toast.type]}`,
              borderLeft: `4px solid ${toastBorder[toast.type]}`,
            }}
          >
            {toastIcons[toast.type]}
            <div className="flex-1">
              <p className={`text-sm font-semibold mb-0.5 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{toastLabel[toast.type]}</p>
              <p className={`text-xs leading-snug ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className={`ml-1 mt-0.5 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Botão flutuante + Nova Transação (apenas mobile, apenas logado) */}
      {currentUser && (
        <button
          onClick={() => { setEditingTransaction(null); setShowTransactionModal(true); }}
          className="fixed bottom-6 right-6 z-50 md:hidden w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-all active:scale-95"
          aria-label="Nova transação"
          title="Nova transação"
        >
          +
        </button>
      )}

    </div>
  );
}
