const MODEL = "gemini-2.0-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const key = process.env.GEMINI_API_KEY;
  const message = String(req.body?.message || "").trim();

  if (!key) {
    return res.status(500).json({
      error: "Missing GEMINI_API_KEY in Vercel."
    });
  }

  if (!message) {
    return res.status(400).json({
      error: "Message is empty."
    });
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    MODEL +
    ":generateContent?key=" +
    encodeURIComponent(key);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: message
              }
            ]
          }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          `Gemini returned HTTP ${response.status}.`,
        status: response.status,
        model: MODEL
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned no text.",
        response: data
      });
    }

    return res.status(200).json({
      text,
      model: MODEL
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
