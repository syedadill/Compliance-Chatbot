"""
Add knowledgebases table and update documents

Revision ID: 003_add_knowledgebases
Revises: 002_add_insuf_info_enum
Create Date: 2026-02-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '003_add_knowledgebases'
down_revision = '002_add_insuf_info_enum'
branch_labels = None
depends_on = None

def upgrade():
    # Create knowledgebases table
    op.create_table(
        'knowledgebases',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    
    # Add knowledgebase_id column to documents table
    op.add_column('documents', sa.Column('knowledgebase_id', UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_documents_knowledgebase',
        'documents', 'knowledgebases',
        ['knowledgebase_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_documents_knowledgebase', 'documents', type_='foreignkey')
    op.drop_column('documents', 'knowledgebase_id')
    op.drop_table('knowledgebases')
