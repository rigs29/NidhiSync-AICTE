import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.models import FDRRecord, RenewalRecord, User, Institution
from app.schemas.schemas import RenewalCreate, RenewalResponse, RenewalReview
from app.security.auth import get_current_user, require_roles, verify_institution_access
from app.services.audit import log_audit
from app.notifications.service import NotificationService

router = APIRouter(prefix="/renewals", tags=["Renewals"])

@router.get("", response_model=List[RenewalResponse])
def get_renewals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RenewalRecord).join(
        FDRRecord, RenewalRecord.original_fdr_id == FDRRecord.id
    )

    if current_user.role == "COLLEGE_USER":
        if not current_user.institution_id:
            return []
        query = query.filter(FDRRecord.institution_id == current_user.institution_id)

    renewals = query.order_by(desc(RenewalRecord.created_at)).all()

    results = []
    for r in renewals:
        orig = db.query(FDRRecord).filter(FDRRecord.id == r.original_fdr_id).first()
        repl = db.query(FDRRecord).filter(FDRRecord.id == r.replacement_fdr_id).first()
        results.append(RenewalResponse(
            id=r.id,
            original_fdr_id=r.original_fdr_id,
            original_fdr_number=orig.fdr_number if orig else None,
            replacement_fdr_id=r.replacement_fdr_id,
            replacement_fdr_number=repl.fdr_number if repl else None,
            submission_date=r.submission_date,
            status=r.status,
            remarks=r.remarks,
            created_at=r.created_at
        ))
    return results

