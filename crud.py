from fastapi import APIRouter, HTTPException,Query,Path,Body,HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import date, datetime,timedelta, time as dtime
from enum import Enum
from db import fetch_all, fetch_one,execute

router = APIRouter(prefix="/crew-members", tags=["crew-members"])

# Pydantic models for response
class CrewRole(str, Enum):
    pilot = "pilot"
    cabin = "cabin"

class CrewStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class CrewMemberResponse(BaseModel):
    id: int
    crew_code: str
    full_name: str
    role: CrewRole
    rank: str | None = None
    base_airport: str | None = None
    qualifications: str | None = None
    phone: str | None = None
    email: str | None = None
    passport_no: str | None = None
    medical_valid_until: date | None = None
    status: CrewStatus
    created_at: datetime

    class Config:
        from_attributes = True

def fmt_time_like(val):
    """
    Normalize DB time-like values into "HH:MM:SS" or None.
    Accepts:
      - datetime.time -> "HH:MM:SS"
      - datetime.timedelta -> "HH:MM:SS" (converted from total seconds)
      - str (already a time string like "03:54:48" or "PT...") -> try to normalize
      - None -> None
    """
    if val is None:
        return None

    # datetime.time
    if isinstance(val, dtime):
        return val.strftime("%H:%M:%S")

    # datetime.timedelta (some drivers map TIME -> timedelta)
    if isinstance(val, timedelta):
        total = int(val.total_seconds())
        hours, rem = divmod(total, 3600)
        minutes, seconds = divmod(rem, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    # strings: could be "HH:MM:SS" already or "PT#H#M#S"
    if isinstance(val, str):
        # already a normal time-like "HH:MM:SS"
        if ":" in val and val.count(":") == 2:
            # ensure zero-padded parts (in case driver emits "3:5:4")
            parts = val.split(":")
            try:
                h, m, s = [int(p) for p in parts]
                return f"{h:02d}:{m:02d}:{s:02d}"
            except Exception:
                return val
        # ISO 8601 duration like "PT13H5M43S"
        if val.startswith("PT"):
            # parse rough "PT(\d+H)?(\d+M)?(\d+S)?"
            hours = minutes = seconds = 0
            s = val[2:]
            # find hours
            import re
            m_h = re.search(r"(\d+)H", s)
            m_m = re.search(r"(\d+)M", s)
            m_s = re.search(r"(\d+)S", s)
            if m_h:
                hours = int(m_h.group(1))
            if m_m:
                minutes = int(m_m.group(1))
            if m_s:
                seconds = int(m_s.group(1))
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        # fallback
        return val

    # fallback to str()
    try:
        return str(val)
    except Exception:
        return None


@router.get("/", response_model=Dict[str, Any])
async def get_all_crew_members(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Get paginated crew members.
    Returns: { data: [CrewMemberResponse], meta: { page, limit, total } }
    """
    try:
        offset = (page - 1) * limit

        # Total count (so frontend can compute pages)
        count_query = "SELECT COUNT(*) AS total FROM crew_members"
        count_row = await fetch_one(count_query)
        total = int(count_row["total"]) if count_row and "total" in count_row else 0

        # Fetch page
        query = f"SELECT * FROM crew_members ORDER BY id LIMIT {limit} OFFSET {offset}"
        rows = await fetch_all(query)

        crew_members = [
            {
                "id": row["id"],
                "crew_code": row["crew_code"],
                "full_name": row["full_name"],
                "role": row["role"],
                "rank": row.get("rank"),
                "base_airport": row.get("base_airport"),
                "qualifications": row.get("qualifications"),
                "phone": row.get("phone"),
                "email": row.get("email"),
                "passport_no": row.get("passport_no"),
                "medical_valid_until": row.get("medical_valid_until"),
                "status": row.get("status"),
                "created_at": row.get("created_at"),
            }
            for row in rows
        ]

        return {
            "data": crew_members,
            "meta": {
                "page": page,
                "limit": limit,
                "total": total,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
@router.patch("/{crew_id}/toggle-status", response_model=CrewMemberResponse)
async def toggle_crew_status(crew_id: int = Path(..., ge=1)):
    """
    Toggle the crew member's status between 'active' and 'inactive'.
    Returns the updated crew member.
    """
    try:
        # 1) fetch current row
        sel = f"SELECT * FROM crew_members WHERE id = {int(crew_id)} LIMIT 1"
        row = await fetch_one(sel)
        if not row:
            raise HTTPException(status_code=404, detail="Crew member not found")

        current = (row.get("status") or "").strip().lower()
        # Normalize: treat many truthy variants as active
        if current in ("active", "available", "1", "true"):
            new_status = "inactive"
        else:
            new_status = "active"

        # 2) update status
        # NOTE: we use an f-string here because your db helpers above used raw SQL strings.
        # Ensure crew_id is integer to avoid injection. If your db.execute supports params,
        # switch to parameterized queries.
        upd = f"UPDATE crew_members SET status = '{new_status}' WHERE id = {int(crew_id)}"
        await execute(upd)

        # 3) return the updated row
        sel2 = f"SELECT * FROM crew_members WHERE id = {int(crew_id)} LIMIT 1"
        updated = await fetch_one(sel2)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to fetch updated crew member")

        # Map to CrewMemberResponse (pydantic will validate/convert)
        return CrewMemberResponse(
            id=updated["id"],
            crew_code=updated["crew_code"],
            full_name=updated["full_name"],
            role=updated["role"],
            rank=updated.get("rank"),
            base_airport=updated.get("base_airport"),
            qualifications=updated.get("qualifications"),
            phone=updated.get("phone"),
            email=updated.get("email"),
            passport_no=updated.get("passport_no"),
            medical_valid_until=updated.get("medical_valid_until"),
            status=updated.get("status"),
            created_at=updated.get("created_at"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
@router.post("/{crew_code}/checkin", response_model=dict)
async def crew_checkin(
    crew_code: str = Path(..., description="Crew code to check in"),
    rest_time_minutes: int | None = Body(None, description="Optional rest time to set (minutes)")
):
    """
    Mark crew as checked-in: sets check_in_date/check_in_time, clears previous check_out/rest_until.
    Optionally set per-duty rest_time_minutes. Returns the updated timing row with time fields as "HH:MM:SS".
    """
    try:
        now = datetime.utcnow()
        check_in_date = now.date()
        check_in_time = now.time().replace(microsecond=0)

        # normalize crew_code (optional)
        crew_code = crew_code.strip().upper()

        existing = await fetch_one("SELECT * FROM crew_timing WHERE crew_code = %s LIMIT 1", (crew_code,))
        if existing:
            await execute(
                """
                UPDATE crew_timing
                SET check_in_date = %s, check_in_time = %s,
                    check_out_date = NULL, check_out_time = NULL,
                    rest_until_date = NULL, rest_until_time = NULL,
                    rest_time_minutes = CASE WHEN %s IS NULL THEN rest_time_minutes ELSE %s END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE crew_code = %s
                """,
                (check_in_date, check_in_time, rest_time_minutes, rest_time_minutes, crew_code),
            )
        else:
            rest_val = rest_time_minutes if rest_time_minutes is not None else 0
            await execute(
                """
                INSERT INTO crew_timing (
                  crew_code, check_in_date, check_in_time, rest_time_minutes, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (crew_code, check_in_date, check_in_time, rest_val),
            )

        updated = await fetch_one("SELECT * FROM crew_timing WHERE crew_code = %s LIMIT 1", (crew_code,))
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to fetch updated timing row")

        # Prepare a safe dict copy and format time-like fields
        timing = dict(updated)

        timing["check_in_time"] = fmt_time_like(timing.get("check_in_time"))
        timing["check_out_time"] = fmt_time_like(timing.get("check_out_time"))
        timing["rest_until_time"] = fmt_time_like(timing.get("rest_until_time"))

        # Optionally format rest_time_minutes into HH:MM:SS for API consumer while keeping DB as minutes
        rt_min = timing.get("rest_time_minutes")
        try:
            if rt_min is None:
                timing["rest_time_hms"] = None
            else:
                # use SEC_TO_TIME equivalent: minutes * 60 -> HH:MM:SS
                total_seconds = int(rt_min) * 60
                h, rem = divmod(total_seconds, 3600)
                m, s = divmod(rem, 60)
                timing["rest_time_hms"] = f"{h:02d}:{m:02d}:{s:02d}"
        except Exception:
            timing["rest_time_hms"] = None

        # created_at / updated_at -> ISO strings if datetime objects
        if isinstance(timing.get("created_at"), datetime):
            timing["created_at"] = timing["created_at"].isoformat()
        if isinstance(timing.get("updated_at"), datetime):
            timing["updated_at"] = timing["updated_at"].isoformat()

        return {"status": "checked_in", "timing": timing}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error during checkin: {e}")
async def crew_checkin(
    crew_code: str = Path(..., description="Crew code to check in"),
    rest_time_minutes: int | None = Body(None, description="Optional rest time to set (minutes)")
):
    """
    Mark crew as checked-in: sets check_in_date/check_in_time, clears previous check_out/rest_until.
    Optionally set per-duty rest_time_minutes. Returns the updated timing row.
    """
    try:
        now = datetime.utcnow()  # naive UTC datetime
        check_in_date = now.date()
        check_in_time = now.time().replace(microsecond=0)

        existing = await fetch_one("SELECT * FROM crew_timing WHERE crew_code = %s LIMIT 1", (crew_code,))
        if existing:
            # update check-in, clear checkout/rest_until; keep rest_time_minutes if not provided
            await execute(
                """
                UPDATE crew_timing
                SET check_in_date = %s, check_in_time = %s,
                    check_out_date = NULL, check_out_time = NULL,
                    rest_until_date = NULL, rest_until_time = NULL,
                    rest_time_minutes = CASE WHEN %s IS NULL THEN rest_time_minutes ELSE %s END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE crew_code = %s
                """,
                (check_in_date, check_in_time, rest_time_minutes, rest_time_minutes, crew_code),
            )
        else:
            rest_val = rest_time_minutes if rest_time_minutes is not None else 0
            await execute(
                """
                INSERT INTO crew_timing (
                  crew_code, check_in_date, check_in_time, rest_time_minutes, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (crew_code, check_in_date, check_in_time, rest_val),
            )

        updated = await fetch_one("SELECT * FROM crew_timing WHERE crew_code = %s LIMIT 1", (crew_code,))
        return {"status": "checked_in", "timing": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error during checkin: {e}")




@router.post("/{crew_code}/checkout", response_model=dict)
async def crew_checkout(crew_code: str = Path(..., description="Crew code to check out")):
    """
    Mark crew as checked-out: sets check_out_date/check_out_time, sets rest_until_date/rest_until_time based on rest_time_minutes.
    Returns updated timing row with time fields formatted as "HH:MM:SS".
    """
    try:
        now = datetime.utcnow()
        check_out_date = now.date()
        check_out_time = now.time().replace(microsecond=0)

        # normalize incoming crew_code to avoid common typos (optional)
        crew_code = crew_code.strip().upper()

        row = await fetch_one("SELECT * FROM crew_timing WHERE crew_code = %s LIMIT 1", (crew_code,))
        if not row:
            raise HTTPException(status_code=404, detail="Crew timing record not found")

        rest_minutes = int(row.get("rest_time_minutes") or 0)

        rest_until_date = None
        rest_until_time = None
        if rest_minutes > 0:
            rest_dt = now + timedelta(minutes=rest_minutes)
            rest_until_date = rest_dt.date()
            rest_until_time = rest_dt.time().replace(microsecond=0)

        await execute(
            """
            UPDATE crew_timing
            SET check_out_date = %s, check_out_time = %s,
                rest_until_date = %s, rest_until_time = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE crew_code = %s
            """,
            (check_out_date, check_out_time, rest_until_date, rest_until_time, crew_code),
        )

        updated = await fetch_one("SELECT * FROM crew_timing WHERE crew_code = %s LIMIT 1", (crew_code,))

        # Format time-like fields before returning
        if updated:
            # copy to avoid mutating driver-specific row objects (some return RowProxy)
            timing = dict(updated)

            # format the TIME / timedelta / string fields
            timing["check_in_time"] = fmt_time_like(timing.get("check_in_time"))
            timing["check_out_time"] = fmt_time_like(timing.get("check_out_time"))
            timing["rest_until_time"] = fmt_time_like(timing.get("rest_until_time"))

            # Optionally format date and datetime fields to iso strings
            # keep dates as "YYYY-MM-DD" (they typically already are), created_at/updated_at -> ISO
            ca = timing.get("created_at")
            ua = timing.get("updated_at")
            if isinstance(ca, datetime):
                timing["created_at"] = ca.isoformat()
            if isinstance(ua, datetime):
                timing["updated_at"] = ua.isoformat()

            return {"status": "checked_out", "timing": timing}

        # fallback
        return {"status": "checked_out", "timing": updated}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error during checkout: {e}")
