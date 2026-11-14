"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Check, Coffee, Plus, Trash2, X } from "lucide-react";

type Props = { userId: string; onComplete: () => void };
type BudgetCategory = { name: string; icon: string; color: string; selected: boolean; amount: string };
type Bill = { name: string; amount: string; due_day: string; frequency: string };

const starterCategories = [
  ["Mortgage / rent", "home", "#A6D189"], ["Electricity", "electric", "#E5A86A"],
  ["Natural gas", "gas", "#E78284"], ["Water & sewer", "water", "#8CAAEE"],
  ["Trash", "receipt", "#99D1DB"], ["Internet", "wifi", "#CA9EE6"],
  ["Groceries", "groceries", "#A6D189"], ["Gas & fuel", "fuel", "#E5A86A"],
  ["Restaurants", "coffee", "#CA9EE6"], ["Shopping", "shopping", "#F4B8E4"],
  ["Entertainment", "ticket", "#BABB F1".replace(" ", "")], ["Insurance", "shield", "#E5A86A"],
  ["Phone", "wifi", "#99D1DB"], ["Health & medical", "heart", "#EA999C"],
  ["Personal care", "user", "#C6D0F5"], ["Giving", "gift", "#F2D5CF"],
  ["Savings", "piggy", "#A6D189"], ["Debt payments", "credit-card", "#CA9EE6"],
] as const;

