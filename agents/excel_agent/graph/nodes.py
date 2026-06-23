"""
LangGraph node factory functions for the ForecastAgent Excel Agent.

Each public ``create_*_node()`` function is a *factory*: it captures agent
instances (and other stateful helpers) in a closure and returns a plain
callable with the signature ``(state: dict) -> dict``.  That callable is the
actual LangGraph node.

Architecture (matches the Selector-centric diagram)
----------------------------------------------------

        ┌──────────────────────────────────┐
        │            SELECTOR              │  ← central router
        └──┬──────┬──────┬──────┬──────┬───┘
           │      │      │      │      │
        decomp  action_items  coder  exec  critic
                                │             │
                         │
                    modification

Flow:
  - decompose, action_items, modification → selector
  - selector → coder → (executor if ok | selector if fail)
  - executor → (critic if success | selector if fail)
  - critic → selector

Coder incorporates styling from config.general_theming when generating code.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..utils.logging_utils import get_logger

# Valid next_node values for LLM selector (must match graph edges)
SELECTOR_VALID_NODES = frozenset({
    "__end__", "decompose", "action_items",
    "coder", "executor", "critic", "modification",
})

def _sm_add_entry(
    state: dict,
    entry_type: str,
    content: Any,
    metadata: Optional[Dict] = None,
) -> dict:
    """
    Add an entry to the in-state session memory.

    Mirrors ``SessionMemory.add_entry`` but operates on plain dicts so the
    full state remains JSON-serialisable and LangGraph-checkpointable.

    Returns a dict of state-field updates that the caller must merge into its
    own return dict.
    """
    entries: dict = dict(state.get("sm_entries") or {})
    code_index: dict = {k: list(v) for k, v in (state.get("sm_code_index") or {}).items()}
    counter: int = (state.get("sm_counter") or 0) + 1

    entries[counter] = {
        "type": entry_type,
        "content": content,
        "metadata": metadata or {},
        "timestamp": datetime.now().isoformat(),
    }

    updates: dict = {
        "sm_entries": entries,
        "sm_counter": counter,
    }

    if entry_type == "code" and metadata and "sheet_name" in metadata:
        sheet_name = metadata["sheet_name"]
        if sheet_name not in code_index:
            code_index[sheet_name] = []
        code_index[sheet_name].append(counter)
        updates["sm_code_index"] = code_index

    elif entry_type == "assumptions":
        updates["sm_assumptions_index"] = counter

    elif entry_type == "workbook_path":
        updates["sm_workbook_path_index"] = counter

    return updates


def _sm_has_existing_work(state: dict) -> bool:
    """Return True if the session memory already contains code or assumptions."""
    return (
        bool(state.get("sm_code_index"))
        or state.get("sm_assumptions_index") is not None
    )


def _sm_get_latest_code(state: dict, sheet_name: str) -> Optional[Dict]:
    """Return the latest memory entry for *sheet_name*, or None."""
    code_index: dict = state.get("sm_code_index") or {}
    entries: dict = state.get("sm_entries") or {}
    indices = code_index.get(sheet_name, [])
    if not indices:
        return None
    return entries.get(indices[-1])


def _sm_get_all_sheet_names(state: dict) -> List[str]:
    """Return all sheet names that have been stored in session memory."""
    return list((state.get("sm_code_index") or {}).keys())


def _sm_get_latest_assumptions(state: dict) -> Optional[Dict]:
    """Return the latest assumptions memory entry, or None."""
    idx = state.get("sm_assumptions_index")
    if idx is None:
        return None
    return (state.get("sm_entries") or {}).get(idx)


def _sm_get_current_workbook_path(state: dict) -> Optional[str]:
    """Return the workbook path stored in session memory, or None."""
    idx = state.get("sm_workbook_path_index")
    if idx is None:
        return None
    entry = (state.get("sm_entries") or {}).get(idx)
    return entry.get("content") if entry else None


# ─── Sheet-advancement helper ─────────────────────────────────────────────────


def _save_current_sheet_to_memory(
    state: dict,
    critic_score: Optional[float] = None,
    note: str = "",
) -> dict:
    """
    Save the current sheet's code to session memory.

    Returns a dict of state updates that must be merged by the caller.
    """
    current_code = state.get("current_code") or ""
    sheet_name = state.get("current_sheet_name") or ""
    current_idx = state.get("current_sheet_index", 0)
    script_path = state.get("current_script_path") or ""

    if not current_code or not sheet_name:
        return {}

    metadata: dict = {
        "sheet_name": sheet_name,
        "sheet_index": current_idx,
        "script_path": script_path,
        "note": note,
    }
    if critic_score is not None:
        metadata["critic_score"] = critic_score

    return _sm_add_entry(state, "code", current_code, metadata)


def _advance_sheet(
    state: dict,
    sheets: list,
    current_idx: int,
    failed: bool,
    logger,
) -> dict:
    """
    Compute the state updates needed to move to the next sheet (or END).

    When *failed* is True the current sheet name is appended to
    ``failed_sheets``.  If there is no next sheet, ``all_sheets_done`` is set
    to True and ``next_node`` is set to ``"__end__"``.
    """
    failed_sheets = list(state.get("failed_sheets") or [])
    current_sheet_name = state.get("current_sheet_name")

    if failed and current_sheet_name:
        failed_sheets.append(current_sheet_name)

    next_idx = current_idx + 1

    if next_idx >= len(sheets):
        logger.info("All sheets processed -> END")
        return {
            "next_node": "__end__",
            "all_sheets_done": True,
            "current_sheet_index": next_idx,
            "failed_sheets": failed_sheets,
        }

    next_sheet = sheets[next_idx]
    next_sheet_name = next_sheet.get("name", f"Sheet{next_idx + 1}")
    logger.info(f"Advancing -> sheet {next_idx + 1}: {next_sheet_name}")

    return {
        "next_node": "action_items",
        "current_sheet_index": next_idx,
        "current_sheet_name": next_sheet_name,
        "failed_sheets": failed_sheets,
        # ── Reset per-sheet fields ──
        "action_plan_done": False,
        "current_action_plan": None,
        "current_code": None,
        "current_script_path": None,
        "coder_mode": "generate",
        "last_execution_attempted": False,
        "last_execution_success": False,
        "last_execution_output": None,
        "last_execution_errors": [],
        "execution_fix_attempts": 0,
        "critic_reviewed": False,
        "critic_score": None,
        "critic_feedback": None,
        "critic_improvement_attempts": 0,
        "critic_accept": False,
    }


# ─── Clarification helpers ────────────────────────────────────────────────────

_CLARIFICATION_KEYWORDS = [
    "clarification needed",
    "need more information",
    "unclear requirement",
    "missing critical information",
    "please specify",
    "must clarify",
    "questions for user:",
    "cannot proceed without",
]

_PROCEED_KEYWORDS = [
    "assume",
    "just proceed",
    "skip clarification",
    "use your best judgment",
    "use defaults",
    "proceed with defaults",
    "go ahead",
    "continue anyway",
    "skip questions",
    "make assumptions",
    "use your discretion",
    "based on your discretion",
]

_MODIFICATION_KEYWORDS = [
    "change", "modify", "update", "edit", "fix", "adjust", "revise",
    "alter", "correct", "improve", "add to", "remove from", "replace",
    "instead", "make it", "make the",
]


def _needs_clarification(breakdown: str) -> bool:
    breakdown_lower = breakdown.lower()
    has_marker = any(kw in breakdown_lower for kw in _CLARIFICATION_KEYWORDS)
    has_structured_questions = "questions:" in breakdown_lower and any(
        m in breakdown_lower for m in ["1.", "2.", "- "]
    )
    return has_marker or has_structured_questions


def _user_wants_to_proceed_anyway(user_request: str) -> bool:
    request_lower = user_request.lower()
    return any(kw in request_lower for kw in _PROCEED_KEYWORDS)


def _is_modification_request(user_request: str, state: dict, query_type: str) -> bool:
    """Mirror the orchestrator's _is_modification_request logic."""
    if not _sm_has_existing_work(state):
        return False

    if query_type in ("edit",):
        return True

    breakdown_raw = (state.get("current_breakdown") or {})
    continuation = breakdown_raw.get("continuation", False)
    if continuation:
        return True

    request_lower = user_request.lower()
    has_mod_keyword = any(kw in request_lower for kw in _MODIFICATION_KEYWORDS)
    existing_sheets = _sm_get_all_sheet_names(state)
    references_sheet = any(s.lower() in request_lower for s in existing_sheets)
    return has_mod_keyword or references_sheet


