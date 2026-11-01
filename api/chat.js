const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

async function callGemini({
  apiKey,
  model,
  message,
  signal
}) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent";

  return fetch(url, {
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
        maxOutputTokens: 1024
      }
    }),
    signal
  });
}

function isRetryable(status) {
  return [
    408,
    429,
    500,
    502,
    503,
    504
  ].includes(status);
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
      error: "GEMINI_API_KEY is missing in Vercel."
    });
  }

  if (!message) {
    return res.status(400).json({
      error: "Message is required."
    });
  }

  const model = "gemini-2.0-flash";
  const maxAttempts = 4;
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    let lastStatus = 503;
    let lastError = "Gemini is temporarily unavailable.";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await callGemini({
          apiKey,
          model,
          message,
          signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!text) {
            return res.status(502).json({
              error: "Gemini returned no text."
            });
          }

          return res.status(200).json({
            text,
            model,
            attempts: attempt + 1
          });
        }

        lastStatus = response.status;
        lastError =
          data?.error?.message ||
          "Gemini request failed.";

        if (!isRetryable(response.status)) {
          return res.status(response.status).json({
            error: lastError
          });
        }

        if (attempt < maxAttempts - 1) {
          const baseDelay = 1000 * Math.pow(2, attempt);
          const jitter = Math.floor(Math.random() * 500);

          await sleep(baseDelay + jitter);
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return res.status(504).json({
            error: "Gemini request timed out."
          });
        }

        lastError = error.message;

        if (attempt < maxAttempts - 1) {
          const baseDelay = 1000 * Math.pow(2, attempt);
          const jitter = Math.floor(Math.random() * 500);

          await sleep(baseDelay + jitter);
        }
      }
    }

    return res.status(lastStatus).json({
      error:
        lastError +
        " Gemini is busy. Please try again shortly."
    });
  } finally {
    clearTimeout(timeout);
  }
}
