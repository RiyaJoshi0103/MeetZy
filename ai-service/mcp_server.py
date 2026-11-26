import json
import time
from typing import Any, Optional
from pydantic import BaseModel, Field

# MCP Standard Tool Schemas
MCP_TOOLS = [
    {
        "name": "search_meeting_transcripts",
        "description": "Search spoken meeting transcripts by keyword, speaker username, or topic",
        "inputSchema": {
            "type": "object",
            "properties": {
                "meeting_code": {"type": "string", "description": "The unique meeting room code"},
                "query": {"type": "string", "description": "Keyword or topic to search for in dialogue"},
                "speaker": {"type": "string", "description": "Optional speaker username to filter by"}
            },
            "required": ["meeting_code", "query"]
        }
    },
    {
        "name": "get_meeting_notes",
        "description": "Retrieve structured meeting notes including executive summary, key topics, decisions, and action items",
        "inputSchema": {
            "type": "object",
            "properties": {
                "meeting_code": {"type": "string", "description": "The unique meeting room code"}
            },
            "required": ["meeting_code"]
        }
    },
    {
        "name": "assign_meeting_task",
        "description": "Assign or add a new action item deliverable with an owner and deadline",
        "inputSchema": {
            "type": "object",
            "properties": {
                "meeting_code": {"type": "string", "description": "The unique meeting room code"},
                "task": {"type": "string", "description": "Description of the task to be completed"},
                "owner": {"type": "string", "description": "Username of assignee"},
                "due_date": {"type": "string", "description": "Target completion date (e.g. 'Tomorrow', 'By Friday')"}
            },
            "required": ["meeting_code", "task", "owner"]
        }
    },
    {
        "name": "export_meeting_minutes",
        "description": "Generate formatted executive meeting minutes in Markdown or text format",
        "inputSchema": {
            "type": "object",
            "properties": {
                "meeting_code": {"type": "string", "description": "The unique meeting room code"},
                "format": {"type": "string", "enum": ["markdown", "text"], "default": "markdown"}
            },
            "required": ["meeting_code"]
        }
    }
]

class MCPCallPayload(BaseModel):
    name: str = Field(..., description="Tool name to execute")
    arguments: dict[str, Any] = Field(default={}, description="Tool input arguments")

class MCPContentItem(BaseModel):
    type: str = "text"
    text: str

class MCPCallResponse(BaseModel):
    content: list[MCPContentItem]
    isError: bool = False

class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = 1
    method: str
    params: Optional[dict[str, Any]] = None

class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = 1
    result: Optional[Any] = None
    error: Optional[dict[str, Any]] = None

def execute_mcp_tool(tool_name: str, args: dict[str, Any], context_data: Optional[dict] = None) -> MCPCallResponse:
    """
    Executes standard MCP tool actions with in-memory meeting state or mock context.
    """
    context = context_data or {}
    segments = context.get("segments", [])
    notes = context.get("notes", {})
    meeting_code = args.get("meeting_code", "GENERAL").upper()

    if tool_name == "search_meeting_transcripts":
        query = args.get("query", "").lower()
        speaker = args.get("speaker", "").lower()
        matched = []
        for s in segments:
            text = getattr(s, "text", s.get("text", "")).lower()
            spk = getattr(s, "speaker", s.get("speaker", "")).lower()
            line = getattr(s, "line_number", s.get("line_number", 1))
            if (not speaker or speaker in spk) and (query in text or not query):
                matched.append(f"Line {line} [{spk}]: {text}")

        res_text = "\n".join(matched[:5]) if matched else f"No transcript matches found for query '{query}' in meeting {meeting_code}."
        return MCPCallResponse(content=[MCPContentItem(text=res_text)])

    elif tool_name == "get_meeting_notes":
        summary = notes.get("summary", f"Meeting {meeting_code} session review.")
        decisions = notes.get("decisions", [])
        actions = notes.get("action_items", [])
        output = {
            "meeting_code": meeting_code,
            "summary": summary,
            "decisions_count": len(decisions),
            "action_items_count": len(actions),
            "decisions": decisions[:5],
            "action_items": actions[:5]
        }
        return MCPCallResponse(content=[MCPContentItem(text=json.dumps(output, indent=2))])

    elif tool_name == "assign_meeting_task":
        task = args.get("task", "Review items")
        owner = args.get("owner", "Unassigned")
        due = args.get("due_date", "Soon")
        res_text = f"Action item created: '{task}' assigned to @{owner} (Due: {due}) for meeting {meeting_code}."
        return MCPCallResponse(content=[MCPContentItem(text=res_text)])

    elif tool_name == "export_meeting_minutes":
        summary = notes.get("summary", f"Discussion held for meeting room {meeting_code}.")
        date_str = time.strftime("%Y-%m-%d %H:%M:%S")
        md = f"# Meetzy Executive Minutes - {meeting_code}\n\nDate: {date_str}\n\n## Summary\n{summary}\n"
        return MCPCallResponse(content=[MCPContentItem(text=md)])

    else:
        return MCPCallResponse(
            content=[MCPContentItem(text=f"Unknown tool: {tool_name}")],
            isError=True
        )

def handle_jsonrpc(req: JSONRPCRequest, context_data: Optional[dict] = None) -> JSONRPCResponse:
    """
    Standard JSON-RPC 2.0 handler for Model Context Protocol.
    """
    if req.method == "tools/list":
        return JSONRPCResponse(id=req.id, result={"tools": MCP_TOOLS})

    elif req.method == "tools/call":
        params = req.params or {}
        tool_name = params.get("name")
        args = params.get("arguments", {})
        if not tool_name:
            return JSONRPCResponse(id=req.id, error={"code": -32602, "message": "Missing tool name"})

        result = execute_mcp_tool(tool_name, args, context_data)
        return JSONRPCResponse(id=req.id, result=result.model_dump())

    elif req.method == "ping":
        return JSONRPCResponse(id=req.id, result={"status": "pong", "time": time.time()})

    else:
        return JSONRPCResponse(
            id=req.id,
            error={"code": -32601, "message": f"Method not found: {req.method}"}
        )