export default function OnboardingWizard({ userId, onComplete }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [householdType, setHouseholdType] = useState<"individual" | "couples">("individual");
  const [householdName, setHouseholdName] = useState("My Budget");
  const [income, setIncome] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [frequency, setFrequency] = useState("biweekly");
  const [nextPayday, setNextPayday] = useState("");
  const [categories, setCategories] = useState<BudgetCategory[]>(starterCategories.map(([name, icon, color], index) => ({
    name, icon, color, selected: index < 8 || index === 12, amount: ""
  })));
  const [bills, setBills] = useState<Bill[]>([]);
  const [debtName, setDebtName] = useState("");
  const [debtBalance, setDebtBalance] = useState("");
  const [debtRate, setDebtRate] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  const steps = ["Your household", "Income & paydays", "Your categories", "Bills & goals"];
  const selectedCategories = categories.filter(category => category.selected);
  const budgetPeriod = frequency === "monthly" ? "monthly" : "biweekly";

  function updateCategory(index: number, patch: Partial<BudgetCategory>) {
    setCategories(current => current.map((category, i) => i === index ? { ...category, ...patch } : category));
  }

  function addBill() {
    setBills(current => [...current, { name: "", amount: "", due_day: "", frequency: "monthly" }]);
  }

  function updateBill(index: number, patch: Partial<Bill>) {
    setBills(current => current.map((bill, i) => i === index ? { ...bill, ...patch } : bill));
  }

  async function finish() {
    if (selectedCategories.length === 0) {
      setError("Choose at least one category so BrewBudget has a place to organize your spending.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== userId) throw new Error("Your session expired. Please sign in again.");

      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({ name: householdName.trim() || "My Budget", created_by: userId })
        .select("id")
        .single();
      if (householdError) throw householdError;

      const { error: memberError } = await supabase.from("household_members").insert({
        household_id: household.id, user_id: userId, role: "owner"
      });
      if (memberError) throw memberError;

      const categoryRows = selectedCategories.map(category => ({
        owner_id: userId, household_id: household.id, name: category.name,
        category_type: "expense", icon: category.icon, color: category.color
      }));
      const { data: savedCategories, error: categoryError } = await supabase
        .from("categories").insert(categoryRows).select("id,name");
      if (categoryError) throw categoryError;

      const categoryByName = new Map((savedCategories ?? []).map(category => [category.name, category.id]));
      const budgetRows = selectedCategories
        .filter(category => Number(category.amount) > 0)
        .map(category => ({
          owner_id: userId, household_id: household.id,
          category_id: categoryByName.get(category.name),
          amount: Number(category.amount), period_type: budgetPeriod, rollover_enabled: false
        }));
      if (budgetRows.length) {
        const { error: budgetError } = await supabase.from("budgets").insert(budgetRows);
        if (budgetError) throw budgetError;
      }

      const validBills = bills.filter(bill => bill.name.trim() && Number(bill.amount) > 0);
      if (validBills.length) {
        const { error: billsError } = await supabase.from("bills").insert(validBills.map(bill => ({
          owner_id: userId, household_id: household.id, name: bill.name.trim(),
          amount: Number(bill.amount), frequency: bill.frequency,
          due_day: bill.due_day ? Number(bill.due_day) : null
        })));
        if (billsError) throw billsError;
      }

      if (debtName.trim() && Number(debtBalance) > 0) {
        const { error: debtError } = await supabase.from("debts").insert({
          owner_id: userId, household_id: household.id, name: debtName.trim(),
          original_balance: Number(debtBalance), current_balance: Number(debtBalance),
          interest_rate: debtRate ? Number(debtRate) : null
        });
        if (debtError) throw debtError;
      }

      if (goalName.trim() && Number(goalTarget) > 0) {
        const { error: goalError } = await supabase.from("savings_goals").insert({
          owner_id: userId, household_id: household.id, name: goalName.trim(),
          target_amount: Number(goalTarget), current_amount: 0
        });
        if (goalError) throw goalError;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: authData.user.user_metadata?.display_name ?? authData.user.user_metadata?.full_name ?? null,
        onboarding_completed: true, household_type: householdType,
        pay_frequency: frequency, expected_income: income ? Number(income) : null,
        income_source: incomeSource.trim() || null, next_payday: nextPayday || null,
        updated_at: new Date().toISOString()
      });
      if (profileError) throw profileError;
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't save your setup. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    setSaving(true);
    setError("");
    try {
      const { data: existingHousehold, error: lookupError } = await supabase
        .from("households").select("id").eq("created_by", userId).limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      let householdId = existingHousehold?.id;
      if (!householdId) {
        const { data: household, error: householdError } = await supabase
          .from("households").insert({ name: "My Budget", created_by: userId }).select("id").single();
        if (householdError) throw householdError;
        householdId = household.id;
      }
      const { error: memberError } = await supabase.from("household_members")
        .upsert({ household_id: householdId, user_id: userId, role: "owner" });
      if (memberError) throw memberError;
      const { data: existingCategories, error: categoryLookupError } = await supabase
        .from("categories").select("id").eq("owner_id", userId).eq("category_type", "expense").limit(1);
      if (categoryLookupError) throw categoryLookupError;
      if (!existingCategories?.length) {
        const { error: categoryError } = await supabase.from("categories").insert(
          starterCategories.slice(0, 8).map(([name, icon, color]) => ({
            owner_id: userId, household_id: householdId, name, icon, color, category_type: "expense"
          }))
        );
        if (categoryError) throw categoryError;
      }
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: userId, onboarding_completed: true, updated_at: new Date().toISOString()
      });
      if (saveError) throw saveError;
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't finish setup. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-panel" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-top">
          <div className="onboarding-brand"><span><Coffee size={20}/></span><div><strong>brewbudget</strong><small>A better daily grind.</small></div></div>
          <button className="onboarding-close" onClick={skip} disabled={saving} aria-label="Skip setup"><X size={19}/></button>
        </div>
        <div className="onboarding-progress"><div style={{ width: ((step + 1) / steps.length * 100) + "%" }}/></div>
        <div className="onboarding-step-label">LET'S GET YOU SET UP <span>STEP {step + 1} OF {steps.length}</span></div>
        <h1 id="onboarding-title">{["First, your workspace.", "How does your money come in?", "Give every dollar a place.", "Let's plan for the regulars."][step]}</h1>
        <p className="onboarding-lead">{[
          "We'll shape your budget around your life. You can change everything later.",
          "A rough estimate is perfect. You can fine-tune it whenever you need.",
          "We've suggested common categories. Keep the ones you use and add budget limits if you know them.",
          "Add recurring bills, debts, or a savings goal now—or skip anything you're not ready for."
        ][step]}</p>

        {step === 0 && <div className="onboarding-fields">
          <label>How will you use BrewBudget?</label>
          <div className="onboarding-choice-grid">
            <button type="button" className={householdType === "individual" ? "selected" : ""} onClick={() => { setHouseholdType("individual"); setHouseholdName("My Budget"); }}><strong>Just me</strong><span>One personal budget</span></button>
            <button type="button" className={householdType === "couples" ? "selected" : ""} onClick={() => { setHouseholdType("couples"); setHouseholdName("Our Household"); }}><strong>Us together</strong><span>A shared household budget</span></button>
          </div>
          <label htmlFor="household-name">{householdType === "couples" ? "Give your household a name" : "Name your workspace"}</label>
          <input id="household-name" value={householdName} onChange={event => setHouseholdName(event.target.value)} placeholder="My Budget"/>
          <div className="onboarding-hint">You can invite another person to your shared budget later.</div>
        </div>}

        {step === 1 && <div className="onboarding-fields">
          <label htmlFor="income-source">Where does your income come from? <small>Optional</small></label>
          <input id="income-source" value={incomeSource} onChange={event => setIncomeSource(event.target.value)} placeholder="e.g. Work, salary, freelance"/>
          <label htmlFor="income-amount">How much do you usually receive each payday?</label>
          <div className="onboarding-money-input"><span>$</span><input id="income-amount" type="number" min="0" step="0.01" value={income} onChange={event => setIncome(event.target.value)} placeholder="0.00"/></div>
          <label htmlFor="pay-frequency">How often are you paid?</label>
          <select id="pay-frequency" value={frequency} onChange={event => setFrequency(event.target.value)}>
            <option value="weekly">Every week</option><option value="biweekly">Every two weeks</option>
            <option value="twice_monthly">Twice a month</option><option value="monthly">Once a month</option><option value="irregular">It varies</option>
          </select>
          <label htmlFor="next-payday">Next payday <small>Optional</small></label>
          <input id="next-payday" type="date" value={nextPayday} onChange={event => setNextPayday(event.target.value)}/>
          <div className="onboarding-hint">This is a planning estimate—not a transaction or money already received.</div>
        </div>}

        {step === 2 && <div className="onboarding-category-list">
          <div className="onboarding-category-head"><span>Category</span><span>Budget {budgetPeriod === "monthly" ? "per month" : "per pay period"}</span></div>
          {categories.map((category, index) => <div className={"onboarding-category-row " + (category.selected ? "active" : "")} key={category.name}>
            <label className="onboarding-category-check"><input type="checkbox" checked={category.selected} onChange={event => updateCategory(index, { selected: event.target.checked })}/><span className="onboarding-category-dot" style={{ background: category.color }}/><strong>{category.name}</strong></label>
            <div className="onboarding-budget-input"><span>$</span><input aria-label={category.name + " budget"} type="number" min="0" step="0.01" placeholder="Not set" value={category.amount} onChange={event => updateCategory(index, { amount: event.target.value })} disabled={!category.selected}/></div>
          </div>)}
          <p className="onboarding-hint">Leave a budget blank if you'd rather decide later. You can customize categories after setup.</p>
        </div>}

        {step === 3 && <div className="onboarding-fields">
          <div className="onboarding-optional-section"><div><strong>Recurring bills</strong><small>Rent, utilities, subscriptions, insurance…</small></div><button type="button" className="onboarding-add" onClick={addBill}><Plus size={15}/> Add bill</button></div>
          {bills.map((bill, index) => <div className="onboarding-bill-row" key={index}>
            <input aria-label="Bill name" placeholder="Bill name" value={bill.name} onChange={event => updateBill(index, { name: event.target.value })}/>
            <input aria-label="Bill amount" type="number" min="0" step="0.01" placeholder="$ amount" value={bill.amount} onChange={event => updateBill(index, { amount: event.target.value })}/>
            <select aria-label="Bill frequency" value={bill.frequency} onChange={event => updateBill(index, { frequency: event.target.value })}><option value="monthly">Monthly</option><option value="biweekly">Biweekly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select>
            <input aria-label="Due day of month" type="number" min="1" max="31" placeholder="Due day" value={bill.due_day} onChange={event => updateBill(index, { due_day: event.target.value })}/>
            <button type="button" onClick={() => setBills(current => current.filter((_, i) => i !== index))} aria-label="Remove bill"><Trash2 size={15}/></button>
          </div>)}
          <div className="onboarding-optional-section"><div><strong>Debt you're paying down</strong><small>Optional—add one balance to start your debt tracker</small></div></div>
          <div className="onboarding-inline-fields"><input aria-label="Debt name" placeholder="e.g. Student loan" value={debtName} onChange={event => setDebtName(event.target.value)}/><input aria-label="Debt balance" type="number" min="0" step="0.01" placeholder="Balance $" value={debtBalance} onChange={event => setDebtBalance(event.target.value)}/><input aria-label="Interest rate" type="number" min="0" step="0.01" placeholder="APR %" value={debtRate} onChange={event => setDebtRate(event.target.value)}/></div>
          <div className="onboarding-optional-section"><div><strong>A savings goal</strong><small>Optional—give something you're saving for a name</small></div></div>
          <div className="onboarding-inline-fields"><input aria-label="Savings goal name" placeholder="e.g. Emergency fund" value={goalName} onChange={event => setGoalName(event.target.value)}/><input aria-label="Savings target" type="number" min="0" step="0.01" placeholder="Target $" value={goalTarget} onChange={event => setGoalTarget(event.target.value)}/></div>
        </div>}

        {error && <div className="onboarding-error" role="alert">{error}</div>}
        <div className="onboarding-actions">
          <button type="button" className="onboarding-secondary" onClick={() => step === 0 ? skip() : setStep(current => current - 1)} disabled={saving}>{step === 0 ? "Skip for now" : <><ArrowLeft size={16}/> Back</>}</button>
          {step < steps.length - 1
            ? <button type="button" className="onboarding-primary" onClick={() => setStep(current => current + 1)}>Continue <ArrowRight size={16}/></button>
            : <button type="button" className="onboarding-primary" onClick={finish} disabled={saving}>{saving ? "Saving your setup…" : <>Build my budget <Check size={16}/></>}</button>}
        </div>
        <p className="onboarding-footnote">Nothing is locked in. You can update your setup anytime.</p>
      </section>
    </div>
  );
}
