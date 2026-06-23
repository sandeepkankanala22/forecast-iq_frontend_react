"""
LangGraph state definition for the ForecastAgent Excel Agent.

AgentState is a TypedDict (total=False so nodes can return partial updates).
LangGraph creates one channel per field and passes the full accumulated state
to every node - this is the required approach when using StateGraph.

Using plain dict as the schema causes LangGraph to pass only the *delta*
(last node output) to each node, which is why we use a proper TypedDict here.
"""

from __future__ import annotations

from typing import Annotated, Any, Dict, List, Optional

try:
    from typing import TypedDict
except ImportError:                         # Python < 3.8
    from typing_extensions import TypedDict

from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict, total=False):
    """
    Complete workflow state for the ForecastAgent LangGraph system.

    ``total=False`` makes every field optional so nodes can return only the
    fields they've changed.  ``initial_state()`` always provides every field
    so the full state is available to every node from the very first tick.

    Sections
    --------
    User Input          - raw request + session identifier
    Selector Routing    - next_node tells the conditional edge where to go
    Decomposition       - results from DecomposerAgent
    Clarification       - human-in-the-loop tracking
    Assumptions         - config loaded from config.json (sheets, theming, instructions)
    Sheet Loop          - index / workbook path for the per-sheet iteration
    Current Sheet       - action plan, code, execution, and critic state
    Modification Flow   - edit / continuation request handling
    Session Memory      - in-state replacement for the old SessionMemory class
    Messages            - append-only LangChain message list
    Errors and Output   - error accumulation and final response string
    """

    # -- User Input -----------------------------------------------------------
    user_request: str
    session_id: str

    # -- Selector Routing -----------------------------------------------------
    # The selector node writes this; the conditional edge reads it.
    next_node: str

    # -- Decomposition --------------------------------------------------------
    decompose_done: bool
    query_type: Optional[str]           # "new" | "edit" | "ask"
    query_decomposition: Optional[str]
    input_files: Optional[List]
    current_breakdown: Optional[Dict]   # Full JSON from DecomposerAgent

    # -- Clarification --------------------------------------------------------
    needs_clarification: bool
    skip_clarification: bool
    clarification_iteration: int
    previous_clarifications: List[str]
    clarification_question: Optional[str]

    # -- Assumptions ----------------------------------------------------------
    assumptions_done: bool
    assumptions: Optional[Dict]         # Full assumptions dict
    sheets: Optional[List[Dict]]        # Sheet definitions

    # -- Sheet Loop -----------------------------------------------------------
    current_sheet_index: int
    all_sheets_done: bool
    failed_sheets: List[str]
    workbook_path: Optional[str]

    # -- Current Sheet State --------------------------------------------------
    current_sheet_name: Optional[str]
    current_action_plan: Optional[Dict]
    action_plan_done: bool

    current_code: Optional[str]
    current_script_path: Optional[str]
    coder_mode: str                     # "generate" | "fix" | "improve"
    coder_run_ok: bool                  # True when coder produced valid code (for conditional routing)

    last_execution_attempted: bool
    last_execution_success: bool
    last_execution_output: Optional[str]
    last_execution_errors: List[str]
    execution_fix_attempts: int

    critic_reviewed: bool
    critic_score: Optional[float]       # 0-10 scale
    critic_feedback: Optional[Dict]
    critic_improvement_attempts: int
    critic_accept: bool                # True when score >= threshold (good enough to exit)

    # -- Modification Flow ----------------------------------------------------
    is_modification: bool
    modification_analysis: Optional[str]
    sheets_to_modify: Optional[List[str]]
    modification_current_index: int
    modification_done: bool

    # -- Session Memory -------------------------------------------------------
    sm_entries: Dict[int, Dict[str, Any]]
    sm_code_index: Dict[str, List[int]]
    sm_assumptions_index: Optional[int]
    sm_workbook_path_index: Optional[int]
    sm_counter: int

    # -- Message History ------------------------------------------------------
    # add_messages reducer automatically appends; never overwrites.
    messages: Annotated[List[BaseMessage], add_messages]

    # -- Errors and Output ----------------------------------------------------
    errors: List[str]
    final_response: Optional[str]


def initial_state(user_request: str, session_id: str) -> dict:
    """
    Build a fully-populated initial state dict for a new graph invocation.

    Every AgentState field is given a sensible default so that nodes can
    safely access any field without encountering a KeyError.

    Args:
        user_request: The raw request text from the user / CLI.
        session_id:   Unique identifier for this session.

    Returns:
        A dict with every AgentState field initialised.
    """
    return {
        # User input
        "user_request": user_request,
        "session_id": session_id,

        # Selector routing
        "next_node": "selector",

        # Decomposition
        "decompose_done": False,
        "query_type": None,
        "query_decomposition": None,
        "input_files": None,
        "current_breakdown": None,

        # Clarification
        "needs_clarification": False,
        "skip_clarification": False,
        "clarification_iteration": 0,
        "previous_clarifications": [],
        "clarification_question": None,

        # Assumptions
        "assumptions_done": False,
        "assumptions": None,
        "sheets": None,

        # Sheet loop
        "current_sheet_index": 0,
        "all_sheets_done": False,
        "failed_sheets": [],
        "workbook_path": None,

        # Current sheet
        "current_sheet_name": None,
        "current_action_plan": None,
        "action_plan_done": False,
        "current_code": None,
        "current_script_path": None,
        "coder_mode": "generate",
        "coder_run_ok": False,

        # Execution
        "last_execution_attempted": False,
        "last_execution_success": False,
        "last_execution_output": None,
        "last_execution_errors": [],
        "execution_fix_attempts": 0,

        # Critic
        "critic_reviewed": False,
        "critic_score": None,
        "critic_feedback": None,
        "critic_improvement_attempts": 0,
        "critic_accept": False,

        # Modification
        "is_modification": False,
        "modification_analysis": None,
        "sheets_to_modify": None,
        "modification_current_index": 0,
        "modification_done": False,

        # Session memory
        "sm_entries": {},
        "sm_code_index": {},
        "sm_assumptions_index": None,
        "sm_workbook_path_index": None,
        "sm_counter": 0,

        # Messages
        "messages": [],

        # Errors and output
        "errors": [],
        "final_response": None,
    }
