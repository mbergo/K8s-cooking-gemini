import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Database persistence simulation (Simulating PostgreSQL Cloud SQL database)
  const DB_FILE = path.join(process.cwd(), "conversations_db.json");

  function loadDB() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to load db, resetting:", e);
    }
    return { sessions: [], messages: [] };
  }

  function saveDB(data: any) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save db:", e);
    }
  }

  // Initialize DB with a default welcome session if empty
  const initialDB = loadDB();
  if (initialDB.sessions.length === 0) {
    const defaultSessionId = "session_welcome";
    initialDB.sessions.push({
      id: defaultSessionId,
      title: "Co-Pilot Welcome Session",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    initialDB.messages.push({
      id: "msg_welcome",
      sessionId: defaultSessionId,
      role: "assistant",
      content: `Hello Marcus! I am your **Gemini AI SRE & AI Compute Co-Pilot**, configured specifically for your upcoming Airbnb interview. 

Ask me any deep systems, networking, scheduling, or SRE debugging questions. Here are a few recommended topics we can discuss:
* **How does vLLM’s Paged Attention optimize GPU memory (VRAM)?**
* **Explain how Karpenter handles multi-tenant GPU node provisioning.**
* **What are the primary differences between a CUDA Out of Memory error and a Linux OOMKilled event?**
* **How does GPUDirect RDMA or NVLink bypass the CPU during training?**`,
      createdAt: new Date().toISOString()
    });
    saveDB(initialDB);
  }

  // Initialize the Gemini SDK lazily to prevent crash on startup if API key is missing
  let aiClient: GoogleGenAI | null = null;
  function getAiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
      }
      aiClient = new GoogleGenAI({ apiKey: apiKey || "" });
    }
    return aiClient;
  }

  // GET: List all sessions (Cloud SQL persistent layer)
  app.get("/api/sessions", (req, res) => {
    try {
      const db = loadDB();
      const sessions = [...db.sessions].sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      res.json({ sessions });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load sessions." });
    }
  });

  // GET: Retrieve a single session's messages
  app.get("/api/sessions/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = loadDB();
      const session = db.sessions.find((s: any) => s.id === id);
      if (!session) {
        return res.status(404).json({ error: "Conversation session not found." });
      }
      const messages = db.messages.filter((m: any) => m.sessionId === id);
      res.json({ session, messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch session messages." });
    }
  });

  // POST: Create a new conversation session
  app.post("/api/sessions", (req, res) => {
    try {
      const { title } = req.body;
      const db = loadDB();
      const newSession = {
        id: "session_" + Math.random().toString(36).substring(2, 11),
        title: title || "New Conversation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.sessions.push(newSession);
      saveDB(db);
      res.json(newSession);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create session." });
    }
  });

  // DELETE: Delete a session and all its messages
  app.delete("/api/sessions/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = loadDB();
      db.sessions = db.sessions.filter((s: any) => s.id !== id);
      db.messages = db.messages.filter((m: any) => m.sessionId !== id);
      saveDB(db);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete session." });
    }
  });

  // API Endpoint for the Gemini AI Infrastructure Co-Pilot (with Cloud SQL persistence)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, thinkingLevel = "LOW", sessionId } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const client = getAiClient();
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Gemini API key is not configured in the workspace settings. Please configure your API secrets."
        });
      }

      // Find or create session
      const db = loadDB();
      let targetSessionId = sessionId;
      let session = db.sessions.find((s: any) => s.id === targetSessionId);
      
      if (!session) {
        targetSessionId = sessionId || "session_" + Math.random().toString(36).substring(2, 11);
        session = {
          id: targetSessionId,
          title: "New Conversation",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.sessions.push(session);
      }

      // Add user message to persistent DB
      const userMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        sessionId: targetSessionId,
        role: "user" as const,
        content: message,
        createdAt: new Date().toISOString()
      };
      db.messages.push(userMsg);

      // Model and Reasoning selection logic:
      // - LITE: gemini-3.1-flash-lite (fast tasks)
      // - LOW (or regular): gemini-3.5-flash (general tasks)
      // - HIGH: gemini-3.1-pro-preview (complex tasks with ThinkingLevel.HIGH, no maxOutputTokens)
      let modelName = "gemini-3.5-flash";
      const config: any = {
        systemInstruction: `You are the ultimate Kubernetes AI Compute & GPU Platform SRE Architect. 
You are helping an engineer prepare for a Senior Staff / Principal Kubernetes AI Compute interview.
You have absolute knowledge about:
- GPU hardware scheduling, taints, tolerations, and Karpenter.
- NVIDIA Device Plugin and GPU Operator internals.
- vLLM, Paged Attention, KV Caching, speculative decoding, and continuous batching.
- Network routing (InfiniBand, EFA, GPUDirect RDMA, Cilium, eBPF) and Storage (FSx, Lustre).
- SRE practices, debugging CrashLoopBackOff, CUDA out-of-memory errors, and Linux OOMKilled.

Provide exceptionally professional, high-depth, causal, and direct systems answers. Use markdown formatting and keep your tone authoritative yet supportive.`,
        temperature: 0.7,
      };

      if (thinkingLevel === "HIGH") {
        modelName = "gemini-3.1-pro-preview";
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH,
        };
        // DO NOT set maxOutputTokens for high-thinking model as per instructions
      } else if (thinkingLevel === "LITE") {
        modelName = "gemini-3.1-flash-lite";
      }

      // Load session conversation history from DB for precise context
      const sessionMessages = db.messages.filter((m: any) => m.sessionId === targetSessionId);
      // Format history for the generateContent request
      const contents = sessionMessages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: msg.content }]
      }));

      // Generate content via Gemini
      const response = await client.models.generateContent({
        model: modelName,
        contents: contents,
        config: config
      });

      const textResponse = response.text || "I was unable to generate a detailed response. Please try reframing your systems question.";

      // Add assistant message to persistent DB
      const assistantMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        sessionId: targetSessionId,
        role: "assistant" as const,
        content: textResponse,
        model: modelName,
        thinking: thinkingLevel === "HIGH",
        createdAt: new Date().toISOString()
      };
      db.messages.push(assistantMsg);

      // Auto-summarize session title dynamically if it is still default or empty
      if (session.title === "New Conversation" || session.title.startsWith("New Chat")) {
        try {
          const titleResponse = await client.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `Generate a very short, professional 2 to 4 word title representing this technical question: "${message}". Avoid quotes, punctuation, or generic prefixes. Keep it under 25 characters.`,
          });
          if (titleResponse.text) {
            session.title = titleResponse.text.trim().replace(/^["']|["']$/g, "").replace(/^Title:\s*/i, "");
          }
        } catch (e) {
          session.title = message.substring(0, 24) + "...";
        }
      }

      // Update timestamps
      session.updatedAt = new Date().toISOString();
      saveDB(db);

      res.json({
        content: textResponse,
        model: modelName,
        thinking: thinkingLevel === "HIGH",
        sessionId: targetSessionId,
        sessionTitle: session.title
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Endpoint for transcribing audio queries using gemini-3.5-flash
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audio, mimeType } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "Audio data is required." });
      }

      const client = getAiClient();
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Gemini API key is not configured in workspace settings."
        });
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: audio,
              mimeType: mimeType || "audio/webm"
            }
          },
          "You are an expert audio transcription system. Transcribe the spoken audio query exactly, prioritizing high-precision technical terms (e.g. Kubernetes, GKE, GPU, vLLM, Karpenter, CUDA, NCCL, PagedAttention, Speculative Decoding, InfiniBand, GPUDirect, RDMA, etc.). Do not add any filler, corrections, or intro. Just return the exact transcription text. If there is no audible speech, return an empty string."
        ]
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio." });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Vite middleware for development, static assets for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Setup Express App server
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  // Attach WebSockets server to /live path for real-time voice conversations
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (clientWs) => {
    console.log("WebSocket client connected to Gemini Live");
    let session: any = null;

    try {
      const client = getAiClient();
      if (!process.env.GEMINI_API_KEY) {
        clientWs.send(JSON.stringify({ error: "Gemini API key is missing. Please configure it in Settings > Secrets." }));
        clientWs.close();
        return;
      }

      session = await client.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the ultimate Kubernetes AI Compute & GPU Platform SRE Architect. Keep your spoken responses concise, direct, professional, and clear. Help the user debug their Kubernetes compute doubts.",
        },
        callbacks: {
          onmessage: (message) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }
          },
          onclose: () => {
            console.log("Gemini Live session closed");
            clientWs.close();
          },
          onerror: (err) => {
            console.error("Gemini Live error:", err);
            clientWs.send(JSON.stringify({ error: err.message || "Gemini Live session error" }));
          }
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e: any) {
          console.error("Error sending input to Live API:", e);
        }
      });

      clientWs.on("close", () => {
        if (session) {
          try {
            session.close();
          } catch (e) {}
        }
      });

    } catch (err: any) {
      console.error("Error setting up Live connection:", err);
      try {
        clientWs.send(JSON.stringify({ error: err.message || "Failed to establish Live session" }));
      } catch (e) {}
      clientWs.close();
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