# ─── Critic-feedback formatter (mirrors orchestrator._format_improvement_feedback) ──


def _format_critic_feedback(
    summary: str,
    improvement_points: List[Dict],
    overall_score: int,
) -> str:
    parts = [
        f"CRITIC REVIEW - Score: {overall_score}/100",
        "=" * 60,
    ]
    if summary:
        parts.append(f"\nSUMMARY:\n{summary}\n")

    if improvement_points:
        parts.append("\nIMPROVEMENT POINTS:\n")
        critical = [p for p in improvement_points if p.get("severity") == "critical"]
        moderate = [p for p in improvement_points if p.get("severity") == "moderate"]
        minor = [p for p in improvement_points if p.get("severity") == "minor"]

        for label, items in [("CRITICAL ISSUES", critical), ("MODERATE ISSUES", moderate)]:
            if items:
                parts.append(f"{label}:")
                for i, item in enumerate(items, 1):
                    parts.append(
                        f"{i}. [{item.get('category', 'General')}] "
                        f"at {item.get('location', 'Unknown')}\n"
                        f"   Issue: {item.get('issue_description', '')}\n"
                        f"   Fix: {item.get('suggested_fix', '')}"
                    )
                parts.append("")

        if minor:
            parts.append("MINOR ISSUES (first 3):")
            for i, item in enumerate(minor[:3], 1):
                parts.append(
                    f"{i}. [{item.get('category', 'General')}] "
                    f"at {item.get('location', 'Unknown')}\n"
                    f"   Issue: {item.get('issue_description', '')}"
                )
            if len(minor) > 3:
                parts.append(f"   … and {len(minor) - 3} more minor issues")
            parts.append("")
    else:
        parts.append("\nNo specific improvement points provided.")

    parts.append("=" * 60)
    parts.append("Focus on addressing CRITICAL and MODERATE issues first.")
    return "\n".join(parts)


# ═══════════════════════════════════════════════════════════════════════════════
# SELECTOR LLM HELPERS
# ═══════════════════════════════════════════════════════════════════════════════


