// Automated test suite for Phase 5: MCP Tools, Agentic Workflows & Host Controls
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const req = createRequire("c:/Users/Riya Joshi/.vscode/Codes/Meetzy/Zoom/frontend/package.json");
const { io } = req("socket.io-client");

const BACKEND_BASE = "http://127.0.0.1:8000/api/v1/users";
const AI_SERVICE_BASE = "http://127.0.0.1:8001";

async function runTests() {
    console.log("=== Meetzy Phase 5: MCP Server, Agentic Workflows & Host Controls Test Suite ===\n");
    let passed = 0;

    // Test 1: MCP Standard Tool Discovery (GET /mcp/tools)
    {
        console.log("[Test 1] MCP Tools Discovery: GET /mcp/tools");
        const res = await fetch(`${AI_SERVICE_BASE}/mcp/tools`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data.tools), "Must return tools array");
        const toolNames = data.tools.map((t) => t.name);
        console.log("  - Discovered MCP tools:", toolNames.join(", "));
        assert.ok(toolNames.includes("search_meeting_transcripts"));
        assert.ok(toolNames.includes("get_meeting_notes"));
        assert.ok(toolNames.includes("assign_meeting_task"));
        assert.ok(toolNames.includes("export_meeting_minutes"));
        console.log("  PASS: All 4 MCP tool specifications discovered in standard format.\n");
        passed++;
    }

    // Test 2: MCP Tool Execution (POST /mcp/call)
    {
        console.log("[Test 2] MCP Direct Tool Execution: POST /mcp/call");
        const res = await fetch(`${AI_SERVICE_BASE}/mcp/call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "assign_meeting_task",
                arguments: {
                    meeting_code: "P5-ROOM",
                    task: "Audit security protocols",
                    owner: "riya",
                    due_date: "Tomorrow",
                },
            }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.isError, false);
        assert.ok(data.content && data.content.length > 0);
        console.log("  - MCP Output:", data.content[0].text);
        assert.ok(data.content[0].text.includes("Action item created"));
        console.log("  PASS: MCP tool executed and formatted output returned.\n");
        passed++;
    }

    // Test 3: Standard JSON-RPC 2.0 MCP Protocol Compliance (POST /mcp)
    {
        console.log("[Test 3] Model Context Protocol JSON-RPC 2.0: POST /mcp");
        const rpcPayload = {
            jsonrpc: "2.0",
            id: 42,
            method: "tools/call",
            params: {
                name: "export_meeting_minutes",
                arguments: {
                    meeting_code: "RPC-ROOM",
                    format: "markdown",
                },
            },
        };

        const res = await fetch(`${AI_SERVICE_BASE}/mcp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rpcPayload),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.jsonrpc, "2.0");
        assert.equal(data.id, 42);
        assert.ok(data.result && data.result.content);
        console.log("  - JSON-RPC response valid. Length:", data.result.content[0].text.length);
        console.log("  PASS: Standard JSON-RPC 2.0 protocol validated.\n");
        passed++;
    }

    // Test 4: LangGraph Agentic Multi-Step Workflow (POST /agent/run)
    {
        console.log("[Test 4] Multi-Step Agentic Workflow: POST /agent/run");
        const agentPayload = {
            meeting_code: "AGENT-ROOM",
            instruction: "Search for security status in transcript, check meeting summary, and assign a task to Alex to review PR by Friday",
            user: "coordinator",
            segments: [
                {
                    line_number: 1,
                    speaker: "alex",
                    text: "Security status is green and ready for deployment.",
                },
            ],
            notes: {
                summary: "All systems verified.",
            },
        };

        const res = await fetch(`${AI_SERVICE_BASE}/agent/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(agentPayload),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, "success");
        assert.ok(Array.isArray(data.steps_executed));
        assert.ok(data.steps_executed.length >= 2, "Agent must execute multiple iterative steps");
        console.log("  - Steps executed:", data.steps_executed.map((s) => s.tool).join(" -> "));
        console.log("  - Final answer:", data.final_answer);
        console.log("  PASS: Multi-step agent completed reasoning, planning, and tool calls.\n");
        passed++;
    }

    // Test 5: Host Moderation Controls (Mute / Shut Camera / Kick via Socket.IO)
    {
        console.log("[Test 5] Host Moderation Controls via Socket.IO");
        const meetingCode = `HOST-${Date.now().toString().slice(-6)}`;

        // Register Host and Participant
        const hostUser = `host_${Date.now()}@meetzy.io`;
        const partUser = `part_${Date.now()}@meetzy.io`;
        const pass = "Pass123!Secure";

        await fetch(`${BACKEND_BASE}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Host User", username: hostUser, password: pass }),
        });
        await fetch(`${BACKEND_BASE}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Participant", username: partUser, password: pass }),
        });

        const hostLogin = await (await fetch(`${BACKEND_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: hostUser, password: pass }),
        })).json();

        const partLogin = await (await fetch(`${BACKEND_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: partUser, password: pass }),
        })).json();

        // Create meeting
        await fetch(`${BACKEND_BASE}/add_to_activity`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${hostLogin.token}`,
            },
            body: JSON.stringify({ meeting_code: meetingCode }),
        });

        const hostSocket = io("http://127.0.0.1:8000", {
            auth: { token: hostLogin.token },
            query: { token: hostLogin.token },
        });

        const partSocket = io("http://127.0.0.1:8000", {
            auth: { token: partLogin.token },
            query: { token: partLogin.token },
        });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                hostSocket.disconnect();
                partSocket.disconnect();
                reject(new Error("Host moderation test timed out"));
            }, 8000);

            let hostSocketId = null;
            let partSocketId = null;
            let muteVerified = false;
            let camVerified = false;

            hostSocket.on("connect", () => {
                hostSocketId = hostSocket.id;
                hostSocket.emit("join-call", `http://localhost:3000/${meetingCode}`);
            });

            partSocket.on("connect", () => {
                partSocketId = partSocket.id;
                partSocket.emit("join-call", `http://localhost:3000/${meetingCode}`);
            });

            // Participant listeners for host moderation events
            partSocket.on("force-mute", (data) => {
                console.log("  - Participant received force-mute from:", data.requestedBy);
                muteVerified = true;
                // Host now sends force-disable-camera
                hostSocket.emit("host-disable-camera", partSocketId);
            });

            partSocket.on("force-disable-camera", (data) => {
                console.log("  - Participant received force-disable-camera from:", data.requestedBy);
                camVerified = true;
                // Host now kicks participant
                hostSocket.emit("host-kick-user", partSocketId);
            });

            partSocket.on("force-leave", (data) => {
                console.log("  - Participant received force-leave:", data.reason);
                assert.ok(muteVerified, "force-mute must have occurred");
                assert.ok(camVerified, "force-disable-camera must have occurred");
                clearTimeout(timeout);
                hostSocket.disconnect();
                partSocket.disconnect();
                resolve();
            });

            // When participant joins, host starts moderation sequence
            hostSocket.on("user-joined", (joinedId) => {
                if (joinedId === partSocketId) {
                    setTimeout(() => {
                        console.log("  - Host triggering remote mute on participant...");
                        hostSocket.emit("host-mute-user", partSocketId);
                    }, 500);
                }
            });
        });

        console.log("  PASS: Host moderation successfully enforced remote mute, camera shut, and kick.\n");
        passed++;
    }

    console.log(`======================================================`);
    console.log(`ALL ${passed} PHASE 5 VERIFICATION TESTS PASSED!`);
    console.log(`======================================================\n`);
}

runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
