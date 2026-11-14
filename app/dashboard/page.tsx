"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BankConnections from "@/components/BankConnections";
import OnboardingWizard from "@/components/OnboardingWizard";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Coffee, CreditCard, Ellipsis, Home, LayoutDashboard,
  Plus, Search, Settings2, ShoppingBag, Sparkles, Target, TrendingUp, Wallet, Volume2, VolumeX,
  Utensils, CarFront, Zap, Heart, SlidersHorizontal, ArrowLeftRight, X, Check, Droplet, Fuel, Wifi, Ticket, UserRound, Gift,
  Menu, Landmark, PiggyBank, ReceiptText, Trash2
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

type Period = "Monthly" | "Biweekly";
type Tab = "Overview" | "Budgets" | "Transactions" | "Debt" | "Accounts" | "Goals" | "Reports";
type Debt = { id: number; name: string; original: number; balance: number };
type Transaction = { name: string; category: string; date: string; amount: number; icon: string; color: string; type: "expense" | "income" };
type CategoryItem = { id?: string; name: string; spent: number; budget: number; color: string; icon: string };

const initialTransactions: Transaction[] = [];

const monthlyChart: { day: string; income: number; spending: number }[] = [];
const biweeklyChart: { day: string; income: number; spending: number }[] = [];

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const nav: { name: Tab; icon: typeof Home }[] = [
  { name: "Overview", icon: LayoutDashboard }, { name: "Budgets", icon: Wallet },
  { name: "Transactions", icon: ArrowLeftRight }, { name: "Debt", icon: CreditCard }, { name: "Accounts", icon: Landmark },
  { name: "Goals", icon: Target }, { name: "Reports", icon: TrendingUp },
];