def _serialize_state_for_selector(state: dict) -> str:
    """Build a concise JSON-serializable summary of state for the selector LLM."""
    sheets = state.get("sheets") or []
    current_idx = state.get("current_sheet_index", 0)
    current_sheet = sheets[current_idx] if current_idx < len(sheets) else None
    summary = {
        "decompose_done": state.get("decompose_done"),
        "query_type": state.get("query_type"),
        "needs_clarification": state.get("needs_clarification"),
        "skip_clarification": state.get("skip_clarification"),
        "clarification_iteration": state.get("clarification_iteration", 0),
        "is_modification": state.get("is_modification"),
        "modification_done": state.get("modification_done"),
        "assumptions_done": state.get("assumptions_done"),
        "sheets_count": len(sheets),
        "current_sheet_index": current_idx,
        "current_sheet_name": current_sheet.get("name") if current_sheet else None,
        "all_sheets_done": state.get("all_sheets_done"),
        "action_plan_done": state.get("action_plan_done"),
        "has_current_code": state.get("current_code") is not None,
        "last_execution_attempted": state.get("last_execution_attempted"),
        "last_execution_success": state.get("last_execution_success"),
        "execution_fix_attempts": state.get("execution_fix_attempts", 0),
        "critic_reviewed": state.get("critic_reviewed"),
        "critic_score": state.get("critic_score"),
        "critic_accept": state.get("critic_accept"),
        "critic_improvement_attempts": state.get("critic_improvement_attempts", 0),
        "has_existing_work": _sm_has_existing_work(state),
    }
    return json.dumps(summary, indent=2)


def _invoke_selector_llm(
    bedrock_client,
    prompt_manager,
    state: dict,
    logger,
) -> Dict[str, Any]:
    """
    Call the LLM to decide next_node (and optional coder_mode, advance_sheet).
    Returns dict with keys: next_node, coder_mode (optional), advance_sheet (optional).
    """
    from ..utils.prompt_manager import PROMPT_DELIMITER

    user_request = (state.get("user_request") or "").strip()
    query_decomposition = (state.get("query_decomposition") or "").strip()
    state_summary = _serialize_state_for_selector(state)

    raw = prompt_manager.load_prompt("selector_next_node")
    if PROMPT_DELIMITER in raw:
        system, _, user_template = raw.partition(PROMPT_DELIMITER)
        system_prompt = system.strip()
        user_content = user_template.strip().format(
            user_request=user_request,
            query_decomposition=query_decomposition or "(none yet)",
            state_summary=state_summary,
        )
    else:
        system_prompt = raw.strip()
        user_content = f"Request: {user_request}\nDecomposition: {query_decomposition or '(none)'}\nState:\n{state_summary}"

    messages = [{"role": "user", "content": user_content}]
    try:
        response = bedrock_client.invoke_with_retry(
            messages=messages,
            system_prompt=system_prompt,
            max_tokens=512,
            temperature=0.0,
            metadata={"agent": "selector", "prompt_name": "selector_next_node"},
        )
        text = (response.get("content") or "").strip()
        # Extract JSON from response (allow markdown code block)
        if "```" in text:
            start = text.find("```") + 3
            if text[start : start + 4].strip().lower() == "json":
                start = text.find("\n", start)
                start = start + 1 if start != -1 else start + 4
            end = text.find("```", start)
            if end != -1:
                text = text[start:end].strip()
            else:
                text = text[start:].strip()
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            text = text[first_brace : last_brace + 1]
        parsed = json.loads(text)
        next_node = (parsed.get("next_node") or "__end__").strip()
        if next_node not in SELECTOR_VALID_NODES:
            logger.warning(f"Selector LLM returned invalid next_node '{next_node}', using __end__")
            next_node = "__end__"
        result = {"next_node": next_node}
        if next_node == "coder":
            mode = (parsed.get("coder_mode") or "generate").strip().lower()
            if mode not in ("generate", "fix", "improve"):
                mode = "generate"
            result["coder_mode"] = mode
        if parsed.get("advance_sheet") is True:
            result["advance_sheet"] = True
        return result
    except Exception as e:
        logger.warning(f"Selector LLM call failed: {e}, will use fallback routing")
        return {}


# ═══════════════════════════════════════════════════════════════════════════════
# NODE FACTORIES
# ═══════════════════════════════════════════════════════════════════════════════


# ── Selector ──────────────────────────────────────────────────────────────────


