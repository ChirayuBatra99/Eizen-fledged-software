from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()
from data import data

@app.get("/customers")
def get_customers():
    print("get_customers")
    return JSONResponse(content=data["customers"])

@app.get("/orders")
def get_orders(customer_id: str):
    orders = [order for order in data["orders"] if customer_id in order["customerid"]]
    return JSONResponse(content=orders)

