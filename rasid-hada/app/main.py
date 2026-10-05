from fastapi import FastAPI
from fastapi.responses import FileResponse
from app.routes.auth import router as auth_router
from app.routes.knowledge import router as knowledge_router
from app.routes.admin import router as admin_router

app = FastAPI(title="Rasid Hada API",description="Private backend for راصد هدى الذكي",version="0.3.0")
app.include_router(auth_router)
app.include_router(knowledge_router)
app.include_router(admin_router)

@app.get("/health",tags=["system"])
def health():
    return {"status":"ok","service":"rasid-hada","version":"0.3.0"}

@app.get("/private-admin",include_in_schema=False)
def private_admin():
    return FileResponse("app/static/admin.html")
