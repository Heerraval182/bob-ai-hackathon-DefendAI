"""
Sensor-data ingestion router.

POST /api/sensors/data   — ingest a single reading
POST /api/sensors/batch  — ingest a batch of readings

Sourced from docs/architecture.md § Suggested API Endpoints and
§ 4.2 Data Ingestion Layer.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SensorReadingBatch, SensorReadingIn, SensorReadingOut
from app.services.ingestion import ingest_sensor_data

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.post(
    "/data",
    response_model=SensorReadingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a single sensor reading",
)
def post_sensor_reading(payload: SensorReadingIn, db: Session = Depends(get_db)):
    try:
        record = ingest_sensor_data(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return record


@router.post(
    "/batch",
    response_model=list[SensorReadingOut],
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a batch of sensor readings",
)
def post_sensor_batch(payload: SensorReadingBatch, db: Session = Depends(get_db)):
    results = []
    errors = []
    for idx, reading in enumerate(payload.readings):
        try:
            record = ingest_sensor_data(db, reading)
            results.append(record)
        except ValueError as exc:
            errors.append({"index": idx, "error": str(exc)})

    if errors and not results:
        raise HTTPException(status_code=422, detail=errors)

    return results
