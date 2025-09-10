# roster.py
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel
from datetime import datetime
import aiomysql
import pymysql  # used for catching IntegrityError from aiomysql/pymysql
from db import get_connection,fetch_all

router = APIRouter(prefix="/roster", tags=["roster"])

class RosterRequest(BaseModel):
    flight_id: int

@router.post("/create-roster/{base_airport}")
async def create_roster(base_airport: str = Path(...), request: RosterRequest = None):
    base = base_airport.strip().upper()

    # explicit safe column list (no trailing comma)
    columns = (
        "`id`,`crew_code`,`full_name`,`rank`,`role`,`base_airport`,"
        "`qualifications`,`phone`,`email`,`passport_no`,`medical_valid_until`,"
        "`status`,`created_at`"
    )

    async with get_connection() as conn:
        try:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                # 0) Validate flight_id exists (if provided)
                flight_id = request.flight_id if request else None
                if flight_id is None:
                    # Shouldn't happen since RosterRequest requires flight_id, but safe-check
                    raise HTTPException(status_code=400, detail="flight_id is required")

                await cur.execute("SELECT `id` FROM `flights` WHERE `id` = %s LIMIT 1", (flight_id,))
                flight_exists = await cur.fetchone()
                if not flight_exists:
                    # No such flight — do not proceed
                    await conn.rollback()
                    raise HTTPException(status_code=400, detail=f"flight_id {flight_id} does not exist")

                # 1) select up to 4 active crew ids and lock them to avoid races
                await cur.execute(
                    """
                    SELECT `id`
                    FROM `crew_members`
                    WHERE `base_airport` = %s
                      AND `status` = 'active'
                    ORDER BY `id`
                    LIMIT 4
                    FOR UPDATE
                    """,
                    (base,)
                )
                id_rows = await cur.fetchall()
                crew_ids = [r["id"] for r in id_rows]

                if len(crew_ids) < 4:
                    await conn.rollback()
                    needed = 4 - len(crew_ids)
                    raise HTTPException(
                        status_code=400,
                        detail=f"Not enough active crew at base {base}. Need {needed} more."
                    )

                # 2) fetch full rows for the selected ids using a safe parametrized IN-clause
                placeholders = ",".join(["%s"] * len(crew_ids))
                sql_fetch_full = f"""
                    SELECT {columns}
                    FROM `crew_members`
                    WHERE `id` IN ({placeholders})
                    ORDER BY `id`
                """
                await cur.execute(sql_fetch_full, tuple(crew_ids))
                available_crew = await cur.fetchall()

                # sanity check
                if not available_crew or len(available_crew) < 4:
                    await conn.rollback()
                    raise HTTPException(status_code=500, detail="Failed to fetch selected crew details.")

                # 3) create roster name and insert assignments
                roster_name = f"{base}_roster_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
                insert_sql = """
                    INSERT INTO `rosters`
                    (`roster_name`,`base_airport`,`flight_id`,`crew_id`,`role_on_flight`,`assigned_at`,`status`,`created_by`)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """
                update_sql = "UPDATE `crew_members` SET `status` = %s WHERE `id` = %s"

                assigned = []
                for crew in available_crew:
                    crew_id = int(crew["id"])
                    role_on_flight = crew.get("rank") or crew.get("role") or "Crew"
                    params = (
                        roster_name,
                        base,
                        flight_id,
                        crew_id,
                        role_on_flight,
                        datetime.utcnow(),
                        "assigned",
                        "system"
                    )
                    try:
                        await cur.execute(insert_sql, params)
                    except pymysql.err.IntegrityError as ie:
                        # handle FK / integrity errors gracefully
                        await conn.rollback()
                        # common case: missing flight_id or invalid crew_id FK
                        raise HTTPException(status_code=400, detail=f"Database integrity error: {ie.args[1] if len(ie.args)>1 else ie.args}")
                    await cur.execute(update_sql, ("inactive", crew_id))

                    # serialize datetime if present
                    cleaned = {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in crew.items()}
                    assigned.append(cleaned)

                # 4) commit once
                await conn.commit()

                return {
                    "message": "Roster created successfully",
                    "roster_name": roster_name,
                    "flight_id": flight_id,
                    "base_airport": base,
                    "assigned_crew": assigned
                }

        except HTTPException:
            # let FastAPI propagate HTTPException as-is
            raise
        except Exception as exc:
            # rollback on any other error (best-effort)
            try:
                await conn.rollback()
            except Exception:
                pass
            # hide internals but return helpful message
            raise HTTPException(status_code=500, detail=f"Roster creation failed: {exc}")
@router.get("/rosters")
async def get_rosters():
    try:
        rows = await fetch_all("SELECT * FROM rosters ORDER BY assigned_at DESC")
        return {"data": rows}
    except Exception as e:
        # log if you have a logger; return 500 with safe message
        raise HTTPException(status_code=500, detail=f"Failed to fetch rosters: {e}")
