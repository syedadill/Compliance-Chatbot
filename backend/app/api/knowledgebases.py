"""
HBL Compliance Chatbot - Knowledgebase API Routes
Handles knowledgebase CRUD operations
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import Knowledgebase, Document

router = APIRouter(prefix="/knowledgebases", tags=["knowledgebases"])


class KnowledgebaseCreate(BaseModel):
    name: str
    description: Optional[str] = None


class KnowledgebaseResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    document_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=KnowledgebaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledgebase(
    kb: KnowledgebaseCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new knowledgebase"""
    knowledgebase = Knowledgebase(
        name=kb.name,
        description=kb.description
    )
    db.add(knowledgebase)
    await db.commit()
    await db.refresh(knowledgebase)
    
    response = KnowledgebaseResponse(
        id=knowledgebase.id,
        name=knowledgebase.name,
        description=knowledgebase.description,
        document_count=0,
        created_at=knowledgebase.created_at,
        updated_at=knowledgebase.updated_at
    )
    return response


@router.get("", response_model=List[KnowledgebaseResponse])
async def list_knowledgebases(
    db: AsyncSession = Depends(get_db)
):
    """List all knowledgebases"""
    stmt = select(Knowledgebase).order_by(Knowledgebase.created_at.desc())
    result = await db.execute(stmt)
    kbs = result.scalars().all()
    
    # Get document counts for each knowledgebase
    responses = []
    for kb in kbs:
        count_stmt = select(func.count(Document.id)).where(Document.knowledgebase_id == kb.id)
        doc_count = (await db.execute(count_stmt)).scalar()
        responses.append(KnowledgebaseResponse(
            id=kb.id,
            name=kb.name,
            description=kb.description,
            document_count=doc_count or 0,
            created_at=kb.created_at,
            updated_at=kb.updated_at
        ))
    
    return responses


@router.get("/{kb_id}", response_model=KnowledgebaseResponse)
async def get_knowledgebase(
    kb_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific knowledgebase"""
    stmt = select(Knowledgebase).where(Knowledgebase.id == kb_id)
    kb = (await db.execute(stmt)).scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledgebase not found")
    
    # Get document count
    count_stmt = select(func.count(Document.id)).where(Document.knowledgebase_id == kb_id)
    doc_count = (await db.execute(count_stmt)).scalar()
    
    return KnowledgebaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        document_count=doc_count or 0,
        created_at=kb.created_at,
        updated_at=kb.updated_at
    )


@router.put("/{kb_id}", response_model=KnowledgebaseResponse)
async def update_knowledgebase(
    kb_id: UUID,
    kb_update: KnowledgebaseCreate,
    db: AsyncSession = Depends(get_db)
):
    """Update a knowledgebase"""
    stmt = select(Knowledgebase).where(Knowledgebase.id == kb_id)
    kb = (await db.execute(stmt)).scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledgebase not found")
    
    kb.name = kb_update.name
    kb.description = kb_update.description
    await db.commit()
    await db.refresh(kb)
    return kb


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledgebase(
    kb_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Delete a knowledgebase"""
    stmt = select(Knowledgebase).where(Knowledgebase.id == kb_id)
    kb = (await db.execute(stmt)).scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledgebase not found")
    
    await db.delete(kb)
    await db.commit()
