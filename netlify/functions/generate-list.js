export default async (request, context) => {
  // CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.httpMethod === "OPTIONS" || request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (request.httpMethod !== "POST" && request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "NO_API_KEY", message: "Backend sin API key configurada" }),
      { status: 500, headers }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), { status: 400, headers });
  }

  const { text } = body;

  if (!text || !text.trim()) {
    return new Response(JSON.stringify({ error: "Texto vacío" }), { status: 400, headers });
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
      return new Response(JSON.stringify({ error: "Gemini error", details: errText }), { status: 502, headers });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "No se pudo parsear la respuesta de Gemini", raw: rawText }),
        { status: 502, headers }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      return new Response(
        JSON.stringify({ error: "Formato inválido de respuesta", raw: parsed }),
        { status: 502, headers }
      );
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers }
    );
  }
};
