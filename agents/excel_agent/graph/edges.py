"""
Conditional edge routing for the ForecastAgent LangGraph graph.

The Selector node populates state["next_node"]. Coder and Executor use
conditional edges for the coder->executor->critic circular flow.
"""

from langgraph.graph import END


def route_from_coder(state: dict) -> str:
    """
    After coder runs: executor if code generated successfully, else selector.
    """
    if state.get("coder_run_ok") is True:
        return "executor"
    return "selector"


def route_from_executor(state: dict) -> str:
    """
    After executor runs: critic if execution succeeded, else selector.
    """
    if state.get("last_execution_success") is True:
        return "critic"
    return "selector"


def route_from_selector(state: dict) -> str:
    """
    Read ``state["next_node"]`` and return the LangGraph destination key.

    The Selector node is responsible for deciding the routing; this function
    is a thin adapter that translates the string value into the key that
    LangGraph's conditional-edge mechanism expects.

    Exit strategy: if all sheets are done and critic accepted, force END
    so the graph always exits even if selector returned something else.

    Recognised values
    -----------------
    ``"__end__"``       → :data:`langgraph.graph.END`
    Any other string    → passed through as-is (must match a node name in the graph)

    Args:
        state: Current :class:`graph.state.AgentState` dict.

    Returns:
        Node name string or :data:`langgraph.graph.END`.
    """
    if state.get("all_sheets_done") and (
        state.get("critic_accept") or (state.get("critic_score") or 0) >= 7.0
    ):
        return END

    next_node = state.get("next_node", "__end__")

    if next_node in ("__end__", END):
        return END

    return next_node
