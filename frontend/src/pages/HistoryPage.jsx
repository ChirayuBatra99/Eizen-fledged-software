import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const istDate = {
  timeZone: "Asia/Kolkata",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

const istTime = {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", istDate);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", istTime);
}

function groupByDate(visits) {
  const groups = [];
  const map = new Map();
  for (const visit of visits) {
    const key = formatDate(visit.paid_at);
    if (!map.has(key)) {
      const group = { date: key, visits: [] };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).visits.push(visit);
  }
  return groups;
}

export function HistoryPage() {
  const [phone, setPhone] = useState("");
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  async function loadAll() {
    setError("");
    setBusy(true);
    try {
      const data = await api.visits();
      setVisits(data.visits || []);
      setFilterActive(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function search(e) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      await loadAll();
      return;
    }
    setError("");
    setBusy(true);
    try {
      const found = await api.patientByPhone(phone);
      if (!found.patient) {
        setVisits([]);
        setFilterActive(true);
        setError("No patient with that phone");
        return;
      }
      const data = await api.patientVisits(found.patient.id);
      setVisits(
        (data.visits || []).map((v) => ({
          ...v,
          patient_id: data.patient.id,
          patient_name: data.patient.name,
          patient_phone: data.patient.phone,
          patient_age: data.patient.age,
          patient_gender: data.patient.gender,
        }))
      );
      setFilterActive(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (filterActive && phone.trim()) {
      await search({ preventDefault() {} });
      return;
    }
    await loadAll();
  }

  const groups = useMemo(() => groupByDate(visits), [visits]);
  const uniquePatients = useMemo(
    () => new Set(visits.map((v) => v.patient_id)).size,
    [visits]
  );

  return (
    <div className={tw.page}>
      <header className={tw.pageHead}>
        <div className={tw.titleRow}>
          <div>
            <h1 className={tw.h1}>Visit history</h1>
            <p className={tw.sub}>
              Every saved slip, newest first. Search a phone to focus on one patient.
            </p>
          </div>
          <button
            type="button"
            className={tw.refresh}
            onClick={refresh}
            disabled={busy}
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <form className={tw.searchCard} onSubmit={search}>
        <label className={tw.label}>
          Phone
          <div className={tw.row}>
            <input
              className={tw.input}
              placeholder="10-digit phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
            />
            <button className={tw.btn} type="submit" disabled={busy}>
              {busy ? "Searching…" : "Search"}
            </button>
            {filterActive ? (
              <button
                className={tw.ghost}
                type="button"
                disabled={busy}
                onClick={() => {
                  setPhone("");
                  loadAll();
                }}
              >
                Show all
              </button>
            ) : null}
          </div>
        </label>
      </form>

      {error ? <p className={tw.err}>{error}</p> : null}

      {!error && !busy && visits.length === 0 ? (
        <p className={tw.empty}>No visits yet. They will appear here after reception saves a slip.</p>
      ) : null}

      {visits.length > 0 ? (
        <div className={tw.stats}>
          <span className={tw.pill}>
            {visits.length} visit{visits.length === 1 ? "" : "s"}
          </span>
          <span className={tw.pill}>
            {uniquePatients} patient{uniquePatients === 1 ? "" : "s"}
          </span>
          {filterActive ? <span className={tw.pillOn}>Filtered by phone</span> : null}
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.date} className={tw.day}>
          <h2 className={tw.dayTitle}>{group.date}</h2>
          <div className={tw.stack}>
            {group.visits.map((v) => (
              <article key={v.id} className={tw.card}>
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
                <ul className={tw.list}>
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
        </section>
      ))}
    </div>
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
  label: "text-base font-bold text-ink flex flex-col gap-2 min-w-0",
  row: "flex flex-col sm:flex-row gap-2.5",
  input:
    "w-full sm:flex-1 rounded-xl border-2 border-clinic-200 px-3.5 py-3 text-lg text-ink outline-none bg-clinic-50/30 focus:border-clinic-600 focus:bg-white focus:ring-4 focus:ring-clinic-100",
  btn: "rounded-xl bg-clinic-700 text-white font-bold px-5 py-3 min-h-12 text-base disabled:opacity-40 hover:bg-clinic-800",
  ghost:
    "rounded-xl border-2 border-clinic-200 bg-white text-ink font-bold px-4 py-3 min-h-12 text-base disabled:opacity-40 hover:bg-clinic-50",
  err: "m-0 text-base font-semibold text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3",
  empty:
    "m-0 text-base text-ink-soft text-center py-12 bg-white border-2 border-clinic-200 rounded-2xl font-medium",
  stats: "flex flex-wrap gap-2",
  pill: "text-sm font-bold text-ink-soft bg-white border-2 border-clinic-200 rounded-full px-3.5 py-1.5",
  pillOn: "text-sm font-bold text-clinic-800 bg-clinic-100 border-2 border-clinic-300 rounded-full px-3.5 py-1.5",
  day: "flex flex-col gap-3",
  dayTitle:
    "m-0 text-base font-extrabold text-clinic-800 tracking-wide font-display",
  stack: "flex flex-col gap-3.5",
  card: "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 shadow-sm",
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
  list: "m-0 p-0 list-none flex flex-col gap-2",
  line: "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base text-ink border-b border-clinic-100 last:border-0 pb-2 last:pb-0",
  lineMeta: "text-ink-soft",
  lineAmt: "ml-auto font-bold tabular-nums text-ink",
};
