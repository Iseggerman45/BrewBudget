"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Coffee, CreditCard, Ellipsis, Home, LayoutDashboard,
  Plus, Search, Settings2, ShoppingBag, Sparkles, Target, TrendingUp, Wallet,
  Utensils, CarFront, Zap, Heart, SlidersHorizontal, ArrowLeftRight, X, Check,
  Menu, Landmark, PiggyBank, ReceiptText
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

type Period = "Monthly" | "Biweekly";
type Tab = "Overview" | "Budgets" | "Transactions" | "Accounts" | "Goals" | "Reports";
type Transaction = { name: string; category: string; date: string; amount: number; icon: string; color: string; type: "expense" | "income" };

const initialTransactions: Transaction[] = [
  { name: "Trader Joe’s", category: "Groceries", date: "Today · 9:42 AM", amount: -64.28, icon: "shopping", color: "mint", type: "expense" },
  { name: "Blue Bottle Coffee", category: "Coffee & dining", date: "Today · 8:15 AM", amount: -8.50, icon: "coffee", color: "amber", type: "expense" },
  { name: "Paycheck · Acme Co.", category: "Income", date: "Yesterday", amount: 2_140.00, icon: "income", color: "blue", type: "income" },
  { name: "Shell", category: "Transportation", date: "Nov 11", amount: -42.16, icon: "car", color: "purple", type: "expense" },
  { name: "Electric Company", category: "Utilities", date: "Nov 10", amount: -86.40, icon: "zap", color: "rose", type: "expense" },
];

const categories = [
  { name: "Housing", spent: 950, budget: 1200, color: "#A6D189", icon: "home" },
  { name: "Groceries", spent: 284, budget: 400, color: "#8CAAEE", icon: "shopping" },
  { name: "Coffee & dining", spent: 96, budget: 160, color: "#E5A86A", icon: "coffee" },
  { name: "Transportation", spent: 118, budget: 180, color: "#CA9EE6", icon: "car" },
  { name: "Utilities", spent: 86, budget: 140, color: "#E78284", icon: "zap" },
];

