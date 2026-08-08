from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import init_db
from routes import dashboard, phones, batches, budget, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run on startup
    await init_db()
    yield
    # Run on shutdown (if needed)


app = FastAPI(
    title="iPhone Export Tracker API",
    description="Backend for asynchronous physical/financial pipeline",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for React Frontend (usually running on port 5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(dashboard.router)
app.include_router(phones.router)
app.include_router(batches.router)
app.include_router(budget.router)
app.include_router(users.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
