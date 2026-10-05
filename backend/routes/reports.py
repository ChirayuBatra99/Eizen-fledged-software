import re

from fastapi import APIRouter, Depends, Query, Request

from db import query
from lib import ist_day, ist_day_range
from middleware import require_auth

router = APIRouter(
    prefix="/reports", tags=["reports"], dependencies=[Depends(require_auth)]
)


@router.get("/daily")
def daily_report(request: Request, date: str | None = Query(default=None)):
    date_str = date if date and re.fullmatch(r"\d{4}-\d{2}-\d{2}", date) else ist_day()
    rng = ist_day_range(date_str)
    start, end = rng["start"], rng["end"]
    clinic_id = request.state.user["clinicId"]

    visits = query(
        """
        SELECT v.id, v.condition, v.payment_method, v.grand_total, v.paid_at,
               p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone,
               p.age AS patient_age, p.gender AS patient_gender,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', vl.id,
                     'name', vl.name_snapshot,
                     'unitPrice', vl.unit_price,
                     'qty', vl.qty,
                     'lineTotal', vl.line_total
                   ) ORDER BY vl.name_snapshot
                 ) FILTER (WHERE vl.id IS NOT NULL),
                 '[]'::json
               ) AS lines
        FROM visits v
        JOIN patients p ON p.id = v.patient_id
        LEFT JOIN visit_lines vl ON vl.visit_id = v.id
        WHERE v.clinic_id = %s AND v.paid_at >= %s AND v.paid_at < %s
        GROUP BY v.id, p.id
        ORDER BY v.paid_at DESC
        """,
        [clinic_id, start, end],
    )

    cash_count = 0
    cash_total = 0.0
    upi_count = 0
    upi_total = 0.0
    for row in visits:
        amt = float(row["grand_total"])
        if row["payment_method"] == "cash":
            cash_count += 1
            cash_total += amt
        else:
            upi_count += 1
            upi_total += amt

    movements = query(
        """
        SELECT sm.kind, sm.qty_delta, m.name
        FROM stock_movements sm
        JOIN medicines m ON m.id = sm.medicine_id
        WHERE sm.clinic_id = %s AND sm.created_at >= %s AND sm.created_at < %s
        """,
        [clinic_id, start, end],
    )

    sold_map: dict[str, int] = {}
    added_map: dict[str, int] = {}
    units_sold = 0
    units_added = 0
    for row in movements:
        if row["kind"] == "sale":
            sold = -int(row["qty_delta"])
            units_sold += sold
            sold_map[row["name"]] = sold_map.get(row["name"], 0) + sold
        elif row["kind"] == "restock":
            qty = int(row["qty_delta"])
            units_added += qty
            added_map[row["name"]] = added_map.get(row["name"], 0) + qty

    def to_list(m: dict[str, int]):
        return sorted(
            [{"name": name, "qty": qty} for name, qty in m.items() if qty > 0],
            key=lambda x: x["name"],
        )

    return {
        "date": date_str,
        "visitCount": len(visits),
        "cashCount": cash_count,
        "cashTotal": round(cash_total * 100) / 100,
        "upiCount": upi_count,
        "upiTotal": round(upi_total * 100) / 100,
        "grandTotal": round((cash_total + upi_total) * 100) / 100,
        "unitsSold": max(0, units_sold),
        "unitsAdded": units_added,
        "stockSold": to_list(sold_map),
        "stockAdded": to_list(added_map),
        "visits": visits,
    }
