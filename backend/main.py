from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from fastapi.responses import JSONResponse

from route import get_customers, get_orders
from data import data

from fastapi import Request
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/customers")
def get_customers():
    print("get_customers")
    return JSONResponse(content=data["customers"])

@app.get("/orders")
def get_orders(customer_id: str):   
    orders = [order for order in data["orders"] if customer_id in order["customerid"]]
    return JSONResponse(content=orders)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)