def create_selector_node(bedrock_client, prompt_manager, logger=None):
    """
    Create the central Selector node.

    The Selector uses an LLM to decide the next node from the decomposed query
    and current agent state. When the LLM returns advance_sheet, we run
    save/advance helpers and use that result. On LLM failure, falls back to
    rules-based routing.

    Args:
        bedrock_client: BedrockClient for LLM calls.
        prompt_manager: PromptManager to load selector_next_node prompt.
        logger: Optional logger.

    Returns:
        A ``(state: dict) -> dict`` callable suitable for ``add_node()``.
    """
    _log = logger or get_logger("Selector")

    def _fallback_selector(state: dict) -> dict:
        """Rules-based routing used when LLM fails or returns nothing."""
        if (
            state.get("needs_clarification")
            and not state.get("skip_clarification")
            and state.get("clarification_iteration", 0) < 2
        ):
            return {"next_node": "__end__"}
        if not state.get("decompose_done"):
            return {"next_node": "decompose"}
        if state.get("is_modification") and _sm_has_existing_work(state):
            if state.get("modification_done"):
                return {"next_node": "__end__"}
            return {"next_node": "modification"}
        sheets = state.get("sheets") or []
        current_idx = state.get("current_sheet_index", 0)
        if not sheets and state.get("decompose_done") and not state.get("is_modification"):
            return {"next_node": "action_items"}
        if state.get("all_sheets_done") or current_idx >= len(sheets):
            return {"next_node": "__end__", "all_sheets_done": True}
        if not state.get("action_plan_done"):
            return {"next_node": "action_items"}
        if state.get("current_code") is None:
            return {"next_node": "coder", "coder_mode": "generate"}
        if not state.get("last_execution_attempted"):
            return {"next_node": "executor"}
        if not state.get("last_execution_success"):
            fix_attempts = state.get("execution_fix_attempts", 0)
            if fix_attempts < 3:
                return {"next_node": "coder", "coder_mode": "fix"}
            sm_updates = _save_current_sheet_to_memory(state, note="Failed – max fix attempts")
            advance = _advance_sheet(state, sheets, current_idx, failed=True, logger=_log)
            return {**sm_updates, **advance}
        if not state.get("critic_reviewed"):
            return {"next_node": "critic"}
        critic_score = state.get("critic_score") or 10.0
        improve_attempts = state.get("critic_improvement_attempts", 0)
        if critic_score < 7.0 and improve_attempts < 2:
            return {"next_node": "coder", "coder_mode": "improve"}
        sm_updates = _save_current_sheet_to_memory(state, critic_score=critic_score, note="Accepted")
        advance = _advance_sheet(state, sheets, current_idx, failed=False, logger=_log)
        return {**sm_updates, **advance}

    def selector_node(state: dict) -> dict:
        _log.info("--- SELECTOR (LLM) ---")
        sheets = state.get("sheets") or []
        current_idx = state.get("current_sheet_index", 0)

        # Exit strategy: all sheets done and critic accepted -> END
        if state.get("all_sheets_done"):
            _log.info("Selector: all_sheets_done -> __end__")
            return {"next_node": "__end__"}
        if state.get("critic_reviewed") and state.get("critic_accept"):
            sm_updates = _save_current_sheet_to_memory(
                state,
                critic_score=state.get("critic_score"),
                note="Accepted",
            )
            advance = _advance_sheet(state, sheets, current_idx, failed=False, logger=_log)
            if advance.get("next_node") == "__end__":
                _log.info("Selector: critic accept on last sheet -> __end__")
                return {**sm_updates, **advance}
            return {**sm_updates, **advance}

        decision = _invoke_selector_llm(bedrock_client, prompt_manager, state, _log)
        if not decision:
            out = _fallback_selector(state)
            _log.info(f"Selector (fallback) -> {out.get('next_node')}")
            return out

        advance_sheet = decision.get("advance_sheet") is True
        if advance_sheet:
            critic_score = state.get("critic_score")
            sm_updates = _save_current_sheet_to_memory(
                state,
                critic_score=critic_score,
                note="Accepted" if (critic_score is not None and critic_score >= 7) else "Failed – max fix attempts",
            )
            advance = _advance_sheet(
                state,
                sheets,
                current_idx,
                failed=critic_score is None or critic_score < 7,
                logger=_log,
            )
            _log.info(f"Selector (advance_sheet) -> {advance.get('next_node')}")
            return {**sm_updates, **advance}

        next_node = decision.get("next_node", "__end__")
        coder_mode = decision.get("coder_mode", "generate")
        _log.info(f"Selector (LLM) -> {next_node}" + (f" coder_mode={coder_mode}" if next_node == "coder" else ""))
        out = {"next_node": next_node}
        if next_node == "coder":
            out["coder_mode"] = coder_mode
        return out

    return selector_node


# ── Decompose ─────────────────────────────────────────────────────────────────


def create_decompose_node(decomposer_agent, logger=None):
    """
    Wrap :class:`agents.DecomposerAgent` as a LangGraph node.

    Mirrors ``ExcelAgentOrchestrator.process_request`` – Step 1.

    Returns:
        ``(state: dict) -> dict``
    """
    _log = logger or get_logger("Node.Decompose")

    def decompose_node(state: dict) -> dict:
        _log.info("=== DECOMPOSE NODE ===")
        user_request: str = state["user_request"]

        try:
            breakdown: dict = decomposer_agent.decompose_request(user_request)

            query_type: str = breakdown.get("query_type") or "new"
            query_decomposition: str = breakdown.get("query_decomposition", "")
            input_files = breakdown.get("input_files")

            # Clarification logic
            needs_clarif = False
            clarif_question = None
            if (
                not state.get("skip_clarification")
                and not _user_wants_to_proceed_anyway(user_request)
                and state.get("clarification_iteration", 0) < 2
            ):
                needs_clarif = _needs_clarification(query_decomposition)
                if needs_clarif:
                    clarif_question = query_decomposition

            # Modification detection
            is_mod = _is_modification_request(user_request, state, query_type)

            _log.info(
                f"type={query_type}  needs_clarif={needs_clarif}  "
                f"is_modification={is_mod}"
            )

            updates: dict = {
                "decompose_done": True,
                "query_type": query_type,
                "query_decomposition": query_decomposition,
                "input_files": input_files,
                "current_breakdown": breakdown,
                "needs_clarification": needs_clarif,
                "clarification_question": clarif_question,
                "is_modification": is_mod,
            }

            sm_upd = _sm_add_entry(
                state,
                "breakdown",
                breakdown,
                {"user_request": user_request[:200], "query_type": query_type},
            )
            updates.update(sm_upd)
            return updates

        except Exception as exc:
            _log.error(f"Decompose node error: {exc}", exc_info=True)
            errors = list(state.get("errors") or [])
            errors.append(f"Decompose error: {exc}")
            return {
                "errors": errors,
                "decompose_done": True,        # allow graph to proceed / fail gracefully
                "needs_clarification": False,
                "is_modification": False,
            }

    return decompose_node


# ── Action Items ──────────────────────────────────────────────────────────────

DEFAULT_CONFIG_PATH = Path("config/config.json")


