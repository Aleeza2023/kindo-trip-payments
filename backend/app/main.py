"""Entry point for the FastAPI backend."""
from fastapi import FastAPI

app = FastAPI(title="Kindo Trip Payments")


@app.get("/api/health")
def health() -> dict[str, str]:
    """Simple check that the server is running."""
    return {"status": "ok"}