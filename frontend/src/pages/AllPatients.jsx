import { useEffect, useState } from "react";
import { api } from "../api";

function genderLabel(value) {
  if (!value) return "";
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

export function AllPatients() {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
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
      const data = await api.patientByPhone(patient.phone);
      if (!data.patient) {
        setSelected(null);
        setError("No patient with that phone");
        return;
      }
      setSelected(data.patient);
    } catch (err) {
      setSelected(null);
      setError(err.message);
    } finally {
      setLoadingOne(false);
    }
  }

  return (
    <div className={tw.page}>
      <header className={tw.pageHead}>
        <div className={tw.titleRow}>
          <div>
            <h1 className={tw.h1}>All patients</h1>
            <p className={tw.sub}>
              Newest updates first. Tap a name to look them up by phone.
            </p>
          </div>
          <button
            type="button"
            className={tw.refresh}
            onClick={() => {
              setSelected(null);
              loadAll();
            }}
            disabled={busy}
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className={tw.err}>{error}</p> : null}

      {selected ? (
        <section className={tw.detail}>
          <div className={tw.detailHead}>
            <h2 className={tw.detailTitle}>Patient</h2>
            <button
              type="button"
              className={tw.ghost}
              onClick={() => {
                setSelected(null);
                setError("");
              }}
            >
              Back to list
            </button>
          </div>
          <p className={tw.name}>{selected.name}</p>
          <p className={tw.meta}>
            {selected.phone}
            {selected.age != null ? ` · ${selected.age} yrs` : ""}
            {selected.gender ? ` · ${genderLabel(selected.gender)}` : ""}
          </p>
        </section>
      ) : null}

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
        {patients.map((p) => {
          const on = selected?.id === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                className={on ? tw.rowOn : tw.row}
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
          );
        })}
      </ul>
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
  err: "m-0 text-base font-semibold text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3",
  empty:
    "m-0 text-base text-ink-soft text-center py-12 bg-white border-2 border-clinic-200 rounded-2xl font-medium",
  stats: "flex flex-wrap gap-2",
  pill: "text-sm font-bold text-ink-soft bg-white border-2 border-clinic-200 rounded-full px-3.5 py-1.5",
  pillOn:
    "text-sm font-bold text-clinic-800 bg-clinic-100 border-2 border-clinic-300 rounded-full px-3.5 py-1.5",
  list: "m-0 p-0 list-none flex flex-col gap-2.5",
  row: "w-full text-left bg-white border-2 border-clinic-200 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col gap-1 hover:border-clinic-600 hover:bg-clinic-50 disabled:opacity-40",
  rowOn:
    "w-full text-left bg-clinic-50 border-2 border-clinic-700 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col gap-1 disabled:opacity-40",
  rowName: "font-bold text-ink text-lg leading-snug break-words",
  rowMeta: "text-base text-ink-soft",
  detail: "bg-white border-2 border-clinic-700 rounded-2xl p-4 sm:p-5 shadow-sm",
  detailHead: "flex items-center justify-between gap-3 mb-3 flex-wrap",
  detailTitle: "m-0 text-base font-extrabold text-clinic-800 tracking-wide font-display",
  ghost:
    "rounded-xl border-2 border-clinic-200 bg-white text-ink font-bold px-4 py-2 min-h-11 text-base hover:bg-clinic-50",
  name: "m-0 font-bold text-ink text-xl leading-snug break-words",
  meta: "m-0 mt-1 text-base text-ink-soft",
};
