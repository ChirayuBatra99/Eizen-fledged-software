from fastapi import APIRouter, Depends, HTTPException, Query, Request

from db import query
from lib import is_valid_phone, normalize_phone
from middleware import require_auth

router = APIRouter(
    prefix="/patients", tags=["patients"], dependencies=[Depends(require_auth)]
)

@router.get("/all_patients")
def all_patients(request: Request):
    clinic_id = request.state.user["clinicId"]
    rows = query(
        """
        SELECT id, name, phone, age, gender
        FROM patients
        WHERE clinic_id = %s
        ORDER BY updated_at DESC
        """,
        [clinic_id],
    )
    return {"patients": rows}

@router.get("")
def list_patients(
    request: Request,
    phone: str | None = Query(default=None),
    q: str = Query(default=""),
):
    clinic_id = request.state.user["clinicId"]
    phone_norm = normalize_phone(phone)
    if phone_norm:
        if not is_valid_phone(phone_norm):
            raise HTTPException(status_code=400, detail="Phone must be 10 digits")
        rows = query(
            """
            SELECT id, name, phone, age, gender
            FROM patients
            WHERE clinic_id = %s AND phone = %s
            """,
            [clinic_id, phone_norm],
        )
        return {"patient": rows[0] if rows else None}

    q = (q or "").strip()
    if not q:
        return {"patients": []}
    rows = query(
        """
        SELECT id, name, phone, age, gender
        FROM patients
        WHERE clinic_id = %s AND (name ILIKE %s OR phone LIKE %s)
        ORDER BY name
        LIMIT 20
        """,
        [clinic_id, f"%{q}%", f"%{q}%"],
    )
    return {"patients": rows}


@router.get("/{patient_id}/visits")
def patient_visits(patient_id: str, request: Request):
    clinic_id = request.state.user["clinicId"]
    patients = query(
        """
        SELECT id, name, phone, age, gender
        FROM patients
        WHERE id = %s AND clinic_id = %s
        """,
        [patient_id, clinic_id],
    )
    if not patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    visits = query(
        """
        SELECT v.id, v.condition, v.payment_method, v.grand_total, v.paid_at,
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
        LEFT JOIN visit_lines vl ON vl.visit_id = v.id
        WHERE v.clinic_id = %s AND v.patient_id = %s
        GROUP BY v.id
        ORDER BY v.paid_at DESC
        """,
        [clinic_id, patient_id],
    )
    return {"patient": patients[0], "visits": visits}
