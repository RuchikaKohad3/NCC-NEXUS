// Responsibility: Gemini function-calling client for the AI Adjutant (M9) —
//   runs the model↔tool loop: send contents + tool declarations, execute any
//   requested tools via a caller-provided executor, feed results back, and
//   return the final text plus the full tool trace.
// Layer: AI Adjutant (Layer 3) service. A NEW file — the existing cadet chatbot
//   (bot.service.js) is deliberately untouched (ADL-007).
// Depends on: global fetch + GEMINI_API_KEY env (read-only). Tool semantics live
//   in modules/adjutant/adjutant.tools.js, injected as `executeTool`.
// Must never be depended on by: legacy modules or bot.service.js.

require("dotenv").config();

const ADJUTANT_PROVIDER = "gemini";
const ADJUTANT_MODEL =
  process.env.ADJUTANT_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL_BASE =
  process.env.GEMINI_API_URL_BASE || "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = Number(process.env.ADJUTANT_TIMEOUT_MS || 30000);
const MAX_TOOL_ROUNDS = 4;

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const extractErrorMessage = async (response) => {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }
  if (!bodyText) return response.statusText || "Unknown error";
  try {
    const parsed = JSON.parse(bodyText);
    if (typeof parsed?.error?.message === "string") return parsed.error.message;
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    /* non-JSON payload */
  }
  return bodyText;
};

/**
 * Pure: split a generateContent response payload into text and functionCalls.
 * Exported separately so the parsing is unit-testable without any network.
 * @returns {{text:string, functionCalls:Array<{name:string, args:object}>,
 *            modelParts:Array}} modelParts = the raw parts to echo back as the
 *            model turn when continuing the loop.
 */
function parseModelTurn(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return { text: "", functionCalls: [], modelParts: [] };

  const textChunks = [];
  const functionCalls = [];
  for (const part of parts) {
    if (typeof part?.text === "string") textChunks.push(part.text);
    if (part?.functionCall && typeof part.functionCall.name === "string") {
      functionCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args && typeof part.functionCall.args === "object"
          ? part.functionCall.args
          : {},
      });
    }
  }
  return { text: textChunks.join(" ").trim(), functionCalls, modelParts: parts };
}

const callGemini = async ({ systemPrompt, contents, toolDeclarations }) => {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");

  const endpoint = `${GEMINI_API_URL_BASE}/models/${encodeURIComponent(
    ADJUTANT_MODEL
  )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
  };
  if (toolDeclarations?.length) {
    body.tools = [{ functionDeclarations: toolDeclarations }];
    body.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
  }

  let response;
  try {
    response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Adjutant request timed out.");
    throw error;
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(`Gemini API error: ${message}`);
  }
  return response.json();
};

/**
 * Run the full model↔tool loop for one user turn.
 *
 * @param {object} input
 * @param {string} input.systemPrompt
 * @param {Array<{role:('user'|'model'), parts:Array}>} input.contents  prior turns
 *   INCLUDING the new user message as the last entry.
 * @param {Array<object>} input.toolDeclarations  Gemini functionDeclarations.
 * @param {(name:string, args:object) => Promise<object>} input.executeTool  runs a
 *   whitelisted tool and returns a JSON-serialisable result. Errors it throws are
 *   fed back to the model as { error } rather than aborting the turn.
 * @returns {{text:string, toolTrace:Array<{name:string, args:object, ok:boolean,
 *            summary:(string|null)}>}}
 */
async function generateWithTools({ systemPrompt, contents, toolDeclarations, executeTool }) {
  const convo = [...contents];
  const toolTrace = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const payload = await callGemini({ systemPrompt, contents: convo, toolDeclarations });
    const turn = parseModelTurn(payload);

    if (!turn.functionCalls.length) {
      const text = turn.text || "I could not produce a response. Please rephrase.";
      return { text, toolTrace };
    }

    // Echo the model's turn, execute each requested tool, then answer with
    // functionResponse parts in a single user turn (v1beta contract).
    convo.push({ role: "model", parts: turn.modelParts });

    const responseParts = [];
    for (const call of turn.functionCalls) {
      let result;
      let ok = true;
      try {
        result = await executeTool(call.name, call.args);
      } catch (error) {
        ok = false;
        result = { error: error?.message || "Tool execution failed." };
      }
      toolTrace.push({
        name: call.name,
        args: call.args,
        ok,
        summary: typeof result?.summary === "string" ? result.summary : null,
      });
      responseParts.push({
        functionResponse: { name: call.name, response: { result } },
      });
    }
    convo.push({ role: "user", parts: responseParts });
  }

  return {
    text: "I consulted the data but could not finish reasoning within the tool budget. Please ask a narrower question.",
    toolTrace,
  };
}

module.exports = {
  ADJUTANT_PROVIDER,
  ADJUTANT_MODEL,
  MAX_TOOL_ROUNDS,
  parseModelTurn,
  generateWithTools,
};
