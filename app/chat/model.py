import sqlite3
from flask import g

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'database.db')
schema_path = os.path.join(BASE_DIR, 'schema.sql')


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    with open(schema_path, 'r', encoding='utf8') as f:
        db.executescript(f.read())
    db.commit()

# ======== User helper =========
def get_or_create_user(email):
    db = get_db()
    user = db.execute(
        "SELECT id FROM users WHERE email = ?", (email,)
    ).fetchone()
    if user:
        return user["id"]

    db.execute("INSERT INTO users (email) VALUES (?)", (email,))
    db.commit()
    user = db.execute(
        "SELECT id FROM users WHERE email = ?", (email,)
    ).fetchone()
    return user["id"]

# ======== Conversation helper =========
def list_conversations(email):
    """Trả về list cuộc hội thoại của user."""
    db = get_db()
    user_id = get_or_create_user(email)
    rows = db.execute(
        """
        SELECT id, title,
               created_at,
               updated_at
        FROM conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC
        """,
        (user_id,),
    ).fetchall()
    return [
        {
            "id": r["id"],
            "title": r["title"] or "New chat",
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]

def create_conversation(email, title="New chat"):
    db = get_db()
    user_id = get_or_create_user(email)
    db.execute(
        "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
        (user_id, title),
    )
    db.commit()
    row = db.execute(
        """
        SELECT id, title, created_at, updated_at
        FROM conversations
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    return {
        "id": row["id"],
        "title": row["title"] or "New chat",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }

def rename_conversation(email, convo_id, title):
    db = get_db()
    user_id = get_or_create_user(email)
    db.execute(
        """
        UPDATE conversations
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
        """,
        (title, convo_id, user_id),
    )
    db.commit()

def delete_conversation(email, convo_id):
    db = get_db()
    user_id = get_or_create_user(email)
    # Xóa messages trước
    db.execute(
        "DELETE FROM messages WHERE conversation_id = ? AND user_id = ?",
        (convo_id, user_id),
    )
    # Xóa cuộc hội thoại
    db.execute(
        "DELETE FROM conversations WHERE id = ? AND user_id = ?",
        (convo_id, user_id),
    )
    db.commit()

# ======== Message helper =========
def save_message(email, role, content, conversation_id):
    db = get_db()
    user_id = get_or_create_user(email)
    db.execute(
        """
        INSERT INTO messages (user_id, conversation_id, role, content)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, conversation_id, role, content),
    )
    # Cập nhật updated_at cho conversation
    db.execute(
        """
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
        """,
        (conversation_id, user_id),
    )
    db.commit()

def get_messages(email, conversation_id):
    db = get_db()
    user_id = get_or_create_user(email)
    rows = db.execute(
        """
        SELECT role, content
        FROM messages
        WHERE user_id = ? AND conversation_id = ?
        ORDER BY timestamp ASC, id ASC
        """,
        (user_id, conversation_id),
    ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in rows]
