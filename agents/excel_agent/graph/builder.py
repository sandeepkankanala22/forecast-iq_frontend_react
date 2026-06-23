"""
LangGraph StateGraph builder for the ForecastAgent Excel Agent.

``build_graph()`` is the single entry-point.  It:

1. Creates node callables from the factory functions in ``graph.nodes``.
2. Wires up the StateGraph with nodes and edges that match the
   Selector-centric architecture shown in the project diagram.
3. Returns a compiled graph ready to be invoked by the orchestrator.

Graph topology
--------------

                      ┌─────────────────────────────┐
                      │         START               │
                      └──────────────┬──────────────┘
                                     │
                      ┌──────────────▼──────────────┐
                      │          SELECTOR            │  (LLM-based routing)
                      └──┬──┬──┬──┬──┬──┬──┬──┬──┘
                         │  │  │  │  │  │  │  │
                   decomp  action_items  coder  ...  END
                          │     │    executor
                          │     │       critic
                          │  modification
                          │
                    ◄─────┘
  Circular flow (no selector between): coder → executor → critic → selector
  Conditional: coder succeeds → executor; fails → selector
               executor succeeds → critic; fails → selector
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from langgraph.graph import END, StateGraph

from .edges import route_from_selector, route_from_coder, route_from_executor
from .state import AgentState
from .nodes import (
    create_action_items_node,
    create_coder_node,
    create_critic_node,
    create_decompose_node,
    create_modification_node,
    create_selector_node,
    create_executor_node,
)

if TYPE_CHECKING:
    from langgraph.graph.graph import CompiledGraph


def build_graph(
    agents: dict,
    script_manager,
    excel_manager,
    output_dir: Path,
    logger,
) -> "CompiledGraph":
    """
    Assemble and compile the ForecastAgent LangGraph workflow.

    All agent instances are captured inside node-function closures so the
    graph itself remains a plain data structure that LangGraph can serialise
    and checkpoint without needing to pickle live objects.

    Args:
        agents:         Dict produced by ``ExcelAgentOrchestrator._initialize_agents()``.
                        Expected keys: ``decomposer``, ``actionitems``,
                        ``coder``, ``executor``, ``critic``, ``coordinator``.
        script_manager: :class:`utils.ScriptManager` instance.
        excel_manager:  :class:`utils.ExcelManager` instance (kept for future nodes).
        output_dir:     Directory where Excel workbooks are saved.
        logger:         Shared logger passed to every node factory.

    Returns:
        A compiled LangGraph graph (``CompiledGraph``) ready for ``.invoke()``
        or ``.stream()``.
    """
    # ── Create node callables ────────────────────────────────────────────────
    bedrock_client = agents["decomposer"].bedrock
    prompt_manager = agents["decomposer"].prompt_manager
    selector_node     = create_selector_node(bedrock_client, prompt_manager, logger)
    decompose_node    = create_decompose_node(agents["decomposer"], logger)
    action_items_node = create_action_items_node(agents["actionitems"], output_dir, logger)
    coder_node        = create_coder_node(agents["coder"], script_manager, logger)
    executor_node     = create_executor_node(agents["executor"], logger)
    critic_node       = create_critic_node(agents["critic"], logger)
    modification_node = create_modification_node(
        coordinator_agent=agents["coordinator"],
        action_items_agent=agents["actionitems"],
        coder_agent=agents["coder"],
        executor_agent=agents["executor"],
        script_manager=script_manager,
        logger=logger,
    )

    # ── Build StateGraph ─────────────────────────────────────────────────────
    # AgentState is a TypedDict (total=False) so LangGraph creates per-field
    # channels and every node receives the full accumulated state, not just
    # the last node's output delta.
    builder = StateGraph(AgentState)

    # Register all nodes
    builder.add_node("selector",     selector_node)
    builder.add_node("decompose",    decompose_node)
    builder.add_node("action_items", action_items_node)
    builder.add_node("coder",        coder_node)
    builder.add_node("executor",     executor_node)
    builder.add_node("critic",       critic_node)
    builder.add_node("modification", modification_node)

    # ── Entry point ──────────────────────────────────────────────────────────
    builder.set_entry_point("selector")

    # ── Selector → conditional fan-out ──────────────────────────────────────
    builder.add_conditional_edges(
        "selector",
        route_from_selector,
        {
            "decompose":    "decompose",
            "action_items": "action_items",
            "coder":        "coder",
            "executor":     "executor",
            "critic":       "critic",
            "modification": "modification",
            END:            END,
        },
    )

    # ── Edges: decompose, action_items, modification → selector ───────────────
    for node_name in ("decompose", "action_items", "modification"):
        builder.add_edge(node_name, "selector")

    # ── Circular flow: coder → executor → critic → selector (conditional) ───
    builder.add_conditional_edges(
        "coder",
        route_from_coder,
        {"executor": "executor", "selector": "selector"},
    )
    builder.add_conditional_edges(
        "executor",
        route_from_executor,
        {"critic": "critic", "selector": "selector"},
    )
    builder.add_edge("critic", "selector")

    # ── Compile ──────────────────────────────────────────────────────────────
    compiled = builder.compile()
    logger.info("LangGraph compiled successfully")
    return compiled
