import { useEffect, useState } from "react";
import { api } from "../api";
import { MedicineSelect } from "../components/MedicineSelect";

export function StockPage() {
  const [medicines, setMedicines] = useState([]);
  const [medicineId, setMedicineId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("unit");
  const [newStock, setNewStock] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    const data = await api.medicines();
    setMedicines(data.medicines);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function addStock(e) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.restock(medicineId, Number(qty), note);
      setQty("");
      setNote("");
      setOk("Stock added");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createMed(e) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.createMedicine({
        name: newName,
        unit: newUnit,
        price: Number(newPrice),
        stockQty: newStock === "" ? 0 : Number(newStock),
      });
      setNewName("");
      setNewPrice("");
      setNewStock("");
      setOk("Medicine added");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={tw.page}>
      <header className={tw.pageHead}>
        <h1 className={tw.h1}>Stock</h1>
        <p className={tw.sub}>Add incoming stock or a new medicine to the catalogue.</p>
      </header>
      {ok ? <p className={tw.ok}>{ok}</p> : null}
      {error ? <p className={tw.err}>{error}</p> : null}

      <div className={tw.stockRow}>
        <section className={tw.formCard}>
          <h2 className={tw.h2}>Add incoming stock</h2>
          <form className={tw.form} onSubmit={addStock}>
            <label className={tw.label}>
              Medicine
              <MedicineSelect
                medicines={medicines}
                value={medicineId}
                onChange={(m) => setMedicineId(m.id)}
                placeholder="Select medicine"
              />
            </label>
            <label className={tw.label}>
              Quantity added
              <input
                className={tw.input}
                placeholder="e.g. 10"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className={tw.label}>
              Note
              <input
                className={tw.input}
                placeholder="Optional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button className={tw.btn} type="submit" disabled={!medicineId || !qty}>
              Save stock
            </button>
          </form>
        </section>

        <section className={tw.formCard}>
          <h2 className={tw.h2}>New medicine in catalogue</h2>
          <form className={tw.form} onSubmit={createMed}>
            <label className={tw.label}>
              Name
              <input
                className={tw.input}
                placeholder="Medicine name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <div className={tw.fieldGrid}>
              <label className={tw.label}>
                Unit
                <input
                  className={tw.input}
                  placeholder="bottle, jar…"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                />
              </label>
              <label className={tw.label}>
                Selling price
                <input
                  className={tw.input}
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <label className={tw.label}>
              Opening stock
              <input
                className={tw.input}
                placeholder="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <button className={tw.btn} type="submit" disabled={!newName || newPrice === ""}>
              Add medicine
            </button>
          </form>
        </section>
      </div>

      <section className={tw.card}>
        <div className={tw.listHead}>
          <h2 className={tw.h2List}>Current stock</h2>
          <span className={tw.count}>{medicines.length} items</span>
        </div>

        {medicines.length === 0 ? (
          <p className={tw.empty}>No medicines yet. Add one to the catalogue above.</p>
        ) : (
          <>
            <ul className={tw.cards}>
              {medicines.map((m) => (
                <li key={m.id} className={tw.item}>
                  <div className={tw.itemTop}>
                    <span className={tw.itemName}>{m.name}</span>
                    <span className={m.stockQty <= 0 ? tw.stockOut : tw.stockOk}>
                      {m.stockQty} {m.unit}
                    </span>
                  </div>
                  <div className={tw.itemMeta}>₹{Number(m.price).toFixed(2)}</div>
                </li>
              ))}
            </ul>

            <div className={tw.tableWrap}>
              <table className={tw.table}>
                <thead>
                  <tr>
                    <th className={tw.th}>Medicine</th>
                    <th className={tw.thRight}>Price</th>
                    <th className={tw.thRight}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((m) => (
                    <tr key={m.id} className={tw.tr}>
                      <td className={tw.td}>{m.name}</td>
                      <td className={tw.tdRight}>₹{Number(m.price).toFixed(2)}</td>
                      <td className={tw.tdRight}>
                        <span className={m.stockQty <= 0 ? tw.stockOut : undefined}>
                          {m.stockQty} {m.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const tw = {
  page: "flex flex-col gap-5 max-w-full",
  pageHead: "flex flex-col gap-1",
  h1: "font-display text-2xl sm:text-3xl font-extrabold text-ink m-0 tracking-tight",
  sub: "m-0 mt-1.5 text-base text-ink-soft",
  h2: "font-display text-lg font-bold m-0 mb-4 text-clinic-800 pb-2 border-b-2 border-clinic-100",
  h2List: "font-display text-lg font-bold m-0 text-clinic-800",
  ok: "m-0 text-base font-semibold text-clinic-800 bg-clinic-50 border-2 border-clinic-200 rounded-xl px-4 py-3",
  err: "m-0 text-base font-semibold text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3",
  stockRow: "grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch",
  formCard:
    "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 min-w-0 shadow-sm flex flex-col h-full",
  card: "bg-white border-2 border-clinic-200 rounded-2xl p-4 sm:p-5 min-w-0 shadow-sm",
  form: "flex flex-col gap-3.5 w-full flex-1",
  fieldGrid: "grid grid-cols-2 gap-3",
  label: "text-base font-bold text-ink flex flex-col gap-1.5 min-w-0",
  input:
    "w-full rounded-xl border-2 border-clinic-200 px-3.5 py-3 text-lg text-ink outline-none bg-clinic-50/30 focus:border-clinic-600 focus:bg-white focus:ring-4 focus:ring-clinic-100",
  btn: "mt-auto w-full rounded-xl bg-clinic-700 text-white font-bold py-3.5 min-h-12 text-base disabled:opacity-40 hover:bg-clinic-800",
  listHead: "flex items-center justify-between gap-3 mb-4",
  count: "text-sm font-bold text-ink-soft bg-clinic-100 rounded-full px-3 py-1.5 shrink-0",
  empty: "m-0 text-base text-ink-soft text-center py-8 font-medium",
  cards: "md:hidden m-0 p-0 list-none flex flex-col gap-2.5",
  item: "rounded-xl border-2 border-clinic-100 bg-clinic-50 px-3.5 py-3.5",
  itemTop: "flex items-start justify-between gap-3",
  itemName: "font-bold text-ink text-base leading-snug break-words",
  itemMeta: "mt-1.5 text-base font-semibold text-ink-soft tabular-nums",
  stockOk: "shrink-0 text-base font-extrabold text-clinic-800 tabular-nums",
  stockOut: "shrink-0 text-base font-extrabold text-amber-700 tabular-nums",
  tableWrap: "hidden md:block overflow-x-auto -mx-1",
  table: "w-full text-base border-collapse",
  th: "text-left border-b-2 border-clinic-200 py-3 px-2 font-bold text-ink-soft",
  thRight: "text-right border-b-2 border-clinic-200 py-3 px-2 font-bold text-ink-soft",
  tr: "hover:bg-clinic-50",
  td: "border-b border-clinic-100 py-3.5 px-2 align-middle font-medium",
  tdRight:
    "border-b border-clinic-100 py-3.5 px-2 text-right tabular-nums align-middle whitespace-nowrap font-semibold",
};