const monthlyChart = [
  { day: "1", income: 340, spending: 190 }, { day: "4", income: 480, spending: 330 },
  { day: "7", income: 620, spending: 410 }, { day: "10", income: 720, spending: 560 },
  { day: "13", income: 940, spending: 680 }, { day: "16", income: 1080, spending: 810 },
  { day: "19", income: 1250, spending: 930 }, { day: "22", income: 1390, spending: 1110 },
  { day: "25", income: 1510, spending: 1280 }, { day: "28", income: 1780, spending: 1450 },
  { day: "30", income: 2140, spending: 1620 },
];
const biweeklyChart = [
  { day: "Payday", income: 2140, spending: 120 }, { day: "+2", income: 2140, spending: 260 },
  { day: "+4", income: 2140, spending: 430 }, { day: "+6", income: 2140, spending: 590 },
  { day: "+8", income: 2140, spending: 710 }, { day: "+10", income: 2140, spending: 940 },
  { day: "+12", income: 2140, spending: 1110 }, { day: "+14", income: 2140, spending: 1290 },
];

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const nav: { name: Tab; icon: typeof Home }[] = [
  { name: "Overview", icon: LayoutDashboard }, { name: "Budgets", icon: Wallet },
  { name: "Transactions", icon: ArrowLeftRight }, { name: "Accounts", icon: Landmark },
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

  const chartData = period === "Monthly" ? monthlyChart : biweeklyChart;
  const filteredTransactions = useMemo(() => transactions.filter(t =>
    (t.name + t.category).toLowerCase().includes(search.toLowerCase())
  ), [transactions, search]);

  function addTransaction(e: FormEvent) {
    e.preventDefault();
    const amount = Number(newAmount);
    if (!newName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setTransactions([{ name: newName.trim(), category: newCategory, date: "Just now", amount: -amount, icon: "shopping", color: "mint", type: "expense" }, ...transactions]);
    setNewName(""); setNewAmount(""); setShowAdd(false);
    setToast("Expense added to your activity");
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <main className="app-shell">
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
          <div className="topbar-actions"><div className="date-chip"><CalendarDays size={15}/> Friday, November 13</div><button className="icon-button notification" aria-label="Notifications" onClick={() => setToast("You're all caught up")}><Bell size={18}/><i/></button><div className="top-avatar">B</div></div>
        </header>

        <div className="content-wrap">
          {tab === "Overview" ? <>
            <div className="welcome-row">
              <div><div className="eyebrow"><span className="eyebrow-line"/> FRIDAY, NOVEMBER 13, 2026</div><h1>Good morning<span className="wave">,</span> <em>let’s get grounded.</em></h1><p className="subtitle">A clear head and a little clarity go a long way.</p></div>
              <button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17}/> Add expense</button>
            </div>

            <div className="period-row"><div className="period-control"><button className={period === "Monthly" ? "selected" : ""} onClick={() => setPeriod("Monthly")}>Monthly</button><button className={period === "Biweekly" ? "selected" : ""} onClick={() => setPeriod("Biweekly")}>Biweekly</button></div><button className="period-date">Nov 1 – Nov 14 <ChevronDown size={14}/></button><span className="period-note"><span className="live-dot"/> {period === "Biweekly" ? "Pay period · 4 days left" : "Monthly overview"}</span></div>

            <div className="summary-grid">
              <div className="glass-card balance-card"><div className="card-top"><span className="card-label">AVAILABLE TO SPEND</span><span className="card-icon green"><Wallet size={17}/></span></div><div className="balance-value">$1,284<span>.62</span></div><div className="balance-foot"><span className="positive-pill"><TrendingUp size={13}/> On track</span><span className="muted-text">of $2,140 income</span></div><div className="balance-glow"/></div>
              <div className="glass-card metric-card"><div className="card-top"><span className="card-label">INCOME THIS PERIOD</span><span className="card-icon blue"><ArrowDownLeft size={17}/></span></div><div className="metric-value">$2,140<span>.00</span></div><div className="metric-foot"><span className="metric-caption">2 deposits this month</span><span className="trend-up">+8.4%</span></div></div>
              <div className="glass-card metric-card"><div className="card-top"><span className="card-label">SPENT THIS PERIOD</span><span className="card-icon amber"><ArrowUpRight size={17}/></span></div><div className="metric-value">$855<span>.38</span></div><div className="metric-foot"><span className="metric-caption">40% of your budget</span><span className="trend-neutral">Looking good</span></div></div>
            </div>

            <div className="dashboard-grid">
              <section className="glass-card chart-card">
                <div className="section-heading"><div><div className="card-label">YOUR CASH FLOW</div><h2>Money in, money out</h2><p>See how your spending is moving over time.</p></div><button className="more-button"><Ellipsis size={20}/></button></div>
                <div className="chart-legend"><span><i className="legend-income"/> Income</span><span><i className="legend-spending"/> Spending</span><span className="chart-total">{period === "Biweekly" ? "$2,140" : "$4,280"} <small>income</small></span></div>
                <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A6D189" stopOpacity={0.22}/><stop offset="95%" stopColor="#A6D189" stopOpacity={0}/></linearGradient><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8CAAEE" stopOpacity={0.16}/><stop offset="95%" stopColor="#8CAAEE" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff" strokeOpacity={0.055} vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#858D9B", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#858D9B", fontSize: 11 }} tickFormatter={(v) => "$"+v}/><Tooltip contentStyle={{ background: "#202630", border: "1px solid #ffffff20", borderRadius: 12, color: "#F2F0E9", fontSize: 12 }} formatter={(v) => money(Number(v))}/><Area type="monotone" dataKey="income" stroke="#A6D189" strokeWidth={2.4} fill="url(#incomeFill)" activeDot={{ r: 4 }}/><Area type="monotone" dataKey="spending" stroke="#8CAAEE" strokeWidth={2.4} fill="url(#spendFill)" activeDot={{ r: 4 }}/></AreaChart></ResponsiveContainer></div>
              </section>

              <section className="glass-card budget-card">
                <div className="section-heading"><div><div className="card-label">SPENDING PLAN</div><h2>Budget categories</h2><p>A little awareness goes a long way.</p></div><button className="more-button" onClick={() => setTab("Budgets")}><Ellipsis size={20}/></button></div>
                <div className="category-list">{categories.slice(0,4).map((c) => <div className="category-item" key={c.name}><div className="category-top"><div className="category-name"><span className="category-dot" style={{ background: c.color }}/>{c.name}</div><div className="category-amount">{money(c.spent)} <span>/ {money(c.budget)}</span></div></div><div className="progress-track"><div className="progress-fill" style={{ width: (c.spent/c.budget*100)+"%", background: c.color }}/></div><div className="category-remaining">{money(c.budget-c.spent)} left</div></div>)}</div>
                <button className="text-link" onClick={() => setTab("Budgets")}>View all categories <ChevronRight size={15}/></button>
              </section>
            </div>

            <div className="bottom-grid">
              <section className="glass-card transactions-card">
                <div className="section-heading"><div><div className="card-label">THE LATEST</div><h2>Recent transactions</h2></div><button className="text-link" onClick={() => setTab("Transactions")}>See all <ChevronRight size={15}/></button></div>
                <TransactionList transactions={transactions.slice(0,4)}/>
              </section>
              <section className="glass-card insight-card"><div className="insight-top"><div className="insight-icon"><Sparkles size={17}/></div><span className="card-label">A LITTLE INSIGHT</span></div><h2>Your coffee habit is looking good.</h2><p>You’ve spent <strong>$38 less</strong> on coffee and dining than this time last period. Those small choices are adding up.</p><div className="insight-bottom"><span className="insight-spark">✳</span> Keep that momentum going.</div></section>
            </div>
            <footer className="footer-note"><Coffee size={14}/> Made for a more mindful money routine. <span>·</span> BrewBudget <span className="footer-version">v0.1.0</span></footer>
          </> : <SubPage tab={tab} transactions={filteredTransactions} search={search} setSearch={setSearch} setShowAdd={setShowAdd}/>}
        </div>
      </section>

      {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="expense-modal" onSubmit={addTransaction} onClick={e => e.stopPropagation()}><div className="modal-head"><div><div className="card-label">NEW TRANSACTION</div><h2>Add an expense</h2></div><button type="button" className="icon-button" onClick={() => setShowAdd(false)}><X size={18}/></button></div><label>What was it for?<input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Grocery run" required/></label><label>Amount<input type="number" min="0.01" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" required/></label><label>Category<select value={newCategory} onChange={e => setNewCategory(e.target.value)}>{categories.map(c => <option key={c.name}>{c.name}</option>)}</select></label><button className="primary-button modal-submit" type="submit"><Check size={16}/> Save expense</button><p className="demo-note">Demo mode · This entry is stored only in this browser session.</p></form></div>}
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </main>
  );
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return <div className="transaction-list">{transactions.map((t,i) => <div className="transaction-row" key={t.name+i}><div className={`transaction-icon ${t.color}`}><CategoryIcon name={t.icon}/></div><div className="transaction-info"><strong>{t.name}</strong><span>{t.category} · {t.date}</span></div><div className={`transaction-amount ${t.type === "income" ? "income-amount" : ""}`}>{t.type === "income" ? "+" : "−"}{money(Math.abs(t.amount))}</div></div>)}</div>;
}

