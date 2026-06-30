import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  // API Endpoint for the Gemini AI Infrastructure Co-Pilot
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, thinkingLevel = "LOW" } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const client = getAiClient();
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Gemini API key is not configured in the workspace settings. Please configure your API secrets."
        });
      }

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

      // Convert history
      const contents = [
        ...(history || []).map((msg: any) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        })),
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await client.models.generateContent({
        model: modelName,
        contents: contents,
        config: config
      });

      res.json({
        content: response.text,
        model: modelName,
        thinking: thinkingLevel === "HIGH"
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
