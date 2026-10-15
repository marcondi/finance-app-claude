import React, { useState } from 'react';
import {
  RefreshCw,
  Download,
  Upload,
  Copy,
  Check,
  Laptop,
  ShieldCheck,
  Calendar,
  Target,
  ClipboardList,
  DollarSign,
  X
} from 'lucide-react';
import { Appointment, Transaction, Category, ScheduledBill } from './types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  appointments: Appointment[];
  transactions: Transaction[];
  categories: Category[];
  scheduled: ScheduledBill[];
  categoryBudgets: Record<string, number>;
  savingsGoal: number;
  savingsAmount: number;
  currentUser: any;
  onImportComplete: (data: any) => void;
  showToast: (msg: string, type?: 'success' | 'warn' | 'error') => void;
}

export default function SyncModal({
  isOpen,
  onClose,
  darkMode,
  appointments = [],
  transactions = [],
  categories = [],
  scheduled = [],
  categoryBudgets = {},
  savingsGoal = 0,
  savingsAmount = 0,
  currentUser,
  onImportComplete,
  showToast
}: SyncModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'guide'>('export');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pasteCode, setPasteCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Carregar dados extras de prontuário e anamnese
  const getFullBackupObject = () => {
    let anamneses = [];
    let evolutions = [];
    try {
      const rawAnam = localStorage.getItem('trg_client_anamneses');
      if (rawAnam) anamneses = JSON.parse(rawAnam);
    } catch {}
    try {
      const rawEvol = localStorage.getItem('trg_client_evolutions');
      if (rawEvol) evolutions = JSON.parse(rawEvol);
    } catch {}

    return {
      version: '2.0-trg',
      appName: 'FinanceApp TRG Terapeuta',
      exportedAt: new Date().toISOString(),
      user: currentUser || {
        id: 'user_marcondes_lima',
        email: 'marcondestl@gmail.com',
        name: 'Marcondes Lima'
      },
      appointments,
      client_anamneses: anamneses,
      client_evolutions: evolutions,
      transactions,
      categories,
      scheduled,
      categoryBudgets,
      savingsGoal,
      savingsAmount
    };
  };

  // Contagens para exibição
  const anamnesesCount = (() => {
    try {
      const raw = localStorage.getItem('trg_client_anamneses');
      return raw ? JSON.parse(raw).length : 0;
    } catch {
      return 0;
    }
  })();

  const evolutionsCount = (() => {
    try {
      const raw = localStorage.getItem('trg_client_evolutions');
      return raw ? JSON.parse(raw).length : 0;
    } catch {
      return 0;
    }
  })();

  // 1. Baixar Arquivo JSON Completo
  const handleDownloadFile = () => {
    try {
      const data = getFullBackupObject();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup_agenda_marcondes_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Arquivo de backup baixado com sucesso! Envie para o outro PC.', 'success');
    } catch (err: any) {
      showToast('Erro ao gerar arquivo: ' + err.message, 'error');
    }
  };

  // 2. Copiar Código de Sincronização
  const handleCopyCode = () => {
    try {
      const data = getFullBackupObject();
      const str = JSON.stringify(data);
      navigator.clipboard.writeText(str).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        showToast('Código copiado! Cole no WhatsApp ou e-mail pessoal para abrir no outro PC.', 'success');
      }).catch(() => {
        showToast('Não foi possível copiar automaticamente. Use a opção de Baixar Arquivo.', 'warn');
      });
    } catch (err: any) {
      showToast('Erro ao copiar dados: ' + err.message, 'error');
    }
  };

  // 3. Processar Importação de Arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onImportComplete(parsed);
      } catch (err: any) {
        showToast('Arquivo inválido: ' + err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4. Processar Código Colado
  const handlePasteImport = () => {
    if (!pasteCode.trim()) {
      showToast('Cole o código de sincronização no campo de texto.', 'warn');
      return;
    }
    setIsProcessing(true);
    try {
      const parsed = JSON.parse(pasteCode.trim());
      onImportComplete(parsed);
      setPasteCode('');
    } catch (err: any) {
      showToast('Código de sincronização inválido: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const appOfficialUrl = 'https://ais-pre-5c2qaujziuksbvi4tooyfx-227875230771.us-east1.run.app';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border transition-all ${
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>Sincronizar entre Computadores</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase">
                  Multi-PC
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Transfira seus clientes, agenda e prontuários para qualquer outro computador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 pt-3 gap-2">
          {[
            { key: 'export', label: '1. Exportar Deste PC', icon: Download },
            { key: 'import', label: '2. Importar no Novo PC', icon: Upload },
            { key: 'guide', label: 'Como Funciona / Dúvidas', icon: Laptop }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === key
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div
                className={`p-4 rounded-2xl border ${
                  darkMode ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-purple-300 mb-1">
                      Você está no computador onde seus dados já estão cadastrados?
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                      Use as opções abaixo para gerar uma cópia segura dos seus dados deste computador e abrir no outro PC.
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumo do que será exportado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className={`p-3.5 rounded-2xl border text-center ${
                    darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                  <span className="block text-lg font-black text-blue-400">{appointments.length}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Agendamentos</span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl border text-center ${
                    darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Target className="w-5 h-5 text-teal-400 mx-auto mb-1.5" />
                  <span className="block text-lg font-black text-teal-400">{anamnesesCount}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Anamneses TRG</span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl border text-center ${
                    darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <ClipboardList className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
                  <span className="block text-lg font-black text-purple-400">{evolutionsCount}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Prontuários</span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl border text-center ${
                    darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1.5" />
                  <span className="block text-lg font-black text-green-400">{transactions.length}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Lançamentos</span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Opção 1: Baixar Arquivo */}
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-500/20 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                >
                  <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span>Baixar Arquivo Completo (.JSON)</span>
                  <span className="text-[10px] text-purple-200 font-normal">
                    Recomendado: salve no pendrive ou envie por WhatsApp/e-mail
                  </span>
                </button>

                {/* Opção 2: Copiar Código */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    darkMode
                      ? 'border-gray-700 bg-gray-800/90 hover:bg-gray-700 text-white'
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  {copied ? (
                    <Check className="w-6 h-6 text-green-400" />
                  ) : (
                    <Copy className="w-6 h-6 text-indigo-400" />
                  )}
                  <span className="font-bold text-xs sm:text-sm">
                    {copied ? 'Código Copiado com Sucesso!' : 'Copiar Código de Sincronização'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal text-center">
                    Copia o texto completo para colar no outro computador
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-5">
              <div
                className={`p-4 rounded-2xl border ${
                  darkMode ? 'bg-blue-950/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Laptop className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-blue-300 mb-1">
                      Você está no computador novo onde a agenda estava vazia?
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                      Carregue o arquivo baixado do PC principal ou cole o código abaixo. Todos os seus clientes, fichas e agendamentos serão restaurados imediatamente neste computador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Método A: Subir Arquivo */}
              <div
                className={`p-4 rounded-2xl border ${
                  darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <span className="block text-xs font-bold mb-2 text-gray-300">
                  Método 1: Selecionar o Arquivo .JSON de Backup
                </span>
                <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  <span>Escolher Arquivo .JSON do Computador</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                </label>
              </div>

              {/* Método B: Colar Código */}
              <div
                className={`p-4 rounded-2xl border ${
                  darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <span className="block text-xs font-bold mb-2 text-gray-300">
                  Método 2: Colar o Código de Sincronização
                </span>
                <textarea
                  rows={3}
                  value={pasteCode}
                  onChange={(e) => setPasteCode(e.target.value)}
                  placeholder="Cole aqui o código que você copiou no outro PC..."
                  className={`w-full p-3 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={isProcessing || !pasteCode.trim()}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white cursor-pointer shadow transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Restaurar Dados a Partir do Código</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div
                className={`p-4 rounded-2xl border ${
                  darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h4 className="font-bold text-sm text-purple-400 mb-2 flex items-center gap-2">
                  <Laptop className="w-4 h-4" />
                  Qual link acessar no outro computador?
                </h4>
                <p className="text-gray-400 mb-3 leading-relaxed">
                  Para garantir que você está vendo a versão oficial mais recente com todas as funções clínicas TRG:
                </p>
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 font-mono text-[11px] ${
                    darkMode ? 'bg-gray-900 border-gray-800 text-blue-400' : 'bg-white border-gray-200 text-blue-600'
                  }`}
                >
                  <span className="truncate">{appOfficialUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(appOfficialUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                      showToast('Link do sistema copiado!', 'success');
                    }}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-bold flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar Link</span>
                  </button>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h4 className="font-bold text-sm text-blue-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Por que a agenda não abriu direto no outro PC?
                </h4>
                <ol className="list-decimal pl-4 space-y-2 text-gray-400 leading-relaxed">
                  <li>
                    <strong className="text-gray-200">Tela de Login no novo PC:</strong> Como é o primeiro acesso nesse novo aparelho, o navegador abre na tela de login. Basta clicar no botão azul <strong className="text-blue-400">"Entrar Imediatamente (Marcondes Lima)"</strong> sem precisar de senha!
                  </li>
                  <li>
                    <strong className="text-gray-200">Armazenamento Local do Navegador:</strong> Por privacidade clínica dos seus pacientes, os cadastros ficam gravados no navegador do PC original. Usando a aba <strong className="text-purple-400">"1. Exportar Deste PC"</strong> e depois <strong className="text-purple-400">"2. Importar no Novo PC"</strong>, você copia todos os clientes em segundos!
                  </li>
                  <li>
                    <strong className="text-gray-200">Se você abriu o link da Vercel:</strong> O site na Vercel estava aguardando atualização de código. Use o link oficial acima que funciona em qualquer navegador ou celular.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-3xl text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>Dados preservados e protegidos com segurança</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
