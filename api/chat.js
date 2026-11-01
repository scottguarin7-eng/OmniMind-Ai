const MODEL = "gemini-2.0-flash";
const REQUEST_TIMEOUT = 30000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const body = req.body || {};
  const message = String(body.message || "").trim();

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing in Vercel environment variables."
    });
  }

  if (!message) {
    return res.status(400).json({
      error: "Message is required."
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
        ]
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.error?.message || "Gemini API request failed.";
      return res.status(response.status).json({
        error: errorMessage
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({
        error: "Neural engine returned an empty response."
      });
    }

    return res.status(200).json({
      text: text,
      model: MODEL
    });

  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "Neural connection timed out. Please try again."
      });
    }

    return res.status(500).json({
      error: "Server error: " + error.message
    });
  } finally {
    clearTimeout(timeout);
  }
}