function SubPage({ tab, transactions, search, setSearch, setShowAdd }: { tab: Tab; transactions: Transaction[]; search: string; setSearch: (s:string)=>void; setShowAdd: (b:boolean)=>void }) {
  const descriptions: Record<Tab,string> = { Overview:"Your financial picture, at a glance.", Budgets:"Give every category a thoughtful spending limit.", Transactions:"Every little purchase, all in one place.", Accounts:"Your connected financial world.", Goals:"Small steps toward the things that matter.", Reports:"Patterns, progress, and a clearer picture." };
  return <div className="subpage"><div className="eyebrow"><span className="eyebrow-line"/> BREWBUDGET WORKSPACE</div><div className="subpage-heading"><div><h1>{tab === "Goals" ? "Savings goals" : tab}</h1><p className="subtitle">{descriptions[tab]}</p></div>{(tab === "Transactions" || tab === "Budgets") && <button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17}/>{tab === "Budgets" ? "Add expense" : "Add transaction"}</button>}</div>
  {tab === "Transactions" ? <section className="glass-card subpage-panel"><div className="search-box"><Search size={17}/><input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)}/><SlidersHorizontal size={16}/></div><TransactionList transactions={transactions}/>{transactions.length===0 && <div className="empty-state">No transactions match that search.</div>}</section> :
  tab === "Budgets" ? <div className="subpage-categories">{categories.map(c=><section className="glass-card category-detail" key={c.name}><div className="category-top"><div className="category-name"><span className="category-dot" style={{background:c.color}}/>{c.name}</div><strong>{money(c.spent)} <span className="muted-text">/ {money(c.budget)}</span></strong></div><div className="progress-track"><div className="progress-fill" style={{width:(c.spent/c.budget*100)+"%",background:c.color}}/></div><div className="category-remaining">{money(c.budget-c.spent)} remaining</div></section>)}</div> :
  tab === "Accounts" ? <div className="subpage-categories"><section className="glass-card account-card"><div className="account-logo"><Landmark size={21}/></div><div><strong>Everyday Checking</strong><p>Demo Bank · Checking •• 4821</p></div><div className="account-balance">$2,684.62</div></section><section className="glass-card account-card"><div className="account-logo savings"><PiggyBank size={21}/></div><div><strong>Rainy Day Savings</strong><p>Demo Bank · Savings •• 9014</p></div><div className="account-balance">$5,200.00</div></section><button className="connect-card" onClick={() => alert("Bank connections will be added with the secure Plaid integration.")}><Plus size={18}/> Connect a bank account</button></div> :
  tab === "Goals" ? <div className="subpage-categories"><section className="glass-card goal-card"><div className="goal-icon"><Heart size={20}/></div><div className="goal-main"><strong>Emergency fund</strong><p>Building a little breathing room.</p><div className="progress-track"><div className="progress-fill" style={{width:"64%",background:"#A6D189"}}/></div><div className="category-remaining">$3,200 of $5,000 saved · 64%</div></div></section><section className="glass-card goal-card"><div className="goal-icon purple"><Target size={20}/></div><div className="goal-main"><strong>Weekend getaway</strong><p>Something fun to look forward to.</p><div className="progress-track"><div className="progress-fill" style={{width:"38%",background:"#CA9EE6"}}/></div><div className="category-remaining">$380 of $1,000 saved · 38%</div></div></section></div> :
  <section className="glass-card report-placeholder"><div className="report-art"><TrendingUp size={32}/></div><h2>Your money story, over time.</h2><p>Reports will bring your spending patterns, cash flow, and savings progress together in one thoughtful view.</p></section>}
  </div>;
}
