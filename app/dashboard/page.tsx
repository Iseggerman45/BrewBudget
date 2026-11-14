"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BankConnections from "@/components/BankConnections";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Coffee, CreditCard, Ellipsis, Home, LayoutDashboard,
  Plus, Search, Settings2, ShoppingBag, Sparkles, Target, TrendingUp, Wallet, Volume2, VolumeX,
  Utensils, CarFront, Zap, Heart, SlidersHorizontal, ArrowLeftRight, X, Check,
  Menu, Landmark, PiggyBank, ReceiptText
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

type Period = "Monthly" | "Biweekly";
type Tab = "Overview" | "Budgets" | "Transactions" | "Debt" | "Accounts" | "Goals" | "Reports";
type Debt = { id: number; name: string; original: number; balance: number };
type Transaction = { name: string; category: string; date: string; amount: number; icon: string; color: string; type: "expense" | "income" };

const initialTransactions: Transaction[] = [];

const categories = [
  { name: "Housing", spent: 0, budget: 0, color: "#A6D189", icon: "home" },
  { name: "Groceries", spent: 0, budget: 0, color: "#8CAAEE", icon: "shopping" },
  { name: "Coffee & dining", spent: 0, budget: 0, color: "#E5A86A", icon: "coffee" },
  { name: "Transportation", spent: 0, budget: 0, color: "#CA9EE6", icon: "car" },
  { name: "Utilities", spent: 0, budget: 0, color: "#E78284", icon: "zap" },
];

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
  if (name === "shopping") return <ShoppingBag {...common}/>;
  if (name === "coffee") return <Coffee {...common}/>;
  if (name === "car") return <CarFront {...common}/>;
  if (name === "zap") return <Zap {...common}/>;
  if (name === "income") return <ArrowDownLeft {...common}/>;
  return <ReceiptText {...common}/>;
}

export default function Dashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("Biweekly");
  const [tab, setTab] = useState<Tab>("Overview");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showAdd, setShowAdd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Groceries");
  const [toast, setToast] = useState("");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [paymentDebtId, setPaymentDebtId] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [entryFeedback, setEntryFeedback] = useState(false);
  const [budgetSpent, setBudgetSpent] = useState<Record<string, number>>(() => Object.fromEntries(categories.map(category => [category.name, category.spent])));

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

  function addTransaction(e: FormEvent) {
    e.preventDefault();
    const amount = Number(newAmount);
    if (!newName.trim() || !Number.isFinite(amount) || amount <= 0) return;
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
      const budget = categories.find(category => category.name === newCategory);
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
          <div className="topbar-actions"><div className="date-chip"><CalendarDays size={15}/> Friday, November 13</div><button className="icon-button sound-toggle" aria-label={soundEnabled ? "Mute sound effects" : "Enable sound effects"} title={soundEnabled ? "Sound effects on" : "Sound effects off"} onClick={() => { setSoundEnabled(!soundEnabled); setToast(!soundEnabled ? "Sound effects on" : "Sound effects off"); }}>{soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button><button className="icon-button notification" aria-label="Notifications" onClick={() => setToast("You're all caught up")}><Bell size={18}/><i/></button><button className="top-avatar" title="Sign out" onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }}>B</button></div>
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
              <div className="glass-card metric-card"><div className="card-top"><span className="card-label">INCOME THIS PERIOD</span><span className="card-icon blue"><ArrowDownLeft size={17}/></span></div><div className="metric-value">$0<span>.00</span></div><div className="metric-foot"><span className="metric-caption">No income recorded yet</span></div></div>
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
                <div className="category-list">{categories.slice(0,4).map((c) => { const spent = budgetSpent[c.name] ?? c.spent; return <div className="category-item" key={c.name}><div className="category-top"><div className="category-name"><span className="category-dot" style={{ background: c.color }}/>{c.name}</div><div className="category-amount">{c.budget > 0 ? <>{money(spent)} <span>/ {money(c.budget)}</span></> : <span>No budget set</span>}</div></div><div className="progress-track"><div className="progress-fill" style={{ width: (c.budget > 0 ? Math.min(100,spent/c.budget*100) : 0)+"%", background: c.color }}/></div><div className="category-remaining">{c.budget > 0 ? (spent <= c.budget ? `${money(c.budget-spent)} left` : `${money(spent-c.budget)} over budget`) : "Set a budget to start tracking"}</div></div>; })}</div>
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
          </> : tab === "Debt" ? <DebtPage debts={debts} onAdd={() => setShowDebtModal(true)} onPayment={() => { setNewCategory("Debt payment"); setPaymentDebtId(debts[0] ? String(debts[0].id) : ""); setShowAdd(true); }} /> : <SubPage tab={tab} transactions={filteredTransactions} search={search} setSearch={setSearch} setShowAdd={setShowAdd} budgetSpent={budgetSpent}/>}
        </div>
      </section>

      {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="expense-modal" onSubmit={addTransaction} onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="card-label">NEW TRANSACTION</div><h2>Add an expense</h2></div><button type="button" className="icon-button" onClick={() => setShowAdd(false)}><X size={18}/></button></div><label>What was it for?<input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Grocery run" required/></label><label>Amount<input type="number" min="0.01" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" required/></label><label>Category<select value={newCategory} onChange={e => setNewCategory(e.target.value)}>{categories.map(c => <option key={c.name}>{c.name}</option>)}<option>Debt payment</option></select></label>{newCategory === "Debt payment" && <label>Apply payment to<select value={paymentDebtId} onChange={e => setPaymentDebtId(e.target.value)} required><option value="">Choose a debt</option>{debts.filter(d => d.balance > 0).map(d => <option key={d.id} value={d.id}>{d.name} · {money(d.balance)} left</option>)}</select></label>}<button className="primary-button modal-submit" type="submit"><Check size={16}/> Save expense</button><p className="demo-note">Demo mode · This entry is stored only in this browser session.</p></form></div>}
      {showDebtModal && <div className="modal-backdrop" onClick={() => setShowDebtModal(false)}><form className="expense-modal" onSubmit={addDebt} onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="card-label">NEW DEBT</div><h2>Add a debt</h2></div><button type="button" className="icon-button" onClick={() => setShowDebtModal(false)}><X size={18}/></button></div><label>What is this debt?<input autoFocus value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="e.g. Student loans" required/></label><label>Starting balance<input type="number" min="0.01" step="0.01" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} placeholder="10000.00" required/></label><button className="primary-button modal-submit" type="submit"><Plus size={16}/> Add debt</button><p className="demo-note">Demo mode · Your debt data is stored only in this browser session.</p></form></div>}{celebrate && <div className="debt-celebration"><div className="confetti-burst">{Array.from({length:48},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`${(i%9)*.09}s`,transform:`rotate(${i*31}deg)`}}/>)}</div><div className="celebration-card"><div className="celebration-spark"><Sparkles size={32}/></div><div className="card-label">DEBT PAID IN FULL</div><h2>You did it!</h2><p>One less weight to carry. Take a moment and celebrate this milestone.</p><button className="primary-button" onClick={() => setCelebrate(false)}>That feels amazing <Check size={16}/></button></div></div>}{toast && <div className="toast"><span className="toast-check"><Check size={15}/></span>{toast}</div>}
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