@router.post("", response_model=RenewalResponse)
def submit_renewal(
    data: RenewalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve original FDR
    original_fdr = db.query(FDRRecord).filter(FDRRecord.id == data.original_fdr_id).first()
    if not original_fdr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original FDR record not found")

    verify_institution_access(current_user, original_fdr.institution_id)

    if data.maturity_date < data.issue_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maturity date cannot be earlier than Issue date")

    # Create new replacement FDR record linked to original
    issue_dt = datetime.datetime.combine(data.issue_date, datetime.time())
    maturity_dt = datetime.datetime.combine(data.maturity_date, datetime.time())

    replacement_fdr = FDRRecord(
        institution_id=original_fdr.institution_id,
        fdr_number=data.fdr_number.strip(),
        bank_name=data.bank_name.strip(),
        branch_name=data.branch_name.strip(),
        amount=data.amount,
        currency="INR",
        issue_date=issue_dt,
        maturity_date=maturity_dt,
        deposit_type=data.deposit_type,
        administrative_status="SUBMITTED",
        maturity_status="ACTIVE",
        verification_status="PENDING",
        scrutiny_remarks=f"Renewal/Replacement for FDR {original_fdr.fdr_number}",
        original_fdr_id=original_fdr.id,
        submission_date=datetime.datetime.utcnow(),
        submitted_by_id=current_user.id
    )
    db.add(replacement_fdr)
    db.flush()  # To obtain replacement_fdr.id

    # Create Renewal Record audit relation
    renewal_record = RenewalRecord(
        original_fdr_id=original_fdr.id,
        replacement_fdr_id=replacement_fdr.id,
        submission_date=datetime.datetime.utcnow(),
        status="PENDING_REVIEW",
        remarks=data.remarks
    )
    db.add(renewal_record)

    # Update original FDR status to reflect renewal in progress
    original_fdr.administrative_status = "RENEWAL_SUBMITTED"
    db.commit()
    db.refresh(renewal_record)

    log_audit(
        db,
        action="SUBMIT_RENEWAL",
        entity_type="RenewalRecord",
        entity_id=str(renewal_record.id),
        actor=current_user,
        metadata_json={
            "original_fdr_id": original_fdr.id,
            "original_fdr_number": original_fdr.fdr_number,
            "replacement_fdr_id": replacement_fdr.id,
            "replacement_fdr_number": replacement_fdr.fdr_number
        }
    )

    # Notify Officers
    inst = original_fdr.institution
    inst_name = inst.name if inst else f"Institution #{original_fdr.institution_id}"
    NotificationService.notify_officers(
        db=db,
        subject=f"Renewal Submitted for FDR {original_fdr.fdr_number}",
        message=f"{inst_name} has submitted renewal FDR ({replacement_fdr.fdr_number}) replacing {original_fdr.fdr_number} for AICTE scrutiny.",
        notification_type="RENEWAL_ALERT",
        fdr_id=replacement_fdr.id
    )

    return RenewalResponse(
        id=renewal_record.id,
        original_fdr_id=original_fdr.id,
        original_fdr_number=original_fdr.fdr_number,
        replacement_fdr_id=replacement_fdr.id,
        replacement_fdr_number=replacement_fdr.fdr_number,
        submission_date=renewal_record.submission_date,
        status=renewal_record.status,
        remarks=renewal_record.remarks,
        created_at=renewal_record.created_at
    )

@router.put("/{id}/review", response_model=RenewalResponse)
def review_renewal(
    id: int,
    data: RenewalReview,
    current_user: User = Depends(require_roles(["AICTE_OFFICER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    renewal = db.query(RenewalRecord).filter(RenewalRecord.id == id).first()
    if not renewal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renewal record not found")

    valid_statuses = ["OFFICER_APPROVED", "REJECTED", "CLARIFICATION_REQUIRED"]
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review status. Officer can submit: {valid_statuses}"
        )

    renewal.status = data.status
    if data.remarks:
        renewal.remarks = f"{renewal.remarks or ''} | Officer Review: {data.remarks}".strip(" | ")

    repl = db.query(FDRRecord).filter(FDRRecord.id == renewal.replacement_fdr_id).first()
    orig = db.query(FDRRecord).filter(FDRRecord.id == renewal.original_fdr_id).first()

    if data.status == "OFFICER_APPROVED":
        if repl:
            repl.administrative_status = "UNDER_REVIEW"
            repl.scrutiny_remarks = f"Officer Endorsed: {data.remarks or 'Awaiting final administrative governance approval.'}"
    elif data.status == "REJECTED":
        if repl:
            repl.administrative_status = "REJECTED"
            repl.scrutiny_remarks = f"Renewal Rejected: {data.remarks or 'Non-compliant replacement instrument.'}"
        if orig:
            orig.administrative_status = "MATURED"
    elif data.status == "CLARIFICATION_REQUIRED":
        if repl:
            repl.administrative_status = "CLARIFICATION_REQUIRED"
            repl.scrutiny_remarks = f"Clarification Required: {data.remarks or 'Please re-submit corrected instrument.'}"

    db.commit()
    db.refresh(renewal)

    log_audit(
        db,
        action=f"REVIEW_RENEWAL_{data.status}",
        entity_type="RenewalRecord",
        entity_id=str(renewal.id),
        actor=current_user,
        metadata_json={
            "status": data.status,
            "remarks": data.remarks,
            "original_fdr_id": renewal.original_fdr_id,
            "replacement_fdr_id": renewal.replacement_fdr_id
        }
    )

    if orig and orig.submitted_by_id:
        NotificationService.send_notification(
            db=db,
            recipient_id=orig.submitted_by_id,
            subject=f"Renewal Review Status: {data.status} for FDR {orig.fdr_number}",
            message=f"Renewal application for FDR {orig.fdr_number} (Replacement: {repl.fdr_number if repl else ''}) has been marked {data.status}. Remarks: {data.remarks or 'N/A'}",
            notification_type="RENEWAL_ALERT",
            fdr_id=repl.id if repl else orig.id
        )

    return RenewalResponse(
        id=renewal.id,
        original_fdr_id=renewal.original_fdr_id,
        original_fdr_number=orig.fdr_number if orig else None,
        replacement_fdr_id=renewal.replacement_fdr_id,
        replacement_fdr_number=repl.fdr_number if repl else None,
        submission_date=renewal.submission_date,
        status=renewal.status,
        remarks=renewal.remarks,
        created_at=renewal.created_at
    )

@router.put("/{id}/admin-approve", response_model=RenewalResponse)
def admin_approve_renewal(
    id: int,
    data: RenewalReview,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    renewal = db.query(RenewalRecord).filter(RenewalRecord.id == id).first()
    if not renewal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renewal record not found")

    repl = db.query(FDRRecord).filter(FDRRecord.id == renewal.replacement_fdr_id).first()
    orig = db.query(FDRRecord).filter(FDRRecord.id == renewal.original_fdr_id).first()

    renewal.status = "APPROVED"
    if data.remarks:
        renewal.remarks = f"{renewal.remarks or ''} | Final Admin Approval: {data.remarks}".strip(" | ")

    if repl:
        repl.administrative_status = "VERIFIED"
        repl.maturity_status = "ACTIVE"
        repl.verification_status = "VERIFIED"
        repl.scrutiny_remarks = f"Renewal Endorsed & Activated by AICTE Administration. {data.remarks or ''}".strip()

    if orig:
        orig.administrative_status = "SUPERSEDED_BY_RENEWAL"
        orig.scrutiny_remarks = f"Statutorily renewed and replaced by FDR {repl.fdr_number if repl else '#' + str(renewal.replacement_fdr_id)}."

    db.commit()
    db.refresh(renewal)

    log_audit(
        db,
        action="FINAL_APPROVE_RENEWAL",
        entity_type="RenewalRecord",
        entity_id=str(renewal.id),
        actor=current_user,
        metadata_json={
            "status": "APPROVED",
            "remarks": data.remarks,
            "original_fdr_number": orig.fdr_number if orig else None,
            "replacement_fdr_number": repl.fdr_number if repl else None
        }
    )

    if orig and orig.submitted_by_id:
        NotificationService.send_notification(
            db=db,
            recipient_id=orig.submitted_by_id,
            subject=f"FINAL APPROVAL: FDR Renewal Activated ({repl.fdr_number if repl else ''})",
            message=f"System Administration has granted final approval for the renewal of FDR {orig.fdr_number}. Replacement instrument {repl.fdr_number if repl else ''} is now active under AICTE joint lien.",
            notification_type="RENEWAL_ALERT",
            fdr_id=repl.id if repl else orig.id
        )

    return RenewalResponse(
        id=renewal.id,
        original_fdr_id=renewal.original_fdr_id,
        original_fdr_number=orig.fdr_number if orig else None,
        replacement_fdr_id=renewal.replacement_fdr_id,
        replacement_fdr_number=repl.fdr_number if repl else None,
        submission_date=renewal.submission_date,
        status=renewal.status,
        remarks=renewal.remarks,
        created_at=renewal.created_at
    )
