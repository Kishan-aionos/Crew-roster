# db.py
import os
import asyncio
import ssl
from pathlib import Path
from typing import Optional, Any, List, Dict
from contextlib import asynccontextmanager
import aiomysql
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "4000"))
DB_USER = os.getenv("DB_USERNAME", "root")
DB_PASS = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_DATABASE", None)
DB_SSL_CA = os.getenv("DB_SSL_CA", "") or None

# Global pool
_pool: Optional[aiomysql.Pool] = None

def _build_ssl_context() -> Optional[ssl.SSLContext]:
    if not DB_SSL_CA:
        return None
    p = Path(DB_SSL_CA)
    if not p.exists():
        print(f"DB_SSL_CA not found: {DB_SSL_CA}")
        return None
    ctx = ssl.create_default_context(cafile=str(p))
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED
    return ctx

# Primary pool creation function (keeps old name for compatibility)
async def init_db_pool(loop: Optional[asyncio.AbstractEventLoop] = None) -> aiomysql.Pool:
    """
    Initialize the global aiomysql pool and return it.
    Use this on app startup.
    """
    global _pool
    if _pool is not None:
        return _pool

    if loop is None:
        loop = asyncio.get_event_loop()

    ssl_ctx = _build_ssl_context()

    create_kwargs = dict(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        db=DB_NAME,
        minsize=1,
        maxsize=10,
        autocommit=False,   # prefer explicit commits; change to True if desired
        loop=loop,
        charset="utf8mb4",
        cursorclass=aiomysql.DictCursor,
    )

    if ssl_ctx is not None:
        create_kwargs["ssl"] = ssl_ctx
    elif DB_SSL_CA:
        create_kwargs["ssl"] = {"ca": DB_SSL_CA}

    _pool = await aiomysql.create_pool(**create_kwargs)
    return _pool

# Provide alias names expected elsewhere
create_pool = init_db_pool

async def close_db_pool():
    """Close the global pool."""
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        _pool = None

close_pool = close_db_pool

async def get_pool() -> aiomysql.Pool:
    """Return the global pool, create if missing."""
    global _pool
    if _pool is None:
        return await create_pool()
    return _pool

@asynccontextmanager
async def get_connection():
    """Async context manager that yields an aiomysql connection from the pool."""
    pool = await get_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)

# Convenience helpers using DictCursor
async def fetch_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(query, params)
            return await cur.fetchall()

async def fetch_one(query: str, params: tuple = ()):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(query, params)
            return await cur.fetchone()

async def execute(query: str, params: tuple = ()):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            await conn.commit()
            return cur.lastrowid

async def get_pool_stats() -> Dict[str, Any]:
    global _pool
    if _pool is None:
        return {"status": "not_initialized"}
    # aiomysql Pool has attributes: minsize, maxsize, size, freesize
    stats = {
        "minsize": getattr(_pool, "minsize", None),
        "maxsize": getattr(_pool, "maxsize", None),
        "size": getattr(_pool, "size", None),
        "freesize": getattr(_pool, "freesize", None),
        "status": "healthy"
    }
    return stats

async def database_health_check() -> Dict[str, Any]:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
                row = await cur.fetchone()
                ok = bool(row and (row[0] == 1 or list(row.values())[0] == 1))
        stats = await get_pool_stats()
        return {"status": "healthy" if ok else "unhealthy", "pool_stats": stats, "timestamp": asyncio.get_event_loop().time()}
    except Exception as e:
        return {"status": "error", "error": str(e), "timestamp": asyncio.get_event_loop().time()}
