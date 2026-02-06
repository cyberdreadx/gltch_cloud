"""
GLTCH Cloud API - Database Models
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"


class LLMProvider(str, enum.Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    GROK = "grok"


class KeyMode(str, enum.Enum):
    MANAGED = "managed"  # Use our keys, we bill
    BYOK = "byok"        # Bring your own key


class User(Base):
    """User account"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)  # Clerk user ID
    email = Column(String, unique=True, nullable=False)
    callsign = Column(String, nullable=False)
    
    # Subscription
    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    
    # LLM Settings
    provider = Column(Enum(LLMProvider), default=LLMProvider.OPENAI)
    key_mode = Column(Enum(KeyMode), default=KeyMode.MANAGED)
    
    # BYOK keys (encrypted)
    openai_key = Column(String, nullable=True)
    anthropic_key = Column(String, nullable=True)
    google_key = Column(String, nullable=True)
    xai_key = Column(String, nullable=True)
    
    # Usage tracking
    messages_today = Column(Integer, default=0)
    tokens_this_month = Column(Integer, default=0)
    last_message_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sessions = relationship("ChatSession", back_populates="user")
    usage_logs = relationship("UsageLog", back_populates="user")


class ChatSession(Base):
    """Chat session / conversation"""
    __tablename__ = "chat_sessions"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New Chat")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session")


class Message(Base):
    """Chat message"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    
    # Token usage
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")


class UsageLog(Base):
    """Usage tracking for billing"""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    provider = Column(Enum(LLMProvider), nullable=False)
    model = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="usage_logs")
