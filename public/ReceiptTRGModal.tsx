import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Printer,
  Share2,
  X,
  User,
  Settings,
  Check,
  Upload,
  Sparkles,
  FileText
} from 'lucide-react';
import { Appointment } from './types';

interface ReceiptTRGModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  allAppointments?: Appointment[];
  darkMode: boolean;
}

// Conversor de Valor para Extenso em Português
function valorPorExtenso(valor: number): string {
  if (!valor || isNaN(valor)) return 'Zero reais';
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function converteGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];

    if (c > 0) partes.push(centenas[c]);
    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
    return partes.join(' e ');
  }

  const milhares = Math.floor(inteiro / 1000);
  const restoMil = inteiro % 1000;

  const partesTexto: string[] = [];
  if (milhares > 0) {
    if (milhares === 1) {
      partesTexto.push('mil');
    } else {
      partesTexto.push(converteGrupo(milhares) + ' mil');
    }
  }

  if (restoMil > 0) {
    partesTexto.push(converteGrupo(restoMil));
  }

  let resultado = partesTexto.join(' e ');
  resultado += inteiro === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    resultado += ' e ' + converteGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

export default function ReceiptTRGModal({
  isOpen,
  onClose,
  appointment,
  allAppointments = [],
  darkMode
}: ReceiptTRGModalProps) {
  // Dados do Terapeuta
  const [therapistName, setTherapistName] = useState(() => {
    return localStorage.getItem('trg_therapist_name') || 'Marcondes Lima';
  });
  const [therapistTitle, setTherapistTitle] = useState(() => {
    return localStorage.getItem('trg_therapist_title') || 'Terapeuta Emocional TRG';
  });
  const [therapistReg, setTherapistReg] = useState(() => {
    return localStorage.getItem('trg_therapist_reg') || 'CITRG 00.000';
  });
  const [therapistDoc, setTherapistDoc] = useState(() => {
    return localStorage.getItem('trg_therapist_doc') || '';
  });
  const [therapistPhone, setTherapistPhone] = useState(() => {
    return localStorage.getItem('trg_therapist_phone') || '';
  });
  const [therapistCity, setTherapistCity] = useState(() => {
    const saved = localStorage.getItem('trg_therapist_city');
    if (!saved || saved === 'Cuiabá - MT') {
      localStorage.setItem('trg_therapist_city', 'Tangará da Serra - MT');
      return 'Tangará da Serra - MT';
    }
    return saved;
  });
  const [therapistLogo, setTherapistLogo] = useState<string>(() => {
    return localStorage.getItem('trg_receipt_logo') || '';
  });

  const [showConfig, setShowConfig] = useState(false);

  // Dados do Recibo
  const [receiptNumber, setReceiptNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('50 minutos a 1 hora');
  const [amount, setAmount] = useState('150.00');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [serviceDescription, setServiceDescription] = useState(
    'Sessão individual de Terapia de Reprocessamento Generativo (TRG) com foco em reestruturação emocional e alívio de bloqueios/ansiedade.'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar quando abre ou muda o agendamento
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    setReceiptNumber(`TRG-${y}${m}-${randomSeq}`);
    setIssueDate(today.toISOString().split('T')[0]);

    if (appointment) {
      setClientName(appointment.client_name || '');
      setClientPhone(appointment.client_phone || '');
      const sDate = appointment.start_time ? appointment.start_time.split('T')[0] : today.toISOString().split('T')[0];
      setSessionDate(sDate);
      setAmount(appointment.service_value ? String(appointment.service_value) : '150.00');
    } else {
      setClientName('');
      setClientPhone('');
      setSessionDate(today.toISOString().split('T')[0]);
      setAmount('150.00');
    }
  }, [appointment, isOpen]);

  // Salvar configurações no localStorage
  const handleSaveConfig = () => {
    localStorage.setItem('trg_therapist_name', therapistName);
    localStorage.setItem('trg_therapist_title', therapistTitle);
    localStorage.setItem('trg_therapist_reg', therapistReg);
    localStorage.setItem('trg_therapist_doc', therapistDoc);
    localStorage.setItem('trg_therapist_phone', therapistPhone);
    localStorage.setItem('trg_therapist_city', therapistCity);
    if (therapistLogo) {
      localStorage.setItem('trg_receipt_logo', therapistLogo);
    }
    setShowConfig(false);
  };

  // Carregar imagem de logo personalizada
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setTherapistLogo(result);
        localStorage.setItem('trg_receipt_logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomLogo = () => {
    setTherapistLogo('');
    localStorage.removeItem('trg_receipt_logo');
  };

  // Formatador de Data em Extenso (ex: 05 de Outubro de 2026)
  const formattedIssueDate = useMemo(() => {
    if (!issueDate) return '';
    const [y, m, d] = issueDate.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [issueDate]);

  const formattedSessionDate = useMemo(() => {
    if (!sessionDate) return '';
    const [y, m, d] = sessionDate.split('-');
    return `${d}/${m}/${y}`;
  }, [sessionDate]);

  const valorExtenso = useMemo(() => {
    return valorPorExtenso(parseFloat(amount) || 0);
  }, [amount]);

  // Função de Impressão / Salvar PDF em Janela Isolada A4
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para gerar o PDF do recibo.');
      return;
    }

    const logoHtml = therapistLogo
      ? `<img src="${therapistLogo}" alt="Logo Marcondes Lima TRG" style="max-height: 90px; width: auto; object-fit: contain; margin: 0 auto 10px auto; display: block;" />`
      : `
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; border: 2.5px solid #d4af37; padding: 4px; box-sizing: border-box; background: #faf9f6;">
            <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#d4af37" stroke-width="2.5" />
              <!-- Silhueta perfil com árvore da vida -->
              <path d="M 50 20 Q 65 30 65 50 Q 65 70 50 82 Q 53 72 52 58 Q 50 40 40 32 Z" fill="#d4af37" opacity="0.9" />
              <circle cx="48" cy="35" r="5" fill="#008080" />
              <circle cx="58" cy="32" r="4.5" fill="#20b2aa" />
              <circle cx="42" cy="46" r="4" fill="#008080" />
              <circle cx="56" cy="45" r="4.5" fill="#2e8b57" />
              <circle cx="50" cy="55" r="5" fill="#008080" />
              <!-- Flor de lótus na base -->
              <path d="M 40 85 C 45 78 55 78 60 85 C 55 83 45 83 40 85 Z" fill="#008080" />
            </svg>
          </div>
        </div>
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Recibo TRG - ${clientName || 'Cliente'} - ${receiptNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #222;
            background: #fff;
            margin: 0;
            padding: 20px;
            font-size: 13px;
            line-height: 1.6;
          }
          .receipt-container {
            max-width: 720px;
            margin: 0 auto;
            border: 2px solid #d4af37;
            border-radius: 12px;
            padding: 35px 40px;
            box-sizing: border-box;
            background: #ffffff;
            position: relative;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .title-name {
            font-family: 'Cinzel', Georgia, 'Times New Roman', serif;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #8c6d1f;
            text-transform: uppercase;
            margin: 4px 0 2px 0;
          }
          .subtitle-role {
            font-size: 13px;
            font-weight: 600;
            color: #006666;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .trg-badge {
            font-family: Georgia, serif;
            font-size: 16px;
            font-weight: 800;
            color: #b8860b;
            letter-spacing: 4px;
          }
          .slogan {
            font-size: 10px;
            color: #666;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .receipt-title-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fbf9f4;
            border-left: 4px solid #b8860b;
            padding: 10px 16px;
            margin-bottom: 25px;
            border-radius: 4px;
          }
          .receipt-doc-title {
            font-size: 15px;
            font-weight: 800;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .receipt-value-box {
            font-size: 18px;
            font-weight: 900;
            color: #0d6338;
          }
          .body-text {
            font-size: 13.5px;
            line-height: 1.8;
            color: #2b2b2b;
            text-align: justify;
            margin-bottom: 25px;
          }
          .details-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .details-grid td {
            padding: 7px 10px;
            font-size: 12px;
            border-bottom: 1px solid #f0f0f0;
          }
          .details-grid td.label {
            font-weight: 700;
            color: #666;
            width: 32%;
            text-transform: uppercase;
            font-size: 11px;
          }
          .details-grid td.val {
            font-weight: 600;
            color: #111;
          }
          .footer-section {
            margin-top: 35px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .date-location {
            font-size: 12px;
            color: #555;
          }
          .signature-box {
            text-align: center;
            min-width: 250px;
          }
          .signature-line {
            border-top: 1.5px solid #333;
            margin-bottom: 5px;
          }
          .signature-name {
            font-weight: 700;
            font-size: 13px;
            color: #111;
          }
          .signature-reg {
            font-size: 11px;
            color: #555;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 85px;
            font-weight: 900;
            color: rgba(212, 175, 55, 0.04);
            pointer-events: none;
            letter-spacing: 12px;
            z-index: 0;
            font-family: Georgia, serif;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="watermark">TRG</div>

          <div class="receipt-header">
            ${logoHtml}
            <div class="title-name">${therapistName}</div>
            <div class="subtitle-role">${therapistTitle}</div>
            <div class="trg-badge">T R G</div>
            <div class="slogan">Reprocessar • Curar • Transformar • Viver</div>
          </div>

          <div class="receipt-title-box">
            <div>
              <div class="receipt-doc-title">RECIBO DE PAGAMENTO & DECLARAÇÃO</div>
              <div style="font-size: 11px; color: #777;">Nº ${receiptNumber}</div>
            </div>
            <div class="receipt-value-box">
              R$ ${parseFloat(amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div class="body-text">
            Recebi de <strong>${clientName || 'Cliente'}</strong>${clientDoc ? `, inscrito(a) no CPF nº <strong>${clientDoc}</strong>` : ''}, 
            a quantia de <strong>R$ ${parseFloat(amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> 
            (<em>${valorExtenso}</em>), referente a honorários profissionais de <strong>${serviceDescription}</strong>, 
            com duração de <strong>${sessionDuration}</strong>, realizada na data de <strong>${formattedSessionDate}</strong>.
          </div>

          <table class="details-grid">
            <tr>
              <td class="label">Cliente:</td>
              <td class="val">${clientName || '---'}</td>
            </tr>
            ${clientDoc ? `
            <tr>
              <td class="label">CPF do Cliente:</td>
              <td class="val">${clientDoc}</td>
            </tr>` : ''}
            <tr>
              <td class="label">Data do Atendimento:</td>
              <td class="val">${formattedSessionDate}</td>
            </tr>
            <tr>
              <td class="label">Duração da Sessão:</td>
              <td class="val">${sessionDuration}</td>
            </tr>
            <tr>
              <td class="label">Forma de Pagamento:</td>
              <td class="val">${paymentMethod} (Quitado)</td>
            </tr>
            <tr>
              <td class="label">Finalidade:</td>
              <td class="val">Comprovação de pagamento e fins de declaração em saúde/terapia</td>
            </tr>
          </table>

          <div class="footer-section">
            <div class="date-location">
              ${therapistCity}, ${formattedIssueDate}.
              ${therapistPhone ? `<br>Contato: ${therapistPhone}` : ''}
              ${therapistDoc ? `<br>CPF/CNPJ: ${therapistDoc}` : ''}
            </div>

            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-name">${therapistName}</div>
              <div class="signature-reg">${therapistTitle} ${therapistReg ? `• ${therapistReg}` : ''}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Enviar Recibo no WhatsApp
  const handleSendWhatsAppReceipt = () => {
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Por favor, informe o WhatsApp do cliente antes de enviar.');
      return;
    }

    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const msg = `Olá, ${clientName.trim() || 'tudo bem'}! 🌸📄

Passando para disponibilizar os dados do seu *Recibo & Declaração de Atendimento de TRG*:

🧾 *Recibo Nº:* ${receiptNumber}
👤 *Cliente:* ${clientName}
📅 *Data da Sessão:* ${formattedSessionDate}
⏳ *Duração:* ${sessionDuration}
💰 *Valor Quitado:* R$ ${parseFloat(amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${valorExtenso})
💳 *Forma de Pagamento:* ${paymentMethod}

Muito obrigado(a) pela confiança no meu trabalho e na sua jornada de reprocessamento emocional com a TRG!

Abraço fraterno,
— *${therapistName}*
*${therapistTitle}*`;

    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${fullPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
        }`}
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Emissão de Recibo & Declaração TRG
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-yellow-100 border border-white/20">
                  A4 Profissional • PDF
                </span>
              </div>
              <p className="text-xs text-yellow-100/90 font-medium">
                Comprovante oficial com logotipo dourado Marcondes Lima Terapeuta Emocional TRG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-xl transition-all ${
                showConfig ? 'bg-white text-amber-800 font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Configurar Dados do Terapeuta e Logotipo"
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

        {/* PAINEL DE CONFIGURAÇÕES DE DADOS DO TERAPEUTA & LOGO */}
        {showConfig && (
          <div className={`p-4 border-b text-xs transition-all ${
            darkMode ? 'bg-gray-850 border-gray-700' : 'bg-amber-50/80 border-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-400">
                <Settings className="w-4 h-4" />
                <span>Configurar Seus Dados no Recibo & Logotipo</span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Salvo com segurança no seu navegador
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Seu Nome Profissional:
                </label>
                <input
                  type="text"
                  value={therapistName}
                  onChange={(e) => setTherapistName(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Título / Cargo:
                </label>
                <input
                  type="text"
                  value={therapistTitle}
                  onChange={(e) => setTherapistTitle(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Registro Profissional (ex: CITRG):
                </label>
                <input
                  type="text"
                  placeholder="Ex: CITRG 00.000"
                  value={therapistReg}
                  onChange={(e) => setTherapistReg(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Seu CPF ou CNPJ:
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={therapistDoc}
                  onChange={(e) => setTherapistDoc(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Cidade - Estado:
                </label>
                <input
                  type="text"
                  placeholder="Tangará da Serra - MT"
                  value={therapistCity}
                  onChange={(e) => setTherapistCity(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Telefone de Contato:
                </label>
                <input
                  type="text"
                  placeholder="(65) 99992-5006"
                  value={therapistPhone}
                  onChange={(e) => setTherapistPhone(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Configuração do Logotipo */}
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  Logotipo no Recibo:
                </span>
                {therapistLogo ? (
                  <div className="flex items-center gap-2">
                    <img src={therapistLogo} alt="Logo" className="h-8 max-w-[80px] object-contain border rounded p-0.5 bg-white" />
                    <button
                      type="button"
                      onClick={handleRemoveCustomLogo}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Remover e Usar Logo Dourada Padrão
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    ✨ Emblema Oficial Dourado Marcondes Lima TRG (Padrão Ativo)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Carregar Minha Imagem de Logo
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5" /> Salvar Meus Dados
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CORPO PRINCIPAL COM CAMPOS DE EMISSÃO & PREVIEW DO RECIBO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

          {/* DADOS DO CLIENTE & ATENDIMENTO */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" />
                Dados do Recibo e do Cliente
              </span>

              {allAppointments.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Puxar de agendamento:</span>
                  <select
                    className={`text-xs px-2 py-1 rounded-lg border max-w-[210px] truncate ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                    onChange={(e) => {
                      const selected = allAppointments.find(a => a.id === e.target.value);
                      if (selected) {
                        setClientName(selected.client_name || '');
                        setClientPhone(selected.client_phone || '');
                        if (selected.start_time) {
                          setSessionDate(selected.start_time.split('T')[0]);
                        }
                        if (selected.service_value) {
                          setAmount(String(selected.service_value));
                        }
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Selecionar da agenda...</option>
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
                  Nome do Cliente:
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Mariana Ferreira"
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-bold ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  CPF do Cliente (Opcional):
                </label>
                <input
                  type="text"
                  value={clientDoc}
                  onChange={(e) => setClientDoc(e.target.value)}
                  placeholder="000.000.000-00"
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-medium ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Data da Sessão TRG:
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-medium ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Valor Pago (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-extrabold text-emerald-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Forma de Pagamento:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-medium ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="PIX">PIX (Transferência Instantânea)</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="Dinheiro">Dinheiro em Espécie</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Duração da Sessão:
                </label>
                <input
                  type="text"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  placeholder="50 minutos a 1 hora"
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-medium ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  WhatsApp do Cliente (para envio):
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(65) 99992-5006"
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-medium ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                Descrição do Atendimento / Terapia no Recibo:
              </label>
              <input
                type="text"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="Sessão individual de Terapia de Reprocessamento Generativo (TRG)"
                className={`w-full px-3 py-1.5 text-xs rounded-lg border font-medium ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          {/* PRÉVIA VISUAL DO RECIBO OFICIAL TRG (FOLHA A4 ESTILIZADA) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                Prévia da Folha do Recibo (Padrão Oficial A4)
              </span>
              <span className="text-[11px] text-gray-400">
                Visualização do documento pronto para impressão
              </span>
            </div>

            {/* Container da Folha Branca com Borda Dourada */}
            <div className="bg-white text-gray-900 p-6 sm:p-8 rounded-2xl shadow-xl border-2 border-amber-500/70 max-w-2xl mx-auto relative overflow-hidden font-sans">
              
              {/* Marca d'água elegante TRG */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none text-8xl font-black font-serif text-amber-900">
                TRG
              </div>

              {/* Cabeçalho do Recibo com Logotipo Oficial */}
              <div className="text-center pb-5 mb-5 border-b-2 border-amber-100 relative">
                {therapistLogo ? (
                  <img
                    src={therapistLogo}
                    alt="Logo Oficial Marcondes Lima"
                    className="max-h-20 mx-auto mb-2 object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center mb-2">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500 p-1 flex items-center justify-center bg-amber-50/50 mb-1">
                      <div className="w-full h-full rounded-full border border-amber-400 flex flex-col items-center justify-center">
                        <Sparkles className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </div>
                )}

                <h2 className="text-xl sm:text-2xl font-serif font-black tracking-wider text-amber-900 uppercase">
                  {therapistName}
                </h2>
                <h4 className="text-xs font-bold tracking-[0.2em] text-teal-800 uppercase mt-0.5">
                  {therapistTitle}
                </h4>
                <div className="text-sm font-serif font-extrabold tracking-[0.3em] text-amber-600 mt-0.5">
                  T R G
                </div>
                <div className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">
                  Reprocessar • Curar • Transformar • Viver
                </div>
              </div>

              {/* Barra de Título do Documento e Valor */}
              <div className="bg-amber-50/70 border-l-4 border-amber-600 p-3 rounded-r-lg flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-950">
                    Recibo de Pagamento & Declaração
                  </div>
                  <div className="text-[10px] text-gray-500 font-semibold">
                    Documento Nº {receiptNumber}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold">Valor Total</span>
                  <span className="text-lg font-black text-emerald-700">
                    R$ {parseFloat(amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Texto Declaratório Principal */}
              <p className="text-xs sm:text-[13px] leading-relaxed text-gray-800 text-justify mb-5 font-normal">
                Recebi de <strong>{clientName || '______________________________________'}</strong>
                {clientDoc ? (
                  <span>, portador(a) do CPF nº <strong>{clientDoc}</strong></span>
                ) : null}
                {', a quantia de '}
                <strong>
                  R$ {parseFloat(amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>{' '}
                (<em>{valorExtenso}</em>), referente a honorários profissionais de{' '}
                <strong>{serviceDescription}</strong>, com duração de{' '}
                <strong>{sessionDuration}</strong>, realizada em{' '}
                <strong>{formattedSessionDate}</strong>.
              </p>

              {/* Tabela de Detalhes da Sessão */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 text-xs">
                <div className="grid grid-cols-3 p-2 bg-gray-50 border-b border-gray-200 font-bold text-gray-600 text-[11px]">
                  <span>Cliente:</span>
                  <span className="col-span-2 text-gray-900">{clientName || '---'}</span>
                </div>
                {clientDoc && (
                  <div className="grid grid-cols-3 p-2 border-b border-gray-100 text-[11px]">
                    <span className="font-bold text-gray-600">CPF do Cliente:</span>
                    <span className="col-span-2 text-gray-900">{clientDoc}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 p-2 border-b border-gray-100 text-[11px]">
                  <span className="font-bold text-gray-600">Data da Sessão:</span>
                  <span className="col-span-2 text-gray-900">{formattedSessionDate} ({sessionDuration})</span>
                </div>
                <div className="grid grid-cols-3 p-2 bg-gray-50 text-[11px]">
                  <span className="font-bold text-gray-600">Forma de Pagamento:</span>
                  <span className="col-span-2 font-bold text-emerald-700">{paymentMethod} (Quitado)</span>
                </div>
              </div>

              {/* Rodapé e Linha de Assinatura */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="text-[11px] text-gray-600 text-center sm:text-left">
                  <div>{therapistCity}, {formattedIssueDate}.</div>
                  {therapistPhone && <div className="text-[10px]">Contato: {therapistPhone}</div>}
                  {therapistDoc && <div className="text-[10px]">CPF/CNPJ: {therapistDoc}</div>}
                </div>

                <div className="text-center min-w-[200px]">
                  <div className="w-48 border-t border-gray-800 mx-auto mb-1"></div>
                  <div className="font-bold text-xs text-gray-900">{therapistName}</div>
                  <div className="text-[10px] text-gray-600">{therapistTitle} {therapistReg ? `• ${therapistReg}` : ''}</div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className={`px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
          darkMode ? 'bg-gray-850 border-gray-800' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="text-xs text-gray-400">
            Recibo gerado para <strong>{clientName || 'Cliente'}</strong> • R$ {amount}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handleSendWhatsAppReceipt}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
              title="Disparar comprovante no WhatsApp do cliente"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
