import os
import base64
import time
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from notes_generator import (
    TranscriptSegmentInput,
    MeetingNotesResponse,
    generate_meeting_notes,
)
from rag_agent import (
    MeetingQAPayload,
    MeetingQAResponse,
    ask_meeting_agent,
)
from mcp_server import (
    MCP_TOOLS,
    MCPCallPayload,
    MCPCallResponse,
    JSONRPCRequest,
    JSONRPCResponse,
    execute_mcp_tool,
    handle_jsonrpc,
)
from agentic_workflow import (
    AgentRunPayload,
    AgentRunResponse,
    run_agentic_workflow,
)

load_dotenv()

app = FastAPI(
    title="Meetzy AI Transcription Service",
    description="Microservice for audio chunk transcription, speaker diarization, and meeting memory",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AudioChunkPayload(BaseModel):
    meeting_code: str = Field(..., description="Unique meeting room code")
    speaker: str = Field(..., description="Verified username of speaker")
    audio_base64: Optional[str] = Field(None, description="Base64-encoded audio chunk (webm/wav/mp3)")
    start_time: float = Field(default=0.0, description="Chunk start offset in seconds")
    end_time: float = Field(default=0.0, description="Chunk end offset in seconds")
    text_override: Optional[str] = Field(None, description="Direct text for testing/transcription pipelines")

class TranscriptionResponse(BaseModel):
    meeting_code: str
    speaker: str
    text: str
    start_time: float
    end_time: float
    confidence: float
    processed_at: float

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "meetzy-ai-transcription",
        "whisper_model": os.getenv("WHISPER_MODEL", "base"),
        "timestamp": time.time()
    }

@app.post("/transcribe", response_model=TranscriptionResponse, status_code=status.HTTP_200_OK)
def transcribe_chunk(payload: AudioChunkPayload):
    if not payload.meeting_code or not payload.speaker:
        raise HTTPException(status_code=400, detail="meeting_code and speaker are required")

    clean_code = payload.meeting_code.strip().upper()
    speaker = payload.speaker.strip()
    transcribed_text = ""
    confidence = 0.95

    # If text is provided directly (e.g. from Web Speech API client fallback or test runner)
    if payload.text_override:
        transcribed_text = payload.text_override.strip()
    elif payload.audio_base64:
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                import requests
                # Decode audio bytes
                audio_bytes = base64.b64decode(payload.audio_base64)
                files = {"file": ("chunk.webm", audio_bytes, "audio/webm")}
                data = {"model": "whisper-1"}
                headers = {"Authorization": f"Bearer {openai_key}"}
                response = requests.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=15
                )
                if response.status_code == 200:
                    transcribed_text = response.json().get("text", "")
                else:
                    transcribed_text = f"[{speaker} audio segment: {payload.start_time:.1f}s - {payload.end_time:.1f}s]"
            except Exception:
                transcribed_text = f"[{speaker} audio segment: {payload.start_time:.1f}s - {payload.end_time:.1f}s]"
        else:
            # Standalone audio fallback when API key is unconfigured
            transcribed_text = f"[{speaker} speaking from {payload.start_time:.1f}s to {payload.end_time:.1f}s]"
    else:
        raise HTTPException(status_code=400, detail="Either audio_base64 or text_override must be provided")

    return TranscriptionResponse(
        meeting_code=clean_code,
        speaker=speaker,
        text=transcribed_text,
        start_time=payload.start_time,
        end_time=payload.end_time,
        confidence=confidence,
        processed_at=time.time()
    )

class GenerateNotesPayload(BaseModel):
    meeting_code: str = Field(..., description="Unique meeting room code")
    segments: list[TranscriptSegmentInput] = Field(default=[], description="List of ordered transcript segments")

@app.post("/generate-notes", response_model=MeetingNotesResponse, status_code=status.HTTP_200_OK)
def api_generate_notes(payload: GenerateNotesPayload):
    if not payload.meeting_code:
        raise HTTPException(status_code=400, detail="meeting_code is required")
    try:
        notes = generate_meeting_notes(payload.meeting_code.strip().upper(), payload.segments)
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate meeting notes: {str(e)}")

@app.post("/meeting-qa", response_model=MeetingQAResponse, status_code=status.HTTP_200_OK)
def api_meeting_qa(payload: MeetingQAPayload):
    if not payload.meeting_code or not payload.question:
        raise HTTPException(status_code=400, detail="meeting_code and question are required")
    try:
        result = ask_meeting_agent(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process meeting Q&A: {str(e)}")

# MCP (Model Context Protocol) Endpoints
@app.get("/mcp/tools")
def get_mcp_tools():
    return {"tools": MCP_TOOLS}

@app.post("/mcp/call", response_model=MCPCallResponse)
def call_mcp_tool(payload: MCPCallPayload):
    try:
        res = execute_mcp_tool(payload.name, payload.arguments)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP tool execution failed: {str(e)}")

@app.post("/mcp", response_model=JSONRPCResponse)
def jsonrpc_mcp(req: JSONRPCRequest):
    return handle_jsonrpc(req)

# LangGraph Agentic Workflow Endpoint
@app.post("/agent/run", response_model=AgentRunResponse, status_code=status.HTTP_200_OK)
def api_agent_run(payload: AgentRunPayload):
    if not payload.meeting_code or not payload.instruction:
        raise HTTPException(status_code=400, detail="meeting_code and instruction are required")
    try:
        res = run_agentic_workflow(payload)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent workflow execution failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
