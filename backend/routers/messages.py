from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import User, Friendship, Message

router = APIRouter(prefix="/api/messages", tags=["messages"])


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


def message_card(msg: Message):
    return {
        "id": msg.id,
        "from_user_id": msg.from_user_id,
        "to_user_id": msg.to_user_id,
        "text": msg.text,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "read_at": msg.read_at.isoformat() if msg.read_at else None,
    }


@router.get("/{friend_id}")
def list_messages(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_friend = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == friend_id,
        )
        .first()
    )

    if not is_friend:
        raise HTTPException(status_code=403, detail="You can only chat with friends")

    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(
                    Message.from_user_id == current_user.id,
                    Message.to_user_id == friend_id,
                ),
                and_(
                    Message.from_user_id == friend_id,
                    Message.to_user_id == current_user.id,
                ),
            )
        )
        .order_by(Message.created_at.asc())
        .limit(100)
        .all()
    )

    for msg in messages:
        if msg.to_user_id == current_user.id and msg.read_at is None:
            msg.read_at = datetime.now(timezone.utc)

    db.commit()

    return [message_card(m) for m in messages]


@router.post("/{friend_id}")
def send_message(
    friend_id: int,
    data: MessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_friend = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == friend_id,
        )
        .first()
    )

    if not is_friend:
        raise HTTPException(status_code=403, detail="You can only message friends")

    msg = Message(
        from_user_id=current_user.id,
        to_user_id=friend_id,
        text=data.text.strip(),
    )

    db.add(msg)
    db.commit()
    db.refresh(msg)

    return message_card(msg)