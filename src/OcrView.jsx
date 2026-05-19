import { useState, useEffect } from "react";

const STORAGE_KEY = "lista-compras-data";
const GEMINI_KEY_STORAGE = "gemini_api_key";
const OPENCODE_KEY_STORAGE = "opencode_api_key";
const makeId = () => Math.random().toString(36).slice(2, 8);

function loadKey(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}

function saveKey(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

export default function OcrView({ onNavigate }) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [geminiKey, setGeminiKey] = useState(() => loadKey(GEMINI_KEY_STORAGE));
  const [opencodeKey, setOpencodeKey] = useState(() => loadKey(OPENCODE_KEY_STORAGE));
  const [showKeyInputs, setShowKeyInputs] = useState(false);

  useEffect(() => { saveKey(GEMINI_KEY_STORAGE, geminiKey); }, [geminiKey]);
  useEffect(() => { saveKey(OPENCODE_KEY_STORAGE, opencodeKey); }, [opencodeKey]);

  const callGeminiDirect = async (promptText, key) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini error: ${err}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se pudo parsear la respuesta de Gemini");
    return JSON.parse(jsonMatch[0]);
  };

  const callOpencodeDirect = async (promptText, key) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptText }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Opencode error: ${err}`);
    }

    const data = await res.json();
    const rawText = data?.choices?.[0]?.message?.content || "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se pudo parsear la respuesta de Opencode");
    return JSON.parse(jsonMatch[0]);
  };

  const buildPrompt = (inputText) =>
    `Organiza la siguiente lista de compras por categorías (usa emojis en los nombres de categoría). Devuélveme ÚNICAMENTE un JSON válido con esta estructura exacta sin explicaciones ni markdown:
{"sections":[{"label":"emoji Categoría","items":["artículo 1","artículo 2"]}]}

Texto a organizar:
${inputText.trim()}`;

  const validateResult = (data) => {
    if (!data || !data.sections || !Array.isArray(data.sections)) {
      throw new Error("Formato de respuesta inválido");
    }
    return data;
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError("");
    setResult(null);

    const prompt = buildPrompt(text);

    try {
      // PRIORIDAD 1: Gemini localStorage
      if (geminiKey.trim()) {
        const data = await callGeminiDirect(prompt, geminiKey.trim());
        setResult(validateResult(data));
        setIsLoading(false);
        return;
      }

      // PRIORIDAD 2: Opencode localStorage
      if (opencodeKey.trim()) {
        const data = await callOpencodeDirect(prompt, opencodeKey.trim());
        setResult(validateResult(data));
        setIsLoading(false);
        return;
      }

      // PRIORIDAD 3: Backend
      const res = await fetch("/api/generate-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 500 && errData.error === "NO_API_KEY") {
          setShowKeyInputs(true);
          throw new Error("El backend no tiene API key configurada. Introduce tu propia API key de Gemini o Opencode abajo.");
        }
        throw new Error(errData.error || errData.details || "Error del servidor");
      }

      const data = await res.json();
      setResult(validateResult(data));
    } catch (err) {
      setError(err.message || "Error al generar la lista. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseList = () => {
    if (!result) return;
    const newSections = result.sections.map((sec, idx) => ({
      id: `sec-${Date.now()}-${idx}`,
      label: sec.label,
      items: sec.items.map(item => ({ id: makeId(), label: item })),
    }));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sections: newSections,
        checked: {},
        prices: {},
        collapsed: {},
      }));
    } catch {}

    onNavigate('list');
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto", padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => onNavigate('list')}
          style={{
            background: "none",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 14,
            color: "#555",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Volver
        </button>
        <h2 style={{ margin: 0, fontSize: 22 }}>📄 Escanear lista</h2>
      </div>

      <p style={{ color: "#666", fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
        Pega aquí el texto copiado de tu recibo, nota o mensaje. La IA lo organizará automáticamente en categorías.
      </p>

      {/* Text area */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Ejemplo:\n- 2 litros de leche Lala\n- Queso manchego La Villita\n- 1 kg de tortillas\n- Huevos\n- Jabón líquido para trastes`}
        style={{
          width: "100%",
          minHeight: 200,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd",
          fontSize: 15,
          fontFamily: "sans-serif",
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.5,
        }}
      />

      {/* API Key inputs */}
      <div style={{
        marginTop: 12,
        padding: "12px 14px",
        background: "#fff8e1",
        border: "1px solid #ffe082",
        borderRadius: 10,
        display: showKeyInputs || !geminiKey && !opencodeKey ? "block" : "none",
      }}>
        <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 8, fontWeight: 600 }}>
          🔑 API keys para testing (se guardan localmente)
        </label>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: "#777", display: "block", marginBottom: 4 }}>Gemini (prioridad 1)</label>
          <input
            type="password"
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            placeholder="Pega aquí tu API key de Gemini..."
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#777", display: "block", marginBottom: 4 }}>Opencode (prioridad 2)</label>
          <input
            type="password"
            value={opencodeKey}
            onChange={e => setOpencodeKey(e.target.value)}
            placeholder="Pega aquí tu API key de Opencode..."
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Toggle key inputs */}
      {!showKeyInputs && (geminiKey || opencodeKey) && (
        <button
          onClick={() => setShowKeyInputs(true)}
          style={{
            marginTop: 8,
            background: "none",
            border: "none",
            color: "#4caf50",
            fontSize: 12,
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {geminiKey ? "✅ Usando Gemini" : ""} {opencodeKey ? "✅ Usando Opencode" : ""} — Editar keys
        </button>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, marginBottom: 24 }}>
        <button
          onClick={handleGenerate}
          disabled={isLoading || !text.trim()}
          style={{
            flex: 1,
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: isLoading ? "#a5d6a7" : "#4caf50",
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            cursor: isLoading || !text.trim() ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {isLoading ? "⏳ Generando..." : "✨ Generar lista"}
        </button>

        <button
          onClick={() => alert("Importar: función próximamente disponible")}
          style={{
            flex: 1,
            padding: "12px 20px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "#f5f5f5",
            color: "#888",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          📁 Importar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "#ffebee",
          border: "1px solid #ef9a9a",
          borderRadius: 10,
          padding: "12px 16px",
          color: "#c62828",
          fontSize: 14,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Result preview */}
      {result && (
        <div style={{
          background: "#e8f5e9",
          border: "1px solid #a5d6a7",
          borderRadius: 12,
          padding: "16px 20px",
        }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#2e7d32" }}>✅ Lista generada (vista previa)</h3>
          {result.sections.map((sec, idx) => (
            <div key={idx} style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 14, color: "#333" }}>{sec.label}</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 20, color: "#555", fontSize: 14 }}>
                {sec.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
          <button
            onClick={handleUseList}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: "#4caf50",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🛒 Usar esta lista
          </button>
        </div>
      )}

      {/* Info */}
      <div style={{
        marginTop: 32,
        padding: "16px 20px",
        background: "#f5f5f5",
        borderRadius: 12,
        border: "1px solid #e0e0e0",
      }}>
        <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#555" }}>💡 ¿Cómo funciona?</h4>
        <p style={{ margin: 0, fontSize: 13, color: "#777", lineHeight: 1.6 }}>
          Esta herramienta usa IA para organizar tu texto en categorías.
          <strong> Prioridad:</strong> 1) Gemini (local), 2) Opencode (local), 3) Backend (Netlify).
          Las API keys que introduzcas se guardan solo en tu navegador.
        </p>
      </div>
    </div>
  );
}
