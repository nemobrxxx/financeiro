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
  LogOut,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signIn, logout, handleFirestoreError } from './lib/firebase';
import { Transaction, TransactionType, OperationType } from './types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
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

const COLORS = ['#F27D26', '#FF4444', '#00FF00', '#007AFF', '#A259FF', '#FFB800', '#00C2FF'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return unsubscribe;
  }, [user]);

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

    return Object.entries(groups).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => (b.value as number) - (a.value as number));
  }, [monthTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formAmount || !formDesc || !formCategory) return;

    const data = {
      userId: user.uid,
      type: formType,
      amount: parseFloat(formAmount),
      description: formDesc,
      category: formCategory,
      date: formDate,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingTransaction) {
        await updateDoc(doc(db, 'transactions', editingTransaction.id), data);
      } else {
        await addDoc(collection(db, 'transactions'), data);
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions');
    }
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'transactions');
    }
  };

  const fetchAIRecommendations = async () => {
    if (monthTransactions.length === 0) return;
    setLoadingAI(true);
    const result = await getSavingsRecommendations(monthTransactions);
    setRecommendations(Array.isArray(result) ? result : []);
    setLoadingAI(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0]"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><PiggyBank className="w-12 h-12 text-[#141414]" /></motion.div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-[#141414] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <PiggyBank className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tighter text-[#141414] mb-4">FinTrack AI</h1>
          <p className="text-[#141414]/60 mb-10 text-lg">Take control of your financial destiny with smart tracking and AI insights.</p>
          <button 
            onClick={signIn}
            className="w-full bg-[#141414] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all transform hover:scale-105"
          >
            Get Started with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#141414] font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#141414]/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-6 h-6 text-[#F27D26]" />
          <span className="font-bold tracking-tight text-xl">FinTrack AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={logout} className="p-2 text-[#141414]/40 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
          <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-[#141414]/10" alt="avatar" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold uppercase tracking-widest">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Income" value={stats.income} icon={<TrendingUp className="text-green-500" />} />
              <StatCard title="Expenses" value={stats.expense} icon={<TrendingDown className="text-red-500" />} />
              <StatCard title="Balance" value={stats.income - stats.expense} icon={<ArrowRightLeft className="text-blue-500" />} highlight />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Chart */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#141414]/5 h-[400px]">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-40 mb-6">Spending vs Category</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Categories Details */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#141414]/5">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-40 mb-6">Spending Details</h3>
                <div className="space-y-4">
                  {categoryData.length === 0 ? (
                    <div className="text-center py-12 opacity-30 italic">No expenses recorded this month</div>
                  ) : categoryData.slice(0, 5).map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-sm">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">-$ {cat.value.toFixed(2)}</div>
                        <div className="text-[10px] opacity-40">{((cat.value / stats.expense) * 100).toFixed(0)}% of budget</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights Section */}
            <div className="bg-[#141414] text-white p-8 rounded-[40px] relative overflow-hidden">
               <Sparkles className="absolute top-4 right-4 w-12 h-12 text-[#F27D26]/20" />
               <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-[#F27D26]" />
                 AI Savings Recommendations
               </h3>
               <p className="text-white/60 text-sm mb-6">Let FinTrack AI analyze your patterns and find hidden opportunities to save.</p>
               
               {recommendations.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {recommendations.map((rec, i) => (
                     <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors"
                      >
                       <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm tracking-tight">{rec.title}</span>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold",
                            rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                          )}>{rec.priority}</span>
                       </div>
                       <p className="text-white/60 text-[13px] leading-relaxed">{rec.advice}</p>
                     </motion.div>
                   ))}
                 </div>
               ) : (
                 <button 
                  onClick={fetchAIRecommendations}
                  disabled={loadingAI || monthTransactions.length === 0}
                  className="bg-[#F27D26] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                 >
                   {loadingAI ? <motion.div animate={{ rotate: 360 }}><Sparkles className="w-4 h-4" /></motion.div> : <><Sparkles className="w-4 h-4" /> Analyze Transactions</>}
                 </button>
               )}
            </div>
          </motion.div>
        )}

        {/* Transactions View */}
        {activeTab === 'transactions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xl">All Records</h3>
              <div className="text-xs opacity-50">{monthTransactions.length} items</div>
            </div>
            {monthTransactions.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 opacity-40">
                Start adding your income and expenses
              </div>
            ) : monthTransactions.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-[#141414]/5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    t.type === TransactionType.INCOME ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {t.type === TransactionType.INCOME ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold leading-tight">{t.description}</div>
                    <div className="text-[11px] opacity-40 uppercase tracking-widest">{t.category} • {format(parseISO(t.date), 'MMM dd')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "font-bold text-lg",
                    t.type === TransactionType.INCOME ? "text-green-600" : "text-[#141414]"
                  )}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}$ {t.amount.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(t)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Analysis View */}
        {activeTab === 'analysis' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div className="bg-white p-8 rounded-[40px] shadow-sm border border-[#141414]/5 h-[500px]">
                <h3 className="text-xl font-bold mb-6">Spending Trend</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" fontSize={11} verticalAnchor="start" />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#141414" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl">
                   <h4 className="text-xs uppercase font-bold opacity-30 mb-2">Highest Category</h4>
                   <div className="text-3xl font-black">{categoryData[0]?.name || 'N/A'}</div>
                   <p className="text-sm opacity-50">Consumes {((categoryData[0]?.value || 0) / stats.expense * 100).toFixed(0)}% of your expenses.</p>
                </div>
                <div className="bg-white p-6 rounded-3xl">
                   <h4 className="text-xs uppercase font-bold opacity-30 mb-2">Savings Rate</h4>
                   <div className="text-3xl font-black">{stats.income > 0 ? (100 - (stats.expense / stats.income * 100)).toFixed(0) : 0}%</div>
                   <p className="text-sm opacity-50">Of your income is remaining this month.</p>
                </div>
             </div>
          </motion.div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#141414] text-white px-4 py-3 rounded-[32px] shadow-2xl flex items-center gap-2 z-40 border border-white/10">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Home" />
        <NavButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowRightLeft />} label="History" />
        <NavButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<PieIcon />} label="Trends" />
        <div className="w-[1px] h-6 bg-white/10 mx-2" />
        <button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="bg-[#F27D26] p-4 rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg"
        >
          <Plus className="w-6 h-6" />
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]" 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] p-8 z-[60] shadow-3xl max-w-xl mx-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
              <h2 className="text-3xl font-bold mb-6 tracking-tight">{editingTransaction ? 'Edit Record' : 'Add New Record'}</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex p-1 bg-gray-100 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setFormType(TransactionType.INCOME)}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all",
                      formType === TransactionType.INCOME ? "bg-[#141414] text-white shadow-lg" : "text-gray-400"
                    )}
                  >Income</button>
                  <button 
                    type="button"
                    onClick={() => setFormType(TransactionType.EXPENSE)}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all",
                      formType === TransactionType.EXPENSE ? "bg-[#141414] text-white shadow-lg" : "text-gray-400"
                    )}
                  >Expense</button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-30 ml-2">Value</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold opacity-30">$</span>
                    <input 
                      type="number" step="0.01" required
                      value={formAmount} onChange={e => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#F27D26] focus:bg-white rounded-2xl p-6 pl-12 text-4xl font-black transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest opacity-30 ml-2">Description</label>
                    <input 
                      type="text" required
                      value={formDesc} onChange={e => setFormDesc(e.target.value)}
                      placeholder="e.g. Weekly Grocery"
                      className="w-full bg-gray-50 rounded-xl p-4 font-medium outline-none border border-transparent focus:border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest opacity-30 ml-2">Category</label>
                    <select 
                      value={formCategory} onChange={e => setFormCategory(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl p-4 font-medium outline-none border border-transparent focus:border-gray-200 appearance-none shadow-sm"
                      required
                    >
                      <option value="">Select Category</option>
                      {formType === TransactionType.INCOME ? (
                        <>
                          <option value="Salary">Salary</option>
                          <option value="Freelance">Freelance</option>
                          <option value="Investments">Investments</option>
                          <option value="Other Income">Other</option>
                        </>
                      ) : (
                        <>
                          <option value="Food">Food & Dining</option>
                          <option value="Transport">Transportation</option>
                          <option value="Health">Health</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Rent">Rent / Bills</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold tracking-widest opacity-30 ml-2">Date</label>
                   <input 
                    type="date" required
                    value={formDate} onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl p-4 font-medium outline-none border border-transparent focus:border-gray-200"
                   />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#141414] text-white py-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                >
                  {editingTransaction ? 'Save Changes' : 'Record Transaction'}
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
      "p-6 rounded-3xl border transition-all",
      highlight ? "bg-[#141414] text-white border-transparent shadow-xl" : "bg-white border-[#141414]/5 shadow-sm"
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className={cn("text-xs font-bold uppercase tracking-widest", highlight ? "text-white/40" : "text-[#141414]/30")}>
          {title}
        </span>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50", highlight && "bg-white/10")}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black tabular-nums">
        {value < 0 ? '-' : ''}$ {Math.abs(value).toLocaleString()}
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
        active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      {active && <span className="text-xs font-bold">{label}</span>}
    </button>
  );
}
