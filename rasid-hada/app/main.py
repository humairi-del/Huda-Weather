from fastapi import FastAPI

app = FastAPI(
    title="Rasid Hada API",
    description="Private backend for راصد هدى الذكي",
    version="0.1.0",
)

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "rasid-hada"}
