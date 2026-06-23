"""
Code parser utilities for extracting Python code from LLM responses
Handles markdown code fences and other formatting issues
"""

import re
from typing import Tuple


def extract_python_code(text: str) -> str:
    """
    Extract Python code from text that may contain markdown fences

    Args:
        text: Raw text that may contain code with markdown fences

    Returns:
        Clean Python code without markdown formatting
    """
    # Check if text contains markdown code fences
    if '```' in text:
        return _extract_from_fences(text)

    # Otherwise return as-is (should be clean code)
    return text.strip()


def _extract_from_fences(text: str) -> str:
    """
    Extract code from markdown code fences

    Supports formats:
    - ```python\ncode\n```
    - ```\ncode\n```
    - Multiple fence blocks (returns all concatenated)
    - Incomplete fences (```python\ncode without closing fence)
    """
    # Pattern to match code fences with optional language specifier
    # Matches: ```python or ``` followed by content, then closing ```
    pattern = r'```(?:python)?\s*\n(.*?)```'

    matches = re.findall(pattern, text, re.DOTALL)

    if matches:
        # If multiple blocks found, concatenate them
        code_blocks = [match.strip() for match in matches]
        return '\n\n'.join(code_blocks)

    # Fallback: try to extract everything between first and last ```
    parts = text.split('```')
    if len(parts) >= 3:
        # Get content between first and last fence
        # Skip parts[0] (before first fence) and parts[-1] (after last fence)
        code_parts = []
        for i in range(1, len(parts) - 1, 2):
            # Every odd index is code content
            code = parts[i].strip()
            # Remove language specifier if present (handles "python\n" or "python ")
            for lang_prefix in ['python\n', 'python ', 'py\n', 'py ']:
                if code.startswith(lang_prefix):
                    code = code[len(lang_prefix):]
                    break
            code_parts.append(code)

        if code_parts:
            return '\n\n'.join(code_parts)

    # Edge case: Single opening fence without closing (```python\ncode)
    if '```' in text:
        parts = text.split('```', 1)
        if len(parts) == 2:
            code = parts[1].strip()
            # Remove language specifier
            for lang_prefix in ['python\n', 'python ', 'py\n', 'py ']:
                if code.startswith(lang_prefix):
                    code = code[len(lang_prefix):]
                    break
            return code

    # If no fences found or extraction failed, return original stripped
    return text.strip()


def has_markdown_fences(text: str) -> bool:
    """
    Check if text contains markdown code fences

    Args:
        text: Text to check

    Returns:
        True if markdown fences detected, False otherwise
    """
    return '```' in text


def clean_code_response(text: str) -> str:
    """
    Clean code response from LLM, removing common formatting issues

    Args:
        text: Raw response from LLM

    Returns:
        Clean Python code
    """
    # Extract from fences if present
    code = extract_python_code(text)

    # Remove common prefixes
    prefixes_to_remove = [
        'Here is the code:',
        'Here is the Python code:',
        'Here\'s the code:',
        'Here\'s the Python code:',
        'The code:',
        'Python code:',
    ]

    code_lower = code.lower()
    for prefix in prefixes_to_remove:
        if code_lower.startswith(prefix.lower()):
            code = code[len(prefix):].strip()
            break

    # Remove trailing explanatory text (after the code)
    # Look for common patterns like "This code...", "The above code..."
    lines = code.split('\n')
    clean_lines = []

    for line in lines:
        line_lower = line.strip().lower()
        # Stop if we hit explanatory text
        if (line_lower.startswith('this code') or
            line_lower.startswith('the above') or
            line_lower.startswith('the code above') or
            line_lower.startswith('note:')):
            break
        # Skip lines that are ONLY markdown fences (not part of actual code)
        if line.strip() in ['```', '```python', '```py']:
            continue
        clean_lines.append(line)

    result = '\n'.join(clean_lines).strip()

    # Final safety: remove any remaining standalone markdown fences
    result = result.replace('```python', '').replace('```py', '').replace('```', '')

    return result


def validate_python_code(code: str) -> Tuple[bool, str]:
    """
    Validate that the extracted code is valid Python

    Args:
        code: Python code to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    import ast

    try:
        ast.parse(code)
        return True, ""
    except SyntaxError as e:
        return False, f"Syntax error at line {e.lineno}: {e.msg}"
    except Exception as e:
        return False, f"Validation error: {str(e)}"
