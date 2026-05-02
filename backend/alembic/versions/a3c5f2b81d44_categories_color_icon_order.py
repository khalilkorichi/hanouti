"""Add color, icon, display_order to categories

Revision ID: a3c5f2b81d44
Revises: e47edd65c5a4
Create Date: 2026-05-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c5f2b81d44'
down_revision: Union[str, Sequence[str], None] = 'e47edd65c5a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    try:
        cols = [c['name'] for c in insp.get_columns(table)]
        return column in cols
    except Exception:
        return False


def upgrade() -> None:
    """Upgrade schema — add color, icon, display_order to categories (idempotent)."""
    if not _has_column('categories', 'color'):
        op.add_column(
            'categories',
            sa.Column('color', sa.String(), nullable=True, server_default='#1976d2'),
        )
    if not _has_column('categories', 'icon'):
        op.add_column(
            'categories',
            sa.Column('icon', sa.String(), nullable=True, server_default='Category'),
        )
    if not _has_column('categories', 'display_order'):
        op.add_column(
            'categories',
            sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        )

    # Best-effort: backfill display_order from id for existing rows
    bind = op.get_bind()
    try:
        bind.exec_driver_sql(
            "UPDATE categories SET display_order = id WHERE display_order = 0 OR display_order IS NULL"
        )
    except Exception:
        pass

    # Indexes (ignore if already there)
    try:
        op.create_index(
            'ix_categories_display_order', 'categories', ['display_order'], unique=False
        )
    except Exception:
        pass
    try:
        op.create_index(
            'ix_categories_order_name', 'categories', ['display_order', 'name'], unique=False
        )
    except Exception:
        pass


def downgrade() -> None:
    """Downgrade schema."""
    try:
        op.drop_index('ix_categories_order_name', table_name='categories')
    except Exception:
        pass
    try:
        op.drop_index('ix_categories_display_order', table_name='categories')
    except Exception:
        pass
    if _has_column('categories', 'display_order'):
        op.drop_column('categories', 'display_order')
    if _has_column('categories', 'icon'):
        op.drop_column('categories', 'icon')
    if _has_column('categories', 'color'):
        op.drop_column('categories', 'color')
