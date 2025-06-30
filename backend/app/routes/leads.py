from quart import Blueprint, request, jsonify
from datetime import datetime
from app.models import Lead, ActivityLog, ActivityType, User
from app.database import SessionLocal
from app.utils.auth_utils import requires_auth
from app.utils.email_utils import send_assignment_notification
from app.utils.phone_utils import clean_phone_number
from app.constants import TYPE_OPTIONS, LEAD_STATUS_OPTIONS, PHONE_LABELS
from sqlalchemy import or_, and_
from sqlalchemy.orm import joinedload

leads_bp = Blueprint("leads", __name__, url_prefix="/api/leads")


# Replace your existing list_leads function in leads.py with this:

@leads_bp.route("/", methods=["GET"])
@requires_auth()
async def list_leads():
    user = request.user
    session = SessionLocal()
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
        sort_order = request.args.get("sort", "newest")
        
        # Validate sort order
        if sort_order not in ["newest", "oldest", "alphabetical"]:
            sort_order = "newest"

        query = session.query(Lead).options(
            joinedload(Lead.assigned_user),
            joinedload(Lead.created_by_user)
        ).filter(
            Lead.tenant_id == user.tenant_id,
            Lead.deleted_at == None,
            or_(
                Lead.assigned_to == user.id,
                and_(
                    Lead.assigned_to == None,
                    Lead.created_by == user.id
                )
            )
        )

        # Apply sorting
        if sort_order == "newest":
            query = query.order_by(Lead.created_at.desc())
        elif sort_order == "oldest":
            query = query.order_by(Lead.created_at.asc())
        elif sort_order == "alphabetical":
            query = query.order_by(Lead.name.asc())

        total = query.count()
        leads = query.offset((page - 1) * per_page).limit(per_page).all()

        response = jsonify({
            "leads": [{
                "id": l.id,
                "name": l.name,
                "contact_person": l.contact_person,
                "contact_title": l.contact_title,
                "email": l.email,
                "phone": l.phone,
                "phone_label": l.phone_label,
                "secondary_phone": l.secondary_phone,
                "secondary_phone_label": l.secondary_phone_label,
                "address": l.address,
                "city": l.city,
                "state": l.state,
                "zip": l.zip,
                "notes": l.notes,
                "created_at": l.created_at.isoformat() + "Z",
                "assigned_to": l.assigned_to,
                "assigned_to_name": (
                    l.assigned_user.email if l.assigned_user
                    else l.created_by_user.email if l.created_by_user
                    else None
                ),
                "lead_status": l.lead_status,
                "converted_on": l.converted_on.isoformat() + "Z" if l.converted_on else None,
                "type": l.type  
            } for l in leads],
            "total": total,
            "page": page,
            "per_page": per_page,
            "sort_order": sort_order
        })
        response.headers["Cache-Control"] = "no-store"
        return response
    finally:
        session.close()


@leads_bp.route("/", methods=["POST"])
@requires_auth()
async def create_lead():
    user = request.user
    data = await request.get_json()
    
    session = SessionLocal()
    try:
        lead_type = data.get("type", TYPE_OPTIONS[0])
        
        if lead_type not in TYPE_OPTIONS:
            lead_type = TYPE_OPTIONS[0]

        lead = Lead(
            tenant_id=user.tenant_id,
            created_by=user.id,
            name=data["name"],
            contact_person=data.get("contact_person"),
            contact_title=data.get("contact_title"),
            email=data.get("email"),
            phone=clean_phone_number(data.get("phone")) if data.get("phone") else None,
            phone_label=data.get("phone_label", PHONE_LABELS[0]),
            secondary_phone=clean_phone_number(data.get("secondary_phone")) if data.get("secondary_phone") else None,
            secondary_phone_label=data.get("secondary_phone_label"),
            address=data.get("address"),
            city=data.get("city"),
            state=data.get("state"),
            zip=data.get("zip"),
            notes=data.get("notes"),
            type=lead_type,
            created_at=datetime.utcnow()
        )
        
        session.add(lead)
        session.commit()
        session.refresh(lead)
        return jsonify({"id": lead.id}), 201
    finally:
        session.close()

