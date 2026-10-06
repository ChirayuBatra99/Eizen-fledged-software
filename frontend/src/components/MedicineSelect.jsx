import { useEffect, useMemo, useRef, useState } from "react";

export function MedicineSelect({ medicines, value, onChange, placeholder, onOpen, excludeIds }) {

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  
  const wrapRef = useRef(null);
  const selected = medicines.find((m) => m.id === value);

  const filtered = useMemo(() => {
    const excluded = new Set(excludeIds || []);
    const available = medicines.filter((m) => m.id === value || !excluded.has(m.id));
    const s = q.trim().toLowerCase();
    if (!s) return available;
    return available.filter((m) => m.name.toLowerCase().includes(s));
  }, [medicines, q, value, excludeIds]);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={tw.wrap} ref={wrapRef}>
      <button
        type="button"
        className={tw.trigger}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) onOpen?.();
            return next;
          });
          setQ("");
        }}
      >
        {selected ? (
          <span className={tw.triggerText}>
            <span className={tw.triggerName}>{selected.name}</span>
            <span className={tw.triggerStock}>{selected.stockQty} in stock</span>
          </span>
        ) : (
          <span className={tw.placeholder}>{placeholder || "Select medicine"}</span>
        )}
      </button>
      {open ? (
        <div className={tw.panel}>
          <input
            className={tw.search}
            autoFocus
            placeholder="Type to search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className={tw.list}>
            {filtered.length === 0 ? (
              <div className={tw.empty}>No medicines found</div>
            ) : (
              filtered.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={m.id === value ? tw.itemOn : tw.item}
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                >
                  <span className={tw.itemName}>{m.name}</span>
                  <span className={tw.meta}>
                    ₹{m.price} · {m.stockQty} {m.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const tw = {
  wrap: "relative w-full",
  trigger: "w-full text-left rounded-xl border-2 border-clinic-200 px-3.5 py-3 bg-white min-h-12 hover:border-clinic-300 focus:outline-none focus:border-clinic-600 focus:ring-4 focus:ring-clinic-100",
  triggerText: "flex flex-col gap-0.5",
  triggerName: "text-base font-semibold text-ink leading-snug",
  triggerStock: "text-sm font-medium text-clinic-700",
  placeholder: "text-base font-medium text-ink-soft",
  panel: "absolute z-30 mt-1.5 w-full bg-white border-2 border-clinic-200 rounded-xl shadow-lg overflow-hidden",
  search: "w-full border-b-2 border-clinic-100 px-3.5 py-3 text-base outline-none bg-clinic-50/50 focus:bg-white",
  list: "max-h-60 overflow-y-auto",
  empty: "px-3.5 py-4 text-base text-ink-soft text-center",
  item: "w-full text-left px-3.5 py-3 hover:bg-clinic-50 flex flex-col gap-0.5 border-b border-clinic-100 last:border-0",
  itemOn: "w-full text-left px-3.5 py-3 bg-clinic-100 flex flex-col gap-0.5 border-b border-clinic-200 last:border-0",
  itemName: "text-base font-semibold text-ink",
  meta: "text-sm font-medium text-ink-soft",
};
