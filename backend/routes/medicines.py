from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from psycopg.errors import IntegrityError, UniqueViolation

from db import query, with_transaction
from middleware import AppError, require_auth


router = APIRouter(
    prefix="/medicines", tags=["medicines"], dependencies=[Depends(require_auth)]
)

class MedicineCreateBody(BaseModel):
    name: str = ""
    unit: str = "unit"
    price: float | None = None
    stockQty: int | float | None = 0
class MedicinePatchBody(BaseModel):
    name: str | None = None
    unit: str | None = None
    price: float | None = None
class RestockBody(BaseModel):
    qty: int | float | None = None
    note: str | None = None


def _medicine_payload(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "unit": row["unit"],
        "price": float(row["price"]),
        "stockQty": row["stock_qty"],
    }

def _whole_number(value, *, min_value: int, error: str) -> int:
    if isinstance(value, bool):
        raise HTTPException(status_code=400, detail=error)
    if isinstance(value, int) and value >= min_value:
        return value
    if isinstance(value, float) and value.is_integer() and value >= min_value:
        return int(value)
    raise HTTPException(status_code=400, detail=error)


@router.get("")
def list_medicines(request: Request):
    rows = query(
        """
        SELECT id, name, unit, price, stock_qty, is_active
        FROM medicines
        WHERE clinic_id = %s AND is_active = TRUE
        ORDER BY name
        """,
        [request.state.user["clinicId"]],
    )
    return {"medicines": [_medicine_payload(row) for row in rows]}

@router.post("")
def create_medicine(body: MedicineCreateBody, request: Request):
    name = (body.name or "").strip()
    unit = ((body.unit or "unit").strip()) or "unit"
    price = body.price
    if not name:
        raise HTTPException(status_code=400, detail="Medicine name required")
    if price is None or not isinstance(price, (int, float)) or price < 0:
        raise HTTPException(status_code=400, detail="Valid price required")
    stock_qty = _whole_number(
        body.stockQty if body.stockQty is not None else 0,
        min_value=0,
        error="Stock must be a whole number",
    )
    user = request.state.user
    try:
        created = with_transaction(
            lambda client: _insert_medicine(client, user, name, unit, price, stock_qty)
        )
    except (UniqueViolation, IntegrityError):
        raise HTTPException(status_code=409, detail="Medicine already exists") from None
    except AppError as err:
        raise HTTPException(status_code=err.status, detail=err.message) from None
    return JSONResponse(
        status_code=201,
        content=jsonable_encoder({"medicine": _medicine_payload(created)}),
    )

@router.patch("/{medicine_id}")
def patch_medicine(medicine_id: str, body: MedicinePatchBody, request: Request):
    fields: list[str] = []
    values: list = []
    if body.name is not None:
        fields.append("name = %s")
        values.append(str(body.name).strip())
    if body.unit is not None:
        fields.append("unit = %s")
        values.append(str(body.unit).strip())
    if body.price is not None:
        if not isinstance(body.price, (int, float)) or body.price < 0:
            raise HTTPException(status_code=400, detail="Valid price required")
        fields.append("price = %s")
        values.append(body.price)
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update")
    fields.append("updated_at = now()")
    values.extend([medicine_id, request.state.user["clinicId"]])
    rows = query(
        f"""
        UPDATE medicines SET {", ".join(fields)}
        WHERE id = %s AND clinic_id = %s
        RETURNING id, name, unit, price, stock_qty
        """,
        values,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"medicine": _medicine_payload(rows[0])}

@router.post("/{medicine_id}/restock")
def restock(medicine_id: str, body: RestockBody, request: Request):
    qty = _whole_number(
        body.qty,
        min_value=1,
        error="Quantity to add must be a positive whole number",
    )
    note = str(body.note).strip() if body.note else None
    user = request.state.user
    try:
        updated = with_transaction(
            lambda client: _restock(client, user, medicine_id, qty, note)
        )
    except AppError as err:
        raise HTTPException(status_code=err.status, detail=err.message) from None
    return {"medicine": _medicine_payload(updated)}


def _insert_medicine(client, user, name, unit, price, stock_qty):
    med = client.query(
        """
        INSERT INTO medicines (clinic_id, name, unit, price, stock_qty)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, name, unit, price, stock_qty
        """,
        [user["clinicId"], name, unit, price, stock_qty],
    )
    row = med[0]
    if stock_qty > 0:
        client.query(
            """
            INSERT INTO stock_movements
              (clinic_id, medicine_id, kind, qty_delta, note, created_by_id)
            VALUES (%s, %s, 'restock', %s, %s, %s)
            """,
            [user["clinicId"], row["id"], stock_qty, "Opening stock", user["id"]],
        )
    return row

def _restock(client, user, medicine_id, qty, note):
    med = client.query(
        """
        SELECT id, name, unit, price, stock_qty
        FROM medicines
        WHERE id = %s AND clinic_id = %s AND is_active = TRUE
        FOR UPDATE
        """,
        [medicine_id, user["clinicId"]],
    )
    if not med:
        raise AppError("Medicine not found", 404)
    next_row = client.query(
        """
        UPDATE medicines
        SET stock_qty = stock_qty + %s, updated_at = now()
        WHERE id = %s AND clinic_id = %s
        RETURNING id, name, unit, price, stock_qty
        """,
        [qty, medicine_id, user["clinicId"]],
    )
    client.query(
        """
        INSERT INTO stock_movements
          (clinic_id, medicine_id, kind, qty_delta, note, created_by_id)
        VALUES (%s, %s, 'restock', %s, %s, %s)
        """,
        [user["clinicId"], medicine_id, qty, note, user["id"]],
    )
    return next_row[0]
