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
  Mail
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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
  { id: 'cat-18', name: 'Intenet+Balcão', color: '#0284c7', type: 'expense', user_id: null },
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [googlePhotoUrl, setGooglePhotoUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [aiTips, setAiTips] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState('week'); // 'today', 'tomorrow', 'week', 'month'
  const [todayEvents, setTodayEvents] = useState([]);
  const [tomorrowEvents, setTomorrowEvents] = useState([]);

  // Verificar sessão existente ao abrir o app — pula tela de login se já logado
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const googleUser = session.user;
          const { data: existingUser } = await supabase
            .from('finance_users')
            .select('*')
            .eq('email', googleUser.email);

          if (existingUser && existingUser.length > 0) {
            setCurrentUser(existingUser[0]);
            setGooglePhotoUrl(googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture || null);
          }
        }
      } catch (e) {
        console.error('Erro ao restaurar sessão:', e);
      } finally {
        setCheckingSession(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
      requestNotificationPermission();
      // Aguarda provider_token do Google OAuth antes de carregar eventos/notificacoes
      const initWithSession = async () => {
        let attempts = 0;
        const tryInit = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.provider_token || attempts >= 10) {
            // loadBannerEvents retorna os eventos e já dispara notificações
            // evitando depender do state todayEvents/tomorrowEvents que ainda está vazio
            const { todayEvts, tomorrowEvts } = await loadBannerEvents();
            checkUpcomingEvents(todayEvts, tomorrowEvts);
          } else {
            attempts++;
            setTimeout(tryInit, 500);
          }
        };
        await tryInit();
      };
      initWithSession();
    }
  }, [currentUser]);

  // Resetar pagina ao mudar filtro ou ordenacao
  useEffect(() => { setCurrentPage(1); }, [filterType, sortBy]);

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
    if (Notification.permission !== 'granted') return;

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
            new Notification('📅 Evento próximo!', {
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
      new Notification('💸 Conta vencendo HOJE!', {
        body: event.summary || 'Evento sem título',
        icon: '/favicon.ico'
      });
    });

    eventsTomorrow.forEach(event => {
      new Notification('⚠️ Conta vence AMANHÃ!', {
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
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

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
        alert('Erro ao fazer login com Google: ' + error.message);
      }
    };

    // Verificar se usuário logou com Google
    useEffect(() => {
      const checkGoogleAuth = async () => {
        if (isLoggingOut) return; // Não verificar se está fazendo logout
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Criar ou buscar usuário no banco
          const googleUser = session.user;
          
          try {
            // Verificar se já existe
            const { data: existingUser, error: checkError } = await supabase
              .from('finance_users')
              .select('*')
              .eq('email', googleUser.email);

            if (checkError) throw checkError;

            if (existingUser && existingUser.length > 0) {
              // Usuário já existe
              setCurrentUser(existingUser[0]);
              setGooglePhotoUrl(googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture || null);
            } else {
              // Criar novo usuário
              const newUser = {
                id: generateId(),
                name: googleUser.user_metadata?.full_name || googleUser.email?.split('@')[0],
                email: googleUser.email,
                password: 'google-oauth' // Senha placeholder para OAuth
              };

              const { data, error } = await supabase
                .from('finance_users')
                .insert([newUser])
                .select();

              if (error) throw error;

              setCurrentUser(data[0]);
              setGooglePhotoUrl(googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture || null);
            }
          } catch (error) {
            console.error('Erro ao processar login Google:', error);
            alert('Erro ao processar login: ' + error.message);
          }
        }
      };

      checkGoogleAuth();
    }, [isLoggingOut]);

    const handleAuth = async () => {
      if (isLogin) {
        try {
          const { data: users, error } = await supabase
            .from('finance_users')
            .select('*')
            .eq('email', email)
            .eq('password', password);

          if (error) throw error;

          if (users && users.length > 0) {
            setCurrentUser(users[0]);
          } else {
            alert('Credenciais inválidas!');
          }
        } catch (error) {
          console.error('Erro no login:', error);
          alert('Erro ao fazer login: ' + error.message);
        }
      } else {
        if (!name || !email || !password) {
          alert('Preencha todos os campos!');
          return;
        }

        try {
          const { data: existingUser, error: checkError } = await supabase
            .from('finance_users')
            .select('*')
            .eq('email', email);

          if (checkError) throw checkError;

          if (existingUser && existingUser.length > 0) {
            alert('Este e-mail já está cadastrado!');
            return;
          }

          const newUser = {
            id: generateId(),
            name,
            email,
            password
          };

          const { data, error } = await supabase
            .from('finance_users')
            .insert([newUser])
            .select();

          if (error) throw error;

          setCurrentUser(data[0]);
        } catch (error) {
          console.error('Erro ao cadastrar:', error);
          alert('Erro ao criar conta: ' + error.message);
        }
      }
    };

    const handleForgotPassword = async () => {
      if (!email) {
        alert('Digite seu e-mail para recuperar a senha!');
        return;
      }

      if (!newPassword || !confirmPassword) {
        alert('Preencha os campos de nova senha!');
        return;
      }

      if (newPassword !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
      }

      if (newPassword.length < 6) {
        alert('A senha deve ter no mínimo 6 caracteres!');
        return;
      }

      try {
        const { data: users, error: findError } = await supabase
          .from('finance_users')
          .select('*')
          .eq('email', email);

        if (findError) throw findError;

        if (!users || users.length === 0) {
          alert('E-mail não encontrado!');
          return;
        }

        const { error: updateError } = await supabase
          .from('finance_users')
          .update({ password: newPassword })
          .eq('email', email);

        if (updateError) throw updateError;

        alert('✅ Senha redefinida com sucesso!');
        setIsForgotPassword(false);
        setEmail('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        alert('Erro ao redefinir senha: ' + error.message);
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
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="E-mail cadastrado"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <input
                  type="password"
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  onClick={handleForgotPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Redefinir Senha
                </button>
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setEmail('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className={`w-full ${
                    darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
                  } font-medium py-2 transition-colors`}
                >
                  ← Voltar ao login
                </button>
              </div>
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
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  onClick={handleAuth}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {isLogin ? 'Entrar' : 'Criar Conta'}
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

  const TransactionModal = () => {
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
        alert('Preencha todos os campos!');
        return;
      }

      const baseTransaction = {
        user_id: currentUser.id,
        type: type === 'scheduled' ? 'expense' : type,
        amount: parseFloat(amount),
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
            amount: parseFloat(amount),
            description,
            category_id: categoryId,
            is_paid: false
          };
          
          const scheduledList = [];
          const months = parseInt(recurringMonths) || 1;
          
          for (let i = 0; i < months; i++) {
            const scheduledDate = new Date(date);
            scheduledDate.setMonth(scheduledDate.getMonth() + i);
            
            scheduledList.push({
              ...baseScheduled,
              id: generateId(), // ADICIONAR ID ÚNICO
              due_date: scheduledDate.toISOString().split('T')[0]
            });
          }
          
          const { data, error } = await supabase
            .from('finance_scheduled')
            .insert(scheduledList)
            .select();
          
          if (error) throw error;
          
          setScheduled([...scheduled, ...data]);
        } else {
          if (editingTransaction) {
            const { error } = await supabase
              .from('finance_transactions')
              .update(baseTransaction)
              .eq('id', editingTransaction.id);
            
            if (error) throw error;
            
            setTransactions(transactions.map(t =>
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
            
            setTransactions([...transactions, ...data]);
            
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
        alert('Erro ao salvar: ' + error.message);
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
        alert('Digite um nome para a categoria!');
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
        alert('Erro ao salvar categoria: ' + error.message);
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

  const savingsAmount = useMemo(() => {
    const savingsCategory = categories.find(c => 
      c.name.toLowerCase() === 'poupança' || c.name.toLowerCase() === 'poupanca'
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

    return Array.from(categoryMap.entries()).map(([categoryId, amount]) => {
      const category = categories.find(c => c.id === categoryId);
      return {
        name: category?.name || 'Sem categoria',
        value: amount,
        color: category?.color || '#666'
      };
    });
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
        if (t.user_id !== currentUser.id || t.type !== 'expense') return false;
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
        alert('❌ Erro: Usuário não identificado. Faça login novamente.');
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
      
      alert('✅ Backup criado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('❌ Erro ao criar backup: ' + error.message);
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
              id: generateId(), // ADICIONAR ID ÚNICO
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

        alert(`✅ Dados importados com sucesso!\n\n📊 ${mappedTransactions.length} transações\n🏷️ ${newCategories.length} novas categorias`);
        
        await loadUserData();
      } catch (error) {
        console.error('Erro na importação:', error);
        alert('❌ Erro ao importar dados: ' + error.message);
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
          <h1>📊 Relatório Financeiro</h1>
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
      
      alert('✅ Janela de impressão aberta! Use "Salvar como PDF" nas opções da impressora.');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('❌ Erro ao exportar PDF: ' + error.message);
    }
  };

  const handleExportExcel = () => {
    try {
      const periodo = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      // Aba 1: Resumo
      const wsResumo = XLSX.utils.aoa_to_sheet([
        ['RELATÓRIO FINANCEIRO'],
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
      
      const wsTransacoes = XLSX.utils.json_to_sheet(transData);
      
      // Adicionar ref de tabela para Excel reconhecer
      if (!wsTransacoes['!ref']) {
        wsTransacoes['!ref'] = 'A1:E' + (transData.length + 1);
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
      XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Transações');
      XLSX.utils.book_append_sheet(wb, wsCategorias, 'Categorias');
      
      // Exportar
      const fileName = `relatorio-${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert('✅ Relatório Excel exportado com sucesso!\n\nDica: No Excel, selecione os dados e vá em Inserir > Tabela Dinâmica para análises avançadas.');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('❌ Erro ao exportar Excel: ' + error.message);
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
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      alert('Erro ao excluir transação: ' + error.message);
    }
  };

  const deleteCategory = async (id) => {
    const hasTransactions = transactions.some(t => t.category_id === id);
    if (hasTransactions) {
      alert('❌ Não é possível excluir uma categoria com transações associadas!');
      return;
    }

    try {
      const { error } = await supabase
        .from('finance_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCategories(categories.filter(c => c.id !== id));
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      alert('Erro ao excluir categoria: ' + error.message);
    }
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

      const income   = currentMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const balance  = income - expenses;

      const txList = currentMonthTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(t => {
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
          income,
          expenses,
          balance,
          transactions: txList,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        alert('✅ Relatório enviado com sucesso para ' + currentUser.email + '!');
      } else {
        alert('❌ Erro ao enviar: ' + JSON.stringify(result.error || result));
      }
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setSendingReport(false);
    }
  };

  // Busca eventos do Google Calendar com base no filtro selecionado
  const fetchCalendarEvents = async (filter) => {
    setLoadingCalendar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        alert('❌ Faça login com Google para acessar o Calendar!');
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
        { headers: { Authorization: `Bearer ${session.provider_token}` } }
      );

      const data = await response.json();
      setCalendarEvents(data.items || []);
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao carregar eventos');
    } finally {
      setLoadingCalendar(false);
    }
  };

  if (checkingSession || loading) {
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
                {['dashboard', 'transactions', 'scheduled'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      view === v
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {v === 'dashboard' ? 'Dashboard' : v === 'transactions' ? 'Transações' : 'Agenda'}
                  </button>
                ))}
                {/* Seletor de mês no lugar de Categorias */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <button
                    onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
                    className={`p-1 rounded transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`text-sm font-semibold min-w-[110px] text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                  <button
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
                          try {
                            setIsLoggingOut(true);
                            await supabase.auth.signOut();
                            setCurrentUser(null);
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
            {['dashboard', 'transactions', 'scheduled'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-100'
                }`}
              >
                {v === 'dashboard' ? 'Dashboard' : v === 'transactions' ? 'Transações' : 'Agenda'}
              </button>
            ))}
            {/* Seletor de mês mobile */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border whitespace-nowrap ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className={`p-1 rounded ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
              </span>
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className={`p-1 rounded ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
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
                📅 Sua Agenda
              </h3>
              <button
                onClick={() => setView('scheduled')}
                className={`ml-auto text-xs font-medium ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                } underline`}
              >
                Ver completa →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Hoje */}
              <div>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  📆 Hoje
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
                          🕐 {event.start?.dateTime 
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
                  ☀️ Amanhã
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
                          🕐 {event.start?.dateTime 
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
          <div className="mb-6 bg-orange-200 dark:bg-orange-900/30 border-2 border-orange-500 dark:border-orange-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-700 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-950 dark:text-orange-300">
                Atenção: Você tem {upcomingDueDates.length} conta{upcomingDueDates.length > 1 ? 's' : ''} vencendo nos próximos 5 dias.
              </p>
              <button
                onClick={() => setView('scheduled')}
                className="text-sm text-orange-800 dark:text-orange-400 underline mt-1 font-medium"
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
                onClick={() => {
                  setView('transactions');
                  setFilterType('income');
                }}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Entradas
                  </h3>
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(income)}
                </p>
              </button>

              {/* Card Saídas - Clicável */}
              <button
                onClick={() => {
                  setView('transactions');
                  setFilterType('expense');
                }}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Saídas
                  </h3>
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(expenses)}
                </p>
              </button>

              {/* Card Saldo - Clicável */}
              <button
                onClick={() => {
                  setView('transactions');
                  setFilterType('all');
                }}
                className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} rounded-xl shadow-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Saldo
                  </h3>
                  <div className={`${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'} p-2 rounded-lg`}>
                    <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </p>
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
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    💡 Crie lançamentos na categoria "Poupança" e veja sua evolução aqui
                  </p>
                </div>
              )}
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                💡 Dicas Financeiras Personalizadas
              </h3>
              
              {!showTips ? (
                <button
                  onClick={async () => {
                    setShowTips(true);
                    setAiTips(['Analisando suas finanças...']);
                    
                    try {
                      const resumo = `
                        Entradas: ${formatCurrency(income)}
                        Saídas: ${formatCurrency(expenses)}
                        Saldo: ${formatCurrency(balance)}
                        Principais gastos: ${expensesByCategory.slice(0, 3).map(c => `${c.name} ${formatCurrency(c.value)}`).join(', ')}
                      `;
                      
                      const response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          model: 'claude-sonnet-4-20250514',
                          max_tokens: 1000,
                          messages: [{
                            role: 'user',
                            content: `Baseado nestas finanças mensais, dê 3 dicas práticas e objetivas de economia:\n${resumo}\n\nRetorne apenas as 3 dicas numeradas, sem introdução.`
                          }]
                        })
                      });
                      
                      const data = await response.json();
                      const tips = data.content[0].text.split('\n').filter(t => t.trim());
                      setAiTips(tips);
                    } catch (error) {
                      setAiTips([
                        '💡 Revise seus gastos com alimentação - pequenas economias diárias fazem diferença!',
                        '📊 Considere criar uma reserva de emergência equivalente a 3-6 meses de despesas.',
                        '🎯 Defina metas específicas para seus gastos em cada categoria.'
                      ]);
                    }
                  }}
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
                  <button
                    onClick={() => setShowTips(false)}
                    className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} underline`}
                  >
                    Ocultar dicas
                  </button>
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
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      {/* Data — clicável, alterna asc/desc */}
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
                      {/* Descrição — clicável */}
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
                      {/* Categoria — clicável */}
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
                      {/* Valor — clicável */}
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
                      <th className={`px-6 py-4 text-center text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pago?</th>
                      <th className={`px-6 py-4 text-center text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      let filtered = currentMonthTransactions;

                      if (filterType !== 'all') {
                        filtered = filtered.filter(t => t.type === filterType);
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
                                  <td className="px-6 py-4 text-center">
                                    <button
                                      onClick={() => toggleTransactionPaid(transaction)}
                                      title={transaction.is_paid ? 'Marcar como não pago' : 'Marcar como pago'}
                                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                                        transaction.is_paid
                                          ? 'bg-green-500 border-green-500 text-white'
                                          : darkMode ? 'border-gray-500 hover:border-green-400' : 'border-gray-300 hover:border-green-400'
                                      }`}
                                    >
                                      {transaction.is_paid && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
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
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{from}–{to} de {total}</span>
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

        {view === 'scheduled' && (
          <>
            <div className="mb-6">
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                📅 Agenda Google Calendar
              </h2>

              {/* Filtros e Sincronizar na mesma linha */}
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { key: 'today',    label: '📆 Hoje' },
                  { key: 'tomorrow', label: '☀️ Amanhã' },
                  { key: 'week',     label: '📅 Esta Semana' },
                  { key: 'month',    label: '🗓️ Este Mês' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCalendarFilter(key);
                      fetchCalendarEvents(key);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      calendarFilter === key
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {loadingCalendar && calendarFilter === key ? '⏳ Carregando...' : label}
                  </button>
                ))}


              </div>

              {/* Mostrar filtro ativo */}
              <p className={`text-sm mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {calendarFilter === 'today' && '📆 Mostrando: Eventos de hoje'}
                {calendarFilter === 'tomorrow' && '☀️ Mostrando: Eventos de amanhã'}
                {calendarFilter === 'week' && '📅 Mostrando: Eventos dos próximos 7 dias'}
                {calendarFilter === 'month' && '🗓️ Mostrando: Eventos deste mês'}
              </p>
            </div>

            <div className="grid gap-4">
              {calendarEvents.length === 0 ? (
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
                  <Calendar className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-lg mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Selecione um período acima para carregar os eventos
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Filtro atual: {calendarFilter === 'today' ? 'Hoje' : calendarFilter === 'tomorrow' ? 'Amanhã' : calendarFilter === 'week' ? 'Esta Semana' : 'Este Mês'}
                  </p>
                </div>
              ) : (
                <>
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {calendarEvents.length} evento{calendarEvents.length !== 1 ? 's' : ''} encontrado{calendarEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {calendarEvents.map(event => (
                    <div
                      key={event.id}
                      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}
                    >
                      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {event.summary || 'Sem título'}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        📅 {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString('pt-BR') : event.start?.date || 'Data não definida'}
                      </p>
                      {event.description && (
                        <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

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
              <button onClick={() => setShowSettings(false)}>
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
                  RELATÓRIO MENSAL
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
                          <button onClick={() => { setEditingCategory(cat); setShowSettings(false); setShowCategoryModal(true); }} className="p-1 opacity-50 hover:opacity-100"><Edit2 className="w-3 h-3 text-blue-500" /></button>
                          <button onClick={() => deleteCategory(cat.id)} className="p-1 opacity-50 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-500" /></button>
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
                          <button onClick={() => { setEditingCategory(cat); setShowSettings(false); setShowCategoryModal(true); }} className="p-1 opacity-50 hover:opacity-100"><Edit2 className="w-3 h-3 text-blue-500" /></button>
                          <button onClick={() => deleteCategory(cat.id)} className="p-1 opacity-50 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-500" /></button>
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
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  💡 Lance valores na categoria "Poupança" (entrada ou saída) para alimentar o poupômetro
                </p>
              </div>

              <button
                onClick={() => {
                  if (goalInput && !isNaN(parseFloat(goalInput)) && parseFloat(goalInput) > 0) {
                    setSavingsGoal(parseFloat(goalInput));
                    setShowGoalModal(false);
                    setGoalInput('');
                  } else {
                    alert('Por favor, digite um valor válido!');
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
    </div>
  );
}
