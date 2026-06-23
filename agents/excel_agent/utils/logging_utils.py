"""
Logging utilities for Excel Agent Playground
Provides structured logging with color coding and LLM call tracking.
Toggle: if S3_BUCKET is set, logs go ONLY to S3 (same format as local).
Otherwise logs go to local files only (fallback).
"""

import io
import logging
import os
import sys
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import colorlog
import traceback
import time

try:
    from s3_storage import s3_enabled, upload_json, upload_bytes, s3_logs_key
except ImportError:
    s3_enabled = lambda: False
    upload_json = lambda d, k: False
    upload_bytes = lambda b, k: False
    s3_logs_key = lambda *p: "/".join(p) if p else ""

# Project root (excel_agent/utils -> excel_agent -> demopiece)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_LOGS = _PROJECT_ROOT / "data" / "logs"

# Format string matching local file handler exactly
_FILE_LOG_FORMAT = "%(asctime)s | %(name)s | %(levelname)s | %(filename)s:%(lineno)d | %(message)s"
_FILE_LOG_DATEFMT = "%Y-%m-%d %H:%M:%S"

# Global session manager instance
_session_manager = None


class _S3BufferHandler(logging.Handler):
    """Writes to an in-memory buffer (same format as local file)."""

    def __init__(self, buffer: io.StringIO):
        super().__init__()
        self._buffer = buffer
        self.setFormatter(logging.Formatter(_FILE_LOG_FORMAT, datefmt=_FILE_LOG_DATEFMT))

    def emit(self, record):
        try:
            self._buffer.write(self.format(record) + "\n")
        except Exception:
            self.handleError(record)


