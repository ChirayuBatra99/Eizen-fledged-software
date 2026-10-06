import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from db import close_pool, get_pool
from middleware import AppError
from routes.ai import router as ai_router
from routes.auth import router as auth_router
from routes.medicines import router as medicines_router
from routes.patients import router as patients_router
from routes.reports import router as reports_router
from routes.visits import router as visits_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    get_pool()
    yield
    close_pool()


app = FastAPI(title="Clinic API", lifespan=lifespan, redirect_slashes=False)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN") or "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status, content={"error": exc.message})

@app.exception_handler(HTTPException)
async def http_error_handler(_request: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"error": message})

@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, _exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"error": "Invalid request"})

@app.exception_handler(Exception)
async def server_error_handler(_request: Request, exc: Exception):
    print(exc)
    return JSONResponse(status_code=500, content={"error": "Server error"})


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(medicines_router)
app.include_router(visits_router)
app.include_router(reports_router)
app.include_router(ai_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT") or 4000),
        reload=True,
    )