function CategoryIcon({ name }: { name: string }) {
  const common = { size: 17, strokeWidth: 1.8 };
  if (name === "home") return <Home {...common}/>;
  if (name === "shopping" || name === "groceries") return <ShoppingBag {...common}/>;
  if (name === "coffee") return <Coffee {...common}/>;
  if (name === "car" || name === "fuel") return <CarFront {...common}/>;
  if (name === "zap" || name === "electric") return <Zap {...common}/>;
  if (name === "gas") return <Fuel {...common}/>;
  if (name === "water") return <Droplet {...common}/>;
  if (name === "wifi") return <Wifi {...common}/>;
  if (name === "ticket") return <Ticket {...common}/>;
  if (name === "trash") return <Trash2 {...common}/>;
  if (name === "piggy") return <PiggyBank {...common}/>;
  if (name === "heart") return <Heart {...common}/>;
  if (name === "user") return <UserRound {...common}/>;
  if (name === "gift") return <Gift {...common}/>;
  if (name === "income") return <ArrowDownLeft {...common}/>;
  if (name === "credit-card") return <CreditCard {...common}/>;
  return <ReceiptText {...common}/>;
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [period, setPeriod] = useState<Period>("Biweekly");
  const [tab, setTab] = useState<Tab>("Overview");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showAdd, setShowAdd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Groceries");
  const [categoryList, setCategoryList] = useState<CategoryItem[]>([]);
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [payFrequency, setPayFrequency] = useState("biweekly");
  const [toast, setToast] = useState("");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [paymentDebtId, setPaymentDebtId] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [entryFeedback, setEntryFeedback] = useState(false);
  const [budgetSpent, setBudgetSpent] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    async function checkOnboarding() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, expected_income, pay_frequency")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setShowOnboarding(!profile?.onboarding_completed);
      setExpectedIncome(Number(profile?.expected_income ?? 0));
      setPayFrequency(profile?.pay_frequency ?? "biweekly");
      if (profile?.onboarding_completed) {
        let [{ data: savedCategories }, { data: savedBudgets }] = await Promise.all([
          supabase.from("categories").select("id,name,icon,color").eq("owner_id", user.id).eq("category_type", "expense"),
          supabase.from("budgets").select("category_id,amount").eq("owner_id", user.id)
        ]);
        if (!active) return;
        if (!savedCategories?.length) {
          const defaults = [
            ["Mortgage / rent","home","#A6D189"],["Electricity","electric","#E5A86A"],["Natural gas","gas","#E78284"],
            ["Water & sewer","water","#8CAAEE"],["Trash","trash","#99D1DB"],["Internet","wifi","#CA9EE6"],
            ["Groceries","groceries","#A6D189"],["Gas & fuel","fuel","#E5A86A"],["Restaurants","coffee","#CA9EE6"],
            ["Shopping","shopping","#F4B8E4"],["Entertainment","ticket","#BABB F1".replace(" ","")],["Insurance","shield","#E5A86A"],
            ["Phone","wifi","#99D1DB"],["Health & medical","heart","#EA999C"],["Personal care","user","#C6D0F5"],
            ["Giving","gift","#F2D5CF"],["Savings","piggy","#A6D189"],["Debt payments","credit-card","#CA9EE6"]
          ];
          const { data: created, error: createError } = await supabase.from("categories").insert(defaults.map(([name,icon,color]) => ({
            owner_id:user.id, name, icon, color, category_type:"expense"
          }))).select("id,name,icon,color");
          if (!createError) savedCategories = created;
        }
        const budgetByCategory = new Map((savedBudgets ?? []).map(item => [item.category_id, Number(item.amount)]));
        const loadedCategories = (savedCategories ?? []).map(item => ({ id: item.id, name: item.name, spent: 0, budget: budgetByCategory.get(item.id) ?? 0, color: item.color ?? "#A6D189", icon: item.icon ?? "receipt" }));
        const { data: actualRows } = await supabase.from("transactions").select("category_id,amount").eq("owner_id", user.id).eq("transaction_type", "expense");
        if (!active) return;
        const spentById = new Map<string, number>();
        (actualRows ?? []).forEach(row => { if (row.category_id) spentById.set(row.category_id, (spentById.get(row.category_id) ?? 0) + Number(row.amount)); });
        const finalCategories = loadedCategories.map(category => ({ ...category, spent: category.id ? spentById.get(category.id) ?? 0 : 0 }));
        setCategoryList(finalCategories);
        setBudgetSpent(Object.fromEntries(finalCategories.map(category => [category.name, category.spent])));
        if (finalCategories.length) setNewCategory(finalCategories[0].name);
      }
    }
    checkOnboarding();
    return () => { active = false; };
  }, []);

  function playFeedback(kind: "tap" | "success" | "payoff") {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      const notes = kind === "payoff" ? [523.25, 659.25, 783.99, 1046.5] : kind === "success" ? [659.25, 880] : [587.33];
      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * (kind === "payoff" ? 0.13 : 0.07));
        gain.gain.setValueAtTime(0.0001, now + index * 0.07);
        gain.gain.exponentialRampToValueAtTime(kind === "payoff" ? 0.075 : 0.035, now + index * 0.07 + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + (kind === "payoff" ? 0.32 : 0.16));
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.start(now + index * (kind === "payoff" ? 0.13 : 0.07));
        oscillator.stop(now + index * (kind === "payoff" ? 0.13 : 0.07) + 0.34);
      });
      window.setTimeout(() => void ctx.close(), 1200);
    } catch { /* Audio is an optional enhancement; the app remains fully usable without it. */ }
  }

  const chartData = period === "Monthly" ? monthlyChart : biweeklyChart;
  const filteredTransactions = useMemo(() => transactions.filter(t =>
    (t.name + t.category).toLowerCase().includes(search.toLowerCase())
  ), [transactions, search]);

  async function addTransaction(e: FormEvent) {
    e.preventDefault();
    const amount = Number(newAmount);
    if (!newName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    if (currentUserId) {
      const selectedCategory = categoryList.find(category => category.name === newCategory);
      const supabase = createClient();
      const { error } = await supabase.from("transactions").insert({
        owner_id: currentUserId,
        category_id: selectedCategory?.id ?? null,
        description: newName.trim(),
        amount,
        transaction_type: newCategory === "Debt payment" ? "debt_payment" : "expense"
      });
      if (error) {
        setToast("Couldn't save transaction: " + error.message);
        return;
      }
    }
    if (newCategory === "Debt payment") {
      const selectedDebt = debts.find(d => String(d.id) === paymentDebtId);
      if (!selectedDebt) { setToast("Choose a debt to apply this payment to"); return; }
      const updatedBalance = Math.max(0, selectedDebt.balance - amount);
      setDebts(debts.map(d => d.id === selectedDebt.id ? { ...d, balance: updatedBalance } : d));
      if (selectedDebt.balance > 0 && updatedBalance === 0) { setCelebrate(true); window.setTimeout(() => setCelebrate(false), 4800); setToast(`${selectedDebt.name} paid off! You did it!`); }
      else { setToast(`${money(Math.min(amount, selectedDebt.balance))} applied to ${selectedDebt.name}`); }
    }
    setTransactions([{ name: newName.trim(), category: newCategory, date: "Just now", amount: -amount, icon: newCategory === "Debt payment" ? "income" : "shopping", color: newCategory === "Debt payment" ? "purple" : "mint", type: "expense" }, ...transactions]);
    setEntryFeedback(true); window.setTimeout(() => setEntryFeedback(false), 850);
    let expenseFeedback = "Expense added to your activity";
    if (newCategory !== "Debt payment") {
      const budget = categoryList.find(category => category.name === newCategory);
      if (budget) {
        const nextSpent = (budgetSpent[newCategory] ?? budget.spent) + amount;
        setBudgetSpent(current => ({ ...current, [newCategory]: nextSpent }));
        if (budget.budget > 0 && nextSpent <= budget.budget) { expenseFeedback = `Nice — still under your ${newCategory.toLowerCase()} budget`; playFeedback("success"); }
        else if (budget.budget > 0) { expenseFeedback = `${newCategory} budget reached — keep an eye on it`; playFeedback("tap"); }
        else { expenseFeedback = `Expense recorded. Set a ${newCategory.toLowerCase()} budget when you're ready`; playFeedback("tap"); }
      } else playFeedback("tap");
    }
    setNewName(""); setNewAmount(""); setShowAdd(false);
    if (newCategory !== "Debt payment") setToast(expenseFeedback);
    window.setTimeout(() => setToast(""), 3200);
  }

  function addDebt(e: FormEvent) {
    e.preventDefault();
    const amount = Number(debtAmount);
    if (!debtName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setDebts([...debts, { id: Date.now(), name: debtName.trim(), original: amount, balance: amount }]);
    playFeedback("success");
    setDebtName(""); setDebtAmount(""); setShowDebtModal(false); setToast("Debt added to your tracker");
    window.setTimeout(() => setToast(""), 2800);
  }

  return (
    <main className={`app-shell ${entryFeedback ? "entry-feedback" : ""}`}>
      <aside className={`sidebar ${showMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Coffee size={23}/><span className="steam">〰</span></div>
          <div><div className="brand-name">brew<span>budget</span></div><div className="brand-caption">A better daily grind.</div></div>
          <button className="icon-button sidebar-close" onClick={() => setShowMenu(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {nav.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${tab === name ? "active" : ""}`} onClick={() => { setTab(name); setShowMenu(false); }}><Icon size={18}/><span>{name}</span>{name === "Budgets" && <span className="nav-dot"/>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-card">
            <div className="daily-icon"><Coffee size={17}/><Sparkles size={11}/></div>
            <div className="daily-eyebrow">YOUR DAILY GRIND</div>
            <div className="daily-title">A little progress adds up.</div>
            <div className="daily-copy">Take a moment to check in with your money.</div>
            <button onClick={() => setTab("Overview")} className="daily-link">Take a coffee break <ChevronRight size={14}/></button>
          </div>
          <button className="nav-item settings" onClick={() => setToast("Settings are coming soon")}><Settings2 size={18}/><span>Settings</span></button>
          <div className="profile-row"><div className="avatar">B</div><div className="profile-copy"><strong>My workspace</strong><span>Personal budget</span></div><Ellipsis size={19} className="muted-icon"/></div>
        </div>
      </aside>

      {showMenu && <button className="mobile-scrim" onClick={() => setShowMenu(false)} aria-label="Close navigation"/>}
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setShowMenu(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{tab}</strong></div></div>
          <div className="topbar-actions"><div className="date-chip"><CalendarDays size={15}/> Friday, November 13</div><button className="icon-button sound-toggle" aria-label={soundEnabled ? "Mute sound effects" : "Enable sound effects"} title={soundEnabled ? "Sound effects on" : "Sound effects off"} onClick={() => { setSoundEnabled(!soundEnabled); setToast(!soundEnabled ? "Sound effects on" : "Sound effects off"); }}>{soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button><button className="icon-button notification" aria-label="Notifications" onClick={() => setToast("You're all caught up")}><Bell size={18}/><i/></button><div className="profile-menu-wrap">
            <button className="top-avatar" title="Account menu" aria-label="Open account menu" aria-haspopup="menu" aria-expanded={showProfileMenu} onClick={() => setShowProfileMenu(value => !value)}>B</button>
            {showProfileMenu && <div className="profile-menu" role="menu">
              <div className="profile-menu-heading"><strong>My account</strong><span>Manage your BrewBudget profile</span></div>
              <button type="button" role="menuitem" onClick={() => { setShowProfileMenu(false); setToast("Account settings are coming soon"); }}><Settings2 size={16}/> Account settings</button>
              <button type="button" role="menuitem" className="profile-signout" onClick={async () => { setShowProfileMenu(false); await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }}><span>↪</span> Sign out</button>
            </div>}
          </div></div>
        </header>

        <div className="content-wrap">
          {tab === "Overview" ? <>
            <div className="welcome-row">
              <div><div className="eyebrow"><span className="eyebrow-line"/> FRIDAY, NOVEMBER 13, 2026</div><h1>Good morning<span className="wave">,</span> <em>let’s get grounded.</em></h1><p className="subtitle">A clear head and a little clarity go a long way.</p></div>
              <button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17}/> Add expense</button>
            </div>

            <div className="period-row"><div className="period-control"><button className={period === "Monthly" ? "selected" : ""} onClick={() => setPeriod("Monthly")}>Monthly</button><button className={period === "Biweekly" ? "selected" : ""} onClick={() => setPeriod("Biweekly")}>Biweekly</button></div><button className="period-date">Nov 1 – Nov 14 <ChevronDown size={14}/></button><span className="period-note"><span className="live-dot"/> {period === "Biweekly" ? "Pay period · 4 days left" : "Monthly overview"}</span></div>

            <div className="summary-grid">
              <div className="glass-card balance-card"><div className="card-top"><span className="card-label">AVAILABLE TO SPEND</span><span className="card-icon green"><Wallet size={17}/></span></div><div className="balance-value">$0<span>.00</span></div><div className="balance-foot"><span className="muted-text">Add income and budgets to get started</span></div><div className="balance-glow"/></div>
              <div className="glass-card metric-card"><div className="card-top"><span className="card-label">INCOME THIS PERIOD</span><span className="card-icon blue"><ArrowDownLeft size={17}/></span></div><div className="metric-value">{money(expectedIncome)}</div><div className="metric-foot"><span className="metric-caption">{expectedIncome > 0 ? "Expected " + (payFrequency === "monthly" ? "monthly" : "per payday") : "Add your income in setup"}</span></div></div>
              <div className="glass-card metric-card"><div className="card-top"><span className="card-label">SPENT THIS PERIOD</span><span className="card-icon amber"><ArrowUpRight size={17}/></span></div><div className="metric-value">$0<span>.00</span></div><div className="metric-foot"><span className="metric-caption">No expenses recorded yet</span></div></div>
            </div>

            <div className="dashboard-grid">
              <section className="glass-card chart-card">
                <div className="section-heading"><div><div className="card-label">YOUR CASH FLOW</div><h2>Money in, money out</h2><p>See how your spending is moving over time.</p></div><button className="more-button"><Ellipsis size={20}/></button></div>
                {chartData.length ? <><div className="chart-legend"><span><i className="legend-income"/> Income</span><span><i className="legend-spending"/> Spending</span></div>
                <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A6D189" stopOpacity={0.22}/><stop offset="95%" stopColor="#A6D189" stopOpacity={0}/></linearGradient><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8CAAEE" stopOpacity={0.16}/><stop offset="95%" stopColor="#8CAAEE" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff" strokeOpacity={0.055} vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#858D9B", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#858D9B", fontSize: 11 }} tickFormatter={(v) => "$"+v}/><Tooltip contentStyle={{ background: "#202630", border: "1px solid #ffffff20", borderRadius: 12, color: "#F2F0E9", fontSize: 12 }} formatter={(v) => money(Number(v))}/><Area type="monotone" dataKey="income" stroke="#A6D189" strokeWidth={2.4} fill="url(#incomeFill)" activeDot={{ r: 4 }}/><Area type="monotone" dataKey="spending" stroke="#8CAAEE" strokeWidth={2.4} fill="url(#spendFill)" activeDot={{ r: 4 }}/></AreaChart></ResponsiveContainer></div></> : <div className="empty-state">Your cash flow chart will appear once you add income or expenses.</div>}
              </section>

              <section className="glass-card budget-card">
                <div className="section-heading"><div><div className="card-label">SPENDING PLAN</div><h2>Budget categories</h2><p>A little awareness goes a long way.</p></div><button className="more-button" onClick={() => setTab("Budgets")}><Ellipsis size={20}/></button></div>
                <div className="category-list">{categoryList.slice(0,4).map((c) => { const spent = budgetSpent[c.name] ?? c.spent; return <div className="category-item" key={c.name}><div className="category-top"><div className="category-name"><span className="category-dot" style={{ background: c.color }}/>{c.name}</div><div className="category-amount">{c.budget > 0 ? <>{money(spent)} <span>/ {money(c.budget)}</span></> : <span>No budget set</span>}</div></div><div className="progress-track"><div className="progress-fill" style={{ width: (c.budget > 0 ? Math.min(100,spent/c.budget*100) : 0)+"%", background: c.color }}/></div><div className="category-remaining">{c.budget > 0 ? (spent <= c.budget ? `${money(c.budget-spent)} left` : `${money(spent-c.budget)} over budget`) : "Set a budget to start tracking"}</div></div>; })}</div>
                <button className="text-link" onClick={() => setTab("Budgets")}>View all categories <ChevronRight size={15}/></button>
              </section>
            </div>

            <div className="bottom-grid">
              <section className="glass-card transactions-card">
                <div className="section-heading"><div><div className="card-label">THE LATEST</div><h2>Recent transactions</h2></div><button className="text-link" onClick={() => setTab("Transactions")}>See all <ChevronRight size={15}/></button></div>
                {transactions.length ? <TransactionList transactions={transactions.slice(0,4)}/> : <div className="empty-state">No transactions yet. Add your first expense to get started.</div>}
              </section>
              <section className="glass-card insight-card"><div className="insight-top"><div className="insight-icon"><Sparkles size={17}/></div><span className="card-label">YOUR NEXT STEP</span></div><h2>Start with what matters most.</h2><p>Add your first income or expense, then create a budget that reflects how you want to use your money.</p><div className="insight-bottom"><span className="insight-spark">✳</span> A little progress adds up.</div></section>
            </div>
            <footer className="footer-note"><Coffee size={14}/> Made for a more mindful money routine. <span>·</span> BrewBudget <span className="footer-version">v0.1.0</span></footer>
          </> : tab === "Debt" ? <DebtPage debts={debts} onAdd={() => setShowDebtModal(true)} onPayment={() => { setNewCategory("Debt payment"); setPaymentDebtId(debts[0] ? String(debts[0].id) : ""); setShowAdd(true); }} /> : <SubPage tab={tab} transactions={filteredTransactions} search={search} setSearch={setSearch} setShowAdd={setShowAdd} budgetSpent={budgetSpent} categories={categoryList} userId={currentUserId} onCategoryChange={(updated) => { setCategoryList(current => current.some(item => item.id === updated.id) ? current.map(item => item.id === updated.id ? updated : item) : [...current, updated]); setBudgetSpent(current => ({ ...current, [updated.name]: current[updated.name] ?? updated.spent })); }} onCategoryDelete={(categoryId, categoryName) => { setCategoryList(current => current.filter(item => item.id !== categoryId)); setBudgetSpent(current => { const next = { ...current }; delete next[categoryName]; return next; }); }}/>}
        </div>
      </section>

      {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="expense-modal" onSubmit={addTransaction} onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="card-label">NEW TRANSACTION</div><h2>Add an expense</h2></div><button type="button" className="icon-button" onClick={() => setShowAdd(false)}><X size={18}/></button></div><label>What was it for?<input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Grocery run" required/></label><label>Amount<input type="number" min="0.01" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" required/></label><label>Category<select value={newCategory} onChange={e => setNewCategory(e.target.value)}>{categoryList.map(c => <option key={c.name}>{c.name}</option>)}<option>Debt payment</option></select></label>{newCategory === "Debt payment" && <label>Apply payment to<select value={paymentDebtId} onChange={e => setPaymentDebtId(e.target.value)} required><option value="">Choose a debt</option>{debts.filter(d => d.balance > 0).map(d => <option key={d.id} value={d.id}>{d.name} · {money(d.balance)} left</option>)}</select></label>}<button className="primary-button modal-submit" type="submit"><Check size={16}/> Save expense</button><p className="demo-note">Demo mode · This entry is stored only in this browser session.</p></form></div>}
      {showDebtModal && <div className="modal-backdrop" onClick={() => setShowDebtModal(false)}><form className="expense-modal" onSubmit={addDebt} onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="card-label">NEW DEBT</div><h2>Add a debt</h2></div><button type="button" className="icon-button" onClick={() => setShowDebtModal(false)}><X size={18}/></button></div><label>What is this debt?<input autoFocus value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="e.g. Student loans" required/></label><label>Starting balance<input type="number" min="0.01" step="0.01" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} placeholder="10000.00" required/></label><button className="primary-button modal-submit" type="submit"><Plus size={16}/> Add debt</button><p className="demo-note">Demo mode · Your debt data is stored only in this browser session.</p></form></div>}{celebrate && <div className="debt-celebration"><div className="confetti-burst">{Array.from({length:48},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%9)*.09}s`,transform:`rotate(${i*31}deg)`}}/>)}</div><div className="celebration-card"><div className="celebration-spark"><Sparkles size={32}/></div><div className="card-label">DEBT PAID IN FULL</div><h2>You did it!</h2><p>One less weight to carry. Take a moment and celebrate this milestone.</p><button className="primary-button" onClick={() => setCelebrate(false)}>That feels amazing <Check size={16}/></button></div></div>}{toast && <div className="toast"><span className="toast-check"><Check size={15}/></span>{toast}</div>}
      {showOnboarding && currentUserId && <OnboardingWizard userId={currentUserId} onComplete={() => window.location.reload()}/>}
    </main>
  );
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return <div className="transaction-list">{transactions.map((t,i) => <div className="transaction-row" key={t.name+i}><div className={`transaction-icon ${t.color}`}><CategoryIcon name={t.icon}/></div><div className="transaction-info"><strong>{t.name}</strong><span>{t.category} · {t.date}</span></div><div className={`transaction-amount ${t.type === "income" ? "income-amount" : ""}`}>{t.type === "income" ? "+" : "−"}{money(Math.abs(t.amount))}</div></div>)}</div>;
}

function DebtPage({ debts, onAdd, onPayment }: { debts: Debt[]; onAdd: () => void; onPayment: () => void }) {
  const total = debts.reduce((sum,d) => sum + d.balance, 0); const original = debts.reduce((sum,d) => sum + d.original, 0);
  return <div className="subpage"><div className="eyebrow"><span className="eyebrow-line"/> YOUR DEBT-FREE JOURNEY</div><div className="subpage-heading"><div><h1>Debt tracker</h1><p className="subtitle">Every payment moves the number down. Every little bit counts.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17}/> Add debt</button></div><div className="debt-summary-grid"><section className="glass-card debt-total-card"><div className="card-label">TOTAL DEBT REMAINING</div><div className="debt-total-value">{money(total)}</div><p>{debts.length ? `${money(Math.max(0, original-total))} paid off so far` : "Add your first debt to get started."}</p></section><section className="glass-card debt-progress-card"><div className="card-label">YOUR PROGRESS</div><div className="debt-progress-number">{original ? Math.round((original-total)/original*100) : 0}%</div><div className="progress-track"><div className="progress-fill" style={{width:(original ? (original-total)/original*100 : 0)+"%",background:"var(--purple)"}}/></div><p>of your starting debt cleared</p></section></div>{debts.length ? <div className="debt-list">{debts.map(d => <section className="glass-card debt-item" key={d.id}><div className="debt-item-top"><div className="debt-icon"><CreditCard size={19}/></div><div className="debt-title"><strong>{d.name}</strong><span>{d.balance === 0 ? "Paid in full 🎉" : "Keep chipping away"}</span></div><div className="debt-balance">{money(d.balance)}<small>remaining</small></div></div><div className="progress-track"><div className="progress-fill" style={{width:((d.original-d.balance)/d.original*100)+"%",background:"var(--purple)"}}/></div><div className="debt-item-foot"><span>{money(d.original-d.balance)} paid of {money(d.original)}</span><strong>{Math.round((d.original-d.balance)/d.original*100)}%</strong></div></section>)}</div> : <section className="glass-card debt-empty"><div className="debt-empty-icon"><CreditCard size={27}/></div><h2>Start with one debt.</h2><p>Add a student loan, car payment, credit card, or anything else you’re working to pay off. BrewBudget will keep the remaining balance moving down as you log payments.</p><button className="primary-button" onClick={onAdd}><Plus size={16}/> Add your first debt</button></section>}{debts.some(d=>d.balance>0) && <div className="debt-payment-row"><div><strong>Made a debt payment?</strong><p>Log it as an expense and apply it to the right balance.</p></div><button className="primary-button" onClick={onPayment}><Plus size={16}/> Log a payment</button></div>}</div>;
}

function SubPage({ tab, transactions, search, setSearch, setShowAdd, budgetSpent, categories, userId, onCategoryChange, onCategoryDelete }: { tab: Tab; transactions: Transaction[]; search: string; setSearch: (s:string)=>void; setShowAdd: (b:boolean)=>void; budgetSpent: Record<string, number>; categories: CategoryItem[]; userId: string | null; onCategoryChange: (category: CategoryItem)=>void; onCategoryDelete: (categoryId: string, categoryName: string)=>void }) {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryBudget, setCategoryBudget] = useState("");
  const [categoryColor, setCategoryColor] = useState("#CA9EE6");
  const [budgetPeriod, setBudgetPeriod] = useState<"monthly" | "biweekly">("biweekly");
  const [adaptiveBudget, setAdaptiveBudget] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState("");
  const descriptions: Record<Tab,string> = { Debt:"A clearer path to becoming debt-free.", Overview:"Your financial picture, at a glance.", Budgets:"Plan what you expect to spend, then compare it with what you actually spend.", Transactions:"Every little purchase, all in one place.", Accounts:"Your connected financial world.", Goals:"Small steps toward the things that matter.", Reports:"Patterns, progress, and a clearer picture." };

  async function saveBudget(category: CategoryItem, amountValue: string) {
    if (!userId || !category.id) return;
    const amount = Number(amountValue);
    if (!Number.isFinite(amount) || amount < 0) { setBudgetMessage("Enter a valid budget amount."); return; }
    setSavingCategory(true); setBudgetMessage("");
    try {
      const supabase = createClient();
      const { data: existing, error: lookupError } = await supabase.from("budgets")
        .select("id").eq("owner_id", userId).eq("category_id", category.id).limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      const payload = { owner_id: userId, category_id: category.id, amount, period_type: budgetPeriod, rollover_enabled: false };
      const result = existing
        ? await supabase.from("budgets").update({ amount, period_type: budgetPeriod }).eq("id", existing.id)
        : await supabase.from("budgets").insert(payload);
      if (result.error) throw result.error;
      onCategoryChange({ ...category, budget: amount });
      setBudgetMessage("Budget saved.");
    } catch (error) {
      setBudgetMessage(error instanceof Error ? error.message : "Couldn't save that budget.");
    } finally { setSavingCategory(false); }
  }

  async function changeBudgetPeriod(nextPeriod: "monthly" | "biweekly") {
    if (nextPeriod === budgetPeriod || savingCategory) return;
    setBudgetMessage("");
    if (!adaptiveBudget) {
      setBudgetPeriod(nextPeriod);
      setBudgetMessage("Period changed. Category amounts were not converted.");
      return;
    }
    if (!userId) {
      setBudgetPeriod(nextPeriod);
      return;
    }
    const multiplier = budgetPeriod === "biweekly" && nextPeriod === "monthly" ? 2 : 0.5;
    setSavingCategory(true);
    try {
      const supabase = createClient();
      const converted = categories.map(category => ({
        ...category,
        budget: Math.round(category.budget * multiplier * 100) / 100
      }));
      for (const category of converted) {
        if (!category.id || category.budget === 0) continue;
        const { data: existing, error: lookupError } = await supabase.from("budgets")
          .select("id").eq("owner_id", userId).eq("category_id", category.id).limit(1).maybeSingle();
        if (lookupError) throw lookupError;
        const result = existing
          ? await supabase.from("budgets").update({ amount: category.budget, period_type: nextPeriod }).eq("id", existing.id)
          : await supabase.from("budgets").insert({ owner_id: userId, category_id: category.id, amount: category.budget, period_type: nextPeriod, rollover_enabled: false });
        if (result.error) throw result.error;
      }
      converted.forEach(category => onCategoryChange(category));
      setBudgetPeriod(nextPeriod);
      setBudgetMessage(`Adaptive budgets converted to ${nextPeriod === "monthly" ? "monthly" : "per-paycheck"} amounts.`);
    } catch (error) {
      setBudgetMessage(error instanceof Error ? error.message : "Couldn't convert your budget amounts.");
    } finally {
      setSavingCategory(false);
    }
  }

  async function deleteCategory(category: CategoryItem) {
    if (!userId || !category.id) return;
    const confirmed = window.confirm(`Remove "${category.name}" from your budget? Existing transactions will be kept but become uncategorized. Its budget amount will be deleted.`);
    if (!confirmed) return;
    setSavingCategory(true); setBudgetMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("categories").delete().eq("id", category.id).eq("owner_id", userId);
      if (error) throw error;
      onCategoryDelete(category.id, category.name);
      setBudgetMessage(`"${category.name}" was removed. Existing transactions were kept.`);
    } catch (error) {
      setBudgetMessage(error instanceof Error ? error.message : "Couldn't remove that category.");
    } finally { setSavingCategory(false); }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !categoryName.trim()) return;
    if (categories.some(item => item.name.toLowerCase() === categoryName.trim().toLowerCase())) {
      setBudgetMessage("That category already exists."); return;
    }
    setSavingCategory(true); setBudgetMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("categories").insert({
        owner_id: userId, name: categoryName.trim(), category_type: "expense",
        icon: "receipt", color: categoryColor
      }).select("id,name,icon,color").single();
      if (error) throw error;
      const created: CategoryItem = { id: data.id, name: data.name, icon: data.icon ?? "receipt", color: data.color ?? categoryColor, spent: 0, budget: 0 };
      onCategoryChange(created);
      if (categoryBudget.trim()) await saveBudget(created, categoryBudget);
      setCategoryName(""); setCategoryBudget(""); setShowCategoryForm(false);
      setBudgetMessage("Category added to your budget.");
    } catch (error) {
      setBudgetMessage(error instanceof Error ? error.message : "Couldn't create that category.");
    } finally { setSavingCategory(false); }
  }

  return <div className="subpage">
    <div className="eyebrow"><span className="eyebrow-line"/> BREWBUDGET WORKSPACE</div>
    <div className="subpage-heading"><div><h1>{tab === "Goals" ? "Savings goals" : tab}</h1><p className="subtitle">{descriptions[tab]}</p></div>
      {(tab === "Transactions" || tab === "Budgets") && <div className="budget-heading-actions">{tab === "Budgets" && <button className="secondary-button" onClick={() => setShowCategoryForm(value => !value)}><Plus size={16}/> Category</button>}<button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17}/>{tab === "Budgets" ? "Add expense" : "Add transaction"}</button></div>}
    </div>
    {tab === "Transactions" ? <section className="glass-card subpage-panel"><div className="search-box"><Search size={17}/><input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)}/><SlidersHorizontal size={16}/></div><TransactionList transactions={transactions}/>{transactions.length===0 && <div className="empty-state">No transactions match that search.</div>}</section> :
    tab === "Budgets" ? <>
      {showCategoryForm && <form className="glass-card add-category-form" onSubmit={createCategory}>
        <div className="add-category-title"><div><div className="card-label">MAKE IT YOURS</div><h2>New budget category</h2></div><button type="button" className="more-button" onClick={() => setShowCategoryForm(false)} aria-label="Close"><X size={18}/></button></div>
        <div className="add-category-fields"><label>Category name<input autoFocus value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="e.g. Pet care" required maxLength={40}/></label><label>Expected budget ({budgetPeriod === "monthly" ? "per month" : "per paycheck"})<input type="number" min="0" step="0.01" value={categoryBudget} onChange={event => setCategoryBudget(event.target.value)} placeholder="Optional"/></label><label>Color<select value={categoryColor} onChange={event => setCategoryColor(event.target.value)}><option value="#CA9EE6">Lavender</option><option value="#8CAAEE">Blue</option><option value="#A6D189">Mint</option><option value="#E5A86A">Amber</option><option value="#E78284">Rose</option><option value="#99D1DB">Teal</option></select></label><button className="primary-button" type="submit" disabled={savingCategory}>{savingCategory ? "Saving…" : "Add category"}</button></div>
      </form>}
      <div className="budget-workspace-grid">
        <div className="budget-category-column">
          <div className="budget-scope-bar">
            <div><div className="card-label">BUDGETING PERIOD</div><strong>{budgetPeriod === "monthly" ? "Monthly budget" : "Per-paycheck budget"}</strong><span>Enter the amount you want to set aside for each category {budgetPeriod === "monthly" ? "each month" : "every payday"}.</span></div>
            <div className="budget-period-control" role="group" aria-label="Budgeting period">
              <button type="button" className={budgetPeriod === "biweekly" ? "selected" : ""} onClick={() => void changeBudgetPeriod("biweekly")}>Per paycheck</button>
              <button type="button" className={budgetPeriod === "monthly" ? "selected" : ""} onClick={() => void changeBudgetPeriod("monthly")}>Monthly</button>
            </div>
            <label className="adaptive-budget-toggle"><input type="checkbox" checked={adaptiveBudget} onChange={event => setAdaptiveBudget(event.target.checked)}/><span className="adaptive-switch"/><span><strong>Adaptive amounts</strong><small>{adaptiveBudget ? "Automatically doubles or halves category targets when you switch periods." : "Switching periods won't change category amounts."}</small></span></label>
          </div>
          <div className="budget-category-list"><div className="budget-table">
          <div className="budget-table-head"><span>CATEGORY</span><span>PLANNED ({budgetPeriod === "monthly" ? "MONTHLY" : "PER PAYCHECK"})</span><span>SPENT</span><span>REMAINING</span></div>
          {categories.map(category => {
            const spent = budgetSpent[category.name] ?? category.spent;
            const remaining = category.budget - spent;
            const percent = category.budget > 0 ? Math.min(100, spent / category.budget * 100) : 0;
            return <section className="budget-table-row" key={category.id ?? category.name}>
              <div className="budget-table-category"><span className="budget-category-symbol" style={{color:category.color,background:category.color+"20"}}><CategoryIcon name={category.icon}/></span><strong>{category.name}</strong><div className="budget-row-progress"><div className="progress-fill" style={{width:percent+"%",background:category.color}}/></div><button type="button" className="budget-delete-category" onClick={() => void deleteCategory(category)} disabled={savingCategory} aria-label={`Remove ${category.name} category`} title="Remove category"><Trash2 size={14}/></button></div>
              <label className="budget-planned-cell"><span className="mobile-column-label">{budgetPeriod === "monthly" ? "PLANNED / MONTH" : "PLANNED / PAYCHECK"}</span><span className="budget-currency">$</span><input key={(category.id ?? category.name)+"-"+budgetPeriod} aria-label={"Planned budget "+(budgetPeriod === "monthly" ? "per month" : "per paycheck")+" for "+category.name} name="budget" type="number" min="0" step="0.01" defaultValue={category.budget || ""} placeholder="0" onBlur={event => { if (event.currentTarget.value !== String(category.budget || "")) void saveBudget(category,event.currentTarget.value); }}/></label>
              <div className="budget-number-cell"><span className="mobile-column-label">SPENT</span><strong>{money(spent)}</strong></div>
              <div className={"budget-number-cell "+(remaining < 0 ? "budget-over" : "budget-under")}><span className="mobile-column-label">REMAINING</span><strong>{category.budget > 0 ? money(remaining) : "—"}</strong></div>
            </section>;
          })}
        </div></div></div>
        <section className="glass-card budget-chart-card">
          <div className="section-heading"><div><div className="card-label">SPENDING MIX</div><h2>Where it goes</h2><p>Actual spending by category.</p></div></div>
          {categories.some(category => (budgetSpent[category.name] ?? category.spent) > 0) ? <div className="budget-chart-wrap"><ResponsiveContainer width="100%" height={235}><PieChart><Pie data={categories.filter(category => (budgetSpent[category.name] ?? category.spent) > 0).map(category => ({name:category.name,value:budgetSpent[category.name] ?? category.spent,color:category.color}))} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={57} outerRadius={88} paddingAngle={3} stroke="none">{categories.filter(category => (budgetSpent[category.name] ?? category.spent) > 0).map(category => <Cell key={category.id ?? category.name} fill={category.color}/>)}</Pie><Tooltip contentStyle={{background:"#202733",border:"1px solid #ffffff20",borderRadius:10,color:"#f2f0e9",fontSize:11}} formatter={(value)=>money(Number(value))}/><Legend layout="vertical" align="center" verticalAlign="bottom" wrapperStyle={{fontSize:10,color:"#aab2bf"}}/></PieChart></ResponsiveContainer></div> : <div className="empty-state budget-pie-empty">Your category breakdown will appear once you record spending.</div>}
          <div className="budget-chart-summary"><div><small>Total planned</small><strong>{money(categories.reduce((sum,item)=>sum+item.budget,0))}</strong></div><div><small>Total spent</small><strong>{money(categories.reduce((sum,item)=>sum+(budgetSpent[item.name] ?? item.spent),0))}</strong></div><div><small>Left to budget</small><strong>{money(categories.reduce((sum,item)=>sum+item.budget,0)-categories.reduce((sum,item)=>sum+(budgetSpent[item.name] ?? item.spent),0))}</strong></div></div>
        </section>
      </div>
      {budgetMessage && <p className="budget-feedback">{budgetMessage}</p>}
    </> :
    tab === "Accounts" ? <BankConnections/> :
    tab === "Goals" ? <div className="subpage-categories"><section className="glass-card goal-card"><div className="goal-icon"><Heart size={20}/></div><div className="goal-main"><strong>Emergency fund</strong><p>Building a little breathing room.</p><div className="progress-track"><div className="progress-fill" style={{width:"64%",background:"#A6D189"}}/></div><div className="category-remaining">$3,200 of $5,000 saved · 64%</div></div></section><section className="glass-card goal-card"><div className="goal-icon purple"><Target size={20}/></div><div className="goal-main"><strong>Weekend getaway</strong><p>Something fun to look forward to.</p><div className="progress-track"><div className="progress-fill" style={{width:"38%",background:"#CA9EE6"}}/></div><div className="category-remaining">$380 of $1,000 saved · 38%</div></div></section></div> :
    <section className="glass-card report-placeholder"><div className="report-art"><TrendingUp size={32}/></div><h2>Your money story, over time.</h2><p>Reports will bring your spending patterns, cash flow, and savings progress together in one thoughtful view.</p></section>}
  </div>;
}
