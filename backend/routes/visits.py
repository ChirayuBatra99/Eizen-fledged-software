from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from db import query, with_transaction
from lib import is_valid_phone, normalize_phone
from middleware import AppError, require_auth

router = APIRouter(
    prefix="/visits", tags=["visits"], dependencies=[Depends(require_auth)]
)

VISIT_LIST_SELECT = """
  SELECT v.id, v.condition, v.payment_method, v.grand_total, v.paid_at,
         p.id AS patient_id, p.name AS patient_name, p.phone AS patient_phone,
         p.age AS patient_age, p.gender AS patient_gender,
         COALESCE(
           json_agg(
             json_build_object(
               'id', vl.id,
               'medicineId', vl.medicine_id,
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
"""


class VisitBody(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str = ""
    phone: str = ""
    age: Any = None
    gender: str | None = None
    condition: str | None = None
    paymentMethod: str | None = None
    lines: list[dict] | None = None


def parse_visit_lines(lines: Any) -> list[dict]:
    if not isinstance(lines, list) or not lines:
        raise AppError("Add at least one medicine", 400)
    parsed = []
    for line in lines:
        try:
            qty_n = int(line.get("qty"))
        except (TypeError, ValueError):
            qty_n = None
        try:
            unit_price_n = float(line.get("unitPrice"))
        except (TypeError, ValueError):
            unit_price_n = None
        if not line.get("medicineId"):
            raise AppError("Pick a medicine on every line", 400)
        if qty_n is None or qty_n != float(line.get("qty")) or qty_n <= 0:
            raise AppError("Quantity must be a positive whole number", 400)
        if unit_price_n is None or unit_price_n < 0:
            raise AppError("Invalid price on a medicine line", 400)
        parsed.append(
            {
                "medicineId": str(line["medicineId"]),
                "qty": qty_n,
                "unitPrice": unit_price_n,
                "lineTotal": round(unit_price_n * qty_n * 100) / 100,
            }
        )
    return parsed


def validate_patient_fields(name, phone, age, gender, payment_method) -> None:
    if not name:
        raise AppError("Patient name required", 400)
    if not is_valid_phone(phone):
        raise AppError("Phone must be 10 digits", 400)
    if gender and gender not in ("male", "female", "other"):
        raise AppError("Invalid gender", 400)
    if payment_method not in ("cash", "upi"):
        raise AppError("Select Cash or UPI", 400)
    if age is not None and (
        not isinstance(age, int) or isinstance(age, bool) or age < 0 or age > 120
    ):
        raise AppError("Invalid age", 400)


def upsert_patient(client, clinic_id, name, phone, age, gender):
    existing = client.query(
        "SELECT id FROM patients WHERE clinic_id = %s AND phone = %s",
        [clinic_id, phone],
    )
    if existing:
        updated = client.query(
            """
            UPDATE patients
            SET name = %s, age = %s, gender = %s, updated_at = now()
            WHERE id = %s AND clinic_id = %s
            RETURNING id, name, phone, age, gender
            """,
            [name, age, gender, existing[0]["id"], clinic_id],
        )
        return updated[0]
    created = client.query(
        """
        INSERT INTO patients (clinic_id, name, phone, age, gender)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, name, phone, age, gender
        """,
        [clinic_id, name, phone, age, gender],
    )
    return created[0]


def _parse_age(age_raw):
    if age_raw == "" or age_raw is None:
        return None
    try:
        return int(age_raw)
    except (TypeError, ValueError):
        try:
            f = float(age_raw)
            return int(f) if f.is_integer() else age_raw
        except (TypeError, ValueError):
            return age_raw


@router.get("")
def list_visits(request: Request):
    visits = query(
        f"""
        {VISIT_LIST_SELECT}
        WHERE v.clinic_id = %s
        GROUP BY v.id, p.id
        ORDER BY v.paid_at DESC
        """,
        [request.state.user["clinicId"]],
    )
    return {"visits": visits}


@router.post("")
def create_visit(body: VisitBody, request: Request):
    name = (body.name or "").strip()
    phone = normalize_phone(body.phone)
    gender = body.gender or None
    condition = str(body.condition).strip() if body.condition else None
    payment_method = body.paymentMethod
    age = _parse_age(body.age)
    user = request.state.user
    try:
        validate_patient_fields(name, phone, age, gender, payment_method)
        parsed_lines = parse_visit_lines(body.lines)
        grand_total = round(sum(l["lineTotal"] for l in parsed_lines) * 100) / 100
        visit = with_transaction(
            lambda client: _create_visit(
                client,
                user,
                name,
                phone,
                age,
                gender,
                condition,
                payment_method,
                parsed_lines,
                grand_total,
            )
        )
    except AppError as err:
        raise HTTPException(status_code=err.status, detail=err.message) from None
    return JSONResponse(
        status_code=201,
        content=jsonable_encoder(
            {
                "visit": {
                    "id": str(visit["id"]),
                    "grandTotal": float(visit["grand_total"]),
                    "paymentMethod": visit["payment_method"],
                    "paidAt": visit["paid_at"],
                    "patientName": name,
                }
            }
        ),
    )


def _create_visit(
    client,
    user,
    name,
    phone,
    age,
    gender,
    condition,
    payment_method,
    parsed_lines,
    grand_total,
):
    patient = upsert_patient(client, user["clinicId"], name, phone, age, gender)
    ids = [l["medicineId"] for l in parsed_lines]
    meds = client.query(
        """
        SELECT id, name, stock_qty
        FROM medicines
        WHERE clinic_id = %s AND is_active = TRUE AND id = ANY(%s::uuid[])
        FOR UPDATE
        """,
        [user["clinicId"], ids],
    )
    by_id = {str(m["id"]): m for m in meds}
    for line in parsed_lines:
        med = by_id.get(str(line["medicineId"]))
        if not med:
            raise AppError("A selected medicine was not found", 400)
        if med["stock_qty"] < line["qty"]:
            raise AppError(
                f"Not enough stock for {med['name']} (have {med['stock_qty']}, need {line['qty']})",
                400,
            )
        line["nameSnapshot"] = med["name"]

    visit_row = client.query(
        """
        INSERT INTO visits
          (clinic_id, patient_id, created_by_id, condition, payment_method, grand_total)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, grand_total, payment_method, paid_at
        """,
        [
            user["clinicId"],
            patient["id"],
            user["id"],
            condition,
            payment_method,
            grand_total,
        ],
    )
    visit_id = visit_row[0]["id"]
    for line in parsed_lines:
        client.query(
            """
            INSERT INTO visit_lines
              (clinic_id, visit_id, medicine_id, name_snapshot, unit_price, qty, line_total)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            [
                user["clinicId"],
                visit_id,
                line["medicineId"],
                line["nameSnapshot"],
                line["unitPrice"],
                line["qty"],
                line["lineTotal"],
            ],
        )
        client.query(
            """
            UPDATE medicines
            SET stock_qty = stock_qty - %s, updated_at = now()
            WHERE id = %s AND clinic_id = %s
            """,
            [line["qty"], line["medicineId"], user["clinicId"]],
        )
        client.query(
            """
            INSERT INTO stock_movements
              (clinic_id, medicine_id, kind, qty_delta, visit_id, created_by_id)
            VALUES (%s, %s, 'sale', %s, %s, %s)
            """,
            [
                user["clinicId"],
                line["medicineId"],
                -line["qty"],
                visit_id,
                user["id"],
            ],
        )
    return visit_row[0]
