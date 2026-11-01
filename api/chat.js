const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite"
];

const MAX_ATTEMPTS_PER_MODEL = 2;
const REQUEST_TIMEOUT = 20000;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTemporary(status) {
  return [
    408,
    425,
    429,
    500,
    502,
    503,
    504
  ].includes(status);
}

function getDelay(attempt) {
  const base = attempt === 0 ? 1000 : 2200;
  const jitter = Math.floor(Math.random() * 400);

  return base + jitter;
}

async function callModel({
  apiKey,
  model,
  message,
  signal
}) {
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent";

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: message
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    }),
    signal
  });
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const message = String(
    req.body?.message || ""
  ).trim();

  if (!apiKey) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY is missing in Vercel Environment Variables."
    });
  }

  if (!message) {
    return res.status(400).json({
      error: "Message is required."
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  let lastStatus = 503;
  let lastError = "No model responded.";

  try {
    for (const model of MODELS) {
      for (
        let attempt = 0;
        attempt < MAX_ATTEMPTS_PER_MODEL;
        attempt++
      ) {
        try {
          const response = await callModel({
            apiKey,
            model,
            message,
            signal: controller.signal
          });

          const data = await readJson(response);

          if (response.ok) {
            const text =
              data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
              return res.status(200).json({
                text,
                model,
                attempts: attempt + 1
              });
            }

            lastStatus = 502;
            lastError =
              "The model returned an empty response.";
            break;
          }

          lastStatus = response.status;
          lastError =
            data?.error?.message ||
            `Model ${model} returned HTTP ${response.status}.`;

          if (
            response.status === 400 ||
            response.status === 401 ||
            response.status === 403
          ) {
            return res.status(response.status).json({
              error: lastError,
              model
            });
          }

          if (!isTemporary(response.status)) {
            break;
          }

          if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
            await wait(getDelay(attempt));
          }
        } catch (error) {
          if (error.name === "AbortError") {
            return res.status(504).json({
              error:
                "The Gemini request timed out after 20 seconds."
            });
          }

          lastError = error.message;

          if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
            await wait(getDelay(attempt));
          }
        }
      }
    }

    return res.status(lastStatus).json({
      error:
        "All configured Gemini models are temporarily unavailable.",
      details: lastError,
      triedModels: MODELS
    });
  } finally {
    clearTimeout(timeout);
  }
}