function SubPage({ tab, transactions, search, setSearch, setShowAdd, budgetSpent }: { tab: Tab; transactions: Transaction[]; search: string; setSearch: (s:string)=>void; setShowAdd: (b:boolean)=>void; budgetSpent: Record<string, number> }) {
  const descriptions: Record<Tab,string> = { Debt:"A clearer path to becoming debt-free.", Overview:"Your financial picture, at a glance.", Budgets:"Give every category a thoughtful spending limit.", Transactions:"Every little purchase, all in one place.", Accounts:"Your connected financial world.", Goals:"Small steps toward the things that matter.", Reports:"Patterns, progress, and a clearer picture." };
  return <div className="subpage"><div className="eyebrow"><span className="eyebrow-line"/> BREWBUDGET WORKSPACE</div><div className="subpage-heading"><div><h1>{tab === "Goals" ? "Savings goals" : tab}</h1><p className="subtitle">{descriptions[tab]}</p></div>{(tab === "Transactions" || tab === "Budgets") && <button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17}/>{tab === "Budgets" ? "Add expense" : "Add transaction"}</button>}</div>
  {tab === "Transactions" ? <section className="glass-card subpage-panel"><div className="search-box"><Search size={17}/><input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)}/><SlidersHorizontal size={16}/></div><TransactionList transactions={transactions}/>{transactions.length===0 && <div className="empty-state">No transactions match that search.</div>}</section> :
  tab === "Budgets" ? <div className="subpage-categories">{categories.map(c=>{const spent=budgetSpent[c.name] ?? c.spent; return <section className="glass-card category-detail" key={c.name}><div className="category-top"><div className="category-name"><span className="category-dot" style={{background:c.color}}/>{c.name}</div><strong>{c.budget > 0 ? <>{money(spent)} <span className="muted-text">/ {money(c.budget)}</span></> : <span className="muted-text">No budget set</span>}</strong></div><div className="progress-track"><div className="progress-fill" style={{width:(c.budget > 0 ? Math.min(100,spent/c.budget*100) : 0)+"%",background:c.color}}/></div><div className="category-remaining">{c.budget > 0 ? (spent<=c.budget ? `${money(c.budget-spent)} remaining` : `${money(spent-c.budget)} over budget`) : "Set a budget to start tracking"}</div></section>;})}</div> :
  tab === "Accounts" ? <BankConnections/> :
  tab === "Goals" ? <div className="subpage-categories"><section className="glass-card goal-card"><div className="goal-icon"><Heart size={20}/></div><div className="goal-main"><strong>Emergency fund</strong><p>Building a little breathing room.</p><div className="progress-track"><div className="progress-fill" style={{width:"64%",background:"#A6D189"}}/></div><div className="category-remaining">$3,200 of $5,000 saved · 64%</div></div></section><section className="glass-card goal-card"><div className="goal-icon purple"><Target size={20}/></div><div className="goal-main"><strong>Weekend getaway</strong><p>Something fun to look forward to.</p><div className="progress-track"><div className="progress-fill" style={{width:"38%",background:"#CA9EE6"}}/></div><div className="category-remaining">$380 of $1,000 saved · 38%</div></div></section></div> :
  <section className="glass-card report-placeholder"><div className="report-art"><TrendingUp size={32}/></div><h2>Your money story, over time.</h2><p>Reports will bring your spending patterns, cash flow, and savings progress together in one thoughtful view.</p></section>}
  </div>;
}
