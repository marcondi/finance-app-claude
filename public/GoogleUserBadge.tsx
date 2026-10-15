import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  Camera,
  Upload,
  Trash2,
  X,
  ShieldCheck,
  CalendarCheck
} from 'lucide-react';

interface GoogleUserBadgeProps {
  currentUser: any;
  darkMode: boolean;
  hasGoogleToken?: boolean;
  onLogout: () => void;
  onOpenAgenda?: () => void;
  showToast?: (text: string, type?: 'success' | 'warn' | 'error') => void;
}

export const GoogleUserBadge: React.FC<GoogleUserBadgeProps> = ({
  currentUser,
  darkMode,
  hasGoogleToken = false,
  onLogout,
  onOpenAgenda,
  showToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar foto customizada salva no localStorage (caso o usuário envie ou personalize)
  const [customAvatar, setCustomAvatar] = useState<string>(() => {
    return localStorage.getItem('finance_user_custom_avatar') || '';
  });

  // Nome e E-mail formatados
  const fullName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split('@')[0] : 'Terapeuta TRG');

  const email = currentUser?.email || 'marcondestl@gmail.com';

  // Obter foto: 1) customizada no localStorage, 2) metadata do Google/Supabase, 3) fallback gerado
  const avatarUrl =
    customAvatar ||
    currentUser?.user_metadata?.avatar_url ||
    currentUser?.user_metadata?.picture ||
    currentUser?.avatar_url ||
    '';

  // Iniciais para fallback elegante caso não haja foto ou der erro
  const initials = (fullName || 'ML')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('');

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Upload local de imagem (converte para data URL e salva com persistência)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast?.('Por favor selecione um arquivo de imagem válido (PNG, JPG, WEBP).', 'warn');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('A imagem é muito grande. Escolha uma foto com até 5MB.', 'warn');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomAvatar(result);
      localStorage.setItem('finance_user_custom_avatar', result);
      setImageError(false);
      setIsPhotoModalOpen(false);
      showToast?.('Sua fotinha de perfil foi atualizada com sucesso!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Salvar foto por URL
  const handleSavePhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrlInput.trim()) return;

    setCustomAvatar(photoUrlInput.trim());
    localStorage.setItem('finance_user_custom_avatar', photoUrlInput.trim());
    setImageError(false);
    setIsPhotoModalOpen(false);
    setPhotoUrlInput('');
    showToast?.('Foto de perfil atualizada via URL com sucesso!', 'success');
  };

  // Remover foto personalizada e voltar para o padrão
  const handleRemovePhoto = () => {
    setCustomAvatar('');
    localStorage.removeItem('finance_user_custom_avatar');
    setImageError(false);
    setIsPhotoModalOpen(false);
    showToast?.('Foto personalizada removida.', 'success');
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Botão de Perfil estilo Google (canto superior direito) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 p-1 pl-2 sm:pl-2.5 rounded-full border transition-all duration-200 cursor-pointer select-none group ${
            isOpen
              ? darkMode
                ? 'bg-gray-800 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : darkMode
              ? 'bg-gray-800/80 hover:bg-gray-750 border-gray-700/80 hover:border-gray-600 shadow-sm'
              : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'
          }`}
          title={`Conta Google: ${fullName} (${email})`}
        >
          {/* Nome e Indicador (Desktop/Tablet) */}
          <div className="hidden md:flex flex-col items-end pr-1 text-right">
            <span
              className={`text-xs font-bold leading-tight max-w-[130px] truncate ${
                darkMode ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'
              }`}
            >
              {fullName}
            </span>
            <span className="text-[10px] font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {hasGoogleToken ? 'Google Conectado' : 'Online'}
            </span>
          </div>

          {/* Círculo do Avatar com Anel estilo Google */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <div
                className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold text-xs uppercase ${
                  darkMode ? 'bg-gray-900 text-white' : 'bg-white text-blue-700'
                }`}
              >
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white w-full h-full flex items-center justify-center font-extrabold text-xs">
                    {initials || <User className="w-4 h-4" />}
                  </span>
                )}
              </div>
            </div>

            {/* Ícone sutil de status ou logo Google no canto */}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-900 p-0.5 shadow border border-gray-200 dark:border-gray-700 flex items-center justify-center"
              title="Conta Google Ativa"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
          </div>
        </button>

        {/* Dropdown Card estilo Perfil Google */}
        {isOpen && (
          <div
            className={`absolute right-0 mt-2 w-80 sm:w-88 rounded-3xl border shadow-2xl z-50 p-5 transform transition-all animate-in fade-in zoom-in-95 duration-150 ${
              darkMode
                ? 'bg-gray-850 bg-gray-900 border-gray-700/80 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {/* Header com E-mail Google */}
            <div className="text-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <span className={`text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                darkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'
              }`}>
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                Conta Google Conectada
              </span>
              <p className={`text-xs mt-1.5 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {email}
              </p>
            </div>

            {/* Foto Grande Central com botão para Trocar/Atualizar */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-md">
                  <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
                    darkMode ? 'bg-gray-900' : 'bg-white'
                  }`}>
                    {avatarUrl && !imageError ? (
                      <img
                        src={avatarUrl}
                        alt={fullName}
                        referrerPolicy="no-referrer"
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white w-full h-full flex items-center justify-center font-black text-2xl">
                        {initials || 'ML'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botão de câmera para alterar foto */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsPhotoModalOpen(true);
                  }}
                  className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg border-2 border-white dark:border-gray-900 transition-transform transform hover:scale-110 cursor-pointer"
                  title="Alterar fotinha de perfil"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Saudação e Nome */}
              <h3 className="font-extrabold text-base mt-3 text-center">
                Olá, {fullName}!
              </h3>
              <p className={`text-xs text-center font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Terapeuta TRG • Tangará da Serra-MT
              </p>

              {/* Botão para gerenciar foto */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPhotoModalOpen(true);
                }}
                className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  darkMode
                    ? 'border-gray-700 hover:border-gray-600 bg-gray-800 text-gray-300 hover:text-white'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50 text-gray-700 hover:text-black'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                <span>Trocar Fotinha</span>
              </button>
            </div>

            {/* Ações e Navegação */}
            <div className="mt-5 space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
              {onOpenAgenda && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAgenda();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-800 text-gray-300 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-700 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarCheck className="w-4 h-4 text-indigo-500" />
                    <span>Ver Minha Agenda</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Ir</span>
                </button>
              )}

              {/* Botão de Sair estilo Google */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  darkMode
                    ? 'border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300'
                    : 'border-red-200 bg-red-50/80 text-red-600 hover:bg-red-100 hover:text-red-700'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta Google</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PARA TROCAR A FOTINHA DE PERFIL */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 ${
              darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-600/15 text-blue-500 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Sua Fotinha de Perfil</h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Como no login do Google no canto superior direito
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className={`p-1.5 rounded-xl border transition-colors ${
                  darkMode ? 'border-gray-800 hover:bg-gray-800 text-gray-400' : 'border-gray-200 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pré-visualização da Fotinha Atual */}
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-lg">
                <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
                  darkMode ? 'bg-gray-900' : 'bg-white'
                }`}>
                  {avatarUrl && !imageError ? (
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white w-full h-full flex items-center justify-center font-black text-2xl">
                      {initials || 'ML'}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs font-bold">{fullName}</p>
              <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{email}</p>
            </div>

            {/* Opção 1: Upload do Arquivo do Celular ou Computador */}
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Escolher Foto do Aparelho (Celular / PC)</span>
                </button>
                <p className={`text-[11px] text-center mt-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  PNG, JPG ou WEBP (até 5MB)
                </p>
              </div>

              {/* Divisor */}
              <div className="relative my-2 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} />
                </div>
                <span className={`relative px-3 text-[10px] uppercase font-bold tracking-wider ${
                  darkMode ? 'bg-gray-900 text-gray-500' : 'bg-white text-gray-400'
                }`}>
                  ou informe o link (URL) da imagem
                </span>
              </div>

              {/* Opção 2: Inserir URL da Foto */}
              <form onSubmit={handleSavePhotoUrl} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>

              {/* Remover foto personalizada caso exista */}
              {customAvatar && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      darkMode
                        ? 'border-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-800'
                        : 'border-gray-200 text-gray-600 hover:text-red-600 hover:bg-gray-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Restaurar foto original da conta</span>
                  </button>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className={`px-6 py-2 rounded-xl border text-xs font-bold transition-colors ${
                  darkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleUserBadge;
