"""Initial migration - PostgreSQL metadata only
Embeddings and chunks stored in Milvus vector database

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ENUMs first
    op.execute("CREATE TYPE documenttype AS ENUM ('SBP_CIRCULAR', 'SBP_POLICY', 'INTERNAL_POLICY', 'USER_UPLOAD', 'GUIDELINE')")
    op.execute("CREATE TYPE compliancestatus AS ENUM ('COMPLIANT', 'PARTIALLY COMPLIANT', 'NON-COMPLIANT', 'INSUFFICIENT INFORMATION')")
    
    # Create documents table (metadata only, chunks stored in Milvus)
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('document_type', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer, nullable=False),
        sa.Column('mime_type', sa.String(100)),
        sa.Column('title', sa.String(500)),
        sa.Column('description', sa.Text),
        sa.Column('source', sa.String(255)),
        sa.Column('circular_number', sa.String(100)),
        sa.Column('effective_date', sa.DateTime),
        sa.Column('is_processed', sa.Boolean, server_default='false'),
        sa.Column('processing_error', sa.Text),
        sa.Column('chunk_count', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Cast document_type column to documenttype enum (with default value after casting)
    op.execute("ALTER TABLE documents ALTER COLUMN document_type TYPE documenttype USING document_type::documenttype")
    op.execute("ALTER TABLE documents ALTER COLUMN document_type SET DEFAULT 'USER_UPLOAD'::documenttype")
    
    # Create document_chunks table (metadata, embeddings stored in Milvus)
    op.create_table(
        'document_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('chunk_text', sa.Text, nullable=False),
        sa.Column('chunk_index', sa.Integer, nullable=False),
        sa.Column('milvus_id', sa.String(100)),
        sa.Column('page_number', sa.Integer),
        sa.Column('start_char', sa.Integer),
        sa.Column('end_char', sa.Integer),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    # Create compliance_queries table
    op.create_table(
        'compliance_queries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('query_text', sa.Text, nullable=False),
        sa.Column('query_type', sa.String(100)),
        sa.Column('uploaded_document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id')),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    # Create compliance_responses table
    op.create_table(
        'compliance_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('query_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('compliance_queries.id'), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('confidence_score', sa.Float, nullable=False),
        sa.Column('summary', sa.Text, nullable=False),
        sa.Column('analysis', postgresql.JSON),
        sa.Column('violations', postgresql.JSON),
        sa.Column('recommendations', postgresql.JSON),
        sa.Column('retrieved_chunks', postgresql.JSON),
        sa.Column('processing_time_ms', sa.Integer),
        sa.Column('llm_model_used', sa.String(100)),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    # Cast status column to compliancestatus enum
    op.execute("ALTER TABLE compliance_responses ALTER COLUMN status TYPE compliancestatus USING status::compliancestatus")
    
    # Create policy_clauses table
    op.create_table(
        'policy_clauses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('clause_number', sa.String(100), nullable=False),
        sa.Column('clause_title', sa.String(500)),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('category', sa.String(100)),
        sa.Column('subcategory', sa.String(100)),
        sa.Column('authority_level', sa.Integer, server_default='1'),
        sa.Column('effective_date', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('idx_documents_type', 'documents', ['document_type'])
    op.create_index('idx_documents_processed', 'documents', ['is_processed'])
    op.create_index('idx_document_chunks_document', 'document_chunks', ['document_id'])
    op.create_index('idx_queries_created', 'compliance_queries', ['created_at'])
    op.create_index('idx_policy_clauses_category', 'policy_clauses', ['category'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('policy_clauses')
    op.drop_table('compliance_responses')
    op.drop_table('compliance_queries')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS compliancestatus')
    op.execute('DROP TYPE IF EXISTS documenttype')
