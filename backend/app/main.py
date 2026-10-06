from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.workspace import router as workspace_router
from app.routers.task import router as task_router
from app.routers.project import router as project_router
from app.routers.project import workspace_project_router 
from app.routers.project_request import router as project_request_router
from app.routers.project_member import router as project_member_router
from app.routers.user import router as user_router
from app.security.header import SecurityHeadersMiddleware 

app = FastAPI(
    title="Project Management API"
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware, 
    secret_key=settings.GOOGLE_CLIENT_SECRET,
    session_cookie="session",
    https_only=False, 
    same_site="lax"  
)

app.add_middleware(SecurityHeadersMiddleware) 

app.include_router(auth_router)
app.include_router(workspace_router)
app.include_router(task_router)
app.include_router(workspace_project_router)
app.include_router(project_router)
app.include_router(project_request_router)
app.include_router(project_member_router)
app.include_router(user_router)

@app.get("/")
def root():
    return {
        "message": "Project Management API"
    }