import { useState } from "react";

export default function OcrView({ onNavigate }) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      // Aquí iría la llamada a la API de AI
      // Por ahora simulamos una respuesta
      await new Promise(r => setTimeout(r, 1500));
      
      const simulatedResponse = {
        sections: [
          { label: "🥛 Lácteos y refrigerados", items: ["Leche", "Queso", "Yogurt"] },
          { label: "🛒 Despensa", items: ["Pan", "Cereal", "Pasta"] },
          { label: "🧹 Limpieza", items: ["Jabón", "Cloro"] },
        ]
      };
      
      setResult(simulatedResponse);
    } catch (err) {
      setError("Error al generar la lista. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
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
            onClick={() => alert("Aquí se importaría la lista al menú principal")}
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
            Usar esta lista
          </button>
        </div>
      )}

      {/* Info about API */}
      <div style={{
        marginTop: 32,
        padding: "16px 20px",
        background: "#f5f5f5",
        borderRadius: 12,
        border: "1px solid #e0e0e0",
      }}>
        <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#555" }}>💡 ¿Cómo funciona?</h4>
        <p style={{ margin: 0, fontSize: 13, color: "#777", lineHeight: 1.6 }}>
          Esta herramienta puede conectarse a modelos de IA como <strong>OpenAI GPT-4</strong>, 
          <strong> Claude</strong> o <strong>Google Gemini</strong> para analizar tu texto y 
          convertirlo automáticamente en una lista organizada por categorías. 
          Actualmente muestra una simulación, pero la integración real es totalmente viable 
          con una API key y un backend seguro para proteger tus credenciales.
        </p>
      </div>
    </div>
  );
}
