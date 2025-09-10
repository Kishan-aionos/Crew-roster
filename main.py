# main.py (trimmed to the relevant changes)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# main.py (relevant imports)
from db import create_pool, close_pool, database_health_check, get_pool_stats

from crud import router as crew_list
from roster import router as roster_router   # if roster.py defines a router

app = FastAPI(lifespan=None)  # we will use startup/shutdown below

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000","http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(crew_list)
app.include_router(roster_router)  # if roster exposes APIRouter

@app.on_event("startup")
async def on_startup():
    await create_pool()

@app.on_event("shutdown")
async def on_shutdown():
    await close_pool()
