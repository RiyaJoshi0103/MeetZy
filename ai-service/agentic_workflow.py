import time
from typing import Any, Optional
from pydantic import BaseModel, Field
from mcp_server import execute_mcp_tool

class AgentStep(BaseModel):
    step_number: int
    tool: str
    arguments: dict[str, Any]
    output: str

class AgentRunPayload(BaseModel):
    meeting_code: str = Field(..., description="Unique meeting room code")
    instruction: str = Field(..., description="Complex agent instruction or goal")
    user: str = Field(default="Participant")
    segments: list[Any] = Field(default=[])
    notes: Optional[dict[str, Any]] = Field(default=None)

class AgentRunResponse(BaseModel):
    meeting_code: str
    instruction: str
    steps_executed: list[AgentStep]
    final_answer: str
    status: str = "success"
    duration_seconds: float

def run_agentic_workflow(payload: AgentRunPayload) -> AgentRunResponse:
    """
    Executes a multi-step agentic workflow using MCP tools and stateful reasoning.
    """
    start_time = time.time()
    code = payload.meeting_code.strip().upper()
    instr_lower = payload.instruction.lower()
    steps: list[AgentStep] = []
    step_num = 1

    context_data = {
        "segments": payload.segments,
        "notes": payload.notes or {}
    }

    # Step 1: Decision on transcript search
    if any(k in instr_lower for k in ["search", "find", "what did", "who said", "check transcript"]):
        query = payload.instruction.replace("search", "").replace("find", "").strip()[:40]
        step1_res = execute_mcp_tool(
            "search_meeting_transcripts",
            {"meeting_code": code, "query": query},
            context_data
        )
        steps.append(AgentStep(
            step_number=step_num,
            tool="search_meeting_transcripts",
            arguments={"meeting_code": code, "query": query},
            output=step1_res.content[0].text
        ))
        step_num += 1

    # Step 2: Decision on notes / summary retrieval
    if any(k in instr_lower for k in ["summary", "notes", "decisions", "status", "overview"]):
        step2_res = execute_mcp_tool(
            "get_meeting_notes",
            {"meeting_code": code},
            context_data
        )
        steps.append(AgentStep(
            step_number=step_num,
            tool="get_meeting_notes",
            arguments={"meeting_code": code},
            output=step2_res.content[0].text
        ))
        step_num += 1

    # Step 3: Action item assignment if requested
    if any(k in instr_lower for k in ["assign", "create task", "add action item", "track task"]):
        task_desc = payload.instruction.replace("assign", "").replace("create task", "").strip()[:80]
        step3_res = execute_mcp_tool(
            "assign_meeting_task",
            {"meeting_code": code, "task": task_desc, "owner": payload.user, "due_date": "Next sprint"},
            context_data
        )
        steps.append(AgentStep(
            step_number=step_num,
            tool="assign_meeting_task",
            arguments={"meeting_code": code, "task": task_desc, "owner": payload.user},
            output=step3_res.content[0].text
        ))
        step_num += 1

    # Step 4: Export minutes if requested
    if any(k in instr_lower for k in ["export", "minutes", "markdown", "download"]):
        step4_res = execute_mcp_tool(
            "export_meeting_minutes",
            {"meeting_code": code, "format": "markdown"},
            context_data
        )
        steps.append(AgentStep(
            step_number=step_num,
            tool="export_meeting_minutes",
            arguments={"meeting_code": code, "format": "markdown"},
            output=step4_res.content[0].text[:180] + "..."
        ))
        step_num += 1

    # Default fallback step if general query
    if not steps:
        step_res = execute_mcp_tool(
            "get_meeting_notes",
            {"meeting_code": code},
            context_data
        )
        steps.append(AgentStep(
            step_number=1,
            tool="get_meeting_notes",
            arguments={"meeting_code": code},
            output=step_res.content[0].text
        ))

    # Synthesize Final Answer
    final_answer = (
        f"Agent completed goal for meeting {code}. "
        f"Executed {len(steps)} tool(s) successfully: {', '.join(s.tool for s in steps)}."
    )

    return AgentRunResponse(
        meeting_code=code,
        instruction=payload.instruction,
        steps_executed=steps,
        final_answer=final_answer,
        status="success",
        duration_seconds=round(time.time() - start_time, 3)
    )
