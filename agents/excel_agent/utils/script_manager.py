"""
Script management for Python-based Excel generation
Handles script creation, storage, retrieval, and section-based editing
"""

import ast
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from .logging_utils import get_logger

try:
    from s3_storage import s3_enabled, upload_file, s3_output_key
except ImportError:
    s3_enabled = lambda: False
    upload_file = lambda *a, **k: None
    s3_output_key = lambda *p: "/".join(p) if p else ""


class ScriptManager:
    """Manages Python scripts for Excel generation"""

    # Section markers for code injection
    DATA_SECTION = "# ===== DATA SECTION (Data Agent) ====="
    FORMULA_SECTION = "# ===== FORMULA SECTION (Math Agent) ====="
    STYLING_SECTION = "# ===== STYLING SECTION (Styler Agent) ====="

    # Whitelisted imports for safety
    ALLOWED_IMPORTS = {
        'openpyxl',
        'openpyxl.styles',
        'openpyxl.utils',
        'datetime',
        'math',
        're'
    }

    # Dangerous operations to block
    DANGEROUS_OPERATIONS = [
        'exec', 'eval', 'compile', '__import__',
        'open', 'file', 'input', 'raw_input',
        'os.', 'sys.', 'subprocess.', 'shutil.',
        'pickle.', 'shelve.', 'socket.', 'urllib.',
        'requests.', 'http.'
    ]

    def __init__(
        self,
        output_dir: str,
        session_id: Optional[str] = None,
        flat: bool = False,
        session_manager=None,
    ):
        """
        Initialize ScriptManager

        Args:
            output_dir: Base directory for script storage
            session_id: Optional session ID (auto-generated if not provided)
            flat: If True, use output_dir directly as session_dir (no session subdir)
            session_manager: Optional session manager for logging
        """
        self.logger = get_logger("ScriptManager", session_manager=session_manager)
        self.output_dir = Path(output_dir)

        if flat:
            self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")
            self.session_dir = self.output_dir
        else:
            self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")
            self.session_dir = self.output_dir / self.session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)

        # Track scripts in current session
        self.scripts: Dict[str, Path] = {}

        self.logger.info(f"Initialized ScriptManager with session: {self.session_id}")

    def create_script(self, sheet_name: str, template: str, description: str = "") -> str:
        """
        Create a new script from template

        Args:
            sheet_name: Name of the sheet
            template: Template string with placeholders
            description: Optional description for the sheet

        Returns:
            Generated script content
        """
        self.logger.info(f"Creating script for sheet: {sheet_name}")

        # Sanitize sheet name for filename
        safe_name = self._sanitize_filename(sheet_name)

        # Fill template
        script_content = template.format(
            sheet_name=sheet_name,
            description=description or f"Generated script for {sheet_name}",
            timestamp=datetime.now().isoformat()
        )

        # Save script
        script_path = self.session_dir / f"sheet_{safe_name}.py"
        script_path.write_text(script_content, encoding='utf-8')

        # Track script
        self.scripts[sheet_name] = script_path

        self.logger.info(f"Created script: {script_path}")
        return script_content

    def get_script(self, sheet_name: str) -> str:
        """
        Retrieve script content

        Args:
            sheet_name: Name of the sheet

        Returns:
            Script content

        Raises:
            FileNotFoundError: If script doesn't exist
        """
        if sheet_name not in self.scripts:
            raise FileNotFoundError(f"No script found for sheet: {sheet_name}")

        script_path = self.scripts[sheet_name]
        return script_path.read_text(encoding='utf-8')

    def save_script(self, sheet_name: str, content: str) -> Path:
        """
        Save script content with robust error handling

        Args:
            sheet_name: Name of the sheet
            content: Script content to save

        Returns:
            Path to saved script file

        Raises:
            ValueError: If sheet_name or content is invalid
            OSError: If file write fails
        """
        try:
            # Validate inputs
            if not sheet_name or not isinstance(sheet_name, str):
                raise ValueError(f"Invalid sheet_name: {sheet_name}")
            
            if not content or not isinstance(content, str):
                raise ValueError(f"Invalid content type: {type(content)}")
            
            # Sanitize and validate filename
            safe_name = self._sanitize_filename(sheet_name)
            if len(safe_name) > 100:  # Reasonable limit for sheet name
                self.logger.warning(f"Sheet name too long, truncating: {safe_name[:50]}...")
                safe_name = safe_name[:100]
            
            script_path = self.session_dir / f"sheet_{safe_name}.py"
            
            # Validate full path length (Windows has 260 char limit for legacy paths)
            if len(str(script_path)) > 250:
                raise ValueError(f"Generated file path too long: {len(str(script_path))} chars")

            # Atomic write with error handling
            temp_path = script_path.with_suffix('.tmp')
            try:
                temp_path.write_text(content, encoding='utf-8')
                temp_path.replace(script_path)
            except OSError as e:
                # Clean up temp file if it exists
                if temp_path.exists():
                    temp_path.unlink()
                raise OSError(f"Failed to write script file: {e}")

            # Track script
            self.scripts[sheet_name] = script_path

            if s3_enabled():
                key = s3_output_key(self.session_id, "scripts", script_path.name)
                upload_file(script_path, key)

            self.logger.info(f"Saved script for sheet: {sheet_name} at {script_path}")
            return script_path
            
        except Exception as e:
            self.logger.error(f"Error saving script for '{sheet_name}': {e}", exc_info=True)
            raise

    def update_script_section(self, sheet_name: str, section: str, code: str) -> str:
        """
        Update a specific section of the script

        Args:
            sheet_name: Name of the sheet
            section: Section name (e.g., 'DATA SECTION', 'FORMULA SECTION')
            code: Code to inject into the section

        Returns:
            Updated script content
        """
        self.logger.info(f"Updating {section} for sheet: {sheet_name}")

        # Get current script
        current_script = self.get_script(sheet_name)

        # Determine section marker
        section_marker = self._get_section_marker(section)

        # Find section and inject code
        updated_script = self._inject_code_in_section(current_script, section_marker, code)

        # Save updated script
        self.save_script(sheet_name, updated_script)

        return updated_script

    def _get_section_marker(self, section: str) -> str:
        """Get the full section marker string"""
        section_upper = section.upper()

        if 'DATA' in section_upper:
            return self.DATA_SECTION
        elif 'FORMULA' in section_upper or 'MATH' in section_upper:
            return self.FORMULA_SECTION
        elif 'STYLING' in section_upper or 'STYLE' in section_upper:
            return self.STYLING_SECTION
        else:
            raise ValueError(f"Unknown section: {section}")

    def _inject_code_in_section(self, script: str, section_marker: str, code: str) -> str:
        """
        Inject code into a specific section

        Args:
            script: Current script content
            section_marker: Section marker to find
            code: Code to inject

        Returns:
            Updated script
        """
        lines = script.split('\n')

        # Find section marker
        section_index = -1
        for i, line in enumerate(lines):
            if section_marker in line:
                section_index = i
                break

        if section_index == -1:
            self.logger.warning(f"Section marker not found: {section_marker}")
            return script

        # Find next section or end of function
        next_section_index = len(lines)
        for i in range(section_index + 1, len(lines)):
            if '# =====' in lines[i] or lines[i].strip().startswith('return '):
                next_section_index = i
                break

        # Remove existing content in section (except marker and comments)
        section_lines = lines[section_index + 1:next_section_index]
        filtered_lines = []
        for line in section_lines:
            # Keep comments and empty lines
            if line.strip().startswith('#') or not line.strip():
                filtered_lines.append(line)

        # Prepare code with proper indentation
        indent = '    '  # 4 spaces (function body indentation)
        code_lines = code.strip().split('\n')
        # Filter out markdown fences and indent
        indented_code = []
        for line in code_lines:
            # Skip lines that are ONLY markdown fences
            if line.strip() in ['```', '```python', '```py']:
                continue
            indented_code.append(indent + line if line.strip() else line)

        # Reconstruct script
        new_lines = (
            lines[:section_index + 1] +  # Everything up to and including marker
            filtered_lines +  # Existing comments
            indented_code +  # New code
            [''] +  # Blank line
            lines[next_section_index:]  # Rest of script
        )

        return '\n'.join(new_lines)

    def get_script_path(self, sheet_name: str) -> Path:
        """
        Get the file path for a script

        Args:
            sheet_name: Name of the sheet

        Returns:
            Path object for the script file
        """
        if sheet_name not in self.scripts:
            raise FileNotFoundError(f"No script found for sheet: {sheet_name}")

        return self.scripts[sheet_name]

    def list_scripts(self) -> List[str]:
        """
        List all script sheet names in current session

        Returns:
            List of sheet names
        """
        return list(self.scripts.keys())

    def validate_syntax(self, script_content: str) -> Tuple[bool, str]:
        """
        Validate Python syntax using AST

        Args:
            script_content: Script content to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            ast.parse(script_content)
            return True, ""
        except SyntaxError as e:
            error_msg = f"Syntax error at line {e.lineno}: {e.msg}"
            self.logger.warning(f"Syntax validation failed: {error_msg}")
            return False, error_msg
        except Exception as e:
            error_msg = f"Validation error: {str(e)}"
            self.logger.warning(f"Syntax validation failed: {error_msg}")
            return False, error_msg

    def validate_imports(self, script_content: str) -> Tuple[bool, List[str]]:
        """
        Validate that script only uses allowed imports

        Args:
            script_content: Script content to validate

        Returns:
            Tuple of (is_valid, list_of_invalid_imports)
        """
        try:
            tree = ast.parse(script_content)
            invalid_imports = []

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if not self._is_allowed_import(alias.name):
                            invalid_imports.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    module = node.module or ''
                    if not self._is_allowed_import(module):
                        invalid_imports.append(module)

            is_valid = len(invalid_imports) == 0
            return is_valid, invalid_imports

        except Exception as e:
            self.logger.error(f"Import validation error: {e}")
            return False, ["Validation failed"]

    def _is_allowed_import(self, module_name: str) -> bool:
        """Check if an import is allowed"""
        # Check if module or parent module is in allowed list
        for allowed in self.ALLOWED_IMPORTS:
            if module_name == allowed or module_name.startswith(allowed + '.'):
                return True
        return False

    def detect_dangerous_operations(self, script_content: str) -> Tuple[bool, List[str]]:
        """
        Detect dangerous operations in script

        Args:
            script_content: Script content to check

        Returns:
            Tuple of (has_dangerous_ops, list_of_dangerous_ops)
        """
        dangerous_found = []

        for op in self.DANGEROUS_OPERATIONS:
            if op in script_content:
                dangerous_found.append(op)

        has_dangerous = len(dangerous_found) > 0
        return has_dangerous, dangerous_found

    def _sanitize_filename(self, name: str) -> str:
        """
        Sanitize a string for use as a filename

        Args:
            name: String to sanitize

        Returns:
            Sanitized string safe for filenames
        """
        # Replace spaces and special characters with underscores
        safe_name = re.sub(r'[^\w\s-]', '', name.lower())
        safe_name = re.sub(r'[-\s]+', '_', safe_name)
        return safe_name.strip('_')

    def get_session_info(self) -> Dict:
        """
        Get information about current session

        Returns:
            Dictionary with session information
        """
        return {
            'session_id': self.session_id,
            'session_dir': str(self.session_dir),
            'script_count': len(self.scripts),
            'scripts': list(self.scripts.keys())
        }
