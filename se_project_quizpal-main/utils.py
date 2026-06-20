# backend/utils.py
import os
import time
import jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

JWT_SECRET = os.environ.get("QUIZPAL_JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
JWT_EXP_DAYS = int(os.environ.get("QUIZPAL_JWT_EXP_DAYS", "7"))

def hash_password(plain):
    return generate_password_hash(plain)

def verify_password(hash_, plain):
    return check_password_hash(hash_, plain)

def create_token(user_id, role="student"):
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(time.time()),
        "exp": int((datetime.utcnow() + timedelta(days=JWT_EXP_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None
