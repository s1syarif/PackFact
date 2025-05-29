from sqlalchemy import Column, Integer, String, DateTime
from database import Base
from datetime import datetime

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
