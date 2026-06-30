import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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

      // Format history into the structure expected by the @google/genai SDK
      // Using models/gemini-3.5-flash for speed, or gemini-3.1-pro-preview with high thinking for deep reasoning
      const isHighThinking = thinkingLevel === "HIGH";
      const modelName = isHighThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";

      const systemInstruction = `You are the ultimate Kubernetes AI Compute & GPU Platform SRE Architect. 
You are helping an engineer prepare for a Senior Staff / Principal Kubernetes AI Compute interview.
You have absolute knowledge about:
- GPU hardware scheduling, taints, tolerations, and Karpenter.
- NVIDIA Device Plugin and GPU Operator internals.
- vLLM, Paged Attention, KV Caching, speculative decoding, and continuous batching.
- Network routing (InfiniBand, EFA, GPUDirect RDMA, Cilium, eBPF) and Storage (FSx, Lustre).
- SRE practices, debugging CrashLoopBackOff, CUDA out-of-memory errors, and Linux OOMKilled.

Provide exceptionally professional, high-depth, causal, and direct systems answers. Use markdown formatting and keep your tone authoritative yet supportive.`;

      const config: any = {
        systemInstruction,
        temperature: 0.7,
      };

      if (isHighThinking) {
        // High thinking mode configuration
        config.thinkingConfig = {
          thinkingBudget: 2048,
        };
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
        thinking: isHighThinking
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