def _load_config(config_path: Path) -> dict:
    """Load config.json; return empty dict with sheet_format_defaults.sheets=[] on failure."""
    try:
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {
        "sheet_format_defaults": {"sheets": []},
        "general_theming": {},
        "general_instructions": "",
        "general_defaults": {},
        "validation_rules": {},
        "confidence_thresholds": {},
    }


def create_action_items_node(action_items_agent, output_dir: Path, logger=None):
    """
    Wrap :class:`agents.ActionItemsAgent` as a LangGraph node.

    Reads config.json (sheet count, sheet types, theming, general instructions).
    On first run (no sheets in state), loads config and initialises sheets + workbook path.
    Then generates the per-sheet implementation plan for the Coder.

    Returns:
        ``(state: dict) -> dict``
    """
    _log = logger or get_logger("Node.ActionItems")

    def action_items_node(state: dict) -> dict:
        _log.info("=== ACTION ITEMS NODE ===")
        user_request: str = state["user_request"]
        assumptions: dict = state.get("assumptions") or {}
        sheets: list = state.get("sheets") or []
        current_idx: int = state.get("current_sheet_index", 0)

        # First time: load config.json and populate state (replaces former assumptions node)
        if not sheets:
            config_path = state.get("config_path") or DEFAULT_CONFIG_PATH
            if isinstance(config_path, str):
                config_path = Path(config_path)
            config = _load_config(config_path)
            sheet_format = config.get("sheet_format_defaults", {})
            sheets = sheet_format.get("sheets", [])
            num_sheets = sheet_format.get("num_sheets")
            if num_sheets == 1:
                single_opt = sheet_format.get("single_sheet_option")
                if single_opt:
                    sheets = [single_opt]
                    _log.info("Using single_sheet_option (num_sheets=1)")
            if not sheets:
                _log.error("No sheet definitions found in config.json")
                errors = list(state.get("errors") or [])
                errors.append("No sheet definitions found in config.json")
                return {
                    "errors": errors,
                    "assumptions_done": True,
                    "assumptions": {"assumptions": config},
                    "sheets": [],
                    "all_sheets_done": True,
                }
            _log.info(f"Loaded config: {len(sheets)} sheets")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            workbook_path = str((output_dir / f"forecast_model_{timestamp}.xlsx").resolve())
            first_sheet_name = sheets[0].get("name") if sheets else None
            result = {"assumptions": config}
            sm_upd = _sm_add_entry(state, "assumptions", result, {})
            tmp_state = {**state, **sm_upd}
            sm_upd2 = _sm_add_entry(tmp_state, "workbook_path", workbook_path, {"timestamp": timestamp})
            return {
                "assumptions_done": True,
                "assumptions": result,
                "sheets": sheets,
                "workbook_path": workbook_path,
                "current_sheet_index": 0,
                "current_sheet_name": first_sheet_name,
                "action_plan_done": False,
                "current_action_plan": None,
                "current_code": None,
                "current_script_path": None,
                "coder_mode": "generate",
                "last_execution_attempted": False,
                "last_execution_success": False,
                "last_execution_output": None,
                "last_execution_errors": [],
                "execution_fix_attempts": 0,
                "critic_reviewed": False,
                "critic_score": None,
                "critic_feedback": None,
                "critic_improvement_attempts": 0,
                **sm_upd,
                **sm_upd2,
            }

        if current_idx >= len(sheets):
            _log.error("Sheet index out of range – nothing to plan")
            return {"action_plan_done": True, "current_action_plan": {}}

        sheet_definition = sheets[current_idx]
        sheet_name = sheet_definition.get("name", f"Sheet{current_idx + 1}")

        try:
            assumptions_content = assumptions.get("assumptions", {})
            assumptions_no_format = {
                k: v
                for k, v in assumptions_content.items()
                if k != "sheet_format_defaults"
            }
            _log.info(f"Generating action plan for '{sheet_name}'")
            action_plan: dict = action_items_agent.generate_sheet_action_plan(
                user_query=user_request,
                assumptions_without_sheet_format=assumptions_no_format,
                sheet_definition=sheet_definition,
                sheet_index=current_idx,
            )
            _log.info(f"Action plan ready for '{sheet_name}'")
            return {
                "action_plan_done": True,
                "current_action_plan": action_plan,
                "current_sheet_name": sheet_name,
            }
        except Exception as exc:
            _log.error(f"ActionItems node error: {exc}", exc_info=True)
            errors = list(state.get("errors") or [])
            errors.append(f"ActionItems error [{sheet_name}]: {exc}")
            return {
                "errors": errors,
                "action_plan_done": True,
                "current_action_plan": {},
            }

    return action_items_node


# ── Coder ─────────────────────────────────────────────────────────────────────


