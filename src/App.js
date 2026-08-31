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
  Search, 
  AlertCircle, 
  Check, 
  X, 
  Calendar 
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from './supabaseClient';

const defaultCategories = [
  { id: 'cat-1', name: 'Alimentação', color: '#ef4444', type: 'expense', user_id: null },
  { id: 'cat-2', name: 'Transporte', color: '#f59e0b', type: 'expense', user_id: null },
  { id: 'cat-3', name: 'Moradia', color: '#8b5cf6', type: 'expense', user_id: null },
  { id: 'cat-4', name: 'Lazer', color: '#ec4899', type: 'expense', user_id: null },
  { id: 'cat-5', name: 'Saúde', color: '#14b8a6', type: 'expense', user_id: null },
  { id: 'cat-6', name: 'Educação', color: '#3b82f6', type: 'expense', user_id: null },
  { id: 'cat-7', name: 'Salário', color: '#10b981', type: 'income', user_id: null },
  { id: 'cat-8', name: 'Freelance', color: '#22c55e', type: 'income', user_id: null },
  { id: 'cat-9', name: 'Investimentos', color: '#059669', type: 'income', user_id: null },
  { id: 'cat-10', name: 'Poupança', color: '#6366f1', type: 'income', user_id: null },
];

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper para obter a data local no formato YYYY-MM-DD sem erros de fuso horário
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

