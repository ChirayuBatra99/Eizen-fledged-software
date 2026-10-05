import { useEffect, useState } from "react";
import { api } from "../api";

function todayIst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

const istTime = {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", istTime);
}

export function DayReportPage() {
  const [date, setDate] = useState(todayIst());
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(d = date) {
    setError("");
    setBusy(true);
    try {
      setReport(await api.dailyReport(d));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(date);
  }, [date]);

  const dayVisits = report?.visits || [];

  return (
    <div className={tw.page}>
      <header className={tw.pageHead}>
        <div className={tw.titleRow}>
          <div>
            <h1 className={tw.h1}>Day report</h1>
            <p className={tw.sub}>
              Cash, UPI, stock, and every patient visit for the selected day — newest first.
            </p>
          </div>
          <button
            type="button"
            className={tw.refresh}
            onClick={() => load(date)}
            disabled={busy}
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className={tw.searchCard}>
        <label className={tw.label}>
          Date
          <input
            className={tw.dateInput}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      {error ? <p className={tw.err}>{error}</p> : null}

      {report ? (
        <>
          <div className={tw.grid}>
            <Stat label="Patients / visits" value={report.visitCount} />
            <Stat label="Cash payments" value={report.cashCount} />
            <Stat label="Cash collected" value={`₹${report.cashTotal.toFixed(2)}`} />
            <Stat label="UPI payments" value={report.upiCount} />
            <Stat label="UPI collected" value={`₹${report.upiTotal.toFixed(2)}`} />
            <Stat label="Total collected" value={`₹${report.grandTotal.toFixed(2)}`} />
            <Stat label="Units sold" value={report.unitsSold} />
            <Stat label="Units added" value={report.unitsAdded} />
          </div>

          <div className={tw.stockRow}>
            <section className={tw.card}>
              <h2 className={tw.h2}>Stock added</h2>
              <MedList rows={report.stockAdded} empty="Nothing added" />
            </section>
            <section className={tw.card}>
              <h2 className={tw.h2}>Stock sold</h2>
              <MedList rows={report.stockSold} empty="Nothing sold" />
            </section>
          </div>

          <section className={tw.day}>
            <h2 className={tw.dayTitle}>Visits this day</h2>
            {dayVisits.length === 0 ? (
              <p className={tw.empty}>No visits on this date.</p>
            ) : (
              <div className={tw.stack}>
                {dayVisits.map((v) => (
                  <article key={v.id} className={tw.visitCard}>
                    <div className={tw.head}>
                      <div className={tw.who}>
                        <span className={tw.name}>{v.patient_name}</span>
                        <span className={tw.meta}>
                          {v.patient_phone}
                          {v.patient_age != null ? ` · ${v.patient_age} yrs` : ""}
                          {v.patient_gender ? ` · ${v.patient_gender}` : ""}
                        </span>
                      </div>
                      <time className={tw.time} dateTime={v.paid_at}>
                        {formatTime(v.paid_at)}
                      </time>
                    </div>
                    <div className={tw.badges}>
                      <span className={v.payment_method === "upi" ? tw.payUpi : tw.payCash}>
                        {String(v.payment_method || "").toUpperCase()}
                      </span>
                      <span className={tw.amt}>₹{Number(v.grand_total).toFixed(2)}</span>
                    </div>
                    {v.condition ? <p className={tw.cond}>{v.condition}</p> : null}
                    <ul className={tw.visitList}>
                      {(v.lines || []).map((line) => (
                        <li key={line.id} className={tw.line}>
                          <span>{line.name}</span>
                          <span className={tw.lineMeta}>
                            × {line.qty} @ ₹{Number(line.unitPrice).toFixed(2)}
                          </span>
                          <span className={tw.lineAmt}>₹{Number(line.lineTotal).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={tw.stat}>
      <div className={tw.statLabel}>{label}</div>
      <div className={tw.statVal}>{value}</div>
    </div>
  );
}

function MedList({ rows, empty }) {
  if (!rows.length) return <p className={tw.medEmpty}>{empty}</p>;
  return (
    <ul className={tw.medList}>
      {rows.map((r) => (
        <li key={r.name}>
          {r.name}: {r.qty}
        </li>
      ))}
    </ul>
  );
}

const tw = {
  page: "flex flex-col gap-5 max-w-full",
  pageHead: "flex flex-col gap-1",
  titleRow: "flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap",
  h1: "font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 tracking-tight",
  sub: "m-0 mt-1.5 text-base text-ink-soft max-w-xl",
  refresh:
    "shrink-0 rounded-xl border-2 border-clinic-200 bg-white text-ink font-bold px-4 py-2.5 min-h-12 text-base hover:bg-clinic-50 disabled:opacity-40",
  searchCard: "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 shadow-sm",
  label: "text-base font-bold text-ink flex flex-col gap-2 min-w-0 max-w-xs",
  dateInput:
    "w-full rounded-xl border-2 border-clinic-200 px-3.5 py-3 text-lg text-ink outline-none bg-clinic-50/30 focus:border-clinic-600 focus:bg-white focus:ring-4 focus:ring-clinic-100",
  err: "m-0 text-base font-semibold text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3",
  grid: "grid grid-cols-2 md:grid-cols-4 gap-3",
  stat: "bg-white border-2 border-clinic-200 rounded-2xl p-4 shadow-sm",
  statLabel: "text-sm font-bold text-ink-soft leading-snug",
  statVal: "text-xl sm:text-2xl font-extrabold mt-1.5 tabular-nums text-ink",
  stockRow: "grid grid-cols-1 sm:grid-cols-2 gap-3.5",
  card: "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 shadow-sm",
  h2: "font-display text-lg font-bold m-0 mb-3 text-clinic-800 pb-2 border-b-2 border-clinic-100",
  medEmpty: "m-0 text-base text-ink-soft font-medium",
  medList: "m-0 pl-5 text-base text-ink space-y-1.5",
  day: "flex flex-col gap-3",
  dayTitle:
    "m-0 text-base font-extrabold text-clinic-800 tracking-wide font-display",
  empty:
    "m-0 text-base text-ink-soft text-center py-12 bg-white border-2 border-clinic-200 rounded-2xl font-medium",
  stack: "flex flex-col gap-3.5",
  visitCard: "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 shadow-sm",
  head: "flex items-start justify-between gap-3 mb-3",
  who: "flex flex-col gap-1 min-w-0",
  name: "font-bold text-ink text-lg leading-snug break-words",
  meta: "text-base text-ink-soft",
  time: "shrink-0 text-sm sm:text-base font-bold text-clinic-800 tabular-nums bg-clinic-100 rounded-xl px-3 py-1.5",
  badges: "flex items-center gap-2 mb-3 flex-wrap",
  payCash:
    "text-sm font-bold tracking-wide text-amber-900 bg-amber-100 border border-amber-300 rounded-full px-3 py-1",
  payUpi:
    "text-sm font-bold tracking-wide text-sky-900 bg-sky-100 border border-sky-300 rounded-full px-3 py-1",
  amt: "ml-auto text-lg font-extrabold text-ink tabular-nums",
  cond: "m-0 mb-3 text-base text-ink bg-clinic-50 border border-clinic-100 rounded-xl px-3.5 py-2.5",
  visitList: "m-0 p-0 list-none flex flex-col gap-2",
  line: "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base text-ink border-b border-clinic-100 last:border-0 pb-2 last:pb-0",
  lineMeta: "text-ink-soft",
  lineAmt: "ml-auto font-bold tabular-nums text-ink",
};
