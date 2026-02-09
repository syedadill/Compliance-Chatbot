"""
Add INSUFFICIENT_INFORMATION to compliancestatus ENUM

Revision ID: 002_add_insuf_info_enum
Revises: 001_initial
Create Date: 2026-02-07
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '002_add_insuf_info_enum'
down_revision = '001_initial'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("""
    ALTER TYPE compliancestatus ADD VALUE IF NOT EXISTS 'INSUFFICIENT_INFORMATION';
    """)

def downgrade():
    # Downgrade not supported for ENUM value removal
    pass
