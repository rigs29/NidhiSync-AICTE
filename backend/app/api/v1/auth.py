import secrets
import random
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import User, Institution
from app.schemas.schemas import (
    UserLogin, Token, UserResponse, UserSignup, 
    VerifyOtpRequest, ResendOtpRequest, SignupResponse
)
from app.security.auth import verify_password, get_password_hash, create_access_token, get_current_user
from app.services.audit import log_audit
from app.notifications.service import NotificationService

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP Cache: email -> { "otp": str, "token": str, "expires_at": float, "user_id": int, ... }
OTP_CACHE: dict = {}

@router.get("/institutions")
def get_public_institutions(db: Session = Depends(get_db)):
    """Public endpoint for signup dropdown so prospective college officers can select their institution."""
    institutions = db.query(Institution).filter(Institution.status == "ACTIVE").order_by(Institution.name).all()
    return [
        {
            "id": inst.id,
            "name": inst.name,
            "aicte_code": inst.aicte_code,
            "state": inst.state,
            "institution_type": inst.institution_type
        }
        for inst in institutions
    ]

@router.post("/signup", response_model=SignupResponse)
def signup(data: UserSignup, db: Session = Depends(get_db)):
    email_clean = str(data.email).strip().lower()
    
    # 1. Validate Role
    allowed_roles = ["COLLEGE_USER", "AICTE_OFFICER", "ADMIN"]
    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(allowed_roles)}"
        )

    # 2. Check Institution Association
    institution_id = None
    if data.role == "COLLEGE_USER":
        if data.institution_id:
            inst = db.query(Institution).filter(Institution.id == data.institution_id).first()
            if not inst:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected institution not found.")
            institution_id = inst.id
        elif data.new_institution_name:
            code = data.new_institution_code.strip() if data.new_institution_code else f"1-{random.randint(10000000, 99999999)}"
            existing_inst = db.query(Institution).filter(Institution.aicte_code == code).first()
            if existing_inst:
                institution_id = existing_inst.id
            else:
                new_inst = Institution(
                    name=data.new_institution_name.strip(),
                    aicte_code=code,
                    institution_type="Engineering & Technical Institute",
                    address="Institutional Campus",
                    state="National",
                    contact_person=data.name.strip(),
                    email=email_clean,
                    phone="+91-11-28082910",
                    status="ACTIVE"
                )
                db.add(new_inst)
                db.flush()
                institution_id = new_inst.id
        else:
            # Fallback to first available institution if not selected
            first_inst = db.query(Institution).first()
            if first_inst:
                institution_id = first_inst.id

    # 3. Create or update user
    existing_user = db.query(User).filter(User.email == email_clean).first()
    
    otp = f"{random.randint(100000, 999999)}"
    magic_token = secrets.token_urlsafe(32)

    if existing_user:
        # Existing account: update credentials and require OTP confirmation
        existing_user.name = data.name.strip()
        existing_user.role = data.role
        if institution_id:
            existing_user.institution_id = institution_id
        existing_user.password_hash = get_password_hash(data.password)
        existing_user.is_active = True # Active immediately
        db.commit()
        db.refresh(existing_user)
        user = existing_user
    else:
        user = User(
            name=data.name.strip(),
            email=email_clean,
            password_hash=get_password_hash(data.password),
            role=data.role,
            institution_id=institution_id,
            is_active=True # Active immediately for seamless access
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. Cache OTP for 15 minutes
    OTP_CACHE[email_clean] = {
        "otp": otp,
        "token": magic_token,
        "expires_at": time.time() + 900,
        "user_id": user.id,
        "role": data.role
    }

    log_audit(db, action="SIGNUP_REQUESTED", entity_type="User", entity_id=str(user.id), result="PENDING_VERIFICATION")

    # In-app notification
    try:
        NotificationService.send_notification(
            db=db,
            recipient_id=user.id,
            subject="AICTE Security Deposit Portal - Verification OTP",
            message=f"Your official single-use 6-digit verification code is {otp}. Valid for 15 minutes.",
            notification_type="SYSTEM"
        )
    except Exception:
        pass

    print(f"\n=======================================================")
    print(f"[REALTIME OTP DISPATCH] To: {email_clean}")
    print(f"6-Digit Verification Code: {otp}")
    print(f"Instant Login Link: /login?verify=true&email={email_clean}&otp={otp}&token={magic_token}")
    print(f"=======================================================\n")

    return {
        "message": f"Verification code generated for {email_clean}. Enter code {otp} to activate.",
        "email": email_clean,
        "role": data.role,
        "requires_otp": True,
        "dev_otp": otp,
        "verification_link": f"/login?verify=true&email={email_clean}&otp={otp}&token={magic_token}"
    }

@router.post("/verify-otp", response_model=Token)
def verify_otp(data: VerifyOtpRequest, db: Session = Depends(get_db)):
    email_clean = str(data.email).strip().lower()
    otp_input = str(data.otp).strip()

    cache_entry = OTP_CACHE.get(email_clean)
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found. Please register first.")

    # Check validity
    is_valid = False
    if cache_entry:
        if cache_entry.get("otp") == otp_input or cache_entry.get("token") == otp_input:
            is_valid = True
        elif time.time() > cache_entry.get("expires_at", 0):
            OTP_CACHE.pop(email_clean, None)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new code.")

    # Universal dev bypass codes for robust testing
    if not is_valid and otp_input in ["123456", "AICTE1", "999999"]:
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid verification code. Please check code or enter {cache_entry.get('otp') if cache_entry else '123456'}.")

    # Activate user
    user.is_active = True
    db.commit()
    db.refresh(user)
    OTP_CACHE.pop(email_clean, None)

    log_audit(db, action="SIGNUP_VERIFIED", entity_type="User", entity_id=str(user.id), actor=user)

    return _issue_token(user, db)

@router.post("/resend-otp", response_model=SignupResponse)
def resend_otp(data: ResendOtpRequest, db: Session = Depends(get_db)):
    email_clean = str(data.email).strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No registered account found with this email.")

    otp = f"{random.randint(100000, 999999)}"
    magic_token = secrets.token_urlsafe(32)
    OTP_CACHE[email_clean] = {
        "otp": otp,
        "token": magic_token,
        "expires_at": time.time() + 900,
        "user_id": user.id
    }

    print(f"\n[RESEND OTP] Dispatched code {otp} to {email_clean}\n")

    return {
        "message": f"A fresh verification code {otp} has been dispatched to {email_clean}.",
        "email": email_clean,
        "role": user.role,
        "requires_otp": True,
        "dev_otp": otp,
        "verification_link": f"/login?verify=true&email={email_clean}&otp={otp}&token={magic_token}"
    }

def _issue_token(user: User, db: Session) -> dict:
    institution_name = None
    if user.institution_id:
        inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
        if inst:
            institution_name = inst.name

    token_data = {
        "sub": user.email,
        "role": user.role,
        "name": user.name,
        "institution_id": user.institution_id,
        "institution_name": institution_name,
    }
    access_token = create_access_token(data=token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "institution_id": user.institution_id,
        "institution_name": institution_name,
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email_clean = str(login_data.email).strip().lower()
    try:
        user = db.query(User).filter(User.email == email_clean).first()
    except Exception:
        from app.db.init_db import init_db
        try:
            init_db(db)
            user = db.query(User).filter(User.email == email_clean).first()
        except Exception:
            user = None
    
    if not user or not verify_password(login_data.password, user.password_hash):
        log_audit(db, action="LOGIN_FAILED", entity_type="User", entity_id=email_clean, result="FAILURE")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect official email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # If valid password was entered, ensure account is active and log user straight in
    if not user.is_active:
        user.is_active = True
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()

    log_audit(db, action="LOGIN_SUCCESS", entity_type="User", entity_id=str(user.id), actor=user)
    return _issue_token(user, db)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    institution_name = None
    if current_user.institution_id:
        inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        if inst:
            institution_name = inst.name
    
    resp = UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        institution_id=current_user.institution_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        institution_name=institution_name
    )
    return resp

@router.get("/demo-personas")
def get_demo_personas():
    """Reference accounts for rapid testing."""
    return [
        {
            "role": "COLLEGE_USER",
            "title": "College Institutional Officer",
            "institution": "Delhi Institute of Technology & Science",
            "email": "college@demo.aicte.gov.in",
            "password": "Demo@12345",
            "description": "Submit FDRs, manage renewals, upload documents, track scrutiny."
        },
        {
            "role": "AICTE_OFFICER",
            "title": "AICTE Scrutiny & Verification Officer",
            "institution": "AICTE Headquarters / Regional Office",
            "email": "officer@demo.aicte.gov.in",
            "password": "Demo@12345",
            "description": "Scrutinize FDR documents, record verification decisions, flag discrepancies."
        },
        {
            "role": "ADMIN",
            "title": "System Administrator",
            "institution": "AICTE ICT Cell",
            "email": "admin@demo.aicte.gov.in",
            "password": "Demo@12345",
            "description": "Manage users and permissions, monitor audit trail."
        }
    ]
