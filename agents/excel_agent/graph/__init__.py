"""
graph package – LangGraph workflow for the ForecastAgent Excel Agent.

Public surface
--------------
build_graph   : assemble and compile the StateGraph
initial_state : build a clean initial state dict for a new invocation
AgentState    : (documentation / type-checking only) state schema
"""

from .builder import build_graph
from .state import AgentState, initial_state

__all__ = ["build_graph", "initial_state", "AgentState"]
