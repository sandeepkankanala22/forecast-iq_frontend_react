"""
Playbook Agent – generates branded Word document playbooks.

Public API
----------
    from agents.playbook_agent import add_heading, add_body, add_bullet
"""

from .agent import (
    add_heading,
    add_subheading,
    add_body,
    add_bullet,
    add_divider,
    add_screenshot_placeholder,
    shade_paragraph,
    shade_cell,
)

__all__ = [
    "add_heading",
    "add_subheading",
    "add_body",
    "add_bullet",
    "add_divider",
    "add_screenshot_placeholder",
    "shade_paragraph",
    "shade_cell",
]
