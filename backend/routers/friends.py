from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import User, FriendRequest, Friendship

router = APIRouter(prefix="/api/friends", tags=["friends"])


def user_card(user: User):
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "picture": user.picture,
        "bio": user.bio,
        "online": False,
    }


@router.get("/search")
def search_users(
    q: str = Query(min_length=1, max_length=80),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = q.strip().lower().replace("@", "")

    users = (
        db.query(User)
        .filter(User.id != current_user.id)
        .filter(
            or_(
                User.name.ilike(f"%{query}%"),
                User.username.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%"),
            )
        )
        .limit(20)
        .all()
    )

    return [user_card(user) for user in users]


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