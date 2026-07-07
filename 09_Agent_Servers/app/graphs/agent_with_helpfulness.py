from __future__ import annotations

from typing import Annotated
from typing_extensions import TypedDict

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel

from app.models import get_chat_model
from app.tools import get_tool_belt

MAX_RETRIES = 3

AGENT_SYSTEM_PROMPT = (
    "You are a helpful assistant specialized in feline (cat) health. "
    "Use the retrieve_information tool for cat-health questions, web search for "
    "current information, and Arxiv for research papers. Cite tool results when "
    "they inform your answer."
)

JUDGE_SYSTEM_PROMPT = (
    "You are a strict response quality evaluator. Given a user question and an assistant "
    "response, decide if the response is HELPFUL. A helpful response: directly answers "
    "the specific question, provides actionable or specific information, cites sources "
    "when relevant, and is not vague or evasive. Mark as NOT helpful if the response is "
    "generic, refuses to engage, or fails to address the actual question."
)


class HelpfulnessVerdict(BaseModel):
    is_helpful: bool
    reason: str


class State(TypedDict):
    messages: Annotated[list, add_messages]
    retry_count: int
    is_helpful: bool


def _build() -> StateGraph:
    model = get_chat_model()
    tools = get_tool_belt()

    inner_agent = create_agent(
        model=model,
        tools=tools,
        system_prompt=AGENT_SYSTEM_PROMPT,
    )

    # Separate judge model instance so temperature/params are independent
    judge_llm = get_chat_model().with_structured_output(HelpfulnessVerdict)

    def run_agent(state: State) -> dict:
        messages = list(state["messages"])
        retry_count = state.get("retry_count", 0)

        if retry_count > 0:
            messages = messages + [
                HumanMessage(
                    content=(
                        "Your previous response was judged as insufficiently helpful. "
                        "Please try again with a more specific, thorough, and accurate answer "
                        "to the original question."
                    )
                )
            ]

        result = inner_agent.invoke({"messages": messages})
        # result["messages"] includes input + generated; slice off only new messages
        new_messages = result["messages"][len(messages):]
        return {"messages": new_messages}

    def judge_response(state: State) -> dict:
        retry_count = state.get("retry_count", 0)

        # Find the original user question
        first_human = next(
            (m for m in state["messages"] if isinstance(m, HumanMessage)), None
        )
        # Find the most recent AI response to judge
        last_ai = next(
            (m for m in reversed(state["messages"]) if isinstance(m, AIMessage)),
            None,
        )

        if last_ai is None or first_human is None:
            # Nothing to judge — treat as not helpful so we retry
            return {"is_helpful": False, "retry_count": retry_count + 1}

        judge_input = [
            SystemMessage(content=JUDGE_SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"User question: {first_human.content}\n\n"
                    f"Assistant response: {last_ai.content}\n\n"
                    "Is this response helpful?"
                )
            ),
        ]
        verdict: HelpfulnessVerdict = judge_llm.invoke(judge_input)
        return {
            "is_helpful": verdict.is_helpful,
            "retry_count": retry_count + 1,
        }

    def route_after_judge(state: State) -> str:
        if state.get("is_helpful", False) or state.get("retry_count", 0) >= MAX_RETRIES:
            return END
        return "run_agent"

    builder = StateGraph(State)
    builder.add_node("run_agent", run_agent)
    builder.add_node("judge_response", judge_response)

    builder.add_edge(START, "run_agent")
    builder.add_edge("run_agent", "judge_response")
    builder.add_conditional_edges("judge_response", route_after_judge)

    return builder.compile()


graph = _build()
