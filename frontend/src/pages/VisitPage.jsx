import { useEffect, useMemo, useState } from "react";

import { api } from "../api";
import { MedicineSelect } from "../components/MedicineSelect";


function emptyLine() {
  return { key: crypto.randomUUID(), medicineId: "", qty: "", unitPrice: "" };
}

function phoneInput(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function ageInput(value) {
  const digits = value.replace(/\D/g, "");
  if (digits === "") return "";
  const n = Number(digits);
  if (n > 120) return "120";
  return digits;
}

function qtyInput(value) {
  return value.replace(/\D/g, "");
}

export function VisitPage() {
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [condition, setCondition] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [pay, setPay] = useState("");
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({
    phone: false,
    name: false,
    age: false,
    gender: false,
  });
  const [qtyErrors, setQtyErrors] = useState({});
  const [utterance, setUtterance] = useState("");
  const [draftMeta, setDraftMeta] = useState(null);

  function markTouched(field) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function markMissingQtys(exceptKey) {
    setQtyErrors((prev) => {
      const next = { ...prev };
      for (const l of lines) {
        if (exceptKey && l.key === exceptKey) continue;
        if (l.medicineId && !(Number(l.qty) > 0)) next[l.key] = true;
      }
      return next;
    });
  }

  function clearQtyError(key) {
    setQtyErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function loadMeds() {
    const data = await api.medicines();
    setMedicines(data.medicines);
  }

  useEffect(() => {
    loadMeds().catch((err) => setError(err.message));
  }, []);

  async function onPhoneBlur() {
    markTouched("phone");
    if (phone.length !== 10) return;
    try {
      const data = await api.patientByPhone(phone);
      if (data.patient) {
        setName(data.patient.name || "");
        setAge(data.patient.age != null ? String(data.patient.age) : "");
        setGender(data.patient.gender || "");
      }
    } catch {
      /* ignore lookup miss */
    }
  }

  const grandTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const qty = Number(line.qty);
      const price = Number(line.unitPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
      return sum + qty * price;
    }, 0);
  }, [lines]);

  const nameOk = name.trim().length > 0;
  const phoneOk = phone.length === 10;
  const ageNum = Number(age);
  const ageOk = age !== "" && Number.isFinite(ageNum) && ageNum >= 0 && ageNum <= 120;
  const genderOk = gender === "male" || gender === "female" || gender === "other";

  const phoneError = !phone
    ? "Phone is required"
    : phone.length !== 10
      ? "Enter a valid 10-digit phone number"
      : "";
  const nameError = !name.trim() ? "Name is required" : "";
  const ageError = !age
    ? "Age is required"
    : !ageOk
      ? "Age must be between 0 and 120"
      : "";
  const genderError = !genderOk ? "Gender is required" : "";

  const patientOk = nameOk && phoneOk && ageOk && genderOk;
  const hasCompleteLine = lines.some((l) => l.medicineId && Number(l.qty) > 0);
  const allSelectedHaveQty = lines.every(
    (l) => !l.medicineId || Number(l.qty) > 0
  );
  const restOk =
    hasCompleteLine &&
    allSelectedHaveQty &&
    (pay === "cash" || pay === "upi") &&
    paid;
  const canAttemptSave = restOk && !busy;

  function updateLine(key, patch) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickMedicine(key, med) {
    markMissingQtys(key);
    updateLine(key, {
      medicineId: med.id,
      unitPrice: String(med.price),
    });
  }

  function resetForm() {
    setName("");
    setPhone("");
    setAge("");
    setGender("");
    setCondition("");
    setLines([emptyLine()]);
    setPay("");
    setPaid(false);
    setTouched({ phone: false, name: false, age: false, gender: false });
    setQtyErrors({});
    setDraftMeta(null);
  }

  function applyDraft(result) {
    const d = result.draft || {};
    setName(d.name || "");
    setPhone(phoneInput(d.phone || ""));
    setAge(d.age != null ? String(d.age) : "");
    setGender(d.gender || "");
    setCondition(d.condition || "");
    setPay(d.paymentMethod === "cash" || d.paymentMethod === "upi" ? d.paymentMethod : "");
    setPaid(false);
    const nextLines = (d.lines || [])
      .filter((ln) => ln.medicineId)
      .map((ln) => ({
        key: crypto.randomUUID(),
        medicineId: ln.medicineId,
        qty: String(ln.qty ?? ""),
        unitPrice: String(ln.unitPrice ?? ""),
      }));
    setLines(nextLines.length ? nextLines : [emptyLine()]);
    setDraftMeta(result);
    setTouched({ phone: true, name: true, age: true, gender: true });
  }

  async function onDraft() {
    const text = utterance.trim();
    if (!text) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      applyDraft(await api.visitDraft(text));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    setTouched({ phone: true, name: true, age: true, gender: true });
    markMissingQtys();
    if (!patientOk || !restOk) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const payloadLines = lines
        .filter((l) => l.medicineId && Number(l.qty) > 0)
        .map((l) => ({
          medicineId: l.medicineId,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
        }));
      const data = await api.confirmVisitDraft({
        name: name.trim(),
        phone,
        age: ageNum,
        gender,
        condition,
        paymentMethod: pay,
        lines: payloadLines,
      });
      setSuccess(
        `Saved ${data.visit.patientName} · ₹${data.visit.grandTotal} · ${data.visit.paymentMethod.toUpperCase()}`
      );
      resetForm();
      await loadMeds();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={tw.page}>
      <h1 className={tw.h1}>New visit</h1>
      {success ? <p className={tw.ok}>{success}</p> : null}
      {error ? <p className={tw.err}>{error}</p> : null}

      <section className={tw.card}>
        <h2 className={tw.h2}>Draft from note</h2>
        <textarea
          className={tw.input}
          rows={3}
          value={utterance}
          onChange={(e) => setUtterance(e.target.value)}
          placeholder="Ramesh 9876543210 fever, 10 paracetamol and ORS, UPI"
        />
        <button type="button" className={`${tw.add} mt-2`} disabled={busy || !utterance.trim()} onClick={onDraft}>
          {busy ? "Drafting…" : "Build draft"}
        </button>
        {draftMeta ? (
          <div className={tw.meta}>
            <div>Path: {(draftMeta.path || []).join(" → ")}</div>
            {(draftMeta.questions || []).map((q) => (
              <div key={q}>{q}</div>
            ))}
            {(draftMeta.warnings || []).map((w) => (
              <div key={w}>{w}</div>
            ))}
            {draftMeta.canConfirm ? <div>Ready to save.</div> : <div>Fix questions before save.</div>}
          </div>
        ) : null}
      </section>

      <section className={tw.card}>
        <h2 className={tw.h2}>Patient</h2>
        <div className={tw.grid}>
          <label className={tw.label}>
            Phone *
            <input
              className={touched.phone && phoneError ? tw.inputBad : tw.input}
              value={phone}
              onChange={(e) => setPhone(phoneInput(e.target.value))}
              onBlur={onPhoneBlur}
              placeholder="10 digit number"
              inputMode="numeric"
              maxLength={10}
              required
            />
            {touched.phone && phoneError ? <span className={tw.fieldErr}>{phoneError}</span> : null}
          </label>
          <label className={tw.label}>
            Name *
            <input
              className={touched.name && nameError ? tw.inputBad : tw.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched("name")}
              placeholder="Patient name"
              required
            />
            {touched.name && nameError ? <span className={tw.fieldErr}>{nameError}</span> : null}
          </label>
          <label className={tw.label}>
            Age *
            <input
              className={touched.age && ageError ? tw.inputBad : tw.input}
              value={age}
              onChange={(e) => setAge(ageInput(e.target.value))}
              onBlur={() => markTouched("age")}
              placeholder="0–120"
              inputMode="numeric"
              maxLength={3}
              required
            />
            {touched.age && ageError ? <span className={tw.fieldErr}>{ageError}</span> : null}
          </label>
          <label className={tw.label}>
            Gender *
            <select
              className={touched.gender && genderError ? tw.inputBad : tw.input}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              onBlur={() => markTouched("gender")}
              required
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {touched.gender && genderError ? <span className={tw.fieldErr}>{genderError}</span> : null}
          </label>
          <label className={`${tw.label} ${tw.span2}`}>
            Condition
            <input
              className={tw.input}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="As written on the slip"
            />
          </label>
        </div>
      </section>

      <section className={tw.card}>
        <h2 className={tw.h2}>Medicines</h2>
        {lines.map((line) => {
          const qty = Number(line.qty);
          const price = Number(line.unitPrice);
          const lineTotal =
            Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
          const qtyMissing =
            Boolean(qtyErrors[line.key]) &&
            Boolean(line.medicineId) &&
            !(Number(line.qty) > 0);
          const excludeIds = lines
            .filter((l) => l.key !== line.key && l.medicineId)
            .map((l) => l.medicineId);
          return (
            <div key={line.key} className={tw.lineWrap}>
              <div className={tw.line}>
                <MedicineSelect
                  medicines={medicines}
                  value={line.medicineId}
                  excludeIds={excludeIds}
                  onChange={(med) => pickMedicine(line.key, med)}
                  onOpen={() => markMissingQtys(line.key)}
                  placeholder="Select medicine"
                />
                <input
                  className={qtyMissing ? tw.inputBad : tw.qty}
                  placeholder="Qty"
                  value={line.qty}
                  onChange={(e) => {
                    const nextQty = qtyInput(e.target.value);
                    updateLine(line.key, { qty: nextQty });
                    if (Number(nextQty) > 0) clearQtyError(line.key);
                  }}
                  onBlur={() => {
                    if (line.medicineId && !(Number(line.qty) > 0)) {
                      setQtyErrors((prev) => ({ ...prev, [line.key]: true }));
                    }
                  }}
                  inputMode="numeric"
                  required={Boolean(line.medicineId)}
                />
                <input
                  className={tw.qty}
                  placeholder="Price"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                  readOnly
                  inputMode="decimal"
                />
                <div className={tw.lineTotal}>₹{lineTotal.toFixed(2)}</div>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    className={tw.remove}
                    onClick={() => {
                      clearQtyError(line.key);
                      setLines((prev) => prev.filter((l) => l.key !== line.key));
                    }}
                  >
                    Remove
                  </button>
                ) : (
                  <span />
                )}
              </div>
              {qtyMissing ? (
                <div className={tw.qtyErrRow}>
                  <span className={tw.qtyErr}>Qty required</span>
                </div>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          className={tw.add}
          onClick={() => {
            markMissingQtys();
            setLines((prev) => [...prev, emptyLine()]);
          }}
        >
          + Add medicine
        </button>
        <div className={tw.grand}>Total ₹{grandTotal.toFixed(2)}</div>
      </section>

      <section className={tw.card}>
        <h2 className={tw.h2}>Payment</h2>
        <div className={tw.payRow}>
          <button
            type="button"
            className={pay === "cash" ? tw.payOn : tw.pay}
            onClick={() => {
              setPay("cash");
              setPaid(false);
            }}
          >
            Cash
          </button>
          <button
            type="button"
            className={pay === "upi" ? tw.payOn : tw.pay}
            onClick={() => {
              setPay("upi");
              setPaid(false);
            }}
          >
            UPI
          </button>
          <button
            type="button"
            className={paid ? tw.paidOn : tw.paid}
            disabled={!pay}
            onClick={() => setPaid(true)}
          >
            Paid
          </button>
        </div>
        <button type="button" className={tw.save} disabled={!canAttemptSave} onClick={onSave}>
          {busy ? "Saving…" : "Save"}
        </button>
      </section>
    </div>
  );
}

// const tw = {
//   page: "flex flex-col gap-5",
//   h1: "font-display text-2xl sm:text-3xl font-extrabold text-ink m-0",
//   h2: "font-display text-lg font-bold text-clinic-800 m-0 mb-4 pb-2 border-b-2 border-clinic-100",
//   ok: "m-0 text-base font-semibold text-clinic-800 bg-clinic-50 border-2 border-clinic-200 rounded-xl px-4 py-3",
//   err: "m-0 text-base font-semibold text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3",
//   card: "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 shadow-sm",
//   grid: "grid grid-cols-1 sm:grid-cols-2 gap-4",
//   span2: "sm:col-span-2",
//   label: "text-base font-bold text-ink flex flex-col gap-1.5",
//   input:
//     "rounded-xl border-2 border-clinic-200 px-3.5 py-3 text-lg text-ink outline-none bg-clinic-50/30 focus:border-clinic-600 focus:bg-white focus:ring-4 focus:ring-clinic-100",
//   inputBad:
//     "rounded-xl border-2 border-red-500 px-3.5 py-3 text-lg text-ink outline-none bg-red-50 focus:border-red-600 focus:ring-4 focus:ring-red-100",
//   fieldErr: "text-sm font-semibold text-red-600",
//   line: "grid grid-cols-1 sm:grid-cols-[1fr_5.5rem_6.5rem_5.5rem_auto] gap-2.5 items-center mb-4 p-3 rounded-xl bg-clinic-50/60 border border-clinic-100",
//   qty: "rounded-xl border-2 border-clinic-200 px-3 py-3 text-lg outline-none bg-white focus:border-clinic-600 focus:ring-4 focus:ring-clinic-100",
//   lineTotal: "text-base font-bold text-ink tabular-nums text-right sm:text-left",
//   remove: "text-base font-bold text-red-600 py-2 px-2 text-left sm:text-center",
//   add: "text-base font-bold text-clinic-700 py-2.5 px-1 w-fit hover:text-clinic-800",
//   grand: "mt-4 pt-3 border-t-2 border-clinic-100 text-right text-2xl font-extrabold text-ink tabular-nums",
//   payRow: "flex flex-wrap gap-2.5 mb-5",
//   pay: "flex-1 min-w-[6.5rem] px-5 py-3.5 rounded-xl border-2 border-clinic-200 bg-white text-base font-bold text-ink hover:bg-clinic-50",
//   payOn: "flex-1 min-w-[6.5rem] px-5 py-3.5 rounded-xl border-2 border-clinic-700 bg-clinic-700 text-white text-base font-bold shadow-sm",
//   paid: "flex-1 min-w-[6.5rem] px-5 py-3.5 rounded-xl border-2 border-amber-400 bg-white text-base font-bold text-amber-900 disabled:opacity-40",
//   paidOn: "flex-1 min-w-[6.5rem] px-5 py-3.5 rounded-xl border-2 border-amber-500 bg-amber-400 text-base font-bold text-amber-950 shadow-sm",
//   save: "w-full py-4 rounded-2xl bg-clinic-800 text-white text-xl font-extrabold shadow-sm hover:bg-clinic-900 disabled:opacity-40 min-h-14",
// };



const tw = {
  page: "flex flex-col gap-4",
  h1: "text-2xl font-semibold m-0",
  h2: "text-base font-semibold m-0 mb-3",
  ok: "m-0 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2",
  err: "m-0 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2",
  card: "bg-white border border-slate-200 rounded-xl p-4",
  grid: "grid grid-cols-1 sm:grid-cols-2 gap-3",
  span2: "sm:col-span-2",
  label: "text-sm font-medium text-slate-700 flex flex-col gap-1",
  input: "rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-600",
  inputBad: "rounded-lg border border-red-500 px-3 py-2 text-base outline-none focus:border-red-600",
  fieldErr: "text-xs font-medium text-red-600",
  lineWrap: "mb-3",
  line: "grid grid-cols-1 sm:grid-cols-[1fr_5rem_6rem_5rem_auto] gap-2 items-center",
  qty: "rounded-lg border border-slate-300 px-3 py-2 text-base outline-none",
  qtyErrRow: "mt-1 grid grid-cols-1 sm:grid-cols-[1fr_5rem_6rem_5rem_auto] gap-2",
  qtyErr: "text-xs font-medium text-red-600 sm:col-start-2",
  lineTotal: "text-sm font-medium text-slate-700",
  remove: "text-sm text-red-600",
  add: "text-sm text-emerald-800 font-medium",
  grand: "mt-3 text-right text-xl font-semibold",
  payRow: "flex flex-wrap gap-2 mb-4",
  pay: "px-6 py-3 rounded-lg border-2 border-slate-300 bg-white font-semibold",
  payOn: "px-6 py-3 rounded-lg border-2 border-emerald-700 bg-emerald-700 text-white font-semibold",
  paid: "px-6 py-3 rounded-lg border-2 border-amber-400 bg-white font-semibold disabled:opacity-40",
  paidOn: "px-6 py-3 rounded-lg border-2 border-amber-500 bg-amber-400 font-semibold",
  save: "w-full py-4 rounded-xl bg-emerald-800 text-white text-xl font-bold disabled:opacity-40",
  meta: "mt-3 text-sm text-slate-600 flex flex-col gap-1",
};
