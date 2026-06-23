"""
LangGraph-based orchestrator for the ForecastAgent Excel Agent.

Agent coordination is driven by the compiled LangGraph in ``graph/``.
Workflow state flows through graph nodes. Session memory is synced from
graph state after each request for CLI/MCP consumers.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .utils import BedrockClient, ExcelManager, PromptManager, get_logger, get_session_manager, ScriptManager
from .agents import (
    ActionItemsAgent,
    CoderAgent,
    CoordinatorAgent,
    CriticAgent,
    DecomposerAgent,
    ExecutorAgent,
)
from .graph import build_graph, initial_state


# ─── Session Memory ───────────────────────────────────────────────────────────


class SessionMemory:
    """
    Session-scoped memory: generated code, config, workbook path.
    Synced from graph state at the end of each process_request.
    """

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.memory: Dict[int, Dict[str, Any]] = {}
        self.index_counter = 0
        self.code_index: Dict[str, List[int]] = {}
        self.config_index: Optional[int] = None
        self.workbook_path_index: Optional[int] = None

    def add_entry(
        self,
        entry_type: str,
        content: Any,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        self.index_counter += 1
        idx = self.index_counter
        self.memory[idx] = {
            "type": entry_type,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
        }
        if entry_type == "code" and metadata and "sheet_name" in metadata:
            sheet = metadata["sheet_name"]
            self.code_index.setdefault(sheet, []).append(idx)
        elif entry_type in ("assumptions", "config"):
            self.config_index = idx
        elif entry_type == "workbook_path":
            self.workbook_path_index = idx
        return idx

    def get_entry(self, index: int) -> Optional[Dict[str, Any]]:
        return self.memory.get(index)

    def get_latest_code(self, sheet_name: str) -> Optional[Dict[str, Any]]:
        indices = self.code_index.get(sheet_name, [])
        return self.memory.get(indices[-1]) if indices else None

    def get_all_sheet_names(self) -> List[str]:
        return list(self.code_index.keys())

    def get_latest_config(self) -> Optional[Dict[str, Any]]:
        return self.memory.get(self.config_index) if self.config_index else None

    def get_latest_assumptions(self) -> Optional[Dict[str, Any]]:
        return self.get_latest_config()

    def get_current_workbook_path(self) -> Optional[str]:
        if self.workbook_path_index is None:
            return None
        entry = self.memory.get(self.workbook_path_index)
        return entry.get("content") if entry else None

    def has_existing_work(self) -> bool:
        return bool(self.code_index) or self.config_index is not None

    def get_summary(self) -> Dict[str, Any]:
        base = {
            "session_id": self.session_id,
            "total_entries": len(self.memory),
            "sheets": list(self.code_index.keys()),
            "sheet_count": len(self.code_index),
            "has_config": self.config_index is not None,
            "has_workbook_path": self.workbook_path_index is not None,
            "workbook_path": self.get_current_workbook_path(),
        }
        base["has_assumptions"] = base["has_config"]  # CLI compat
        return base

    # ── Sync from graph state ──────────────────────────────────────────────

    def sync_from_graph_state(self, graph_state: dict) -> None:
        """
        Populate this SessionMemory from the final LangGraph state dict.

        Called at the end of every ``process_request`` invocation so that
        external callers always see an up-to-date view.
        """
        sm_entries: dict = graph_state.get("sm_entries") or {}
        sm_code_index: dict = graph_state.get("sm_code_index") or {}
        sm_config_index: Optional[int] = graph_state.get("sm_assumptions_index")
        sm_workbook_path_index: Optional[int] = graph_state.get("sm_workbook_path_index")
        sm_counter: int = graph_state.get("sm_counter") or 0

        self.memory = {int(k): v for k, v in sm_entries.items()}
        self.code_index = {
            sheet: [int(i) for i in indices]
            for sheet, indices in sm_code_index.items()
        }
        self.config_index = sm_config_index
        self.workbook_path_index = sm_workbook_path_index
        self.index_counter = sm_counter


# ─── Orchestrator ─────────────────────────────────────────────────────────────


class ExcelAgentOrchestrator:
    """Orchestrates the LangGraph Excel workflow and session state."""

    def __init__(
        self,
        aws_region: str = "us-east-1",
        prompts_dir: str = "prompts",
        run_dir: Optional[Path] = None,
        output_dir: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> None:
        self.session_id = session_id or str(uuid.uuid4())
        self.run_dir = Path(run_dir) if run_dir else Path(output_dir or "output")
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir = self.run_dir

        self._session_manager = get_session_manager(
            session_dir=self.run_dir, session_id=self.session_id
        )
        self.logger = get_logger("Orchestrator", session_manager=self._session_manager)
        self.logger.info("Initialising LangGraph Excel Agent Orchestrator")
        self.logger.info(f"Session ID: {self.session_id}")

        self.memory = SessionMemory(self.session_id)

        # ── Utilities ─────────────────────────────────────────────────────
        try:
            self._aws_region = aws_region
            bedrock_logger = get_logger("BedrockClient", session_manager=self._session_manager)
            self.bedrock = BedrockClient(region=aws_region, logger=bedrock_logger)
            self.excel_manager = ExcelManager(session_manager=self._session_manager)
            self.prompt_manager = PromptManager(prompts_dir=prompts_dir, session_manager=self._session_manager)

            scripts_dir = self.run_dir / "scripts"
            scripts_dir.mkdir(exist_ok=True)
            self.script_manager = ScriptManager(
                output_dir=str(scripts_dir),
                flat=True,
                session_id=self.session_id,
                session_manager=self._session_manager,
            )
        except Exception as exc:
            self.logger.critical("Failed to initialise utilities", exc_info=exc)
            raise

        # ── Agents ────────────────────────────────────────────────────────
        try:
            self.agents = self._initialize_agents()
            self.logger.info(f"Initialised {len(self.agents)} agents")
        except Exception as exc:
            self.logger.critical("Failed to initialise agents", exc_info=exc)
            raise

        # ── LangGraph ─────────────────────────────────────────────────────
        try:
            self.graph = build_graph(
                agents=self.agents,
                script_manager=self.script_manager,
                excel_manager=self.excel_manager,
                output_dir=self.output_dir,
                logger=self.logger,
            )
            self.logger.info("LangGraph workflow compiled and ready")
        except Exception as exc:
            self.logger.critical("Failed to compile LangGraph", exc_info=exc)
            raise

        self.recursion_limit = int(os.getenv("RECURSION_LIMIT", "200"))
        self.clarification_iteration: int = 0
        self.max_clarification_iterations: int = 2
        self.previous_clarifications: List[str] = []
        self._graph_state: Optional[dict] = None
        self.current_request: Optional[str] = None

    # ── Agent factory ──────────────────────────────────────────────────────────

    def _get_bedrock_for_agent(self, agent_key: str):
        """Return a BedrockClient for the given agent. Uses MODEL_ID_<KEY> if set."""
        env_key = f"MODEL_ID_{agent_key.upper()}"
        model_id = os.getenv(env_key)
        if model_id:
            return BedrockClient(region=self._aws_region, model_id=model_id, logger=self.bedrock.logger)
        return self.bedrock

    def _initialize_agents(self) -> Dict:
        agents: Dict = {}
        try:
            agents["coordinator"]  = CoordinatorAgent(
                bedrock_client=self._get_bedrock_for_agent("coordinator"),
                prompt_manager=self.prompt_manager,
                session_manager=self._session_manager,
            )
            agents["decomposer"]   = DecomposerAgent(
                bedrock_client=self._get_bedrock_for_agent("decomposer"),
                prompt_manager=self.prompt_manager,
                session_manager=self._session_manager,
            )
            agents["critic"]       = CriticAgent(
                bedrock_client=self._get_bedrock_for_agent("critic"),
                prompt_manager=self.prompt_manager,
                excel_manager=self.excel_manager,
                session_manager=self._session_manager,
            )
            agents["executor"]     = ExecutorAgent(
                bedrock_client=self._get_bedrock_for_agent("executor"),
                prompt_manager=self.prompt_manager,
                session_manager=self._session_manager,
            )
            agents["actionitems"]  = ActionItemsAgent(
                bedrock_client=self._get_bedrock_for_agent("actionitems"),
                prompt_manager=self.prompt_manager,
                session_manager=self._session_manager,
            )
            agents["coder"]        = CoderAgent(
                bedrock_client=self._get_bedrock_for_agent("coder"),
                prompt_manager=self.prompt_manager,
                session_manager=self._session_manager,
            )
            return agents
        except Exception as exc:
            self.logger.error("Error initialising agents", exc_info=exc)
            raise

    # ── Core request processing ────────────────────────────────────────────────

    def process_request(self, user_request: str, skip_clarification: bool = False) -> str:
        """
        Process a user request through the LangGraph workflow.

        Handles the full lifecycle:
        * First call  → build initial state, invoke graph.
        * Clarification needed → return question, save state for continuation.
        * Modification request → pass existing session-memory into graph state.

        Args:
            user_request:       Raw request text from the user / CLI.
            skip_clarification: When True the agent skips the clarification step.

        Returns:
            Human-readable response string (file path, summary, or question).
        """
        self.logger.info(f"Processing request: {user_request[:120]}…")
        self.current_request = user_request

        try:
            # Build or continue graph state
            if self._graph_state is None:
                # Fresh request – start from scratch
                state = initial_state(user_request, self.session_id)
                state["skip_clarification"] = skip_clarification
                state["previous_clarifications"] = list(self.previous_clarifications)
                state["clarification_iteration"] = self.clarification_iteration
                # Mirror any existing session memory into the graph state
                self._inject_memory_into_state(state)
            else:
                # Continuation (e.g. user answered a clarification question)
                state = dict(self._graph_state)
                state["user_request"] = user_request
                state["skip_clarification"] = skip_clarification
                state["previous_clarifications"] = list(self.previous_clarifications)
                state["clarification_iteration"] = self.clarification_iteration
                # Reset decompose so the agent re-processes the enriched request
                state["decompose_done"] = False
                state["needs_clarification"] = False

            # Invoke graph
            self.logger.info("Invoking LangGraph workflow")
            final_state: dict = self.graph.invoke(
                state,
                config={"recursion_limit": self.recursion_limit},
            )

            # Persist state for potential continuation turns
            self._graph_state = final_state
            self.memory.sync_from_graph_state(final_state)

            # Clarification pending
            if final_state.get("needs_clarification") and not final_state.get("skip_clarification"):
                self.clarification_iteration += 1
                clarif_q = final_state.get("clarification_question") or (
                    final_state.get("query_decomposition") or
                    "Could you please provide more details about your requirements?"
                )
                # Use coordinator to format the question nicely
                try:
                    formatted = self.agents["coordinator"].generate_response(
                        f"Based on this analysis, extract and format the clarification "
                        f"questions for the user:\n\n{clarif_q}\n\n"
                        f"Format them as a friendly, conversational message asking for "
                        f"specific details."
                    )
                    self._session_manager.flush_logs()
                    return formatted
                except Exception:
                    self._session_manager.flush_logs()
                    return clarif_q

            # Build final response
            self.clarification_iteration = 0
            response = self._build_final_response(final_state)
            self.logger.info(f"Request complete: {response[:120]}…")
            self._session_manager.flush_logs()
            return response

        except Exception as exc:
            try:
                self.logger.log_error_with_context(
                    error=exc,
                    context={
                        "user_request": user_request[:200],
                        "current_step": "process_request",
                    },
                )
            except Exception:
                self.logger.error(f"Error processing request: {exc}", exc_info=exc)
            self._session_manager.flush_logs()
            return f"Error processing request: {exc}"

    def _inject_memory_into_state(self, state: dict) -> None:
        """
        Copy current SessionMemory contents into *state* so the graph can
        see existing work when detecting modification requests.
        """
        state["sm_entries"]             = dict(self.memory.memory)
        state["sm_code_index"]          = {
            k: list(v) for k, v in self.memory.code_index.items()
        }
        state["sm_assumptions_index"]   = self.memory.config_index
        state["sm_workbook_path_index"] = self.memory.workbook_path_index
        state["sm_counter"]             = self.memory.index_counter
        # Restore workbook path directly so nodes can use it
        wp = self.memory.get_current_workbook_path()
        if wp:
            state["workbook_path"] = wp

    def _build_final_response(self, final_state: dict) -> str:
        """Turn the final graph state into a user-facing response string."""

        # Explicit final_response set by a node (e.g. modification node)
        if final_state.get("final_response"):
            return final_state["final_response"]

        # Modification completed
        if final_state.get("modification_done"):
            sheets = _sm_get_all_sheet_names(final_state)
            wp = (
                final_state.get("workbook_path")
                or _sm_get_current_workbook_path(final_state)
            )
            return (
                f"Modification complete!\n"
                f"Sheets in workbook: {', '.join(sheets)}\n"
                f"Workbook: {wp or 'unknown'}"
            )

        workbook_path = (
            final_state.get("workbook_path")
            or _sm_get_current_workbook_path(final_state)
        )
        sheets = final_state.get("sheets") or []
        failed_sheets: list = final_state.get("failed_sheets") or []
        all_done: bool = final_state.get("all_sheets_done", False)
        errors: list = final_state.get("errors") or []

        if not workbook_path:
            if errors:
                return f"Failed to generate workbook.\nErrors:\n" + "\n".join(
                    f"  • {e}" for e in errors[:5]
                )
            return "No workbook generated – check logs for details."

        if failed_sheets:
            success_count = len(sheets) - len(failed_sheets)
            return (
                f"Excel workbook created with partial success.\n"
                f"Path: {workbook_path}\n"
                f"Successful sheets: {success_count}/{len(sheets)}\n"
                f"Failed sheets: {', '.join(failed_sheets)}"
            )

        return (
            f"Excel workbook created successfully!\n"
            f"Path: {workbook_path}\n"
            f"Sheets: {len(sheets)}"
        )

    # ── Clarification continuation ─────────────────────────────────────────────

    def provide_clarification(self, user_response: str) -> str:
        """
        Process the user's answer to a clarification question.

        Args:
            user_response: User's clarification text.

        Returns:
            Next response from the system.
        """
        self.logger.info("Processing clarification response")

        if not self.current_request:
            return "No active request to clarify. Please start with a new request."

        self.previous_clarifications.append(user_response)

        all_clarifications = "\n".join(self.previous_clarifications)
        enhanced_request = (
            f"Original Request: {self.current_request}\n\n"
            f"Additional Information Provided:\n{all_clarifications}"
        )

        return self.process_request(enhanced_request)

    def review_file(self, filepath: str) -> Dict:
        """
        Review an existing Excel file using the CriticAgent.

        Args:
            filepath: Path to Excel file.

        Returns:
            Review results dict.
        """
        self.logger.info(f"Reviewing file: {filepath}")
        try:
            return self.agents["critic"].review_spreadsheet(filepath)
        except Exception as exc:
            self.logger.error("Failed to review file", exc_info=exc)
            raise

    def get_agent_status(self) -> Dict:
        """Return conversation statistics for all agents."""
        return {name: agent.get_conversation_summary() for name, agent in self.agents.items()}

    def reset_all_agents(self) -> None:
        """Reset all agent conversation histories and clear session state."""
        self.logger.info("Resetting all agents and session state")
        for agent in self.agents.values():
            agent.reset_conversation()

        self.current_request = None
        self.clarification_iteration = 0
        self.previous_clarifications = []
        self._graph_state = None

        # Clear session memory
        self.memory = SessionMemory(self.session_id)
        self.logger.info("Session cleared")

    def get_memory_summary(self) -> Dict[str, Any]:
        """Return a summary of the current session memory."""
        return self.memory.get_summary()


# ─── Memory helpers ────────────────────────────────────────────────────────


def _sm_get_all_sheet_names(state: dict) -> List[str]:
    return list((state.get("sm_code_index") or {}).keys())


def _sm_get_current_workbook_path(state: dict) -> Optional[str]:
    idx = state.get("sm_workbook_path_index")
    if idx is None:
        return None
    entry = (state.get("sm_entries") or {}).get(idx)
    return entry.get("content") if entry else None