// Formatação segura DD/MM/YYYY sem shift de fuso horário
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
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [savingsGoal, setSavingsGoal] = useState(() => {
    const saved = localStorage.getItem('savings_goal');
    return saved ? parseFloat(saved) : 0;
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [filterPaid, setFilterPaid] = useState('all');

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
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
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
      // Carregar categorias do usuário
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setTransactions([]);
      setScheduled([]);
      setCategories([]);
    } catch (error) {
      console.error('Erro ao sair:', error);
      alert('Erro ao sair: ' + error.message);
    }
  };

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
        alert('Preencha e-mail e senha!');
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
            alert('Por favor, informe seu nome!');
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
            alert('✅ Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.');
            setIsLogin(true);
          } else if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (error) {
        console.error('Erro na autenticação:', error);
        alert('Erro: ' + (error.message || 'Falha ao autenticar'));
      } finally {
        setLoadingAuth(false);
      }
    };

    const handleGoogleLogin = async () => {
      try {
        setLoadingAuth(true);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Erro no login com Google:', error);
        alert('Erro ao fazer login com Google: ' + error.message);
      } finally {
        setLoadingAuth(false);
      }
    };

    const handleForgotPassword = async (e) => {
      if (e) e.preventDefault();
      if (!email.trim()) {
        alert('Digite seu e-mail cadastrado!');
        return;
      }

      setLoadingAuth(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });

        if (error) throw error;

        alert('✅ Link de redefinição de senha enviado para seu e-mail!');
        setIsForgotPassword(false);
      } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        alert('Erro ao recuperar senha: ' + error.message);
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
        alert('Preencha todos os campos!');
        return;
      }

      const numAmount = parseFloat(amount.toString().replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        alert('Digite um valor numérico válido!');
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
              ...baseScheduled,
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
      setDate(getTodayDateString());
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
        alert('Digite um nome para a categoria!');
        return;
      }

      try {
        if (editingCategory) {
          const { error } = await supabase
            .from('finance_categories')
            .update({ name: name.trim(), color, type })
            .eq('id', editingCategory.id);
          
          if (error) throw error;
          
          setCategories(categories.map(c =>
            c.id === editingCategory.id ? { ...c, name: name.trim(), color, type } : c
          ));
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
          name: `${category?.name || 'Sem categoria'} (${percent}%)`,
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

  const handleExport = async () => {
    try {
      if (!currentUser) {
        alert('❌ Erro: Usuário não identificado. Faça login novamente.');
        return;
      }

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
      link.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
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
          date: t.date.split('T')[0],
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
          setCategories([...categories, ...insertedCats]);
        }
        
        if (processedTransactions.length > 0) {
          const { data: insertedTrans, error: transError } = await supabase
            .from('finance_transactions')
            .insert(processedTransactions)
            .select();
          
          if (transError) throw transError;
          setTransactions([...transactions, ...insertedTrans]);
        }
        
        if (imported.scheduled && imported.scheduled.length > 0) {
          const processedScheduled = imported.scheduled.map(s => ({
            user_id: currentUser.id,
            amount: parseFloat(s.amount),
            description: s.description,
            category_id: s.category || s.categoryId || s.category_id,
            due_date: s.dueDate || s.due_date,
            is_paid: s.isPaid || s.is_paid || false
          }));
          
          const { data: insertedSched, error: schedError } = await supabase
            .from('finance_scheduled')
            .insert(processedScheduled)
            .select();
          
          if (schedError) throw schedError;
          setScheduled([...scheduled, ...insertedSched]);
        }

        alert(`✅ Dados importados com sucesso!\n\n📊 ${processedTransactions.length} transações importadas`);
        await loadUserData();
      } catch (error) {
        console.error('Erro na importação:', error);
        alert('❌ Erro ao importar dados: ' + error.message);
      }
    };
    reader.readAsText(file);
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
      alert('✅ Conta marcada como paga e registrada nas suas transações de hoje!');
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      alert('Erro ao marcar como pago: ' + error.message);
    }
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

              <nav className="hidden md:flex gap-2">
                {['dashboard', 'transactions', 'scheduled', 'categories'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      view === v
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {v === 'dashboard' ? 'Dashboard' : v === 'transactions' ? 'Transações' : v === 'scheduled' ? 'Agenda' : 'Categorias'}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-sm hidden sm:inline ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Olá, <strong>{currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}</strong>
              </span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
                title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } transition-colors`}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          <div className="flex md:hidden gap-2 mt-4 overflow-x-auto">
            {['dashboard', 'transactions', 'scheduled', 'categories'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-100'
                }`}
              >
                {v === 'dashboard' ? 'Dashboard' : v === 'transactions' ? 'Transações' : v === 'scheduled' ? 'Agenda' : 'Categorias'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setCurrentDate(newDate);
            }}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} shadow`}
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
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} shadow`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {upcomingDueDates.length > 0 && view === 'dashboard' && (
          <div className="mb-6 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-300">
                Atenção: Você tem {upcomingDueDates.length} conta{upcomingDueDates.length > 1 ? 's' : ''} vencendo nos próximos 5 dias.
              </p>
              <button
                onClick={() => setView('scheduled')}
                className="text-sm text-orange-700 dark:text-orange-400 underline mt-1"
              >
                Ver detalhes
              </button>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Entradas
                  </h3>
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(income)}
                </p>
              </div>

              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Saídas
                  </h3>
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(expenses)}
                </p>
              </div>

              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Saldo
                  </h3>
                  <div className={`${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'} p-2 rounded-lg`}>
                    <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            {expensesByCategory.length > 0 && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-6`}>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowTransactionModal(true)}
                className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Adicionar Lançamento
              </button>

              <button
                onClick={handleExport}
                className={`flex items-center justify-center gap-3 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                } font-semibold py-4 rounded-xl shadow-lg transition-colors`}
              >
                <Download className="w-5 h-5" />
                Exportar Dados
              </button>

              <label className={`flex items-center justify-center gap-3 ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              } font-semibold py-4 rounded-xl shadow-lg transition-colors cursor-pointer`}>
                <Upload className="w-5 h-5" />
                Importar Dados
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </>
        )}

        {view === 'transactions' && (
          <>
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

                      return (
                        <>
                          {filtered.length > 0 ? (
                            filtered.map(transaction => {
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
                              <td colSpan={5} className="text-center py-12">
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
            </div>
          </>
        )}

        {view === 'scheduled' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Contas Agendadas - {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
              </h2>
              <button
                onClick={() => setShowTransactionModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Novo Agendamento
              </button>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 mb-6`}>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Status de Pagamento
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterPaid('all')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    filterPaid === 'all'
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterPaid('paid')}
                  className={`inline-flex items-center gap-1 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    filterPaid === 'paid'
                      ? 'bg-green-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Pago
                </button>
                <button
                  onClick={() => setFilterPaid('unpaid')}
                  className={`inline-flex items-center gap-1 px-4 py-2 rounded-full font-medium text-sm border transition-colors ${
                    filterPaid === 'unpaid'
                      ? darkMode ? 'bg-gray-600 text-white border-gray-500' : 'bg-gray-300 text-gray-800 border-gray-400'
                      : darkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  A pagar
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {(() => {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const targetPrefix = `${year}-${month}`;
                const todayStr = getTodayDateString();
                
                let currentMonthScheduled = scheduled
                  .filter(s => {
                    if (s.user_id !== currentUser.id) return false;
                    const sDate = (s.due_date || '').split('T')[0];
                    return sDate.startsWith(targetPrefix);
                  })
                  .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

                if (filterPaid === 'paid') {
                  currentMonthScheduled = currentMonthScheduled.filter(s => s.is_paid);
                } else if (filterPaid === 'unpaid') {
                  currentMonthScheduled = currentMonthScheduled.filter(s => !s.is_paid);
                }
                
                if (currentMonthScheduled.length === 0) {
                  return (
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
                      <Calendar className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {filterPaid !== 'all'
                          ? 'Nenhum agendamento encontrado com esse status.'
                          : 'Nenhum agendamento para este mês.'}
                      </p>
                    </div>
                  );
                }
                
                return currentMonthScheduled.map(scheduledItem => {
                  const category = categories.find(c => c.id === scheduledItem.category_id);
                  const sDateStr = (scheduledItem.due_date || '').split('T')[0];
                  const isPastDue = sDateStr < todayStr && !scheduledItem.is_paid;
                  
                  return (
                    <div
                      key={scheduledItem.id}
                      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 ${
                        isPastDue ? 'border-2 border-red-500' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {scheduledItem.description}
                            </h3>
                            {scheduledItem.is_paid ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <Check className="w-4 h-4 mr-1" />
                                Pago
                              </span>
                            ) : isPastDue ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Atrasado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                <Calendar className="w-4 h-4 mr-1" />
                                Pendente
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-white font-medium"
                              style={{ backgroundColor: category?.color }}
                            >
                              {category?.name}
                            </span>
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                              Vencimento: {formatDate(scheduledItem.due_date)}
                            </span>
                            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {formatCurrency(scheduledItem.amount)}
                            </span>
                          </div>
                        </div>

                        {!scheduledItem.is_paid && (
                          <button
                            onClick={() => payScheduled(scheduledItem)}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Marcar como Pago
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
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
