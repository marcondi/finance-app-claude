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

const STORAGE_KEY = 'finance_app_v1';

const defaultCategories = [
  { id: 'cat-1', name: 'Alimentação', color: '#ef4444', type: 'expense' },
  { id: 'cat-2', name: 'Transporte', color: '#f59e0b', type: 'expense' },
  { id: 'cat-3', name: 'Moradia', color: '#8b5cf6', type: 'expense' },
  { id: 'cat-4', name: 'Lazer', color: '#ec4899', type: 'expense' },
  { id: 'cat-5', name: 'Saúde', color: '#14b8a6', type: 'expense' },
  { id: 'cat-6', name: 'Educação', color: '#3b82f6', type: 'expense' },
  { id: 'cat-7', name: 'Salário', color: '#10b981', type: 'income' },
  { id: 'cat-8', name: 'Freelance', color: '#22c55e', type: 'income' },
  { id: 'cat-9', name: 'Investimentos', color: '#059669', type: 'income' },
];

const loadData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    users: [],
    categories: defaultCategories,
    transactions: [],
    scheduled: []
  };
};

const saveData = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (date) => {
  // Parse manual para evitar problema de timezone
  const dateParts = date.split('-');
  const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  return dateObj.toLocaleDateString('pt-BR');
};

export default function FinanceApp() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [appData, setAppData] = useState(loadData());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, income, expense
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, description-asc, description-desc, amount-desc, amount-asc
  const [savingsGoal, setSavingsGoal] = useState(0); // Meta de economia mensal
  const [showTips, setShowTips] = useState(false);
  const [aiTips, setAiTips] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    saveData(appData);
  }, [appData]);

  const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleAuth = () => {
      if (isLogin) {
        const user = appData.users.find(u => u.email === email && u.password === password);
        if (user) {
          setCurrentUser(user);
        } else {
          alert('Credenciais inválidas!');
        }
      } else {
        if (!name || !email || !password) {
          alert('Preencha todos os campos!');
          return;
        }
        const existingUser = appData.users.find(u => u.email === email);
        if (existingUser) {
          alert('Este e-mail já está cadastrado!');
          return;
        }
        const newUser = {
          id: generateId(),
          name,
          email,
          password
        };
        setAppData(prev => ({
          ...prev,
          users: [...prev.users, newUser]
        }));
        setCurrentUser(newUser);
      }
    };

    const handleForgotPassword = () => {
      if (!email) {
        alert('Digite seu e-mail para recuperar a senha!');
        return;
      }

      const user = appData.users.find(u => u.email === email);
      if (!user) {
        alert('E-mail não encontrado!');
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

      setAppData(prev => ({
        ...prev,
        users: prev.users.map(u => 
          u.email === email ? { ...u, password: newPassword } : u
        )
      }));

      alert('✅ Senha redefinida com sucesso!');
      setIsForgotPassword(false);
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
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
        setCategoryId(editingTransaction.categoryId);
        setDate(editingTransaction.date);
        setIsRecurring(editingTransaction.isRecurring || false);
        setRecurringMonths((editingTransaction.recurringMonths || 1).toString());
      }
    }, [editingTransaction]);

    const handleSubmit = () => {
      if (!amount || !description || !categoryId) {
        alert('Preencha todos os campos!');
        return;
      }

      const baseTransaction = {
        userId: currentUser.id,
        type: type === 'scheduled' ? 'expense' : type,
        amount: parseFloat(amount),
        description,
        categoryId,
        date,
        isRecurring,
        recurringMonths: isRecurring ? parseInt(recurringMonths) : undefined
      };

      if (type === 'scheduled') {
        const baseScheduled = {
          userId: currentUser.id,
          amount: parseFloat(amount),
          description,
          categoryId,
          isPaid: false
        };
        
        const scheduledList = [];
        const months = parseInt(recurringMonths) || 1;
        
        // Gerar agendamentos para N meses
        for (let i = 0; i < months; i++) {
          const scheduledDate = new Date(date);
          scheduledDate.setMonth(scheduledDate.getMonth() + i);
          
          scheduledList.push({
            ...baseScheduled,
            id: generateId(),
            dueDate: scheduledDate.toISOString().split('T')[0]
          });
        }
        
        console.log(`Criando ${scheduledList.length} agendamento(s)`);
        
        setAppData(prev => ({
          ...prev,
          scheduled: [...prev.scheduled, ...scheduledList]
        }));
      } else {
        if (editingTransaction) {
          setAppData(prev => ({
            ...prev,
            transactions: prev.transactions.map(t =>
              t.id === editingTransaction.id ? { ...t, ...baseTransaction } : t
            )
          }));
        } else {
          const newTransaction = {
            id: generateId(),
            ...baseTransaction
          };

          console.log('Nova transação criada:', newTransaction);

          const transactions = [newTransaction];

          if (isRecurring && recurringMonths) {
            const months = parseInt(recurringMonths);
            for (let i = 1; i < months; i++) {
              const futureDate = new Date(date);
              futureDate.setMonth(futureDate.getMonth() + i);
              transactions.push({
                ...newTransaction,
                id: generateId(),
                date: futureDate.toISOString().split('T')[0],
                parentId: newTransaction.id
              });
            }
          }

          setAppData(prev => ({
            ...prev,
            transactions: [...prev.transactions, ...transactions]
          }));
          
          // Navegar para o mês da transação criada (parse correto da data)
          const dateParts = date.split('-');
          const transactionDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          console.log('Navegando para data:', transactionDate, 'Mês:', transactionDate.getMonth(), 'Ano:', transactionDate.getFullYear());
          setCurrentDate(transactionDate);
          
          // Voltar para o dashboard para ver o resultado
          setView('dashboard');
        }
      }

      setShowTransactionModal(false);
      setEditingTransaction(null);
      resetForm();
    };

    const resetForm = () => {
      setAmount('');
      setDescription('');
      setCategoryId('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurringMonths('1');
    };

    const availableCategories = appData.categories.filter(c => {
      // Mostrar categoria se:
      // 1. Não tem userId (categoria padrão) OU
      // 2. UserId é do usuário atual OU
      // 3. UserId existe mas queremos mostrar todas do tipo certo (para categorias importadas)
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

    const handleSubmit = () => {
      if (!name) {
        alert('Digite um nome para a categoria!');
        return;
      }

      if (editingCategory) {
        setAppData(prev => ({
          ...prev,
          categories: prev.categories.map(c =>
            c.id === editingCategory.id ? { ...c, name, color, type } : c
          )
        }));
      } else {
        const newCategory = {
          id: generateId(),
          name,
          color,
          type
        };
        setAppData(prev => ({
          ...prev,
          categories: [...prev.categories, newCategory]
        }));
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      setName('');
      setColor('#3b82f6');
      setType('expense');
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
    
    return appData.transactions.filter(t => {
      if (t.userId !== currentUser.id) return false;
      
      // Corrigir parsing de data para evitar problema de timezone
      const dateParts = t.date.split('-');
      const tDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }, [appData.transactions, currentUser, currentDate]);

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
    // Procurar categoria "Poupança" (case insensitive)
    const savingsCategory = appData.categories.find(c => 
      c.name.toLowerCase() === 'poupança' || c.name.toLowerCase() === 'poupanca'
    );
    
    if (!savingsCategory) return 0;
    
    // Somar todas as transações da categoria Poupança no mês atual
    return currentMonthTransactions
      .filter(t => t.categoryId === savingsCategory.id)
      .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  }, [currentMonthTransactions, appData.categories]);

  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map();
    
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = categoryMap.get(t.categoryId) || 0;
        categoryMap.set(t.categoryId, current + t.amount);
      });

    return Array.from(categoryMap.entries()).map(([categoryId, amount]) => {
      const category = appData.categories.find(c => c.id === categoryId);
      return {
        name: category?.name || 'Sem categoria',
        value: amount,
        color: category?.color || '#666'
      };
    });
  }, [currentMonthTransactions, appData.categories]);

  const upcomingDueDates = useMemo(() => {
    if (!currentUser) return [];
    
    const today = new Date();
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);

    return appData.scheduled.filter(s => {
      if (s.userId !== currentUser.id || s.isPaid) return false;
      const dueDate = new Date(s.dueDate);
      return dueDate >= today && dueDate <= fiveDaysFromNow;
    });
  }, [appData.scheduled, currentUser]);

  const handleExport = () => {
    try {
      if (!currentUser) {
        alert('❌ Erro: Usuário não identificado. Faça login novamente.');
        return;
      }

      const userRelatedData = {
        user: currentUser,
        categories: appData.categories,
        transactions: appData.transactions.filter(t => t.userId === currentUser.id),
        scheduled: appData.scheduled.filter(s => s.userId === currentUser.id),
        exportDate: new Date().toISOString()
      };

      console.log('Exportando dados:', userRelatedData);

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
      
      console.log('✅ Backup criado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('❌ Erro ao criar backup. Verifique o console para detalhes.');
    }
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result);
        
        // Cores padrão para categorias sem cor
        const defaultColors = [
          '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', 
          '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
        ];
        
        // Processar categorias: adicionar cores se não existirem
        const processedCategories = (imported.categories || []).map((cat, index) => ({
          ...cat,
          color: cat.color || defaultColors[index % defaultColors.length],
          // Manter ID original
          id: cat.id
        }));
        
        // Processar transações: converter formato antigo para novo
        const processedTransactions = (imported.transactions || []).map(t => {
          // Converter recurrence para isRecurring/recurringMonths
          let isRecurring = false;
          let recurringMonths = undefined;
          
          if (t.recurrence === 'monthly') {
            isRecurring = true;
            // Contar quantas transações existem com o mesmo recurrenceId
            if (t.recurrenceId) {
              const sameGroup = imported.transactions.filter(tr => tr.recurrenceId === t.recurrenceId);
              recurringMonths = sameGroup.length;
            }
          }
          
          return {
            id: t.id,
            userId: currentUser.id, // Usar o ID do usuário atual
            type: t.type,
            amount: t.amount,
            description: t.description,
            categoryId: t.category || t.categoryId, // Aceitar ambos os formatos
            date: t.date.split('T')[0], // Converter ISO para formato YYYY-MM-DD
            isRecurring,
            recurringMonths,
            parentId: t.recurrenceId || t.parentId
          };
        });
        
        // Mesclar categorias (evitar duplicatas por nome)
        const existingCategoryNames = appData.categories.map(c => c.name.toLowerCase());
        const newCategories = processedCategories.filter(
          cat => !existingCategoryNames.includes(cat.name.toLowerCase())
        );
        
        setAppData(prev => ({
          ...prev,
          categories: [...prev.categories, ...newCategories],
          transactions: [
            ...prev.transactions.filter(t => t.userId !== currentUser.id),
            ...processedTransactions
          ],
          scheduled: imported.scheduled ? [
            ...prev.scheduled.filter(s => s.userId !== currentUser.id),
            ...imported.scheduled.map(s => ({
              ...s,
              userId: currentUser.id,
              categoryId: s.category || s.categoryId
            }))
          ] : prev.scheduled
        }));

        alert(`✅ Dados importados com sucesso!\n\n📊 ${processedTransactions.length} transações\n🏷️ ${newCategories.length} novas categorias`);
        
        // Pequeno delay antes de recarregar para garantir que salvou
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error('Erro na importação:', error);
        alert('❌ Erro ao importar dados. Verifique se o arquivo está correto.\n\nDetalhes: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const deleteTransaction = (id) => {
    console.log('Excluindo transação com ID:', id);
    
    setAppData(prev => {
      const novasTransacoes = prev.transactions.filter(t => t.id !== id);
      console.log('Transações antes:', prev.transactions.length);
      console.log('Transações depois:', novasTransacoes.length);
      
      return {
        ...prev,
        transactions: novasTransacoes
      };
    });
    
    console.log('✅ Transação excluída!');
  };

  const deleteCategory = (id) => {
    const hasTransactions = appData.transactions.some(t => t.categoryId === id);
    if (hasTransactions) {
      // Usar alert apenas para informar (não requer confirmação)
      console.log('❌ Categoria tem transações associadas');
      return;
    }

    console.log('Excluindo categoria com ID:', id);
    setAppData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }));
  };

  const payScheduled = (scheduled) => {
    const newTransaction = {
      id: generateId(),
      userId: currentUser.id,
      type: 'expense',
      amount: scheduled.amount,
      description: scheduled.description,
      categoryId: scheduled.categoryId,
      date: new Date().toISOString().split('T')[0]
    };

    setAppData(prev => ({
      ...prev,
      transactions: [...prev.transactions, newTransaction],
      scheduled: prev.scheduled.map(s =>
        s.id === scheduled.id ? { ...s, isPaid: true } : s
      )
    }));
  };

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
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setCurrentUser(null)}
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
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    💡 Crie lançamentos na categoria "Poupança" e veja sua evolução aqui
                  </p>
                </div>
              )}
            </div>

            {/* Dicas Financeiras com IA */}
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
                      // Fallback com dicas genéricas
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
              {/* Barra de busca e botão adicionar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className={`relative flex-1 max-w-md`}>
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

              {/* Filtros e Ordenação */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Filtro por Tipo */}
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

                  {/* Ordenação */}
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

                      // Aplicar filtro de busca
                      if (searchTerm) {
                        filtered = filtered.filter(t => {
                          const category = appData.categories.find(c => c.id === t.categoryId);
                          return (
                            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            category?.name.toLowerCase().includes(searchTerm.toLowerCase())
                          );
                        });
                      }

                      // Aplicar filtro de tipo
                      if (filterType !== 'all') {
                        filtered = filtered.filter(t => t.type === filterType);
                      }

                      // Aplicar ordenação
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
                          default:
                            return 0;
                        }
                      });

                      return (
                        <>
                          {filtered.length > 0 ? (
                            filtered.map(transaction => {
                              const category = appData.categories.find(c => c.id === transaction.categoryId);
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

                {/* Contador de resultados */}
                {currentMonthTransactions.length > 0 && (
                  <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Mostrando {(() => {
                        let count = currentMonthTransactions;
                        if (searchTerm) count = count.filter(t => {
                          const category = appData.categories.find(c => c.id === t.categoryId);
                          return t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 category?.name.toLowerCase().includes(searchTerm.toLowerCase());
                        });
                        if (filterType !== 'all') count = count.filter(t => t.type === filterType);
                        return count.length;
                      })()} de {currentMonthTransactions.length} transações
                    </p>
                  </div>
                )}
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

            <div className="grid gap-4">
              {(() => {
                // Filtrar agendamentos do mês atual
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                
                const currentMonthScheduled = appData.scheduled
                  .filter(s => {
                    if (s.userId !== currentUser.id) return false;
                    
                    // Parse correto da data para evitar timezone
                    const dateParts = s.dueDate.split('-');
                    const dueDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                    
                    return dueDate.getFullYear() === year && dueDate.getMonth() === month;
                  })
                  .sort((a, b) => {
                    const dateA = a.dueDate.split('-').map(n => parseInt(n));
                    const dateB = b.dueDate.split('-').map(n => parseInt(n));
                    const dA = new Date(dateA[0], dateA[1] - 1, dateA[2]);
                    const dB = new Date(dateB[0], dateB[1] - 1, dateB[2]);
                    return dA.getTime() - dB.getTime();
                  });
                
                if (currentMonthScheduled.length === 0) {
                  return (
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
                      <Calendar className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Nenhum agendamento para este mês.
                      </p>
                    </div>
                  );
                }
                
                return currentMonthScheduled.map(scheduled => {
                  const category = appData.categories.find(c => c.id === scheduled.categoryId);
                  
                  // Parse correto da data para evitar timezone
                  const dateParts = scheduled.dueDate.split('-');
                  const dueDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  const isPastDue = dueDate < today && !scheduled.isPaid;
                  
                  return (
                    <div
                      key={scheduled.id}
                      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 ${
                        isPastDue ? 'border-2 border-red-500' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {scheduled.description}
                            </h3>
                            {scheduled.isPaid ? (
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
                              Vencimento: {formatDate(scheduled.dueDate)}
                            </span>
                            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {formatCurrency(scheduled.amount)}
                            </span>
                          </div>
                        </div>

                        {!scheduled.isPaid && (
                          <button
                            onClick={() => payScheduled(scheduled)}
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
                  {appData.categories
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
                  {appData.categories
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
      
      {/* Modal de Meta de Economia */}
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