class SessionManager:
    """Manages session-based logging directories"""

    def __init__(
        self,
        base_log_dir: Optional[str] = None,
        session_id: Optional[str] = None,
        session_dir: Optional[Path] = None,
    ):
        """
        Initialize session manager

        Args:
            base_log_dir: Base directory for all logs. Defaults to LOGS_DIR env or data/logs.
            session_id: Optional session ID (auto-generated if not provided).
            session_dir: Optional explicit session directory. If provided, overrides base_log_dir/session_id.
        """
        if session_dir is not None and session_id is not None:
            self.session_dir = Path(session_dir).resolve()
            self.session_id = session_id
            self.base_log_dir = self.session_dir.parent
            self.session_dir.mkdir(parents=True, exist_ok=True)
        else:
            if base_log_dir is None:
                base_log_dir = os.getenv("LOGS_DIR", str(_DEFAULT_LOGS))
            base = Path(base_log_dir)
            if not base.is_absolute():
                base = _PROJECT_ROOT / base_log_dir
            self.base_log_dir = Path(base).resolve()
            self.base_log_dir.mkdir(parents=True, exist_ok=True)
            self.session_id = session_id or self._generate_session_id()
            self.session_dir = self.base_log_dir / self.session_id
            self.session_dir.mkdir(parents=True, exist_ok=True)

        self._use_s3 = s3_enabled()

        if self._use_s3:
            self.main_log_file = None
            self.llm_calls_file = None
            self.script_execution_log_file = None
            self._main_log_buffer = io.StringIO()
            self._llm_calls_data: Dict[str, Any] = {}
            self._script_execution_buffer = io.StringIO()
        else:
            self.main_log_file = self.session_dir / "main.log"
            self.llm_calls_file = self.session_dir / "llm_calls.json"
            self.script_execution_log_file = self.session_dir / "script_execution.log"
            self._main_log_buffer = None
            self._llm_calls_data = None
            self._script_execution_buffer = None

        self.llm_calls: List[Dict] = []
        self._initialize_llm_calls()

        print(f"\n{'='*70}", file=sys.stderr)
        print(f"Session ID: {self.session_id}", file=sys.stderr)
        print(f"Logging: {'S3 only' if self._use_s3 else 'local'} ({self.session_dir})", file=sys.stderr)
        print(f"{'='*70}\n", file=sys.stderr)

    def _generate_session_id(self) -> str:
        """Generate unique session ID with timestamp first (for chronological sorting)"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]
        return f"{timestamp}_{unique_id}"

    def _flush_main_log_to_s3(self):
        """Upload main log buffer to S3 (S3 mode only)."""
        if self._use_s3 and self._main_log_buffer:
            key = s3_logs_key(self.session_id, "main.log")
            upload_bytes(self._main_log_buffer.getvalue().encode("utf-8"), key)

    def flush_logs(self):
        """Ensure all buffered logs are persisted. For S3 mode, uploads main.log."""
        self._flush_main_log_to_s3()

    def _initialize_llm_calls(self):
        """Initialize LLM calls storage (local file or S3 buffer)."""
        data = {
            "session_id": self.session_id,
            "created_at": datetime.now().isoformat(),
            "llm_calls": []
        }
        if self._use_s3:
            self._llm_calls_data = data
            key = s3_logs_key(self.session_id, "llm_calls.json")
            upload_json(data, key)
        else:
            with open(self.llm_calls_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

    def log_llm_call(
        self,
        call_id: str,
        model: str,
        input_messages: List[Dict],
        system_prompt: Optional[str],
        output: str,
        time_elapsed: float,
        tokens_used: Dict[str, int],
        metadata: Optional[Dict] = None
    ):
        """
        Log an LLM call to the JSON file

        Args:
            call_id: Unique identifier for this call
            model: Model identifier
            input_messages: Input messages sent to the model
            system_prompt: System prompt (if any)
            output: Model output
            time_elapsed: Time taken in seconds
            tokens_used: Token usage statistics
            metadata: Additional metadata
        """
        call_data = {
            "call_id": call_id,
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "input": {
                "system_prompt": system_prompt,
                "messages": input_messages,
                "message_count": len(input_messages),
                "total_input_length": sum(len(str(m.get('content', ''))) for m in input_messages)
            },
            "output": {
                "content": output,
                "length": len(output)
            },
            "performance": {
                "time_elapsed_seconds": round(time_elapsed, 3),
                "tokens": tokens_used
            },
            "metadata": metadata or {}
        }

        self.llm_calls.append(call_data)

        try:
            if self._use_s3:
                self._llm_calls_data["llm_calls"] = self.llm_calls
                self._llm_calls_data["total_calls"] = len(self.llm_calls)
                self._llm_calls_data["last_updated"] = datetime.now().isoformat()
                key = s3_logs_key(self.session_id, "llm_calls.json")
                upload_json(self._llm_calls_data, key)
                self._flush_main_log_to_s3()
            else:
                with open(self.llm_calls_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                data["llm_calls"].append(call_data)
                data["total_calls"] = len(data["llm_calls"])
                data["last_updated"] = datetime.now().isoformat()
                with open(self.llm_calls_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error logging LLM call: {e}", file=sys.stderr)

    def log_script_execution(
        self,
        script_path: str,
        workbook_path: str,
        success: bool,
        execution_time_seconds: float,
        return_code: Optional[int] = None,
        stdout: str = "",
        stderr: str = "",
        errors: Optional[List[str]] = None,
        script_content_preview: Optional[str] = None,
    ) -> None:
        """
        Append a script execution record to script_execution.log.

        Args:
            script_path: Path to the executed script
            workbook_path: Path to the workbook passed to the script
            success: Whether execution succeeded
            execution_time_seconds: Duration in seconds
            return_code: Process return code (if available)
            stdout: Full stdout from the process
            stderr: Full stderr from the process
            errors: List of error messages (e.g. validation, timeout)
            script_content_preview: Optional first N lines of script for reference
        """
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        status = "SUCCESS" if success else "FAILED"
        block = [
            "",
            "=" * 80,
            f"SCRIPT EXECUTION | {ts} | {status}",
            "=" * 80,
            f"script_path:      {script_path}",
            f"workbook_path:   {workbook_path}",
            f"execution_time:  {execution_time_seconds:.3f}s",
            f"return_code:     {return_code if return_code is not None else 'N/A'}",
            f"success:         {success}",
        ]
        if errors:
            block.append("errors:")
            for e in errors:
                block.append(f"  - {e}")
        if stdout:
            block.append("--- stdout ---")
            block.append(stdout.strip() if stdout else "(empty)")
        if stderr:
            block.append("--- stderr ---")
            block.append(stderr.strip() if stderr else "(empty)")
        if script_content_preview:
            block.append("--- script_preview ---")
            block.append(script_content_preview.strip())
        block.append("")
        text = "\n".join(block) + "\n"
        try:
            if self._use_s3:
                self._script_execution_buffer.write(text)
                key = s3_logs_key(self.session_id, "script_execution.log")
                upload_bytes(self._script_execution_buffer.getvalue().encode("utf-8"), key)
                self._flush_main_log_to_s3()
            else:
                with open(self.script_execution_log_file, "a", encoding="utf-8") as f:
                    f.write(text)
        except Exception as e:
            print(f"Error writing script execution log: {e}", file=sys.stderr)


def get_session_manager(
    base_log_dir: Optional[str] = None,
    session_id: Optional[str] = None,
    session_dir: Optional[Path] = None,
) -> SessionManager:
    """
    Get or create the session manager.
    When session_dir and session_id are provided, creates a per-run SessionManager.
    Otherwise uses/creates the global instance.
    """
    if session_dir is not None and session_id is not None:
        return SessionManager(session_dir=session_dir, session_id=session_id)
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager(base_log_dir=base_log_dir, session_id=session_id)
    return _session_manager


class AgentLogger:
    """Centralized logging for the agent system"""

    def __init__(self, name: str, session_manager: Optional[SessionManager] = None):
        """
        Initialize logger with color formatting and file output

        Args:
            name: Logger name (typically module or agent name)
            session_manager: SessionManager instance (creates one if not provided)
        """
        self.name = name

        # Get or create session manager
        if session_manager is None:
            session_manager = get_session_manager()
        self.session_manager = session_manager

        # Scope the Python logger name to the session so each run gets its own
        # logger instance and handler set. Without this, the global logger
        # registry returns the same instance for every run in the process, and
        # the "prevent duplicate handlers" guard below silently skips attaching
        # the S3 buffer handler for all runs after the first one.
        scoped_name = f"{name}.{session_manager.session_id}"

        # Create logger
        self.logger = logging.getLogger(scoped_name)
        self.logger.setLevel(logging.DEBUG)

        # Prevent duplicate handlers for the same session
        if self.logger.handlers:
            return

        # Console handler with color (stderr so MCP stdio protocol is not corrupted)
        console_handler = colorlog.StreamHandler(sys.stderr)
        console_handler.setLevel(logging.INFO)

        console_formatter = colorlog.ColoredFormatter(
            '%(log_color)s%(asctime)s | %(name)-20s | %(levelname)-8s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            }
        )
        console_handler.setFormatter(console_formatter)

        # Persistent log: S3 buffer or local file (same format)
        file_formatter = logging.Formatter(_FILE_LOG_FORMAT, datefmt=_FILE_LOG_DATEFMT)
        if self.session_manager._use_s3:
            file_handler = _S3BufferHandler(self.session_manager._main_log_buffer)
        else:
            file_handler = logging.FileHandler(self.session_manager.main_log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(file_formatter)

        # Add handlers
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)

        self.logger.info(f"Logger initialized for {name}")
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self.logger.debug(message, extra=kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, exc_info=None, **kwargs):
        """
        Log error message with optional exception details.

        Args:
            message: Error message
            exc_info: If True, use sys.exc_info(). If an Exception instance, use it for traceback. Otherwise ignored.
        """
        if exc_info is True:
            exc_info = sys.exc_info()
            if exc_info and exc_info[1] is not None:
                tb = ''.join(traceback.format_exception(*exc_info))
                self.logger.error(f"{message}\n{tb}", extra=kwargs)
            else:
                self.logger.error(message, extra=kwargs)
        elif isinstance(exc_info, BaseException):
            tb = ''.join(traceback.format_exception(
                type(exc_info), exc_info, exc_info.__traceback__
            ))
            self.logger.error(f"{message}\n{tb}", extra=kwargs)
        else:
            self.logger.error(message, extra=kwargs)

    def critical(self, message: str, exc_info=None, **kwargs):
        """
        Log critical error with exception details.

        Args:
            message: Critical error message
            exc_info: If True, use sys.exc_info(). If an Exception instance, use it for traceback. Otherwise ignored.
        """
        if exc_info is True:
            exc_info = sys.exc_info()
            if exc_info and exc_info[1] is not None:
                tb = ''.join(traceback.format_exception(*exc_info))
                self.logger.critical(f"{message}\n{tb}", extra=kwargs)
            else:
                self.logger.critical(message, extra=kwargs)
        elif isinstance(exc_info, BaseException):
            tb = ''.join(traceback.format_exception(
                type(exc_info), exc_info, exc_info.__traceback__
            ))
            self.logger.critical(f"{message}\n{tb}", extra=kwargs)
        else:
            self.logger.critical(message, extra=kwargs)
    
    def log_function_call(self, func_name: str, args: dict):
        """Log function call with arguments"""
        self.logger.debug(f"Calling {func_name} with args: {args}")
    
    def log_agent_message(self, agent_name: str, message: str):
        """Log agent message"""
        self.logger.info(f"[{agent_name}] {message}")
    
    def log_bedrock_call(
        self,
        call_id: str,
        model: str,
        input_messages: List[Dict],
        system_prompt: Optional[str],
        output: str,
        time_elapsed: float,
        tokens_used: Dict[str, int],
        metadata: Optional[Dict] = None
    ):
        """
        Log Bedrock API call details to both main log and LLM calls JSON

        Args:
            call_id: Unique call identifier
            model: Model used
            input_messages: Input messages
            system_prompt: System prompt
            output: Model output
            time_elapsed: Time taken
            tokens_used: Token usage
            metadata: Additional metadata
        """
        prompt_length = sum(len(str(m.get('content', ''))) for m in input_messages)
        response_length = len(output)

        # Log to main log file
        self.logger.info(
            f"LLM Call [{call_id}]: model={model}, "
            f"prompt_length={prompt_length}, "
            f"response_length={response_length}, "
            f"time={time_elapsed:.2f}s"
        )

        # Log to LLM calls JSON file
        self.session_manager.log_llm_call(
            call_id=call_id,
            model=model,
            input_messages=input_messages,
            system_prompt=system_prompt,
            output=output,
            time_elapsed=time_elapsed,
            tokens_used=tokens_used,
            metadata=metadata
        )
    
    def log_error_with_context(self, error: Exception, context: dict):
        """
        Log error with detailed context for debugging
        
        Args:
            error: Exception that occurred
            context: Dictionary with context information
        """
        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'traceback': traceback.format_exc()
        }
        
        self.logger.error(
            f"Error occurred: {error_details['error_type']}\n"
            f"Message: {error_details['error_message']}\n"
            f"Context: {error_details['context']}\n"
            f"Traceback:\n{error_details['traceback']}"
        )


def get_logger(name: str, session_manager: Optional[SessionManager] = None) -> AgentLogger:
    """
    Factory function to get a logger instance

    Args:
        name: Name for the logger
        session_manager: Optional session manager (uses global if not provided)

    Returns:
        AgentLogger instance
    """
    return AgentLogger(name, session_manager)
