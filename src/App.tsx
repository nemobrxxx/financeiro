import { motion, AnimatePresence } from 'motion/react';
import { 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  PieChart as PieIcon,
  LayoutDashboard,
  Sparkles,
  ArrowRightLeft,
  Wallet
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType } from './types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';
import { cn } from './lib/utils';
import { getSavingsRecommendations } from './services/geminiService';

const COLORS = ['#6366F1', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'analysis'>('dashboard');
  
  // Form State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // AI Suggestions
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('fintrack_transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('fintrack_transactions', JSON.stringify(transactions));
    }
  }, [transactions, loading]);

  const monthTransactions = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });
  }, [transactions, currentDate]);

  const stats = useMemo(() => {
    return monthTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [monthTransactions]);

  const categoryData = useMemo(() => {
    const groups = monthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(groups)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  }, [monthTransactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formDesc || !formCategory) return;

    const data: Transaction = {
      id: editingTransaction?.id || crypto.randomUUID(),
      type: formType,
      amount: parseFloat(formAmount),
      description: formDesc,
      category: formCategory,
      date: formDate,
      createdAt: editingTransaction?.createdAt || new Date().toISOString()
    };

    if (editingTransaction) {
      setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? data : t));
    } else {
      setTransactions(prev => [data, ...prev]);
    }
    resetForm();
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormAmount('');
    setFormDesc('');
    setFormCategory('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setIsAddModalOpen(false);
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type);
    setFormAmount(t.amount.toString());
    setFormDesc(t.description);
    setFormCategory(t.category);
    setFormDate(t.date);
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const fetchAIRecommendations = async () => {
    if (monthTransactions.length === 0) return;
    setLoadingAI(true);
    const result = await getSavingsRecommendations(monthTransactions);
    setRecommendations(Array.isArray(result) ? result : []);
    setLoadingAI(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><PiggyBank className="w-12 h-12 text-[#6366F1]" /></motion.div></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#121212]/80 backdrop-blur-xl border-b border-[#262626] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <PiggyBank className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-lg text-white">FinTrack AI</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold italic">Modo Offline</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-[#121212] p-4 rounded-2xl border border-[#262626] shadow-xl">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR as any })}
          </h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-[#262626] rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Receitas" value={stats.income} icon={<TrendingUp className="text-emerald-400" />} />
              <StatCard title="Despesas" value={stats.expense} icon={<TrendingDown className="text-rose-400" />} />
              <StatCard title="Saldo" value={stats.income - stats.expense} icon={<Wallet className="text-indigo-400" />} highlight />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Chart */}
              <div className="bg-[#121212] p-6 rounded-3xl border border-[#262626] h-[380px]">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6">Gastos por Categoria</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121212', borderRadius: '12px', border: '1px solid #262626', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Categories Details */}
              <div className="bg-[#121212] p-6 rounded-3xl border border-[#262626]">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6">Detalhamento</h3>
                <div className="space-y-5">
                  {categoryData.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 italic text-sm">Nenhuma despesa este mês</div>
                  ) : categoryData.slice(0, 5).map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-sm text-gray-300">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-gray-100">R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-gray-600 font-semibold uppercase">{((cat.value / (stats.expense || 1)) * 100).toFixed(0)}% do total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights Section */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-indigo-900/10 border border-indigo-500/20 p-8 rounded-[32px] relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32" />
               <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
                 <Sparkles className="w-5 h-5 text-indigo-400" />
                 Recomendações com IA
               </h3>
               <p className="text-gray-400 text-xs mb-6 max-w-md">Deixe o FinTrack AI analisar seus padrões para encontrar formas de economizar.</p>
               
               {recommendations.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {recommendations.map((rec, i) => (
                     <motion.div 
                        key={i} 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-black/20 border border-white/5 p-5 rounded-2xl cursor-default hover:border-indigo-500/30 transition-all"
                      >
                       <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-xs text-indigo-300 tracking-tight">{rec.title}</span>
                          <span className={cn(
                            "text-[8px] px-2 py-0.5 rounded-full uppercase font-black",
                            rec.priority === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                          )}>{rec.priority === 'high' ? 'Crítico' : 'Oportunidade'}</span>
                       </div>
                       <p className="text-gray-400 text-[12px] leading-relaxed italic">"{rec.advice}"</p>
                     </motion.div>
                   ))}
                 </div>
               ) : (
                 <button 
                  onClick={fetchAIRecommendations}
                  disabled={loadingAI || monthTransactions.length === 0}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 hover:bg-indigo-500 transition-all disabled:opacity-30 shadow-lg shadow-indigo-600/20"
                 >
                   {loadingAI ? <motion.div animate={{ rotate: 360 }}><Sparkles className="w-4 h-4" /></motion.div> : <><Sparkles className="w-4 h-4" /> Analisar Finanças</>}
                 </button>
               )}
            </div>
          </motion.div>
        )}

        {/* Transactions View */}
        {activeTab === 'transactions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-lg text-white">Extrato Detalhado</h3>
              <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{monthTransactions.length} registros</div>
            </div>
            {monthTransactions.length === 0 ? (
              <div className="text-center py-24 bg-[#121212] rounded-3xl border border-dashed border-[#262626] opacity-30 italic text-sm">
                Lista vazia para este mês
              </div>
            ) : monthTransactions.map((t) => (
              <div key={t.id} className="bg-[#121212] p-4 rounded-2xl border border-[#262626] flex items-center justify-between group hover:border-[#363636] transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center",
                    t.type === TransactionType.INCOME ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  )}>
                    {t.type === TransactionType.INCOME ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-gray-100 text-sm leading-tight">{t.description}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{t.category} • {format(parseISO(t.date), 'dd MMM', { locale: ptBR as any })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "font-bold text-md",
                    t.type === TransactionType.INCOME ? "text-emerald-400" : "text-gray-100"
                  )}>
                    {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(t)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Analysis View */}
        {activeTab === 'analysis' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div className="bg-[#121212] p-8 rounded-[32px] border border-[#262626] h-[480px]">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-8">Tendência por Categoria</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#4b5563'}} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#4b5563'}} />
                    <Tooltip cursor={{fill: '#1a1a1a'}} contentStyle={{backgroundColor: '#121212', border: '1px solid #262626'}} />
                    <Bar dataKey="value" fill="#6366F1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#121212] p-7 rounded-[32px] border border-[#262626]">
                   <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Principal Gasto</h4>
                   <div className="text-2xl font-black text-white">{categoryData[0]?.name || 'N/A'}</div>
                   <p className="text-xs text-gray-500 mt-1">Representa {((categoryData[0]?.value || 0) / (stats.expense || 1) * 100).toFixed(0)}% das suas despesas.</p>
                </div>
                <div className="bg-[#121212] p-7 rounded-[32px] border border-[#262626]">
                   <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Taxa de Poupança</h4>
                   <div className="text-2xl font-black text-indigo-400">{stats.income > 0 ? (100 - (stats.expense / stats.income * 100)).toFixed(0) : 0}%</div>
                   <p className="text-xs text-gray-500 mt-1">Do seu rendimento sobrou este mês.</p>
                </div>
             </div>
          </motion.div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#121212]/90 backdrop-blur-md px-4 py-3 rounded-[32px] shadow-2xl flex items-center gap-2 z-40 border border-[#262626]">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Início" />
        <NavButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowRightLeft />} label="Registros" />
        <NavButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<PieIcon />} label="Análise" />
        <div className="w-[1px] h-6 bg-[#262626] mx-2" />
        <button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="bg-indigo-600 p-4 rounded-full hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </nav>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="fixed inset-0 bg-[#0a0a0a]/90 backdrop-blur-md z-[50]" 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-[#121212] rounded-t-[48px] p-8 pb-12 z-[60] border-t border-[#262626] max-w-2xl mx-auto shadow-3xl"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8 cursor-pointer" onClick={resetForm} />
              <h2 className="text-2xl font-bold mb-8 text-white text-center tracking-tight">{editingTransaction ? 'Editar Registro' : 'Novo Lançamento'}</h2>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5">
                  <button 
                    type="button"
                    onClick={() => setFormType(TransactionType.INCOME)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                      formType === TransactionType.INCOME ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500"
                    )}
                  >Receita</button>
                  <button 
                    type="button"
                    onClick={() => setFormType(TransactionType.EXPENSE)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                      formType === TransactionType.EXPENSE ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500"
                    )}
                  >Despesa</button>
                </div>

                <div className="text-center">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2 block">Valor Total (R$)</label>
                  <div className="relative inline-block max-w-[300px]">
                    <span className="absolute -left-12 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-700">R$</span>
                    <input 
                      type="number" step="0.01" required
                      value={formAmount} onChange={e => setFormAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-transparent border-b-2 border-white/5 focus:border-indigo-600 text-5xl font-black text-white text-center transition-all outline-none pb-4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-2">Descrição</label>
                    <input 
                      type="text" required
                      value={formDesc} onChange={e => setFormDesc(e.target.value)}
                      placeholder="Ex: Almoço, Salário..."
                      className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-indigo-600 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-2">Categoria</label>
                    <select 
                      value={formCategory} onChange={e => setFormCategory(e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-sm text-gray-300 focus:border-indigo-600 appearance-none outline-none"
                      required
                    >
                      <option value="">Selecionar Categoria</option>
                      {formType === TransactionType.INCOME ? (
                        <>
                          <option value="Salário">Salário</option>
                          <option value="Freelance">Freelance</option>
                          <option value="Investimentos">Investimentos</option>
                          <option value="Outros">Outros</option>
                        </>
                      ) : (
                        <>
                          <option value="Alimentação">Alimentação</option>
                          <option value="Transporte">Transporte</option>
                          <option value="Saúde">Saúde</option>
                          <option value="Lazer">Lazer</option>
                          <option value="Compras">Compras</option>
                          <option value="Moradia">Moradia</option>
                          <option value="Outros">Outros</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-2">Data</label>
                   <input 
                    type="date" required
                    value={formDate} onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-sm text-gray-300 focus:border-indigo-600 outline-none"
                   />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  {editingTransaction ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, highlight = false }: { title: string, value: number, icon: React.ReactNode, highlight?: boolean }) {
  return (
    <div className={cn(
      "p-7 rounded-[32px] border transition-all duration-300",
      highlight ? "bg-white text-black border-transparent shadow-[0_20px_50px_rgba(255,255,255,0.1)]" : "bg-[#121212] border-[#262626] shadow-md hover:border-[#363636]"
    )}>
      <div className="flex items-center justify-between mb-5">
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", highlight ? "text-gray-400" : "text-gray-500 italic")}>
          {title}
        </span>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", highlight ? "bg-black/5" : "bg-black/20")}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight tabular-nums">
        <span className="text-xs font-medium mr-1 opacity-40">R$</span>
        {value < 0 ? '-' : ''}{Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all",
        active ? "bg-indigo-600/20 text-indigo-400" : "text-gray-600 hover:text-gray-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      {active && <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>}
    </button>
  );
}
