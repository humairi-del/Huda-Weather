from fastapi import FastAPI
from app.routes.auth import router as auth_router
from app.routes.knowledge import router as knowledge_router

app = FastAPI(
    title="Rasid Hada API",
    description="Private backend for راصد هدى الذكي",
    version="0.2.0",
)

app.include_router(auth_router)
app.include_router(knowledge_router)

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "rasid-hada", "version": "0.2.0"}
