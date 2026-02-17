import crypto from "crypto";
import express from "express";
import dotenv from "dotenv";
import { microfinanceKnowledgeBase } from "./knowledgeBase.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || "";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
const TRUST_PROXY = String(process.env.TRUST_PROXY || "false") === "true";

if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "256kb" }));

const requestCounters = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

function sanitizeInput(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[<>`]/g, "").trim().slice(0, 500);
}

function safeEqual(a, b) {
  const aa = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function verifyVapiSignature(req, res, next) {
  const signature = req.header("x-vapi-signature") || "";
  const timestamp = req.header("x-vapi-timestamp") || "";

  if (!VAPI_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Server secret is not configured" });
  }

  if (!signature || !timestamp) {
    return res.status(401).json({ error: "Missing Vapi signature headers" });
  }

  const bodyString = JSON.stringify(req.body || {});
  const payload = `${timestamp}.${bodyString}`;
  const computed = crypto
    .createHmac("sha256", VAPI_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (!safeEqual(signature, computed)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
}

function requireInternalApiKey(req, res, next) {
  const apiKey = req.header("x-api-key") || "";
  if (!INTERNAL_API_KEY) {
    return res.status(500).json({ error: "Internal API key not configured" });
  }
  if (!safeEqual(apiKey, INTERNAL_API_KEY)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = requestCounters.get(ip) || { count: 0, start: now };

  if (now - current.start > RATE_LIMIT_WINDOW_MS) {
    requestCounters.set(ip, { count: 1, start: now });
    return next();
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests" });
  }

  current.count += 1;
  requestCounters.set(ip, current);
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agrobank-vapi-webhook" });
});

app.post("/internal/microfinance-info", requireInternalApiKey, rateLimit, (req, res) => {
  const question = sanitizeInput(req.body?.question || "").toLowerCase();
  const productKey = sanitizeInput(req.body?.productKey || "").toLowerCase();

  if (productKey && microfinanceKnowledgeBase.products[productKey]) {
    return res.json({
      source: "approved_kb",
      product: microfinanceKnowledgeBase.products[productKey]
    });
  }

  if (question.includes("foiz")) {
    return res.json({ source: "approved_kb", answer: microfinanceKnowledgeBase.faq.foiz });
  }
  if (question.includes("hujjat")) {
    return res.json({ source: "approved_kb", answer: microfinanceKnowledgeBase.faq.hujjatlar });
  }
  if (question.includes("muddat")) {
    return res.json({ source: "approved_kb", answer: microfinanceKnowledgeBase.faq.muddat });
  }
  if (question.includes("onlayn") || question.includes("online")) {
    return res.json({ source: "approved_kb", answer: microfinanceKnowledgeBase.faq.online_ariza });
  }

  return res.json({
    source: "approved_kb",
    answer:
      "Bu savol bo'yicha aniq va tasdiqlangan ma'lumot uchun iltimos operatorga ulanishingizni tavsiya qilaman."
  });
});

app.post("/vapi/tool/microfinance-info", verifyVapiSignature, rateLimit, (req, res) => {
  const question = sanitizeInput(req.body?.message?.toolCall?.arguments?.question || "");
  const productKey = sanitizeInput(req.body?.message?.toolCall?.arguments?.productKey || "");

  const normalizedProductKey = productKey.toLowerCase();
  if (normalizedProductKey && microfinanceKnowledgeBase.products[normalizedProductKey]) {
    return res.json({ result: microfinanceKnowledgeBase.products[normalizedProductKey] });
  }

  const normalizedQuestion = question.toLowerCase();
  if (normalizedQuestion.includes("foiz")) {
    return res.json({ result: microfinanceKnowledgeBase.faq.foiz });
  }
  if (normalizedQuestion.includes("hujjat")) {
    return res.json({ result: microfinanceKnowledgeBase.faq.hujjatlar });
  }
  if (normalizedQuestion.includes("muddat")) {
    return res.json({ result: microfinanceKnowledgeBase.faq.muddat });
  }
  if (normalizedQuestion.includes("onlayn") || normalizedQuestion.includes("online")) {
    return res.json({ result: microfinanceKnowledgeBase.faq.online_ariza });
  }

  return res.json({
    result:
      "Kechirasiz, bu savol bo'yicha tasdiqlangan ma'lumot bazasida aniq javob topilmadi. Operatorga ulashni taklif qilaman."
  });
});

app.listen(PORT, () => {
  console.log(`Secure Vapi webhook listening on port ${PORT}`);
});
