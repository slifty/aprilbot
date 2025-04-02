import os
from contextlib import asynccontextmanager
from time import sleep
from langchain_mcp_adapters.client import MultiServerMCPClient, StdioConnection  # type: ignore
from langgraph.prebuilt import create_react_agent  # type: ignore
from langchain_openai import ChatOpenAI
from langgraph.graph import START, StateGraph
from langchain_core.messages import AnyMessage, HumanMessage, SystemMessage
from pydantic import BaseModel

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_TEAM_ID = os.getenv("SLACK_TEAM_ID")
SLEEP_TIME = os.getenv("SLEEP_TIME", 60)

model = ChatOpenAI(model=os.getenv("LLM_MODEL", "gpt-4o"))


class State(BaseModel):
    messages: list[AnyMessage]


@asynccontextmanager
async def make_graph():
    if not SLACK_BOT_TOKEN:
        raise ValueError("SLACK_BOT_TOKEN environment variable is not set.")

    if not SLACK_TEAM_ID:
        raise ValueError("SLACK_TEAM_ID environment variable is not set.")

    slack_config: StdioConnection = {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-slack"],
        "env": {
            "SLACK_BOT_TOKEN": SLACK_BOT_TOKEN,
            "SLACK_TEAM_ID": SLACK_TEAM_ID,
        },
        "transport": "stdio",
        "encoding": "utf-8",
        "encoding_error_handler": "strict",
    }

    async with MultiServerMCPClient({"slack": slack_config}) as client:
        builder = StateGraph(State)
        builder.add_node(  # type: ignore
            "instruction",
            lambda state: {
                "messages": [  # type: ignore
                    HumanMessage(
                        content=(
                            "First check the Slack channel with ID C02JZTC78 for recent messages in the history, "
                            "Then add a reaction or respond to the most recent message. "
                            "unless it's an April Bot message."
                        )
                    ),
                ]
            },
        )
        builder.add_node(  # type: ignore
            "slack",
            create_react_agent(
                model,
                client.get_tools(),
                prompt=SystemMessage(
                    content=(
                        "You are an April Fools robot whose name is April Bot. "
                        "Your job is to add whimsy and magic to Slack."
                    )
                ),
            ),
        )
        builder.add_node(  # type: ignore
            "sleep_node",
            lambda _state: sleep(int(SLEEP_TIME)),  # type: ignore
        )
        builder.add_edge(START, "instruction")
        builder.add_edge("instruction", "slack")
        builder.add_edge("slack", "sleep_node")
        builder.add_edge("sleep_node", "instruction")
        graph = builder.compile()  # type: ignore

        yield graph