def create_coder_node(coder_agent, script_manager, logger=None):
    """
    Wrap :class:`agents.CoderAgent` as a LangGraph node.

    Handles three modes driven by ``state["coder_mode"]``:

    * ``"generate"`` – initial sheet code generation
    * ``"fix"``      – fix after an execution error
    * ``"improve"``  – improve based on critic feedback

    Args:
        coder_agent:    CoderAgent instance.
        script_manager: ScriptManager for saving generated scripts.

    Returns:
        ``(state: dict) -> dict``
    """
    _log = logger or get_logger("Node.Coder")

    def coder_node(state: dict) -> dict:
        mode: str = state.get("coder_mode", "generate")
        _log.info(f"=== CODER NODE [mode={mode}] ===")

        user_request: str = state["user_request"]
        assumptions: dict = state.get("assumptions") or {}
        assumptions_content = assumptions.get("assumptions", {}) if assumptions else {}
        action_plan: dict = state.get("current_action_plan") or {}
        workbook_path: str = state.get("workbook_path") or ""
        current_idx: int = state.get("current_sheet_index", 0)
        sheet_name: str = state.get("current_sheet_name") or f"Sheet{current_idx + 1}"
        safe_name = f"{current_idx + 1}_{sheet_name.replace(' ', '_')}"

        try:
            code: str

            if mode == "generate":
                is_first_sheet = current_idx == 0
                _log.info(
                    f"Generating code for '{sheet_name}' "
                    f"(first_sheet={is_first_sheet})"
                )
                code = coder_agent.generate_sheet_code(
                    user_query=user_request,
                    assumptions=assumptions_content,
                    action_plan=action_plan,
                    workbook_path=workbook_path,
                    is_first_sheet=is_first_sheet,
                )

            elif mode == "fix":
                execution_errors = state.get("last_execution_errors") or []
                _log.info(
                    f"Fixing code for '{sheet_name}' "
                    f"(errors={execution_errors[:2]})"
                )
                code = coder_agent.edit_code(
                    original_code=state.get("current_code") or "",
                    critic_feedback="Script failed to execute. Please fix the errors.",
                    execution_errors=execution_errors,
                    action_plan=action_plan,
                )

            elif mode == "improve":
                critic_feedback = state.get("critic_feedback") or {}
                critic_score = state.get("critic_score") or 0.0
                _log.info(
                    f"Improving code for '{sheet_name}' "
                    f"(score={critic_score:.1f}/10)"
                )
                structured_fb = _format_critic_feedback(
                    summary=critic_feedback.get("summary", ""),
                    improvement_points=critic_feedback.get("improvement_points", []),
                    overall_score=int((critic_score or 0.0) * 10),
                )
                code = coder_agent.edit_code(
                    original_code=state.get("current_code") or "",
                    critic_feedback=structured_fb,
                    execution_errors=None,
                    action_plan=action_plan,
                )

            else:
                raise ValueError(f"Unknown coder_mode: {mode!r}")

            # Save script to disk
            script_path = script_manager.save_script(safe_name, code)
            _log.info(f"Code saved -> {script_path}")

            updates: dict = {
                "current_code": code,
                "current_script_path": str(script_path),
                # Reset execution state so executor runs again with fresh code
                "last_execution_attempted": False,
                "last_execution_success": False,
                "last_execution_output": None,
                "last_execution_errors": [],
            }

            if mode == "fix":
                updates["execution_fix_attempts"] = (
                    state.get("execution_fix_attempts", 0) + 1
                )

            if mode == "improve":
                # Force re-execution and re-review of improved code
                updates["critic_reviewed"] = False
                updates["critic_improvement_attempts"] = (
                    state.get("critic_improvement_attempts", 0) + 1
                )

            updates["coder_run_ok"] = True
            return updates

        except Exception as exc:
            _log.error(f"Coder node error: {exc}", exc_info=True)
            errors = list(state.get("errors") or [])
            errors.append(f"Coder error [{sheet_name}]: {exc}")
            return {
                "errors": errors,
                "coder_run_ok": False,
                "execution_fix_attempts": (
                    state.get("execution_fix_attempts", 0) + 1
                ),
            }

    return coder_node


# ── Executor ──────────────────────────────────────────────────────────────────


def create_executor_node(executor_agent, logger=None):
    """
    Wrap :class:`agents.ExecutorAgent` as a LangGraph node.

    Runs the generated Python script and records success / errors.
    Mirrors ``_process_single_sheet`` step 3b.2.

    Returns:
        ``(state: dict) -> dict``
    """
    _log = logger or get_logger("Node.Executor")

    def executor_node(state: dict) -> dict:
        _log.info("=== EXECUTOR NODE ===")
        script_path: Optional[str] = state.get("current_script_path")
        workbook_path: str = state.get("workbook_path") or ""
        sheet_name: str = state.get("current_sheet_name") or ""

        if not script_path:
            _log.error("No script path in state – cannot execute")
            return {
                "last_execution_attempted": True,
                "last_execution_success": False,
                "last_execution_errors": ["No script path available"],
            }

        try:
            _log.info(f"Executing '{script_path}'")
            result: dict = executor_agent.execute_script(script_path, workbook_path)

            success: bool = result.get("success", False)
            exec_time: float = result.get("execution_time", 0.0)
            errors: list = result.get("errors", [])
            output: str = result.get("output", "")

            if success:
                _log.info(f"Execution successful in {exec_time:.2f}s")
            else:
                _log.warning(f"Execution failed: {errors[:3]}")

            return {
                "last_execution_attempted": True,
                "last_execution_success": success,
                "last_execution_output": output,
                "last_execution_errors": errors,
            }

        except Exception as exc:
            _log.error(f"Executor node error: {exc}", exc_info=True)
            errors = list(state.get("errors") or [])
            errors.append(f"Executor error [{sheet_name}]: {exc}")
            return {
                "errors": errors,
                "last_execution_attempted": True,
                "last_execution_success": False,
                "last_execution_errors": [str(exc)],
            }

    return executor_node


# ── Critic ────────────────────────────────────────────────────────────────────


