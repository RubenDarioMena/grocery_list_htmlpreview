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

  const geminiKey = Netlify.env.get("GEMINI_API_KEY");
  const opencodeKey = Netlify.env.get("OPENCODE_API_KEY");

  if (!geminiKey && !opencodeKey) {
    return new Response(
      JSON.stringify({ error: "NO_API_KEY", message: "Backend sin API key configurada (ni Gemini ni Opencode)" }),
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

  // Intentar Gemini primero
  if (geminiKey) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.sections && Array.isArray(parsed.sections)) {
            return new Response(JSON.stringify(parsed), { status: 200, headers });
          }
        }
      }
    } catch {}
    // Si Gemini falla, continuamos a Opencode
  }

  // Intentar Opencode (OpenAI-compatible)
  if (opencodeKey) {
    try {
      const opencodeRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${opencodeKey}`,
        },
        body: JSON.stringify({
          model: "minimax-m2.5-free",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      if (opencodeRes.ok) {
        const opencodeData = await opencodeRes.json();
        const rawText = opencodeData?.choices?.[0]?.message?.content || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.sections && Array.isArray(parsed.sections)) {
            return new Response(JSON.stringify(parsed), { status: 200, headers });
          }
        }
      }
    } catch {}
  }

  // Si ninguna funcionó
  return new Response(
    JSON.stringify({ error: "No se pudo generar la lista con ninguna API disponible" }),
    { status: 502, headers }
  );
};
