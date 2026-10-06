from decimal import Decimal
from uuid import UUID

from db import query
from lib import is_valid_phone, normalize_phone


def _json(value):
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    return value


def _patient(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "phone": row["phone"],
        "age": row["age"],
        "gender": row["gender"],
    }


def find_patients(clinic_id: str, phone: str | None, name: str | None) -> list[dict]:
    phone_n = normalize_phone(phone) if phone else ""
    if is_valid_phone(phone_n):
        rows = query(
            """
            SELECT id, name, phone, age, gender
            FROM patients
            WHERE clinic_id = %s AND phone = %s
            """,
            [clinic_id, phone_n],
        )
        return [_patient(r) for r in rows]
    q = (name or "").strip()
    if not q:
        return []
    rows = query(
        """
        SELECT id, name, phone, age, gender
        FROM patients
        WHERE clinic_id = %s AND name ILIKE %s
        ORDER BY name
        LIMIT 8
        """,
        [clinic_id, f"%{q}%"],
    )
    return [_patient(r) for r in rows]


def visit_history(clinic_id: str, patient_id: str, limit: int = 5) -> list[dict]:
    rows = query(
        """
        SELECT v.id, v.condition, v.payment_method, v.grand_total, v.paid_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'name', vl.name_snapshot,
                     'qty', vl.qty,
                     'lineTotal', vl.line_total
                   ) ORDER BY vl.name_snapshot
                 ) FILTER (WHERE vl.id IS NOT NULL),
                 '[]'::json
               ) AS lines
        FROM visits v
        LEFT JOIN visit_lines vl ON vl.visit_id = v.id
        WHERE v.clinic_id = %s AND v.patient_id = %s
        GROUP BY v.id
        ORDER BY v.paid_at DESC
        LIMIT %s
        """,
        [clinic_id, patient_id, limit],
    )
    out = []
    for r in rows:
        out.append(
            {
                "id": str(r["id"]),
                "condition": r["condition"],
                "paymentMethod": r["payment_method"],
                "grandTotal": _json(r["grand_total"]),
                "paidAt": r["paid_at"].isoformat() if r["paid_at"] else None,
                "lines": r["lines"] or [],
            }
        )
    return out


def list_medicines(clinic_id: str) -> list[dict]:
    rows = query(
        """
        SELECT id, name, unit, price, stock_qty
        FROM medicines
        WHERE clinic_id = %s AND is_active = TRUE
        ORDER BY name
        """,
        [clinic_id],
    )
    return [
        {
            "id": str(r["id"]),
            "name": r["name"],
            "unit": r["unit"],
            "price": float(r["price"]),
            "stockQty": r["stock_qty"],
        }
        for r in rows
    ]
