export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "NO_API_KEY", message: "Backend sin API key configurada" });
  }

  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Texto vacío" });
  }

  const prompt = `Organiza la siguiente lista de compras por categorías (usa emojis en los nombres de categoría). Devuélveme ÚNICAMENTE un JSON válido con esta estructura exacta sin explicaciones ni markdown:
{"sections":[{"label":"emoji Categoría","items":["artículo 1","artículo 2"]}]}

Texto a organizar:
${text.trim()}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: "Gemini error", details: errText });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extraer JSON de la respuesta (puede venir envuelto en markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: "No se pudo parsear la respuesta de Gemini", raw: rawText });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      return res.status(502).json({ error: "Formato inválido de respuesta", raw: parsed });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno" });
  }
}
