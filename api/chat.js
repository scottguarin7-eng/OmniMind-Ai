const MODEL = "gemini-3.8-flash";
const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT = 25000;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function temporaryError(status) {
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

function retryDelay(attempt) {
  return attempt === 0 ? 1200 : 2500;
}

async function requestGemini(apiKey, message, signal) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    MODEL +
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
        maxOutputTokens: 800
      }
    }),
    signal
  });
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

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    let lastStatus = 503;
    let lastProviderError =
      "Gemini did not return a response.";

    for (
      let attempt = 0;
      attempt < MAX_ATTEMPTS;
      attempt++
    ) {
      try {
        const response = await requestGemini(
          apiKey,
          message,
          controller.signal
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!text) {
            return res.status(502).json({
              error: "Gemini returned an empty response.",
              provider: data
            });
          }

          return res.status(200).json({
            text,
            model: MODEL,
            attempts: attempt + 1
          });
        }

        lastStatus = response.status;
        lastProviderError =
          data?.error?.message ||
          `Gemini returned HTTP ${response.status}.`;

        if (!temporaryError(response.status)) {
          return res.status(response.status).json({
            error: lastProviderError,
            status: response.status,
            model: MODEL
          });
        }

        if (attempt < MAX_ATTEMPTS - 1) {
          await wait(retryDelay(attempt));
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return res.status(504).json({
            error:
              "Gemini timed out after 25 seconds. " +
              "The provider did not respond in time."
          });
        }

        lastProviderError = error.message;

        if (attempt < MAX_ATTEMPTS - 1) {
          await wait(retryDelay(attempt));
        }
      }
    }

    return res.status(lastStatus).json({
      error:
        "Gemini is temporarily unavailable after " +
        MAX_ATTEMPTS +
        " attempts.",
      providerError: lastProviderError,
      status: lastStatus,
      model: MODEL
    });
  } finally {
    clearTimeout(timeout);
  }
}