@leads_bp.route("/<int:lead_id>", methods=["GET"])
@requires_auth()
async def get_lead(lead_id):
    user = request.user
    session = SessionLocal()
    try:
        lead_query = session.query(Lead).options(
            joinedload(Lead.assigned_user),
            joinedload(Lead.created_by_user)
        ).filter(
            Lead.id == lead_id,
            Lead.tenant_id == user.tenant_id,
            Lead.deleted_at == None
        )

        if not any(role.name == "admin" for role in user.roles):
            lead_query = lead_query.filter(
                or_(
                    Lead.created_by == user.id,
                    Lead.assigned_to == user.id
                )
            )

        lead = lead_query.first()

        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        log = ActivityLog(
            tenant_id=user.tenant_id,
            user_id=user.id,
            action=ActivityType.viewed,
            entity_type="lead",
            entity_id=lead.id,
            description=f"Viewed lead '{lead.name}'"
        )
        session.add(log)
        session.commit()

        response = jsonify({
            "id": lead.id,
            "name": lead.name,
            "contact_person": lead.contact_person,
            "contact_title": lead.contact_title,
            "email": lead.email,
            "phone": lead.phone,
            "phone_label": lead.phone_label,
            "secondary_phone": lead.secondary_phone,
            "secondary_phone_label": lead.secondary_phone_label,
            "address": lead.address,
            "city": lead.city,
            "state": lead.state,
            "zip": lead.zip,
            "notes": lead.notes,
            "created_at": lead.created_at.isoformat() + "Z",
            "lead_status": lead.lead_status,
            "converted_on": lead.converted_on.isoformat() + "Z" if lead.converted_on else None,
            "type": lead.type
        })
        response.headers["Cache-Control"] = "no-store"
        return response
    finally:
        session.close()


@leads_bp.route("/<int:lead_id>", methods=["PUT"])
@requires_auth()
async def update_lead(lead_id):
    user = request.user
    data = await request.get_json()
    
    session = SessionLocal()
    try:
        lead = session.query(Lead).filter(
            Lead.id == lead_id,
            Lead.tenant_id == user.tenant_id,
            or_(
                Lead.created_by == user.id,
                Lead.assigned_to == user.id
            ),
            Lead.deleted_at == None
        ).first()

        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        for field in [
            "name", "contact_person", "contact_title", "email", "phone_label",
            "secondary_phone_label", "address", "city", "state", "zip", "notes"
        ]:
            if field in data:
                setattr(lead, field, data[field] or None)

        if "phone" in data:
            lead.phone = clean_phone_number(data["phone"]) if data["phone"] else None
        if "secondary_phone" in data:
            lead.secondary_phone = clean_phone_number(data["secondary_phone"]) if data["secondary_phone"] else None

        if "lead_status" in data:
            new_status = data["lead_status"]
            if new_status in LEAD_STATUS_OPTIONS:
                if new_status == "converted" and lead.lead_status != "converted":
                    lead.converted_on = datetime.utcnow()
                lead.lead_status = new_status

        if "type" in data and data["type"] in TYPE_OPTIONS:
            lead.type = data["type"]

        lead.updated_by = user.id
        lead.updated_at = datetime.utcnow()

        session.commit()
        session.refresh(lead)
        return jsonify({"id": lead.id})
    finally:
        session.close()


@leads_bp.route("/<int:lead_id>", methods=["DELETE"])
@requires_auth()
async def delete_lead(lead_id):
    user = request.user
    session = SessionLocal()
    try:
        lead = session.query(Lead).filter(
            Lead.id == lead_id,
            Lead.tenant_id == user.tenant_id,
            or_(
                Lead.created_by == user.id,
                Lead.assigned_to == user.id
            ),
            Lead.deleted_at == None
        ).first()

        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        lead.deleted_at = datetime.utcnow()
        lead.deleted_by = user.id
        session.commit()
        return jsonify({"message": "Lead soft-deleted successfully"})
    finally:
        session.close()


@leads_bp.route("/<int:lead_id>/assign", methods=["PUT"])
@requires_auth(roles=["admin"])
async def assign_lead(lead_id):
    user = request.user
    data = await request.get_json()
    assigned_to = data.get("assigned_to")

    session = SessionLocal()
    try:
        lead = session.query(Lead).filter(
            Lead.id == lead_id,
            Lead.tenant_id == user.tenant_id,
            Lead.deleted_at == None
        ).first()

        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        # Validate that assigned_to is a valid user
        if assigned_to:
            assigned_user = session.query(User).filter(
                User.id == assigned_to,
                User.tenant_id == user.tenant_id,
                User.is_active == True
            ).first()
            
            if not assigned_user:
                return jsonify({"error": f"User {assigned_to} not found or not active"}), 400

        lead.assigned_to = assigned_to
        lead.updated_by = user.id
        lead.updated_at = datetime.utcnow()

        # Send email to assigned user (before commit in case it fails)
        if assigned_to:
            assigned_user = session.query(User).get(assigned_to)
            if assigned_user:
                try:
                    await send_assignment_notification(
                        to_email=assigned_user.email,
                        entity_type="lead",
                        entity_name=lead.name,
                        assigned_by=user.email
                    )
                except Exception as email_error:
                    print(f"DEBUG: Email notification failed: {email_error}")
                    # Don't fail the assignment if email fails

        try:
            session.commit()
            return jsonify({"message": "Lead assigned successfully"})
        except Exception as e:
            session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
    finally:
        session.close()