def create_critic_node(critic_agent, logger=None):
    """
    Wrap :class:`agents.CriticAgent` as a LangGraph node.

    Reviews the generated sheet against its action plan and returns a score
    (0-10) plus structured improvement points.
    Mirrors ``_process_single_sheet`` step 3b.3.

    Returns:
        ``(state: dict) -> dict``
    """
    _log = logger or get_logger("Node.Critic")

    def critic_node(state: dict) -> dict:
        _log.info("=== CRITIC NODE ===")
        workbook_path: str = state.get("workbook_path") or ""
        sheet_name: str = state.get("current_sheet_name") or ""
        action_plan: dict = state.get("current_action_plan") or {}

        # If workbook doesn't exist yet, skip and accept
        if not Path(workbook_path).exists():
            _log.warning(
                f"Workbook not found at {workbook_path!r} – "
                "accepting sheet (execution succeeded)"
            )
            sm_upd = _save_current_sheet_to_memory(
                state, note="Accepted – workbook not found for critic"
            )
            return {
                "critic_reviewed": True,
                "critic_score": 7.0,
                "critic_accept": True,
                **sm_upd,
            }

        try:
            _log.info(f"Reviewing sheet '{sheet_name}' in {workbook_path!r}")
            assumptions_content = (state.get("assumptions") or {}).get("assumptions", {})
            validation_rules = assumptions_content.get("validation_rules", {})
            confidence_thresholds = assumptions_content.get("confidence_thresholds", {})
            review: dict = critic_agent.review_spreadsheet(
                workbook_path,
                sheet_name=sheet_name,
                action_plan=action_plan,
                validation_rules=validation_rules,
                confidence_thresholds=confidence_thresholds,
            )

            overall_score: int = review.get("overall_score", 0)
            score: float = overall_score / 10.0   # 0-100 → 0-10
            summary: str = review.get("summary", "")
            _log.info(f"Critic score: {score:.1f}/10  (raw={overall_score}/100)")
            if summary:
                _log.info(f"Summary: {summary[:150]}")

            accept_threshold = float(os.getenv("CRITIC_ACCEPT_THRESHOLD", "7.0"))
            critic_accept = score >= accept_threshold
            updates: dict = {
                "critic_reviewed": True,
                "critic_score": score,
                "critic_feedback": review,
                "critic_accept": critic_accept,
            }

            # Persist code to memory when the sheet passes
            if critic_accept:
                _log.info(f"Sheet '{sheet_name}' passed review")
                sm_upd = _save_current_sheet_to_memory(
                    state,
                    critic_score=score,
                    note=f"Passed critic (score={score:.1f})",
                )
                updates.update(sm_upd)

            return updates

        except Exception as exc:
            etype = type(exc).__name__
            if "Timeout" in etype or "timeout" in str(exc).lower():
                _log.warning(
                    f"Critic timed out for '{sheet_name}' – accepting sheet "
                    "(execution already succeeded)"
                )
            else:
                _log.error(f"Critic node error: {exc}", exc_info=True)

            sm_upd = _save_current_sheet_to_memory(
                state, note="Accepted after critic timeout/failure"
            )
            return {
                "critic_reviewed": True,
                "critic_score": 7.0,
                "critic_accept": True,
                **sm_upd,
            }

    return critic_node


# ── Modification ──────────────────────────────────────────────────────────────


