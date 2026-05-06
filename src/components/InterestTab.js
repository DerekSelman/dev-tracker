import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { formatCurrency, calcDailyInterest, daysDiff, labelStyle, fieldStyle, cardStyle, btnGreen, btnOutline, G, G2, G3, Icons } from "../utils";

export default function InterestTab({ lotId }) {
  const [loans, setLoans] = useState([]);
  const [draws, setDraws] = useState({});
  const [payments, setPayments] = useState({});
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showPaymentForm, setShowPaymentForm] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ payment_amount: "", payment_date: "", notes: "" });
  const [loanForm, setLoanForm] = useState({ lender_name: "", loan_amount: "", interest_rate: "", payment_due_day: "1", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLoans(); }, [lotId]);

  const loadLoans = async () => {
    const { data: loansData } = await supabase.from("interest_loans").select("*").eq("lot_id", lotId).order("created_at");
    if (loansData) {
      setLoans(loansData);
      for (const loan of loansData) {
        const { data: drawData } = await supabase.from("loan_draws").select("*").eq("loan_id", loan.id).order("draw_number");
        if (drawData) setDraws(p => ({ ...p, [loan.id]: drawData }));
        const { data: payData } = await supabase.from("loan_payments").select("*").eq("loan_id", loan.id).order("payment_date", { ascending: false });
        if (payData) setPayments(p => ({ ...p, [loan.id]: payData }));
      }
    }
  };

  // Get the next payment due date
  const getNextDueDate = (loan) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(today.getFullYear(), today.getMonth(), loan.payment_due_day);
    if (due <= today) due.setMonth(due.getMonth() + 1);
    due.setHours(0,0,0,0);
    return due;
  };

  // Get the last payment date for a loan
  const getLastPaymentDate = (loanId) => {
    const loanPayments = payments[loanId] || [];
    if (loanPayments.length === 0) return null;
    // Most recent payment
    const sorted = [...loanPayments].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
    return new Date(sorted[0].payment_date + "T00:00:00");
  };

  // Calculate interest for a draw from start date to next due date
  const calcDrawInterest = (draw, loan) => {
    if (!draw.amount || !draw.draw_date) return 0;
    const amount = parseFloat(draw.amount);
    const rate = loan.interest_rate;
    if (!amount || !rate) return 0;

    const drawDate = new Date(draw.draw_date + "T00:00:00");
    const lastPayment = getLastPaymentDate(loan.id);
    const nextDue = getNextDueDate(loan);

    // Start date = whichever is later: draw date or last payment date
    let startDate = drawDate;
    if (lastPayment && lastPayment > drawDate) {
      startDate = lastPayment;
    }

    // Only calculate if draw date is before next due date
    if (drawDate >= nextDue) return 0;

    // Days from start to next due date
    const days = Math.round((nextDue - startDate) / 86400000);
    if (days <= 0) return 0;

    return amount * (rate / 100) / 365 * days;
  };

  // Days until next payment
  const getDaysUntilDue = (loan) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const nextDue = getNextDueDate(loan);
    return Math.round((nextDue - today) / 86400000);
  };

  const getDraw = (loanId, drawNumber) => (draws[loanId] || []).find(d => d.draw_number === drawNumber) || {};

  const getLoanTotals = (loan) => {
    const loanDraws = draws[loan.id] || [];
    const totalDrawn = loanDraws.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    const totalInterest = loanDraws.reduce((s, d) => s + calcDrawInterest(d, loan), 0);
    const dailyBurn = loanDraws.reduce((s, d) => s + calcDailyInterest(parseFloat(d.amount) || 0, loan.interest_rate), 0);
    return { totalDrawn, totalInterest, dailyBurn };
  };

  const saveLoan = async () => {
    setSaving(true);
    const { data } = await supabase.from("interest_loans").insert({
      lot_id: lotId,
      lender_name: loanForm.lender_name,
      loan_amount: parseFloat(loanForm.loan_amount) || 0,
      interest_rate: parseFloat(loanForm.interest_rate) || 0,
      payment_due_day: parseInt(loanForm.payment_due_day) || 1,
      notes: loanForm.notes,
    }).select().single();
    if (data) { setExpandedLoan(data.id); setDraws(p => ({ ...p, [data.id]: [] })); }
    setLoanForm({ lender_name: "", loan_amount: "", interest_rate: "", payment_due_day: "1", notes: "" });
    setShowLoanForm(false);
    loadLoans();
    setSaving(false);
  };

  const deleteLoan = async (id) => {
    if (!window.confirm("Delete this loan and all its draws?")) return;
    await supabase.from("interest_loans").delete().eq("id", id);
    loadLoans();
  };

  const startEdit = (loan) => {
    setEditingLoan(loan.id);
    setEditForm({ lender_name: loan.lender_name, loan_amount: loan.loan_amount, interest_rate: loan.interest_rate, payment_due_day: loan.payment_due_day, notes: loan.notes || "" });
  };

  const saveEdit = async (loanId) => {
    await supabase.from("interest_loans").update({ lender_name: editForm.lender_name, loan_amount: parseFloat(editForm.loan_amount), interest_rate: parseFloat(editForm.interest_rate), payment_due_day: parseInt(editForm.payment_due_day), notes: editForm.notes }).eq("id", loanId);
    setEditingLoan(null);
    loadLoans();
  };

  const savePayment = async (loanId) => {
    if (!paymentForm.payment_amount || !paymentForm.payment_date) return;
    await supabase.from("loan_payments").insert({ loan_id: loanId, lot_id: lotId, payment_amount: parseFloat(paymentForm.payment_amount), payment_date: paymentForm.payment_date, notes: paymentForm.notes });
    setPaymentForm({ payment_amount: "", payment_date: "", notes: "" });
    setShowPaymentForm(null);
    loadLoans();
  };

  const deletePayment = async (id) => {
    await supabase.from("loan_payments").delete().eq("id", id);
    loadLoans();
  };

  const updateDraw = async (loanId, drawNumber, field, value) => {
    const loanDraws = draws[loanId] || [];
    const existing = loanDraws.find(d => d.draw_number === drawNumber);
    if (existing) {
      await supabase.from("loan_draws").update({ [field]: value || null }).eq("id", existing.id);
    } else {
      await supabase.from("loan_draws").insert({ loan_id: loanId, draw_number: drawNumber, draw_name: `Draw ${drawNumber}`, [field]: value || null });
    }
    const { data } = await supabase.from("loan_draws").select("*").eq("loan_id", loanId).order("draw_number");
    if (data) setDraws(p => ({ ...p, [loanId]: data }));
  };

  const allTotalInterest = loans.reduce((s, l) => s + getLoanTotals(l).totalInterest, 0);
  const allDailyBurn = loans.reduce((s, l) => s + getLoanTotals(l).dailyBurn, 0);
  const allDrawn = loans.reduce((s, l) => s + getLoanTotals(l).totalDrawn, 0);

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      {loans.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total Drawn", value: formatCurrency(allDrawn), color: "#1e293b" },
            { label: "Next Payment Due", value: formatCurrency(allTotalInterest), color: "#d97706" },
            { label: "Daily Burn Rate", value: formatCurrency(allDailyBurn), color: "#ef4444" },
          ].map(s => (
            <div key={s.label} style={cardStyle}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loans.map(loan => {
        const { totalDrawn, totalInterest, dailyBurn } = getLoanTotals(loan);
        const daysLeft = getDaysUntilDue(loan);
        const urgent = daysLeft <= 7;
        const isExpanded = expandedLoan === loan.id;
        const nextDue = getNextDueDate(loan);
        const lastPayment = getLastPaymentDate(loan.id);
        const loanPayments = payments[loan.id] || [];

        return (
          <div key={loan.id} style={{ ...cardStyle, marginBottom: 14, borderColor: urgent ? "#fecaca" : "#e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} style={{ cursor: "pointer", flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{loan.lender_name || "Unnamed Loan"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{loan.interest_rate}% interest · Payment due day {loan.payment_due_day}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} style={{ ...btnOutline, padding: "5px 12px", fontSize: 12 }}>{isExpanded ? "Collapse" : "Manage Draws"}</button>
                <button onClick={() => deleteLoan(loan.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
              </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: isExpanded ? 16 : 0 }}>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 600 }}>Commitment</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{formatCurrency(loan.loan_amount)}</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 600 }}>Total Drawn</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#475569" }}>{formatCurrency(totalDrawn)}</div>
              </div>
              <div style={{ background: "#fffbeb", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 600 }}>Payment Due {nextDue.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#d97706" }}>{formatCurrency(totalInterest)}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{formatCurrency(dailyBurn)}/day</div>
              </div>
              <div style={{ background: urgent ? "#fef2f2" : G3, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 600 }}>Days Until Due</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: urgent ? "#ef4444" : G2 }}>{daysLeft === 0 ? "TODAY" : `${daysLeft}d`}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Day {loan.payment_due_day} of month</div>
              </div>
            </div>

            {/* Last payment info */}
            {lastPayment && (
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: isExpanded ? 8 : 0, padding: "4px 0" }}>
                Last payment: {fmtDate(lastPayment)} · Interest calculating from this date forward
              </div>
            )}

            {isExpanded && (
              <div>
                {/* Draw schedule */}
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Draw Schedule</div>
                <div style={{ background: "#f8fafc", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 120px 100px 120px", gap: 0 }}>
                    {["Draw", "Name / Note", "Amount", "Draw Date", "Interest This Cycle"].map(h => (
                      <div key={h} style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", padding: "8px 10px", borderBottom: "1px solid #e2e8f0", background: "#f1f5f9" }}>{h}</div>
                    ))}
                  </div>
                  {[1,2,3,4,5,6,7].map(num => {
                    const draw = getDraw(loan.id, num);
                    const interest = calcDrawInterest(draw, loan);
                    const drawDate = draw.draw_date ? new Date(draw.draw_date + "T00:00:00") : null;
                    const lastPay = getLastPaymentDate(loan.id);
                    const startDate = drawDate && lastPay && lastPay > drawDate ? lastPay : drawDate;
                    const nextDueDate = getNextDueDate(loan);
                    const days = startDate ? Math.round((nextDueDate - startDate) / 86400000) : null;
                    const hasData = draw.amount || draw.draw_date;
                    return (
                      <div key={num} style={{ display: "grid", gridTemplateColumns: "90px 1fr 120px 100px 120px", gap: 0, borderBottom: num < 7 ? "1px solid #f1f5f9" : "none", background: hasData ? "#fff" : "transparent" }}>
                        <div style={{ padding: "8px 10px", fontSize: 12, color: "#475569", fontWeight: 600, display: "flex", alignItems: "center" }}>Draw {num}</div>
                        <div style={{ padding: "4px 6px", display: "flex", alignItems: "center" }}>
                          <input defaultValue={draw.draw_name || `Draw ${num}`} onBlur={e => updateDraw(loan.id, num, "draw_name", e.target.value)} style={{ width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: "#1e293b", background: "transparent", outline: "none", fontFamily: "'DM Sans', sans-serif" }} onFocus={e => e.target.style.borderColor = G} />
                        </div>
                        <div style={{ padding: "4px 6px", display: "flex", alignItems: "center" }}>
                          <div style={{ position: "relative", width: "100%" }}>
                            <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 12 }}>$</span>
                            <input type="number" defaultValue={draw.amount || ""} onBlur={e => updateDraw(loan.id, num, "amount", e.target.value)} placeholder="0" style={{ width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "4px 6px 4px 16px", fontSize: 12, color: "#1e293b", background: "transparent", outline: "none", fontFamily: "'DM Sans', sans-serif" }} onFocus={e => e.target.style.borderColor = G} />
                          </div>
                        </div>
                        <div style={{ padding: "4px 6px", display: "flex", alignItems: "center" }}>
                          <input type="date" defaultValue={draw.draw_date || ""} onBlur={e => updateDraw(loan.id, num, "draw_date", e.target.value)} style={{ width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "4px 4px", fontSize: 11, color: "#475569", background: "transparent", outline: "none", fontFamily: "'DM Sans', sans-serif" }} onFocus={e => e.target.style.borderColor = G} />
                        </div>
                        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          {hasData && interest > 0 ? (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#d97706" }}>{formatCurrency(interest)}</div>
                              {days !== null && days > 0 && <div style={{ fontSize: 10, color: "#94a3b8" }}>{days} days</div>}
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: "#cbd5e1" }}>—</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Totals row */}
                  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 120px 100px 120px", background: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
                    <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Total</div>
                    <div />
                    <div style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{formatCurrency(totalDrawn)}</div>
                    <div />
                    <div style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: "#d97706" }}>{formatCurrency(totalInterest)}</div>
                  </div>
                </div>

                {/* Edit form */}
                {editingLoan === loan.id && (
                  <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 10 }}>Edit Loan Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Lender</div><input value={editForm.lender_name || ""} onChange={e => setEditForm(p => ({ ...p, lender_name: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Commitment</div><input type="number" value={editForm.loan_amount || ""} onChange={e => setEditForm(p => ({ ...p, loan_amount: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Rate %</div><input type="number" step="0.01" value={editForm.interest_rate || ""} onChange={e => setEditForm(p => ({ ...p, interest_rate: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Due Day</div><input type="number" value={editForm.payment_due_day || ""} onChange={e => setEditForm(p => ({ ...p, payment_due_day: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                    </div>
                    <input value={editForm.notes || ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px", marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveEdit(loan.id)} style={{ ...btnGreen, padding: "6px 14px", fontSize: 12 }}>Save</button>
                      <button onClick={() => setEditingLoan(null)} style={{ ...btnOutline, padding: "6px 14px", fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Payment history */}
                {loanPayments.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Payment History</div>
                    {loanPayments.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: G2 }}>{formatCurrency(p.payment_amount)}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{fmtDate(p.payment_date)}{p.notes ? ` · ${p.notes}` : ""}</div>
                        </div>
                        <button onClick={() => deletePayment(p.id)} style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer" }}><Icons.Trash /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Log payment form */}
                {showPaymentForm === loan.id ? (
                  <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 10 }}>Log Payment</div>
                    <div style={{ marginBottom: 6, fontSize: 11, color: "#64748b" }}>
                      Suggested amount: <strong style={{ color: "#d97706" }}>{formatCurrency(totalInterest)}</strong>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Amount Paid</div>
                        <div style={{ position: "relative" }}><span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>$</span><input type="number" value={paymentForm.payment_amount} onChange={e => setPaymentForm(p => ({ ...p, payment_amount: e.target.value }))} placeholder={totalInterest.toFixed(2)} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px 6px 20px" }} /></div>
                      </div>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Payment Date</div><input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                    </div>
                    <input value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px", marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => savePayment(loan.id)} style={{ ...btnGreen, padding: "6px 14px", fontSize: 12 }}>Log Payment</button>
                      <button onClick={() => setShowPaymentForm(null)} style={{ ...btnOutline, padding: "6px 14px", fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setShowPaymentForm(loan.id); setEditingLoan(null); }} style={{ ...btnGreen, padding: "6px 14px", fontSize: 12 }}>+ Log Payment</button>
                    <button onClick={() => { startEdit(loan); setShowPaymentForm(null); }} style={{ ...btnOutline, padding: "6px 14px", fontSize: 12 }}>Edit Loan</button>
                  </div>
                )}

                {loan.notes && <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{loan.notes}</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Add loan form */}
      {showLoanForm && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 14 }}>Add Construction Loan</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Lender Name</label><input value={loanForm.lender_name} onChange={e => setLoanForm(p => ({ ...p, lender_name: e.target.value }))} placeholder="Bank or lender name" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Total Loan Commitment</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>$</span>
                <input type="number" value={loanForm.loan_amount} onChange={e => setLoanForm(p => ({ ...p, loan_amount: e.target.value }))} placeholder="565000" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px 8px 24px" }} />
              </div>
            </div>
            <div><label style={labelStyle}>Interest Rate %</label><input type="number" step="0.01" value={loanForm.interest_rate} onChange={e => setLoanForm(p => ({ ...p, interest_rate: e.target.value }))} placeholder="10" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
            <div><label style={labelStyle}>Payment Due Day of Month</label><input type="number" min="1" max="28" value={loanForm.payment_due_day} onChange={e => setLoanForm(p => ({ ...p, payment_due_day: e.target.value }))} placeholder="1" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
          </div>
          <input value={loanForm.notes} onChange={e => setLoanForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveLoan} disabled={saving} style={btnGreen}>{saving ? "Saving..." : "Save Loan"}</button>
            <button onClick={() => setShowLoanForm(false)} style={btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      {!showLoanForm && (
        <button onClick={() => setShowLoanForm(true)} style={btnOutline}><Icons.Plus /> Add Loan</button>
      )}
    </div>
  );
}