# Replace the existing /all endpoint in leads.py with this paginated version

@leads_bp.route("/all", methods=["GET"])
@requires_auth(roles=["admin"])
async def list_all_leads_admin():
    user = request.user
    session = SessionLocal()
    try:
        # Get pagination parameters
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
        sort_order = request.args.get("sort", "newest")
        user_email = request.args.get("user_email")  # Filter by specific user
        
        # Validate sort order
        if sort_order not in ["newest", "oldest", "alphabetical"]:
            sort_order = "newest"

        query = session.query(Lead).options(
            joinedload(Lead.assigned_user),
            joinedload(Lead.created_by_user)
        ).filter(
            Lead.tenant_id == user.tenant_id,
            Lead.deleted_at == None
        )

        # Filter by user if specified
        if user_email:
            query = query.filter(
                or_(
                    Lead.assigned_user.has(User.email == user_email),
                    Lead.created_by_user.has(User.email == user_email)
                )
            )

        # Apply sorting
        if sort_order == "newest":
            query = query.order_by(Lead.created_at.desc())
        elif sort_order == "oldest":
            query = query.order_by(Lead.created_at.asc())
        elif sort_order == "alphabetical":
            query = query.order_by(Lead.name.asc())

        total = query.count()
        leads = query.offset((page - 1) * per_page).limit(per_page).all()

        response_data = {
            "leads": [{
                "id": l.id,
                "name": l.name,
                "contact_person": l.contact_person,
                "contact_title": l.contact_title,
                "email": l.email,
                "phone": l.phone,
                "phone_label": l.phone_label,
                "secondary_phone": l.secondary_phone,
                "secondary_phone_label": l.secondary_phone_label,
                "address": l.address,
                "city": l.city,
                "state": l.state,
                "zip": l.zip,
                "notes": l.notes,
                "assigned_to": l.assigned_to,
                "created_at": l.created_at.isoformat() + "Z",
                "lead_status": l.lead_status,
                "converted_on": l.converted_on.isoformat() + "Z" if l.converted_on else None,
                "type": l.type,
                "assigned_to_name": (
                    l.assigned_user.email if l.assigned_user
                    else l.created_by_user.email if l.created_by_user
                    else None
                ),
                "created_by_name": l.created_by_user.email if l.created_by_user else None,
            } for l in leads],
            "total": total,
            "page": page,
            "per_page": per_page,
            "sort_order": sort_order,
            "user_email": user_email
        }

        response = jsonify(response_data)
        response.headers["Cache-Control"] = "no-store"
        return response
    finally:
        session.close()


@leads_bp.route("/assigned", methods=["GET"])
@requires_auth(roles=["admin"])
async def list_assigned_leads():
    user = request.user
    session = SessionLocal()
    try:
        leads = session.query(Lead).filter(
            Lead.tenant_id == user.tenant_id,
            Lead.deleted_at == None,
            Lead.assigned_to != None
        ).all()

        response = jsonify([{
            "id": l.id,
            "name": l.name,
            "contact_person": l.contact_person,
            "contact_title": l.contact_title,
            "email": l.email,
            "phone": l.phone,
            "phone_label": l.phone_label,
            "secondary_phone": l.secondary_phone,
            "secondary_phone_label": l.secondary_phone_label,
            "address": l.address,
            "city": l.city,
            "state": l.state,
            "zip": l.zip,
            "notes": l.notes,
            "assigned_to": l.assigned_to,
            "created_at": l.created_at.isoformat() + "Z",
            "lead_status": l.lead_status,
            "converted_on": l.converted_on.isoformat() + "Z" if l.converted_on else None,
            "type": l.type
        } for l in leads])
        response.headers["Cache-Control"] = "no-store"
        return response
    finally:
        session.close()