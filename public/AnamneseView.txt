import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Target,
  User,
  Phone,
  Search,
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  Brain
} from 'lucide-react';
import { Appointment } from './types';
import {
  ClientAnamneseModal,
  loadAllAnamneses,
  saveAllAnamneses,
  AnamneseRecord
} from './AgendaView';
import { supabase } from './supabaseClient';

interface AnamneseViewProps {
  darkMode: boolean;
  appointments: Appointment[];
  currentUser?: any;
  onOpenEvolution?: (apt?: Appointment | null) => void;
  showToast?: (text: string, type?: 'success' | 'warn' | 'error') => void;
}

export default function AnamneseView({
  darkMode,
  appointments = [],
  currentUser,
  onOpenEvolution,
  showToast
}: AnamneseViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [anamneses, setAnamneses] = useState<AnamneseRecord[]>(() => loadAllAnamneses());
  
  // Modal State
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Backup
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recarregar anamneses locais e nuvem
  const refreshAnamneses = () => {
    const list = loadAllAnamneses();
    setAnamneses(list);
  };

  // Sincronizar com a nuvem Supabase
  const handleCloudSync = async () => {
    setSyncStatus('syncing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let userId = session?.user?.id;
      if (!userId) {
        const savedUser = localStorage.getItem('finance_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            userId = parsed.id;
          } catch {}
        }
      }

      if (!userId) {
        setSyncStatus('idle');
        if (showToast) showToast('Faça login para sincronizar com a nuvem.', 'warn');
        return;
      }

      // Buscar da nuvem
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .eq('notes', '[TRG_ANAMNESE_SYNC]');

      if (!error && data && data.length > 0) {
        const rawPayload = data[0].client_phone || '';
        if (rawPayload.startsWith('[TRG_ANAMNESE_SYNC]')) {
          try {
            const cloudList: AnamneseRecord[] = JSON.parse(rawPayload.replace('[TRG_ANAMNESE_SYNC]', ''));
            const localList = loadAllAnamneses();
            const map = new Map<string, AnamneseRecord>();
            localList.forEach(r => map.set(r.id, r));
            cloudList.forEach(r => {
              const existing = map.get(r.id);
              if (!existing || new Date(r.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
                map.set(r.id, r);
              }
            });
            const merged = Array.from(map.values());
            saveAllAnamneses(merged);
            setAnamneses(merged);
          } catch {}
        }
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      if (showToast) showToast('Fichas de Anamnese sincronizadas com sucesso!', 'success');
    } catch {
      setSyncStatus('error');
      if (showToast) showToast('Erro na sincronização em nuvem.', 'error');
    }
  };

  useEffect(() => {
    refreshAnamneses();
  }, [isModalOpen]);

  // Lista unificada de clientes: agendamentos + anamneses já criadas
  const clientList = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      lastDate?: string;
      sampleAppointment?: Appointment;
      anamnese?: AnamneseRecord;
    }>();

    // 1. Inserir a partir dos agendamentos
    appointments.forEach(a => {
      const name = a.client_name?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = map.get(key);
      const aptDate = a.start_time ? a.start_time.split('T')[0] : '';
      if (!existing) {
        map.set(key, {
          name,
          phone: a.client_phone || '',
          lastDate: aptDate,
          sampleAppointment: a
        });
      } else {
        if (!existing.phone && a.client_phone) existing.phone = a.client_phone;
        if (aptDate && (!existing.lastDate || aptDate > existing.lastDate)) {
          existing.lastDate = aptDate;
          existing.sampleAppointment = a;
        }
      }
    });

    // 2. Associar ou adicionar a partir das anamneses
    anamneses.forEach(rec => {
      const key = (rec.clientKey || rec.clientName).trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.anamnese = rec;
        if (!existing.phone && rec.clientPhone) existing.phone = rec.clientPhone;
      } else {
        const defaultDate = rec.date || new Date().toISOString().split('T')[0];
        map.set(key, {
          name: rec.clientName,
          phone: rec.clientPhone || '',
          lastDate: rec.date,
          anamnese: rec,
          sampleAppointment: {
            id: 'anamnese-' + rec.id,
            user_id: '',
            title: 'Sessão TRG - ' + rec.clientName,
            client_name: rec.clientName,
            client_phone: rec.clientPhone || '',
            start_time: `${defaultDate}T09:00:00`,
            end_time: `${defaultDate}T10:00:00`,
            status: 'COMPLETED',
            service_value: 0,
            synced_google: false
          }
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments, anamneses]);

  // Filtragem
  const filteredClients = useMemo(() => {
    return clientList.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.anamnese?.chiefComplaint || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterStatus === 'completed') return !!c.anamnese;
      if (filterStatus === 'pending') return !c.anamnese;
      return true;
    });
  }, [clientList, searchTerm, filterStatus]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalClients = clientList.length;
    const completedAnamneses = clientList.filter(c => !!c.anamnese).length;
    const pendingAnamneses = totalClients - completedAnamneses;
    
    let totalTargets = 0;
    let childhoodTargets = 0;
    let adolescenceTargets = 0;
    let adultTargets = 0;
    let currentTargets = 0;

    anamneses.forEach(a => {
      if (Array.isArray(a.targets)) {
        totalTargets += a.targets.length;
        a.targets.forEach(t => {
          if (t.lifeStage === 'infancia') childhoodTargets++;
          else if (t.lifeStage === 'adolescencia') adolescenceTargets++;
          else if (t.lifeStage === 'adulta') adultTargets++;
          else if (t.lifeStage === 'atual') currentTargets++;
        });
      }
    });

    return {
      totalClients,
      completedAnamneses,
      pendingAnamneses,
      totalTargets,
      childhoodTargets,
      adolescenceTargets,
      adultTargets,
      currentTargets
    };
  }, [clientList, anamneses]);

  const handleOpenClientAnamnese = (client: { name: string; phone: string; sampleAppointment?: Appointment }) => {
    const today = new Date().toISOString().split('T')[0];
    const apt: Appointment = client.sampleAppointment || {
      id: 'apt-temp-' + Date.now(),
      user_id: '',
      title: 'Sessão TRG - ' + client.name,
      client_name: client.name,
      client_phone: client.phone,
      start_time: `${today}T09:00:00`,
      end_time: `${today}T10:00:00`,
      status: 'CONFIRMED',
      service_value: 0,
      synced_google: false
    };
    setSelectedAppointment(apt);
    setIsModalOpen(true);
  };

  const handleNewAnamnese = () => {
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  // Exportar Backup JSON
  const handleExportBackup = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(anamneses, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `backup_anamneses_trg_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (showToast) showToast('Backup de Anamneses baixado com sucesso!', 'success');
    } catch {
      if (showToast) showToast('Erro ao exportar backup.', 'error');
    }
  };

  // Importar Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const localList = loadAllAnamneses();
          const map = new Map<string, AnamneseRecord>();
          localList.forEach(r => map.set(r.id, r));
          parsed.forEach(r => {
            if (r.id && r.clientName) {
              map.set(r.id, r);
            }
          });
          const merged = Array.from(map.values());
          saveAllAnamneses(merged);
          setAnamneses(merged);
          if (showToast) showToast(`${parsed.length} anamneses restauradas com sucesso!`, 'success');
        }
      } catch {
        if (showToast) showToast('Arquivo de backup inválido.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* CABEÇALHO HERO CLÍNICO TRG */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-cyan-900 text-white p-6 sm:p-8 shadow-xl border border-teal-700/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <Brain className="w-3.5 h-3.5 text-teal-300" />
              <span>Terapia de Reprocessamento Generativo • Módulo Clínico</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Target className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-300 flex-shrink-0" />
              <span>Ficha de Anamnese TRG</span>
            </h1>
            <p className="text-sm sm:text-base text-teal-100/90 leading-relaxed">
              Primeira consulta, linha do tempo da vida, queixa principal, catalogação detalhada de <strong>Alvos de Reprocessamento (SUD)</strong> e planejamento terapêutico estruturado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleNewAnamnese}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-teal-950 shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Ficha de Anamnese</span>
            </button>

            <button
              onClick={handleCloudSync}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
              title="Sincronizar dados com a nuvem"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
            </button>

            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-3 rounded-2xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-teal-100 border border-white/20 transition-all cursor-pointer"
              title="Baixar Backup em arquivo JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-3 rounded-2xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-teal-100 border border-white/20 transition-all cursor-pointer"
              title="Restaurar de arquivo JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* FEEDBACK NUVEM */}
        {lastSyncTime && (
          <div className="mt-4 pt-3 border-t border-teal-700/50 flex items-center gap-2 text-xs text-teal-200/80">
            <Cloud className="w-3.5 h-3.5 text-teal-300" />
            <span>Última sincronização com a nuvem: <strong>{lastSyncTime}</strong></span>
          </div>
        )}
      </div>

      {/* CARDS DE ESTATÍSTICAS CLÍNICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total de Assistidos</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {stats.totalClients}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Cadastrados na sua clínica
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">Anamneses Feitas</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">
            {stats.completedAnamneses}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Prontuários com 1ª consulta mapeada
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Anamneses Pendentes</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.pendingAnamneses}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Aguardando preenchimento da 1ª consulta
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Alvos Mapeados (TRG)</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {stats.totalTargets}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Infância: {stats.childhoodTargets} | Adolesc: {stats.adolescenceTargets} | Adulto: {stats.adultTargets}
          </p>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do assistido, telefone ou queixa..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border focus:ring-2 focus:ring-teal-500 outline-none transition-all ${
              darkMode
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { key: 'all', label: `Todos (${clientList.length})` },
            { key: 'completed', label: `Com Anamnese (${stats.completedAnamneses})` },
            { key: 'pending', label: `Pendentes (${stats.pendingAnamneses})` }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === f.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE CLIENTES / ASSISTIDOS */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            darkMode ? 'bg-gray-800/40 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
          }`}>
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30 text-teal-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Nenhum assistido encontrado
            </h3>
            <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto">
              {searchTerm
                ? `Nenhum assistido corresponde à pesquisa "${searchTerm}".`
                : 'Você ainda não possui assistidos cadastrados ou com anamnese.'}
            </p>
            <button
              onClick={handleNewAnamnese}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Ficha de Anamnese</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client, idx) => {
              const hasAnamnese = !!client.anamnese;
              const targetsCount = client.anamnese?.targets?.length || 0;
              const chiefComplaint = client.anamnese?.chiefComplaint;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all hover:shadow-lg ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 hover:border-teal-500/50'
                      : 'bg-white border-gray-200 hover:border-teal-400'
                  } group`}
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner ${
                          hasAnamnese
                            ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-teal-500/20'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors">
                            {client.name}
                          </h3>
                          {client.phone && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              <span>{client.phone}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Badge de Status */}
                      {hasAnamnese ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                          <CheckCircle2 className="w-3 h-3 text-teal-500" />
                          <span>Preenchida</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Pendente</span>
                        </span>
                      )}
                    </div>

                    {/* Resumo da Queixa Principal ou Destaque */}
                    <div className={`p-3 rounded-xl text-xs ${
                      darkMode ? 'bg-gray-900/60' : 'bg-gray-50'
                    } border border-gray-100 dark:border-gray-800 space-y-1.5`}>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                        <span>Queixa Principal (Demanda):</span>
                        {hasAnamnese && (
                          <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                            {targetsCount} {targetsCount === 1 ? 'alvo' : 'alvos'}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-2 italic">
                        {chiefComplaint ? `"${chiefComplaint}"` : 'Ficha de Anamnese ainda não preenchida para este assistido.'}
                      </p>
                    </div>

                    {/* Detalhes de Alvos TRG */}
                    {hasAnamnese && targetsCount > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {client.anamnese?.targets?.slice(0, 3).map((target, tIdx) => (
                          <span
                            key={tIdx}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                              target.lifeStage === 'infancia'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : target.lifeStage === 'adolescencia'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                            }`}
                          >
                            {target.lifeStage}: SUD {target.initialSud}
                          </span>
                        ))}
                        {targetsCount > 3 && (
                          <span className="text-[10px] text-gray-400">+{targetsCount - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AÇÕES DO CARD */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenClientAnamnese(client)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        hasAnamnese
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md'
                      }`}
                      title={hasAnamnese ? 'Abrir e editar Ficha de Anamnese' : 'Iniciar Primeira Consulta e Ficha de Anamnese'}
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>{hasAnamnese ? 'Ver / Editar Anamnese' : 'Preencher Anamnese'}</span>
                    </button>

                    {onOpenEvolution && (
                      <button
                        onClick={() => onOpenEvolution(client.sampleAppointment || null)}
                        className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          darkMode
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                        }`}
                        title="Ir para o Prontuário & Evolução TRG deste assistido"
                      >
                        <ClipboardList className="w-4 h-4 text-purple-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL COMPLETO DE ANAMNESE TRG */}
      <ClientAnamneseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refreshAnamneses();
        }}
        appointment={selectedAppointment}
        allAppointments={appointments}
        darkMode={darkMode}
        onOpenEvolution={onOpenEvolution}
      />
    </div>
  );
}
