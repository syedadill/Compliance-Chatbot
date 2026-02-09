"""fix document foreign key constraint

Revision ID: 004_fix_document_fk
Revises: 003_add_knowledgebases
Create Date: 2026-02-09 07:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_fix_document_fk'
down_revision = '003_add_knowledgebases'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the existing foreign key constraint
    op.drop_constraint(
        'compliance_queries_uploaded_document_id_fkey',
        'compliance_queries',
        type_='foreignkey'
    )
    
    # Recreate the foreign key constraint with ON DELETE SET NULL
    op.create_foreign_key(
        'compliance_queries_uploaded_document_id_fkey',
        'compliance_queries',
        'documents',
        ['uploaded_document_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop the constraint with ON DELETE SET NULL
    op.drop_constraint(
        'compliance_queries_uploaded_document_id_fkey',
        'compliance_queries',
        type_='foreignkey'
    )
    
    # Recreate the original foreign key constraint without ON DELETE
    op.create_foreign_key(
        'compliance_queries_uploaded_document_id_fkey',
        'compliance_queries',
        'documents',
        ['uploaded_document_id'],
        ['id']
    )
