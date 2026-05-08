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
  const [saving, setSaving] = useState(false);
  const [showManualPayment, setShowManualPayment] = useState(null);
  const [manualPaymentForm, setManualPaymentForm] = useState({ amount: "", date: "", notes: "" });
  const [loanForm, setLoanForm] = useState({ lender_name: "", loan_amount: "", interest_rate: "", payment_due_day: "1", notes: "" });

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
    return due;
  };

  // Get the last payment date (or null)
  const getLastPaymentDate = (loanId) => {
    const loanPayments = payments[loanId] || [];
    if (!loanPayments.length) return null;
    // Sort by payment_date descending and take most recent
    const sorted = [...loanPayments].sort((a, b) => b.payment_date.localeCompare(a.payment_date));
    return sorted[0].payment_date;
  };

  // Calculate interest from startDate to endDate for a draw
  const calcInterestBetween = (amount, rate, startDateStr, endDateStr) => {
    if (!amount || !rate || !startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr + "T00:00:00"); start.setHours(0,0,0,0);
    const end = new Date(endDateStr + "T00:00:00"); end.setHours(0,0,0,0);
    const days = Math.max(0, Math.round((end - start) / 86400000));
    return (parseFloat(amount) * (parseFloat(rate) / 100) / 365) * days;
  };

  // Calculate what's due on next payment date
  const calcPaymentDue = (loan) => {
    const loanDraws = draws[loan.id] || [];
    const lastPaymentDate = getLastPaymentDate(loan.id);
    const nextDueDate = getNextDueDate(loan);
    const nextDueDateStr = nextDueDate.toISOString().split("T")[0];
    
    let total = 0;
    let breakdown = [];

    for (const draw of loanDraws) {
      if (!draw.amount || !draw.draw_date) continue;
      
      // Start from whichever is LATER: draw date or last payment date
      let startDate = draw.draw_date;
      if (lastPaymentDate && lastPaymentDate > draw.draw_date) {
        startDate = lastPaymentDate;
      }
      
      // Only calculate if draw started before next due date
      if (startDate >= nextDueDateStr) continue;
      
      const interest = calcInterestBetween(draw.amount, loan.interest_rate, startDate, nextDueDateStr);
      const days = Math.round((new Date(nextDueDateStr) - new Date(startDate + "T00:00:00")) / 86400000);
      
      if (interest > 0) {
        breakdown.push({
          drawName: draw.draw_name || `Draw ${draw.draw_number}`,
          amount: parseFloat(draw.amount),
          startDate,
          days,
          interest
        });
        total += interest;
      }
    }

    return { total, breakdown, nextDueDateStr, daysUntilDue: Math.round((nextDueDate - new Date().setHours(0,0,0,0)) / 86400000) };
  };

  const markAsPaid = async (loan) => {
    const { total, nextDueDateStr } = calcPaymentDue(loan);
    if (!window.confirm(`Mark $${total.toFixed(2)} as paid on ${nextDueDateStr}?`)) return;
    await supabase.from("loan_payments").insert({
      loan_id: loan.id,
      lot_id: lotId,
      payment_amount: parseFloat(total.toFixed(2)),
      payment_date: nextDueDateStr,
      notes: "Auto-calculated payment"
    });
    loadLoans();
  };

  const deletePayment = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    await supabase.from("loan_payments").delete().eq("id", id);
    loadLoans();
  };

  const saveManualPayment = async (loanId) => {
    if (!manualPaymentForm.amount || !manualPaymentForm.date) return;
    await supabase.from("loan_payments").insert({
      loan_id: loanId,
      lot_id: lotId,
      payment_amount: parseFloat(manualPaymentForm.amount),
      payment_date: manualPaymentForm.date,
      notes: manualPaymentForm.notes || "Manual entry"
    });
    setManualPaymentForm({ amount: "", date: "", notes: "" });
    setShowManualPayment(null);
    loadLoans();
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
    if (data) {
      setExpandedLoan(data.id);
      setDraws(p => ({ ...p, [data.id]: [] }));
    }
    setLoanForm({ lender_name: "", loan_amount: "", interest_rate: "", payment_due_day: "1", notes: "" });
    setShowLoanForm(false);
    loadLoans();
    setSaving(false);
  };

  const saveEdit = async (loanId) => {
    await supabase.from("interest_loans").update({
      lender_name: editForm.lender_name,
      loan_amount: parseFloat(editForm.loan_amount),
      interest_rate: parseFloat(editForm.interest_rate),
      payment_due_day: parseInt(editForm.payment_due_day),
      notes: editForm.notes
    }).eq("id", loanId);
    setEditingLoan(null);
    loadLoans();
  };

  const deleteLoan = async (id) => {
    if (!window.confirm("Delete this loan and all its draws?")) return;
    await supabase.from("interest_loans").delete().eq("id", id);
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

  const getDraw = (loanId, drawNumber) => (draws[loanId] || []).find(d => d.draw_number === drawNumber) || {};

  const totalDrawn = (loanId) => (draws[loanId] || []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const dailyBurn = (loan) => (draws[loan.id] || []).filter(d => d.amount && d.draw_date).reduce((s, d) => s + calcDailyInterest(parseFloat(d.amount), loan.interest_rate), 0);

  // Summary totals across all loans
  const allPaymentsDue = loans.reduce((s, l) => s + calcPaymentDue(l).total, 0);
  const allDailyBurn = loans.reduce((s, l) => s + dailyBurn(l), 0);
  const allDrawn = loans.reduce((s, l) => s + totalDrawn(l.id), 0);

  const fmtDate = (d) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div>
      {loans.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", fontFamily: "'DM Serif Display', serif" }}>{formatCurrency(allDrawn)}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Total Drawn</div>
          </div>
          <div style={{ ...cardStyle, borderColor: "#fde68a", background: "#fffbeb" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#d97706", fontFamily: "'DM Serif Display', serif" }}>{formatCurrency(allPaymentsDue)}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Next Payment Due</div>
          </div>
          <div style={{ ...cardStyle, borderColor: "#fecaca", background: "#fef2f2" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444", fontFamily: "'DM Serif Display', serif" }}>{formatCurrency(allDailyBurn)}/day</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Daily Burn Rate</div>
          </div>
        </div>
      )}

      {loans.map(loan => {
        const isExpanded = expandedLoan === loan.id;
        const { total, breakdown, nextDueDateStr, daysUntilDue } = calcPaymentDue(loan);
        const lastPmt = getLastPaymentDate(loan.id);
        const urgent = daysUntilDue <= 7;
        const loanPayments = payments[loan.id] || [];

        return (
          <div key={loan.id} style={{ ...cardStyle, marginBottom: 14, borderColor: urgent ? "#fecaca" : "#e2e8f0" }}>
            {/* Loan header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} style={{ cursor: "pointer", flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{loan.lender_name || "Unnamed Loan"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{loan.interest_rate}% interest · Payment due day {loan.payment_due_day}</div>
                {lastPmt && <div style={{ fontSize: 11, color: G2, marginTop: 2 }}>Last paid: {fmtDate(lastPmt)} · Interest calculating from this date</div>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} style={{ ...btnOutline, padding: "5px 12px", fontSize: 12 }}>{isExpanded ? "Collapse" : "Manage Draws"}</button>
                <button onClick={() => deleteLoan(loan.id)} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer" }}><Icons.Trash /></button>
              </div>
            </div>

            {/* Payment due card - the key feature */}
            <div style={{ background: urgent ? "#fef2f2" : "#f0fdf4", border: `2px solid ${urgent ? "#fecaca" : G}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Payment Due {fmtDate(nextDueDateStr)}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: urgent ? "#ef4444" : G2, fontFamily: "'DM Serif Display', serif" }}>{formatCurrency(total)}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{formatCurrency(dailyBurn(loan))}/day · {daysUntilDue} days until due</div>
                </div>
                <button onClick={() => markAsPaid(loan)} style={{ ...btnGreen, padding: "10px 18px", fontSize: 13 }}>✓ Mark as Paid</button>
              </div>

              {/* Breakdown */}
              {breakdown.length > 0 && (
                <div style={{ borderTop: `1px solid ${urgent ? "#fecaca" : "#bbf7d0"}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Calculation Breakdown</div>
                  {breakdown.map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 4 }}>
                      <span>{b.drawName}: {formatCurrency(b.amount)} × {loan.interest_rate}% / 365 × {b.days} days</span>
                      <span style={{ fontWeight: 700, color: "#1e293b" }}>{formatCurrency(b.interest)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: G2, borderTop: `1px solid ${urgent ? "#fecaca" : "#bbf7d0"}`, paddingTop: 6, marginTop: 4 }}>
                    <span>Total Due</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: isExpanded ? 16 : 0 }}>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 600 }}>Commitment</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{formatCurrency(loan.loan_amount)}</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 600 }}>Total Drawn</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#475569" }}>{formatCurrency(totalDrawn(loan.id))}</div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, textTransform: "uppercase", fontWeight: 600 }}>Daily Burn</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}>{formatCurrency(dailyBurn(loan))}/day</div>
              </div>
            </div>

            {/* Draw schedule */}
            {isExpanded && (
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Draw Schedule</div>
                <div style={{ background: "#f8fafc", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 130px 120px 130px", gap: 0 }}>
                    {["Draw", "Name / Note", "Amount", "Draw Date", "Interest This Cycle"].map(h => (
                      <div key={h} style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", padding: "8px 10px", borderBottom: "1px solid #e2e8f0", background: "#f1f5f9" }}>{h}</div>
                    ))}
                  </div>
                  {[1,2,3,4,5,6,7].map(num => {
                    const draw = getDraw(loan.id, num);
                    const lastPmtDate = getLastPaymentDate(loan.id);
                    const startDate = (lastPmtDate && draw.draw_date && lastPmtDate > draw.draw_date) ? lastPmtDate : draw.draw_date;
                    const nextDue = nextDueDateStr;
                    const interest = draw.amount && draw.draw_date ? calcInterestBetween(draw.amount, loan.interest_rate, startDate, nextDue) : 0;
                    const days = startDate && nextDue ? Math.max(0, Math.round((new Date(nextDue) - new Date(startDate + "T00:00:00")) / 86400000)) : null;
                    const hasData = draw.amount || draw.draw_date;

                    return (
                      <div key={num} style={{ display: "grid", gridTemplateColumns: "80px 1fr 130px 120px 130px", gap: 0, borderBottom: num < 7 ? "1px solid #f1f5f9" : "none", background: hasData ? "#fff" : "transparent" }}>
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
                              {days !== null && <div style={{ fontSize: 10, color: "#94a3b8" }}>{days} days</div>}
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: "#cbd5e1" }}>—</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 130px 120px 130px", background: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
                    <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Total</div>
                    <div />
                    <div style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{formatCurrency(totalDrawn(loan.id))}</div>
                    <div />
                    <div style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: "#d97706" }}>{formatCurrency(total)}</div>
                  </div>
                </div>

                {/* Edit loan form */}
                {editingLoan === loan.id ? (
                  <div style={{ marginBottom: 12, padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 10 }}>Edit Loan Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Lender</div><input value={editForm.lender_name || ""} onChange={e => setEditForm(p => ({ ...p, lender_name: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Commitment</div><input type="number" value={editForm.loan_amount || ""} onChange={e => setEditForm(p => ({ ...p, loan_amount: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Rate %</div><input type="number" step="0.01" value={editForm.interest_rate || ""} onChange={e => setEditForm(p => ({ ...p, interest_rate: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                      <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 600, marginBottom: 3 }}>Due Day</div><input type="number" value={editForm.payment_due_day || ""} onChange={e => setEditForm(p => ({ ...p, payment_due_day: e.target.value }))} style={{ ...fieldStyle, fontSize: 13, padding: "6px 10px" }} /></div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveEdit(loan.id)} style={{ ...btnGreen, padding: "7px 16px", fontSize: 13 }}>Save</button>
                      <button onClick={() => setEditingLoan(null)} style={{ ...btnOutline, padding: "7px 16px", fontSize: 13 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <button onClick={() => { setEditingLoan(loan.id); setEditForm({ lender_name: loan.lender_name, loan_amount: loan.loan_amount, interest_rate: loan.interest_rate, payment_due_day: loan.payment_due_day, notes: loan.notes || "" }); }} style={{ ...btnOutline, padding: "6px 14px", fontSize: 12 }}>Edit Loan Details</button>
                    <button onClick={() => setShowManualPayment(loan.id)} style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, color: "#92400e", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Log Payment / Override</button>
                  </div>
                )}

                {/* Payment history */}
                {loanPayments.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Payment History</div>
                    {loanPayments.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: G3, border: `1px solid #bbf7d0`, borderRadius: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: G2 }}>{formatCurrency(p.payment_amount)} paid</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{fmtDate(p.payment_date)}{p.notes && p.notes !== "Auto-calculated payment" ? ` · ${p.notes}` : ""}</div>
                        </div>
                        <button onClick={() => deletePayment(p.id)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}><Icons.Trash /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Log past payment */}

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
            <div><label style={labelStyle}>Payment Due Day of Month</label><input type="number" min="1" max="28" value={loanForm.payment_due_day} onChange={e => setLoanForm(p => ({ ...p, payment_due_day: e.target.value }))} placeholder="10" style={{ ...fieldStyle, fontSize: 13, padding: "8px 12px" }} /></div>
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