def create_modification_node(
    coordinator_agent,
    action_items_agent,
    coder_agent,
    executor_agent,
    script_manager,
    logger=None,
):
    """
    Handle edit / continuation requests against already-generated sheets.

    Mirrors ``ExcelAgentOrchestrator._handle_modification_request`` (+ helpers)
    as a single self-contained LangGraph node.

    Args:
        coordinator_agent:  CoordinatorAgent – analyses which sheets to modify.
        action_items_agent: ActionItemsAgent – produces modification plan.
        coder_agent:        CoderAgent – generates modified code.
        executor_agent:     ExecutorAgent – runs the modified code.
        script_manager:     ScriptManager – saves scripts to disk.

    Returns:
        ``(state: dict) -> dict``
    """
    _log = logger or get_logger("Node.Modification")

    # ─── helpers ──────────────────────────────────────────────────────────────

    def _extract_sheets_from_analysis(
        analysis: str, available_sheets: List[str]
    ) -> List[str]:
        sheets_to_modify: List[str] = []
        for line in analysis.split("\n"):
            if "SHEETS_TO_MODIFY" in line.upper():
                parts = line.split(":", 1)
                if len(parts) > 1:
                    potentials = [s.strip() for s in parts[1].split(",")]
                    for sheet in available_sheets:
                        for p in potentials:
                            if sheet.lower() in p.lower() or p.lower() in sheet.lower():
                                if sheet not in sheets_to_modify:
                                    sheets_to_modify.append(sheet)
                                break
        return sheets_to_modify

    # ─── node body ────────────────────────────────────────────────────────────

    def modification_node(state: dict) -> dict:  # noqa: C901
        _log.info("=== MODIFICATION NODE ===")
        user_request: str = state["user_request"]

        # Session memory snapshot
        memory_sheets = _sm_get_all_sheet_names(state)
        workbook_path = (
            state.get("workbook_path")
            or _sm_get_current_workbook_path(state)
        )
        assumptions_entry = _sm_get_latest_assumptions(state)
        assumptions = (
            (assumptions_entry or {}).get("content", {})
            if assumptions_entry
            else {}
        )

        if not workbook_path:
            _log.error("No workbook path in session memory")
            return {
                "modification_done": True,
                "final_response": (
                    "Error: No existing workbook found in session memory. "
                    "Please create a workbook first."
                ),
            }

        # ── 1. Coordinator analysis ────────────────────────────────────────
        analysis_prompt = (
            f"Analyze this user modification request in the context of existing work:\n\n"
            f"USER REQUEST: {user_request}\n\n"
            f"EXISTING SHEETS: {', '.join(memory_sheets)}\n\n"
            f"Determine:\n"
            f"1. Which sheet(s) need to be modified? (provide exact names)\n"
            f"2. What changes are requested?\n"
            f"3. Is this a modification of existing sheets or a request for new sheets?\n\n"
            f"Respond in this format:\n"
            f"MODIFICATION TYPE: [MODIFY_EXISTING / CREATE_NEW / BOTH]\n"
            f"SHEETS_TO_MODIFY: [comma-separated list of exact sheet names]\n"
            f"CHANGES_REQUESTED: [brief description]"
        )
        analysis: str = coordinator_agent.generate_response(analysis_prompt)
        _log.info(f"Coordinator analysis: {analysis[:300]}")

        if "CREATE_NEW" in analysis.upper():
            _log.info("Modification requires new sheets – delegating to creation flow")
            # Signal that we need a full new-creation pass
            return {
                "modification_done": True,
                "is_modification": False,
                "assumptions_done": False,
                "decompose_done": False,
                "skip_clarification": True,
            }

        sheets_to_modify = _extract_sheets_from_analysis(analysis, memory_sheets)
        if not sheets_to_modify:
            _log.warning("Could not determine sheets to modify")
            return {
                "modification_done": True,
                "is_modification": False,
                "assumptions_done": False,
                "decompose_done": False,
                "skip_clarification": True,
            }

        _log.info(f"Modifying sheets: {sheets_to_modify}")
        failed_sheets: List[str] = []
        state_snapshot = dict(state)   # read-only reference for sm helpers

        for sheet_name in sheets_to_modify:
            _log.info(f"-- Modifying '{sheet_name}' --")
            try:
                existing_entry = _sm_get_latest_code(state_snapshot, sheet_name)
                existing_code = existing_entry.get("content") if existing_entry else None

                # Generate modification action plan
                action_plan = action_items_agent.generate_modification_action_plan(
                    user_query=user_request,
                    sheet_name=sheet_name,
                    existing_code=existing_code,
                    workbook_path=workbook_path,
                )

                # Generate modified code
                modified_code = coder_agent.modify_sheet_code(
                    user_query=user_request,
                    existing_code=existing_code,
                    action_plan=action_plan,
                    assumptions=assumptions.get("assumptions", {}),
                    workbook_path=workbook_path,
                    sheet_name=sheet_name,
                )

                safe_name = f"modified_{sheet_name.replace(' ', '_')}"
                script_path = script_manager.save_script(safe_name, modified_code)
                exec_result = executor_agent.execute_script(
                    str(script_path), workbook_path
                )

                # MergedCell retry
                if not exec_result["success"]:
                    err_str = " ".join(str(e) for e in exec_result.get("errors", []))
                    if "MergedCell" in err_str or "read-only" in err_str:
                        _log.info("MergedCell error detected – retrying with fix")
                        modified_code = coder_agent.edit_code(
                            original_code=modified_code,
                            critic_feedback=(
                                "The script failed with: 'MergedCell' object attribute 'value' "
                                "is read-only. When writing to cells you must either: "
                                "(1) Unmerge any merged ranges that overlap the write area before "
                                "assigning, or (2) Skip MergedCell when iterating: "
                                "from openpyxl.cell.cell import MergedCell; "
                                "if isinstance(cell, MergedCell): continue. "
                                "Apply the fix and return the full corrected script."
                            ),
                            execution_errors=exec_result.get("errors", []),
                            action_plan=action_plan,
                        )
                        try:
                            script_path = script_manager.save_script(
                                safe_name, modified_code
                            )
                            exec_result = executor_agent.execute_script(
                                str(script_path), workbook_path
                            )
                        except Exception as retry_exc:
                            _log.error(f"Retry failed: {retry_exc}")

                if exec_result["success"]:
                    _log.info(f"Successfully modified '{sheet_name}'")
                    # Persist modified code to in-state memory
                    sm_upd = _sm_add_entry(
                        state_snapshot,
                        "code",
                        modified_code,
                        {
                            "sheet_name": sheet_name,
                            "modification_request": user_request[:200],
                            "script_path": str(script_path),
                            "execution_time": exec_result.get("execution_time", 0),
                        },
                    )
                    # Apply memory updates to snapshot so subsequent sheets see them
                    state_snapshot.update(sm_upd)
                else:
                    _log.error(f"Execution failed for modified '{sheet_name}'")
                    failed_sheets.append(sheet_name)

            except Exception as exc:
                _log.error(f"Modification error for '{sheet_name}': {exc}", exc_info=True)
                failed_sheets.append(sheet_name)

        # ── Build final response ───────────────────────────────────────────
        if failed_sheets:
            success_count = len(sheets_to_modify) - len(failed_sheets)
            response = (
                f"Modification completed with partial success.\n"
                f"Modified: {success_count}/{len(sheets_to_modify)} sheets\n"
                f"Failed: {', '.join(failed_sheets)}\n"
                f"Workbook: {workbook_path}"
            )
        else:
            response = (
                f"Successfully modified {len(sheets_to_modify)} sheet(s)!\n"
                f"Sheets: {', '.join(sheets_to_modify)}\n"
                f"Workbook: {workbook_path}"
            )

        # Merge memory changes accumulated in snapshot back into state updates
        upd = {
            "modification_done": True,
            "final_response": response,
            "sm_entries": state_snapshot.get("sm_entries", state.get("sm_entries", {})),
            "sm_code_index": state_snapshot.get("sm_code_index", state.get("sm_code_index", {})),
            "sm_counter": state_snapshot.get("sm_counter", state.get("sm_counter", 0)),
        }
        return upd

    return modification_node
