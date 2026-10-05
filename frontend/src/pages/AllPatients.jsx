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

function genderLabel(value) {
  if (!value) return "";
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}


export function AllPatients() {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingOne, setLoadingOne] = useState(false);

  async function loadAll() {
    setError("");
    setBusy(true);
    try {
      const data = await api.allPatients();
      setPatients(data.patients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function openPatient(patient) {
    setError("");
    setLoadingOne(true);
    try {
      const found = await api.patientByPhone(patient.phone);
      if (!found.patient) {
        setSelected(null);
        setVisits([]);
        setError("No patient with that phone");
        return;
      }
      const data = await api.patientVisits(found.patient.id);
      setSelected(data.patient || found.patient);
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
    } catch (err) {
      setSelected(null);
      setVisits([]);
      setError(err.message);
    } finally {
      setLoadingOne(false);
    }
  }

  function backToList() {
    setSelected(null);
    setVisits([]);
    setError("");
  }

  const groups = useMemo(() => groupByDate(visits), [visits]);

  return (
    <div className={tw.page}>
      <header className={tw.pageHead}>
        <div className={tw.titleRow}>
          <div>
            <h1 className={tw.h1}>All patients</h1>
            <p className={tw.sub}>
              {selected
                ? "Every saved slip for this patient, newest first."
                : "Newest updates first. Tap a name to open their visit report."}
            </p>
          </div>
          {selected ? (
            <button type="button" className={tw.ghost} onClick={backToList}>
              Back to list
            </button>
          ) : (
            <button
              type="button"
              className={tw.refresh}
              onClick={loadAll}
              disabled={busy}
            >
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
      </header>

      {error ? <p className={tw.err}>{error}</p> : null}

      {selected ? (
        <>
          <div className={tw.stats}>
            <span className={tw.pill}>
              {visits.length} visit{visits.length === 1 ? "" : "s"}
            </span>
            <span className={tw.pillOn}>Filtered by phone</span>
          </div>

          {!error && !loadingOne && visits.length === 0 ? (
            <p className={tw.empty}>No visits yet for this patient.</p>
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
                          {v.patient_gender ? ` · ${genderLabel(v.patient_gender)}` : ""}
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
                    <ul className={tw.lines}>
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
        </>
      ) : (
        <>
          {!error && !busy && patients.length === 0 ? (
            <p className={tw.empty}>No patients yet.</p>
          ) : null}

          {patients.length > 0 ? (
            <div className={tw.stats}>
              <span className={tw.pill}>
                {patients.length} patient{patients.length === 1 ? "" : "s"}
              </span>
              {loadingOne ? <span className={tw.pillOn}>Looking up…</span> : null}
            </div>
          ) : null}

          <ul className={tw.list}>
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={tw.row}
                  onClick={() => openPatient(p)}
                  disabled={loadingOne}
                >
                  <span className={tw.rowName}>{p.name}</span>
                  <span className={tw.rowMeta}>
                    {p.phone}
                    {p.age != null ? ` · ${p.age} yrs` : ""}
                    {p.gender ? ` · ${genderLabel(p.gender)}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const tw = {
  page: "flex flex-col gap-5 max-w-full",
  pageHead: "flex flex-col gap-1",
  titleRow: "flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap",
  h1: "font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 tracking-tight",
  sub: "m-0 mt-1.5 text-base text-ink-soft max-w-xl",
  refresh: "shrink-0 rounded-xl border-2 border-clinic-200 bg-white text-ink font-bold px-4 py-2.5 min-h-12 text-base hover:bg-clinic-50 disabled:opacity-40",
  err: "m-0 text-base font-semibold text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3",
  empty: "m-0 text-base text-ink-soft text-center py-12 bg-white border-2 border-clinic-200 rounded-2xl font-medium",
  stats: "flex flex-wrap gap-2",
  pill: "text-sm font-bold text-ink-soft bg-white border-2 border-clinic-200 rounded-full px-3.5 py-1.5",
  pillOn: "text-sm font-bold text-clinic-800 bg-clinic-100 border-2 border-clinic-300 rounded-full px-3.5 py-1.5",
  list: "m-0 p-0 list-none flex flex-col gap-2.5",
  row: "w-full text-left bg-white border-2 border-clinic-200 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col gap-1 hover:border-clinic-600 hover:bg-clinic-50 disabled:opacity-40",
  rowName: "font-bold text-ink text-lg leading-snug break-words",
  rowMeta: "text-base text-ink-soft",
  ghost: "rounded-xl border-2 border-clinic-200 bg-white text-ink font-bold px-4 py-2.5 min-h-12 text-base hover:bg-clinic-50",
  day: "flex flex-col gap-3",
  dayTitle: "m-0 text-base font-extrabold text-clinic-800 tracking-wide font-display",
  stack: "flex flex-col gap-3.5",
  card: "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 shadow-sm",
  head: "flex items-start justify-between gap-3 mb-3",
  who: "flex flex-col gap-1 min-w-0",
  name: "font-bold text-ink text-lg leading-snug break-words",
  meta: "text-base text-ink-soft",
  time: "shrink-0 text-sm sm:text-base font-bold text-clinic-800 tabular-nums bg-clinic-100 rounded-xl px-3 py-1.5",
  badges: "flex items-center gap-2 mb-3 flex-wrap",
  payCash: "text-sm font-bold tracking-wide text-amber-900 bg-amber-100 border border-amber-300 rounded-full px-3 py-1",
  payUpi: "text-sm font-bold tracking-wide text-sky-900 bg-sky-100 border border-sky-300 rounded-full px-3 py-1",
  amt: "ml-auto text-lg font-extrabold text-ink tabular-nums",
  cond: "m-0 mb-3 text-base text-ink bg-clinic-50 border border-clinic-100 rounded-xl px-3.5 py-2.5",
  lines: "m-0 p-0 list-none flex flex-col gap-2",
  line: "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base text-ink border-b border-clinic-100 last:border-0 pb-2 last:pb-0",
  lineMeta: "text-ink-soft",
  lineAmt: "ml-auto font-bold tabular-nums text-ink",
};
