from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from datetime import datetime, timezone, timedelta
from database import get_db
from deps import get_current_user
from models import User, FriendRequest, Friendship

router = APIRouter(prefix="/api/friends", tags=["friends"])


def user_card(user: User):
    now = datetime.now(timezone.utc)
    last_seen = user.last_seen

    if last_seen and last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)

    online = bool(last_seen and now - last_seen < timedelta(seconds=60))

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "picture": user.picture,
        "bio": user.bio,
        "online": online,
        "last_seen": user.last_seen.isoformat() if user.last_seen else None,
    }


@router.get("/search")
def search_users(
    q: str = Query(min_length=1, max_length=80),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = q.strip().lower()

    def compact(value):
        return (
            (value or "")
            .lower()
            .replace("@", "")
            .replace(".", "")
            .replace("_", "")
            .replace("-", "")
            .replace(" ", "")
        )

    raw_compact = compact(raw)

    all_users = (
        db.query(User)
        .filter(User.id != current_user.id)
        .limit(200)
        .all()
    )

    results = []

    for user in all_users:
        name = user.name or ""
        username = user.username or ""
        email = user.email or ""

        normal_match = (
            raw in name.lower()
            or raw in username.lower()
            or raw in email.lower()
        )

        compact_match = (
            raw_compact in compact(name)
            or raw_compact in compact(username)
            or raw_compact in compact(email)
        )

        if normal_match or compact_match:
            results.append(user_card(user))

    return results[:20]


@router.get("")
def list_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Friendship)
        .filter(Friendship.user_id == current_user.id)
        .all()
    )

    return [user_card(row.friend) for row in rows]


@router.post("/request/{user_id}")
def send_friend_request(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself")

    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    already_friends = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == user_id,
        )
        .first()
    )
    if already_friends:
        raise HTTPException(status_code=400, detail="Already friends")

    existing = (
        db.query(FriendRequest)
        .filter(
            or_(
                and_(
                    FriendRequest.from_user_id == current_user.id,
                    FriendRequest.to_user_id == user_id,
                ),
                and_(
                    FriendRequest.from_user_id == user_id,
                    FriendRequest.to_user_id == current_user.id,
                ),
            )
        )
        .first()
    )

    if existing:
        # A prior request that was rejected should be re-openable rather than
        # permanently blocked by the unique constraint.
        if existing.status == "rejected":
            existing.from_user_id = current_user.id
            existing.to_user_id = user_id
            existing.status = "pending"
            db.commit()
            return {"ok": True, "status": "pending"}
        return {"ok": True, "status": existing.status}

    request = FriendRequest(
        from_user_id=current_user.id,
        to_user_id=user_id,
        status="pending",
    )
    db.add(request)
    db.commit()

    return {"ok": True, "status": "pending"}


@router.get("/requests")
def incoming_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    requests = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.to_user_id == current_user.id,
            FriendRequest.status == "pending",
        )
        .all()
    )

    return [
        {
            "id": req.id,
            "from_user": user_card(req.from_user),
            "created_at": req.created_at.isoformat() if req.created_at else None,
        }
        for req in requests
        if req.from_user is not None  # skip requests whose sender was deleted
    ]


@router.post("/accept/{request_id}")
def accept_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.get(FriendRequest, request_id)

    if not req or req.to_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")

    req.status = "accepted"

    db.add(Friendship(user_id=req.from_user_id, friend_id=req.to_user_id))
    db.add(Friendship(user_id=req.to_user_id, friend_id=req.from_user_id))

    db.commit()

    return {"ok": True}


@router.post("/reject/{request_id}")
def reject_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.get(FriendRequest, request_id)

    if not req or req.to_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = "rejected"
    db.commit()

    return {"ok": True}
@router.post("/heartbeat")
def heartbeat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.last_seen = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}