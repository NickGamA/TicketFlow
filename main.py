from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List
import datetime

# Segurança moderna para senhas
from pwdlib import PasswordHash
import jwt

# Banco de Dados (SQLAlchemy)
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# CONFIGURAÇÕES DO BANCO DE DADOS (SQLite)
DATABASE_URL = "sqlite:///./ticketflow.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# CONFIGURAÇÃO DE SEGURANÇA MODERNA
password_hash_context = PasswordHash.recommended()
SECRET_KEY = "sua_chave_secreta_super_segura_para_o_copa"
ALGORITHM = "HS256"

# ---- MODELOS DO BANCO DE DADOS (Tabelas) ----

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    terms_accepted = Column(Boolean, default=False)

class MatchModel(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    team_a = Column(String)
    team_b = Column(String)
    date_time = Column(String)
    stadium = Column(String)
    available_tickets = Column(Integer)

# Criar as tabelas automaticamente se não existirem
Base.metadata.create_all(bind=engine)

# ---- ESQUEMAS DE VALIDAÇÃO (Pydantic) ----

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    terms_accepted: bool

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MatchResponse(BaseModel):
    id: int
    team_a: str
    team_b: str
    date_time: str
    stadium: str
    available_tickets: int

    model_config = {
        "from_attributes": True
    }

# ---- INICIALIZAÇÃO DO FASTAPI ----

app = FastAPI(title="TicketFlow Backend - Copa", version="1.0.0")

# Permitir que o teu HTML/CSS aceda a este backend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependência para obter a sessão do banco de dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- POPULAR DADOS INICIAIS ----
@app.on_event("startup")
def startup_populate_db():
    db = SessionLocal()
    if db.query(MatchModel).count() == 0:
        jogos_iniciais = [
            MatchModel(team_a="Brasil", team_b="Portugal", date_time="2026-06-15 16:00", stadium="Maracanã", available_tickets=50000),
            MatchModel(team_a="Argentina", team_b="França", date_time="2026-06-16 20:00", stadium="Estádio Nacional", available_tickets=45000),
            MatchModel(team_a="Espanha", team_b="Alemanha", date_time="2026-06-17 14:00", stadium="Arena Corinthians", available_tickets=40000)
        ]
        db.add_all(jogos_iniciais)
        db.commit()
    db.close()

# ---- ROTAS DA API (ENDPOINTS) ----

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    if not user_data.terms_accepted:
        raise HTTPException(status_code=400, detail="Deves aceitar os termos de uso.")
    
    user_exists = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Este e-mail já está registado.")
        
    # Usando o triturador moderno para esconder a senha
    hashed_password = password_hash_context.hash(user_data.password)
    
    new_user = UserModel(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        terms_accepted=user_data.terms_accepted
    )
    db.add(new_user)
    db.commit()
    return {"message": "Utilizador registado com sucesso!"}

@app.post("/api/auth/login")
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == login_data.email).first()
    
    # Conferindo a senha com o sistema moderno
    if not user or not password_hash_context.verify(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    
    payload = {
        "sub": user.email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return {"access_token": token, "token_type": "bearer", "username": user.username}

@app.get("/api/matches", response_model=List[MatchResponse])
def list_matches(db: Session = Depends(get_db)):
    matches = db.query(MatchModel).all()
    return matches