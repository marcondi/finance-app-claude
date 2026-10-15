import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  Copy,
  Check,
  Send,
  Sparkles,
  Clock,
  HeartHandshake,
  CreditCard,
  User,
  Phone,
  Settings,
  X,
  RefreshCw,
  HelpCircle,
  CalendarCheck,
  MapPin,
  Building2,
  Navigation
} from 'lucide-react';
import { Appointment } from './types';

export type TRGMessageType = 'presencial' | 'before' | 'return_scheduled' | 'after' | 'undecided' | 'pix' | 'reschedule' | 'custom';

interface WhatsAppTRGModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  allAppointments?: Appointment[];
  darkMode: boolean;
  initialType?: TRGMessageType;
}

export default function WhatsAppTRGModal({
  isOpen,
  onClose,
  appointment,
  allAppointments = [],
  darkMode,
  initialType = 'before'
}: WhatsAppTRGModalProps) {
  // Configurações do Terapeuta e Studio (salvas no localStorage)
  const [therapistName, setTherapistName] = useState(() => {
    return localStorage.getItem('trg_therapist_name') || 'Terapeuta TRG';
  });
  const [pixKey, setPixKey] = useState(() => {
    return localStorage.getItem('trg_therapist_pix') || '';
  });
  const [studioName, setStudioName] = useState(() => {
    return localStorage.getItem('trg_studio_name') || 'Studio Fernanda Lima';
  });
  const [studioAddress, setStudioAddress] = useState(() => {
    return localStorage.getItem('trg_studio_address') || 'Rua Arlindo Lopes da Silva, Nº 683-N, Centro';
  });
  const [studioCep, setStudioCep] = useState(() => {
    return localStorage.getItem('trg_studio_cep') || '78300-106';
  });
  const [studioCity, setStudioCity] = useState(() => {
    return localStorage.getItem('trg_studio_city') || 'Tangará da Serra - MT';
  });
  const [studioMapsUrl, setStudioMapsUrl] = useState(() => {
    return (
      localStorage.getItem('trg_studio_maps_url') ||
      'https://maps.google.com/?q=Rua+Arlindo+Lopes+da+Silva,+683-N,+Centro,+Tangará+da+Serra+-+MT'
    );
  });
  const [showSettings, setShowSettings] = useState(false);

  // Dados do Cliente e Sessão
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('09:00');
  const [sessionValue, setSessionValue] = useState('150,00');

  // Tipo de Mensagem Ativa
  const [activeType, setActiveType] = useState<TRGMessageType>(initialType);
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);

  // Inicializar dados quando o modal abre ou o appointment muda
  useEffect(() => {
    if (appointment) {
      setClientName(appointment.client_name || '');
      setClientPhone(appointment.client_phone || '');
      if (appointment.start_time) {
        const d = appointment.start_time.split('T')[0];
        setSessionDate(d);
        setSessionTime(appointment.start_time.substring(11, 16) || '09:00');
      } else {
        const today = new Date().toISOString().split('T')[0];
        setSessionDate(today);
      }
      setSessionValue(appointment.service_value ? String(appointment.service_value) : '150,00');
    } else {
      setClientName('');
      setClientPhone('');
      const today = new Date().toISOString().split('T')[0];
      setSessionDate(today);
      setSessionTime('09:00');
      setSessionValue('150,00');
    }
    setActiveType(initialType);
    setCopied(false);
  }, [appointment, isOpen, initialType]);

  // Formatador automático de telefone brasileiro (DDD + 9 dígitos)
  const formatPhoneNumber = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length === 0) return '';
    if (raw.length <= 2) return `(${raw}`;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  // Salvar configurações no localStorage
  const handleSaveSettings = () => {
    localStorage.setItem('trg_therapist_name', therapistName.trim() || 'Terapeuta TRG');
    localStorage.setItem('trg_therapist_pix', pixKey.trim());
    localStorage.setItem('trg_studio_name', studioName.trim() || 'Studio Fernanda Lima');
    localStorage.setItem('trg_studio_address', studioAddress.trim() || 'Rua Arlindo Lopes da Silva, Nº 683-N, Centro');
    localStorage.setItem('trg_studio_cep', studioCep.trim() || '78300-106');
    localStorage.setItem('trg_studio_city', studioCity.trim() || 'Tangará da Serra - MT');
    localStorage.setItem(
      'trg_studio_maps_url',
      studioMapsUrl.trim() || 'https://maps.google.com/?q=Rua+Arlindo+Lopes+da+Silva,+683-N,+Centro,+Tangará+da+Serra+-+MT'
    );
    setShowSettings(false);
  };

  // Formatador da Data para o texto (DD/MM/YYYY)
  const formattedDateStr = useMemo(() => {
    if (!sessionDate) return 'hoje';
    const [y, m, d] = sessionDate.split('-');
    if (y && m && d) {
      return `${d}/${m}/${y}`;
    }
    return sessionDate;
  }, [sessionDate]);

  // Nome do dia da semana (ex: Segunda-feira)
  const sessionWeekday = useMemo(() => {
    if (!sessionDate) return '';
    try {
      const parts = sessionDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayName = d.toLocaleDateString('pt-BR', { weekday: 'long' });
        return dayName.charAt(0).toUpperCase() + dayName.slice(1);
      }
    } catch {
      return '';
    }
    return '';
  }, [sessionDate]);

  // Modelos de Mensagem TRG Especializados
  const templates: Record<TRGMessageType, { title: string; subtitle: string; icon: any; getTemplate: () => string }> = {
    presencial: {
      title: 'Confirmação Presencial (Studio)',
      subtitle: `${studioName} • ${studioCity}`,
      icon: MapPin,
      getTemplate: () => `Olá, ${clientName.trim() || 'tudo bem'}! 🌿✨

Passando para confirmar o seu agendamento para a nossa sessão presencial de *TRG (Terapia de Reprocessamento Generativo)*:

📅 *Data:* ${formattedDateStr}${sessionWeekday ? ` (${sessionWeekday})` : ''}
⏰ *Horário:* ${sessionTime}
⏳ *Duração:* 50 minutos a 1 hora

📍 *Local do Atendimento Presencial:*
🏢 *${studioName}*
📌 *Endereço:* ${studioAddress}
🏙️ *Cidade:* ${studioCity}
📮 *CEP:* ${studioCep}

🗺️ *Como Chegar (Link no Google Maps / GPS):*
${studioMapsUrl.trim()}

💡 *Orientações importantes para a sua sessão:*
• Chegue com 5 a 10 minutos de antecedência para ser recepcionado(a) com calma.
• Venha com roupas confortáveis e o coração aberto para reprocessarmos e liberarmos bloqueios e cargas emocionais.
• O ambiente do Studio é totalmente privativo, climatizado e preparado para o seu acolhimento e transformação.

Você confirma a sua presença? Caso tenha qualquer dúvida sobre o trajeto ou horário, estou à sua total disposição! Abraço fraterno.
— *${therapistName}*`
    },

    before: {
      title: 'Lembrete & Pré-Atendimento',
      subtitle: 'Confirmação e preparo com 50 min a 1h',
      icon: Clock,
      getTemplate: () => `Olá, ${clientName.trim() || 'tudo bem'}! 🌿✨

Passando para confirmar a nossa sessão de *TRG (Terapia de Reprocessamento Generativo)*:

📅 *Data:* ${formattedDateStr}${sessionWeekday ? ` (${sessionWeekday})` : ''}
⏰ *Horário:* ${sessionTime}
⏳ *Duração:* 50 minutos a 1 hora

💡 *Orientações para o seu atendimento:*
• Esteja em um local silencioso, privativo e confortável, onde você não seja interrompido(a).
• Tenha um copo de água ao seu lado.
• Se nosso atendimento for online, utilize fones de ouvido para melhor concentração no reprocessamento.
• Venha com o coração aberto para reprocessarmos e liberarmos bloqueios e cargas emocionais.

Você confirma o seu horário? Qualquer dúvida fico à total disposição! Abraço fraterno.
— *${therapistName}*`
    },

    return_scheduled: {
      title: 'Confirmação de Retorno (7/14 dias)',
      subtitle: 'Agendamento rápido da próxima sessão TRG',
      icon: CalendarCheck,
      getTemplate: () => `Olá, ${clientName.trim() || 'tudo bem'}! 🌿✨

Passando para confirmar que já deixei agendada a nossa próxima sessão de *Retorno / Continuidade da TRG*:

📅 *Data:* ${formattedDateStr}${sessionWeekday ? ` (${sessionWeekday})` : ''}
⏰ *Horário:* ${sessionTime}
⏳ *Duração:* 50 minutos a 1 hora
📍 *Formato:* Atendimento de Reprocessamento Generativo

💡 *Dica importante para o intervalo entre as sessões:*
Continue observando suas sensações e acolhendo os momentos de alívio e leveza. Se surgir algum sonho ou reflexão importante, anote para aprofundarmos no nosso próximo encontro.

Nos vemos lá! Caso precise de qualquer ajuste de horário, só me avisar com antecedência por aqui. Um abraço carinhoso!
— *${therapistName}*`
    },

    after: {
      title: 'Pós-Atendimento & Acolhimento',
      subtitle: 'Orientações pós-sessão TRG (48h-72h)',
      icon: HeartHandshake,
      getTemplate: () => `Olá, ${clientName.trim() || 'tudo bem'}! 🌸🤍

Quero te parabenizar pela entrega, foco e coragem na nossa sessão de *TRG* hoje! Cada reprocessamento é um passo essencial na sua libertação e reestruturação emocional.

🧠 *Orientações importantes para as próximas 48 a 72 horas:*
• Seu cérebro continua trabalhando, reprocessando e consolidando novas conexões neurais.
• Beba bastante água e, se possível, tenha momentos de descanso e uma boa noite de sono.
• É absolutamente normal sentir um cansaço mental positivo, sono ou leveza. Apenas acolha as sensações com carinho e sem julgamentos.
• Se surgir qualquer dúvida, estou por aqui para te acolher.

Seguimos firmes na sua jornada de transformação! Um abraço carinhoso.
— *${therapistName}*`
    },

    undecided: {
      title: 'Cliente Indeciso / Dúvida no Valor',
      subtitle: 'Valor da TRG, duração e investimento de R$ 150',
      icon: HelpCircle,
      getTemplate: () => `Olá, ${clientName.trim() || 'tudo bem'}! 🌿✨

Vi que você ficou na dúvida sobre iniciar sua terapia e resolvi te explicar com carinho como funciona a *TRG (Terapia de Reprocessamento Generativo)*:

🧠 *Por que a TRG é diferente de tudo o que você já viu?*
Ao contrário das terapias convencionais onde você passa meses ou anos apenas conversando sobre o problema, a TRG trabalha diretamente na *raiz emocional* do seu cérebro. Reprocessamos desde traumas do passado até medos do futuro, eliminando a carga de dor, crises de ansiedade, bloqueios e angústias de forma rápida, profunda e duradoura.

⏳ *Como funciona a sessão?*
• *Duração:* Cada atendimento dura de *50 minutos a 1 hora* de reprocessamento direcionado e humanizado.
• *Investimento:* *R$ 150,00* por sessão.

💡 *Uma reflexão para você:*
Quanto tem custado para você conviver com essa angústia, noites mal dormidas ou bloqueios no seu dia a dia? Investir R$ 150 na sua paz, saúde mental e liberdade emocional não é um gasto, é o maior presente e transformação que você pode se permitir.

Você não precisa continuar carregando esse peso. Se fizer sentido para você, tenho alguns horários abertos esta semana. Posso reservar um horário especial para começarmos? 🤍
— *${therapistName}*`
    },

    pix: {
      title: 'Chave PIX & Pagamento',
      subtitle: 'Dados para acertar a sessão de R$ 150',
      icon: CreditCard,
      getTemplate: () => `Olá, ${clientName.trim() || 'tudo bem'}! 🌸✨

Seguem os dados para o acerto da nossa sessão de *TRG*:

💰 *Valor:* R$ ${sessionValue || '150,00'} (Sessão de 50 min a 1 hora)
🔑 *Chave PIX:* ${pixKey || '[INSIRA SUA CHAVE PIX NAS CONFIGURAÇÕES DO APP]'}
👤 *Favorecido:* ${therapistName}

Assim que realizar o pagamento, por gentileza envie o comprovante por aqui para confirmarmos a reserva na agenda. Muito obrigado(a)!
— *${therapistName}*`
    },

    reschedule: {
      title: 'Reagendamento & Continuidade',
      subtitle: 'Avanço do reprocessamento emocional',
      icon: RefreshCw,
      getTemplate: () => `Olá, ${clientName.trim() || 'tudo bem'}! 🌿

Passando para acompanhar como você está após nosso último atendimento de *TRG*. Como você tem se sentido nestes últimos dias?

Para darmos continuidade ao seu reprocessamento emocional e consolidarmos os resultados, gostaria de combinar a sua próxima sessão para esta semana.

Tenho alguns horários disponíveis nos próximos dias. Qual dia e turno (manhã, tarde ou noite) fica melhor para você?

Fico no aguardo para reservarmos o seu horário! Um grande abraço.
— *${therapistName}*`
    },

    custom: {
      title: 'Mensagem Personalizada',
      subtitle: 'Escreva livremente usando variáveis',
      icon: Sparkles,
      getTemplate: () => customText || `Olá, ${clientName.trim() || 'tudo bem'}! 🌿\n\n[Escreva sua mensagem aqui para o cliente da TRG]`
    }
  };

  // Mensagem Final Gerada (calculada diretamente para máxima performance sem warnings de lint)
  const activeTemplate = templates[activeType];
  const finalMessage = activeType === 'custom'
    ? customText
    : (activeTemplate ? activeTemplate.getTemplate() : '');

  // Ao mudar para a aba personalizada, preencher com o template atual
  const handleSelectTab = (type: TRGMessageType) => {
    setActiveType(type);
    if (type === 'custom' && !customText) {
      setCustomText(templates.before.getTemplate());
    }
  };

  // Copiar mensagem
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(finalMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  // Disparar WhatsApp
  const handleSendWhatsApp = () => {
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Por favor, informe o número de WhatsApp do cliente antes de enviar.');
      return;
    }

    // Se o número não incluir código do país (55), adiciona 55
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(finalMessage);
    const url = `https://wa.me/${fullPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
        }`}
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Central de Mensagens WhatsApp TRG
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-emerald-100 border border-white/20">
                  50min a 1h • R$ 150
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Mensagens prontas e humanizadas para Terapia de Reprocessamento Generativo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-all ${
                showSettings ? 'bg-white text-emerald-700 font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Configurar Chave PIX e Nome do Terapeuta"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PAINEL DE CONFIGURAÇÕES RÁPIDAS (PIX & NOME DO TERAPEUTA) */}
        {showSettings && (
          <div className={`p-4 border-b text-xs transition-all ${
            darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                <Settings className="w-4 h-4" />
                <span>Configurar Seus Dados de Terapeuta TRG</span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Salvo com segurança no seu navegador
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Seu Nome Profissional / Assinatura:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Terapeuta Marcos Silva"
                  value={therapistName}
                  onChange={(e) => setTherapistName(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Sua Chave PIX para Recebimento (R$ 150):
                </label>
                <input
                  type="text"
                  placeholder="Ex: CPF, celular, e-mail ou chave aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Configurações do Local Presencial (Studio) */}
            <div className="pt-2.5 border-t border-gray-200 dark:border-gray-700">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5" />
                Local da Sessão Presencial (Endereço do Studio)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Nome do Studio / Consultório:
                  </label>
                  <input
                    type="text"
                    placeholder="Studio Fernanda Lima"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Endereço Completo & Número:
                  </label>
                  <input
                    type="text"
                    placeholder="Rua Arlindo Lopes da Silva, Nº 683-N, Centro"
                    value={studioAddress}
                    onChange={(e) => setStudioAddress(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    CEP:
                  </label>
                  <input
                    type="text"
                    placeholder="78300-106"
                    value={studioCep}
                    onChange={(e) => setStudioCep(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Cidade & Estado:
                  </label>
                  <input
                    type="text"
                    placeholder="Tangará da Serra - MT"
                    value={studioCity}
                    onChange={(e) => setStudioCity(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Linha do Link do Google Maps / GPS */}
              <div className="mt-2.5 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Link do Google Maps / GPS (Rota direta para o Studio):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://maps.google.com/?q=..."
                    value={studioMapsUrl}
                    onChange={(e) => setStudioMapsUrl(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono text-[11px] ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <a
                    href={studioMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    title="Testar rota no Google Maps"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Testar Link</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Check className="w-3.5 h-3.5" /> Salvar Meus Dados
              </button>
            </div>
          </div>
        )}

        {/* CORPO PRINCIPAL COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* BARRA DE DADOS DO CLIENTE / PROSPECT */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                Dados do Destinatário & Atendimento
              </span>

              {/* Seletor rápido de clientes existentes caso queira trocar */}
              {allAppointments.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Puxar da agenda:</span>
                  <select
                    className={`text-xs px-2 py-1 rounded-lg border max-w-[200px] truncate ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                    onChange={(e) => {
                      const selected = allAppointments.find(a => a.id === e.target.value);
                      if (selected) {
                        setClientName(selected.client_name || '');
                        setClientPhone(selected.client_phone || '');
                        if (selected.start_time) {
                          setSessionDate(selected.start_time.split('T')[0]);
                          setSessionTime(selected.start_time.substring(11, 16));
                        }
                        if (selected.service_value) {
                          setSessionValue(String(selected.service_value));
                        }
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Selecionar agendamento...</option>
                    {allAppointments.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.client_name} - {a.start_time ? a.start_time.substring(8, 10) + '/' + a.start_time.substring(5, 7) : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Nome do Cliente / Interessado:
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Mariana Ferreira"
                    className={`w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border font-medium ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  WhatsApp (com DDD):
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(65) 99992-5006"
                    className={`w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border font-medium ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                {clientPhone.replace(/\D/g, '').length > 0 && clientPhone.replace(/\D/g, '').length < 11 && (
                  <span className="text-[10px] text-amber-500 block mt-0.5 font-medium">
                    ⚠️ Verifique se tem 9 dígitos após o DDD (ex: {clientPhone.replace(/\D/g, '').slice(0, 2)} 9...)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Data da Sessão TRG:
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs rounded-lg border font-medium ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Horário:
                  </label>
                  <input
                    type="time"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className={`w-full px-2 py-1.5 text-xs rounded-lg border font-medium ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                    Valor (R$):
                  </label>
                  <input
                    type="text"
                    value={sessionValue}
                    onChange={(e) => setSessionValue(e.target.value)}
                    className={`w-full px-2 py-1.5 text-xs rounded-lg border font-bold text-emerald-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SELEÇÃO DO MODELO DE MENSAGEM */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Escolha a Finalidade da Mensagem:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8 gap-2">
              {(Object.keys(templates) as TRGMessageType[]).map((key) => {
                const item = templates[key];
                const Icon = item.icon;
                const isSelected = activeType === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTab(key)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-md font-bold'
                        : darkMode
                        ? 'border-gray-700 bg-gray-800/80 hover:bg-gray-800 text-gray-300'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs leading-tight line-clamp-2">{item.title}</div>
                      <div className="text-[10px] opacity-70 mt-1 truncate">{item.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ÁREA DE PRÉ-VISUALIZAÇÃO ESTILO WHATSAPP & EDIÇÃO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Visualizador de Chat estilo WhatsApp */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-gray-400">
                  <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                  Prévia no WhatsApp
                </span>
                <span className="text-[11px] text-gray-400">
                  {clientPhone ? `Para: ${clientPhone}` : 'Telefone não preenchido'}
                </span>
              </div>

              {/* Fundo de chat verde WhatsApp */}
              <div className={`flex-1 p-4 rounded-2xl border min-h-[280px] flex flex-col justify-start relative overflow-hidden ${
                darkMode ? 'bg-[#0b141a] border-gray-700' : 'bg-[#e5ddd5] border-gray-300'
              }`}>
                {/* Balão de mensagem enviada (verde WhatsApp) */}
                <div className="max-w-[92%] sm:max-w-[85%] self-end">
                  <div className={`p-3.5 rounded-2xl rounded-tr-none text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap shadow-md ${
                    darkMode
                      ? 'bg-[#005c4b] text-gray-100'
                      : 'bg-[#d9fdd3] text-[#111b21]'
                  }`}>
                    {finalMessage}

                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-emerald-200/80">
                      <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <Check className="w-3 h-3 text-emerald-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Editor de Texto para Ajustes Livres */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Editar ou Personalizar Texto
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeType === 'custom') {
                      setCustomText(templates.before.getTemplate());
                    } else {
                      // Ao resetar, recarrega o modelo base
                      const base = templates[activeType].getTemplate();
                      setCustomText(base);
                    }
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Restaurar Padrão
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                <textarea
                  value={activeType === 'custom' ? customText : finalMessage}
                  onChange={(e) => {
                    setActiveType('custom');
                    setCustomText(e.target.value);
                  }}
                  rows={11}
                  placeholder="Escreva ou edite sua mensagem..."
                  className={`w-full flex-1 p-3 text-xs sm:text-sm rounded-xl border leading-relaxed resize-none ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-emerald-500 outline-none`}
                />

                <div className="mt-2 text-[11px] text-gray-400 leading-tight">
                  💡 <em>Você pode alterar qualquer palavra ou adicionar o link do Google Meet / endereço antes de enviar.</em>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className={`px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
          darkMode ? 'bg-gray-850 border-gray-800' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span>Terapeuta: <strong>{therapistName}</strong></span>
            {pixKey && <span className="truncate max-w-[150px] sm:max-w-xs">| Chave Pix: <strong>{pixKey}</strong></span>}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyMessage}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-green-500/20 text-green-500 border-green-500'
                  : darkMode
                  ? 'border-gray-700 hover:bg-gray-800 text-gray-200'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              }`}
              title="Copiar texto da mensagem"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Abrir & Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
