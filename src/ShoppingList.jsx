import { useState, useRef, useEffect } from "react";

const STORAGE_KEY = "lista-compras-data";
const API_KEY_STORAGE = "gemini_api_key";

// [TESTING] Botón de configuración para API key temporal de Gemini - QUITAR EN PRODUCCIÓN
function loadApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch { return ""; }
}

const makeId = () => Math.random().toString(36).slice(2, 8);

const defaultSeed = () => [
  {
    id: "lacteos", label: "🥛 Lácteos y refrigerados", items: [
      { id: makeId(), label: "Huevos" },
      { id: makeId(), label: "Yogurt Oiko coco o Lala" },
      { id: makeId(), label: "Queso Oaxaca La Villita" },
      { id: makeId(), label: "Queso manchego La Villita" },
      { id: makeId(), label: "2 media crema Lala" },
      { id: makeId(), label: "1 Lechera de lata" },
      { id: makeId(), label: "1 Leche Carnation lata" },
    ]
  },
  {
    id: "despensa", label: "🛒 Despensa", items: [
      { id: makeId(), label: "1 pan molde" },
      { id: makeId(), label: "Chocolate Abuelita" },
    ]
  },
  {
    id: "limpieza", label: "🧹 Limpieza", items: [
      { id: makeId(), label: "Fibra para los trastes" },
    ]
  },
  {
    id: "bebe", label: "👶 Cuidado personal / bebé", items: [
      { id: makeId(), label: "2 paquetes protectores de lactancia Select" },
      { id: makeId(), label: "2 bolsas de algodón" },
    ]
  },
];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function ShoppingList({ onNavigate }) {
  const initial = loadData();

  const [sections, setSections] = useState(initial?.sections || defaultSeed());
  const [checked, setChecked] = useState(initial?.checked || {});
  const [prices, setPrices] = useState(initial?.prices || {});
  const [collapsed, setCollapsed] = useState(initial?.collapsed || {});
  const [newItemText, setNewItemText] = useState({});
  const [addingTo, setAddingTo] = useState(null);
  const [userApiKey, setUserApiKey] = useState(loadApiKey);
  const inputRef = useRef(null);

  // Persistir en localStorage
  useEffect(() => {
    saveData({ sections, checked, prices, collapsed });
  }, [sections, checked, prices, collapsed]);

  // [TESTING] Persistir API key temporal - QUITAR EN PRODUCCIÓN
  useEffect(() => {
    try { localStorage.setItem(API_KEY_STORAGE, userApiKey); } catch {}
  }, [userApiKey]);

  // [TESTING] Mostrar prompt para configurar API key - QUITAR EN PRODUCCIÓN
  const handleConfigApiKey = () => {
    const newKey = prompt("Introduce tu API key temporal de Gemini para testing:", userApiKey);
    if (newKey !== null) setUserApiKey(newKey);
  };

  const toggleCheck = id => setChecked(p => ({ ...p, [id]: !p[id] }));
  const toggleSection = id => setCollapsed(p => ({ ...p, [id]: !p[id] }));
  const setPrice = (id, val) => setPrices(p => ({ ...p, [id]: val }));

  const allItems = sections.flatMap(s => s.items);
  const done = allItems.filter(i => checked[i.id]).length;
  const totalCost = Object.values(prices).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const sectionCost = items => items.reduce((s, i) => s + (parseFloat(prices[i.id]) || 0), 0);

  const deleteItem = (secId, itemId) => {
    setSections(prev => prev.map(s =>
      s.id !== secId ? s : { ...s, items: s.items.filter(i => i.id !== itemId) }
    ).filter(s => s.items.length > 0));
  };

  const startAdding = (secId) => {
    setAddingTo(secId);
    setNewItemText(p => ({ ...p, [secId]: "" }));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitAdd = (secId) => {
    const text = (newItemText[secId] || "").trim();
    if (!text) { setAddingTo(null); return; }
    setSections(prev => prev.map(s =>
      s.id !== secId ? s : { ...s, items: [...s.items, { id: makeId(), label: text }] }
    ));
    setNewItemText(p => ({ ...p, [secId]: "" }));
    setAddingTo(null);
  };

  const handleReset = () => {
    if (confirm("¿Seguro que quieres reiniciar la lista? Se perderán los cambios.")) {
      setChecked({});
      setPrices({});
    }
  };

  const handleFullReset = () => {
    if (confirm("¿Seguro que quieres restaurar la lista original? Se borrarán todos tus cambios.")) {
      localStorage.removeItem(STORAGE_KEY);
      setSections(defaultSeed());
      setChecked({});
      setPrices({});
      setCollapsed({});
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 460, margin: "0 auto", padding: 16, position: "relative" }}>
      {/* Botón OCR - izquierda */}
      <button
        onClick={() => onNavigate('ocr')}
        title="Escanear texto (OCR)"
        style={{
          position: "absolute",
          top: 16,
          left: 0,
          background: "none",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "6px 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4caf50"; e.currentTarget.style.background = "#f0f0f0"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.background = "none"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>

      {/* [TESTING] Botón configuración - QUITAR EN PRODUCCIÓN */}
      <button
        onClick={handleConfigApiKey}
        title="Configurar API key de Gemini (testing)"
        style={{
          position: "absolute",
          top: 16,
          right: 0,
          background: "none",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "6px 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#2196f3"; e.currentTarget.style.background = "#f0f0f0"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.background = "none"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <h2 style={{ margin: "0 0 4px", fontSize: 22 }}>🛒 Lista del mandado</h2>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "#888", fontSize: 13 }}>{done} de {allItems.length} listos</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleReset}
            style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer" }}>
            Reiniciar
          </button>
          <button onClick={handleFullReset}
            style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, border: "1px solid #ef9a9a", background: "#ffebee", color: "#c62828", cursor: "pointer" }}>
            Restaurar
          </button>
        </div>
      </div>

      <div style={{ background: "#e0e0e0", borderRadius: 8, height: 7, marginBottom: 14 }}>
        <div style={{ background: "#4caf50", width: `${allItems.length ? (done / allItems.length) * 100 : 0}%`, height: "100%", borderRadius: 8, transition: "width 0.3s" }} />
      </div>

      {/* Total */}
      <div style={{
        background: totalCost > 0 ? "#e8f5e9" : "#f5f5f5",
        border: `1px solid ${totalCost > 0 ? "#a5d6a7" : "#e0e0e0"}`,
        borderRadius: 12, padding: "10px 16px", marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <span style={{ fontSize: 14, color: "#555" }}>💰 Total estimado</span>
        <span style={{ fontSize: 20, fontWeight: "bold", color: totalCost > 0 ? "#2e7d32" : "#aaa" }}>
          ${totalCost.toFixed(2)}
        </span>
      </div>

      {sections.map(sec => {
        const isCollapsed = collapsed[sec.id];
        const secDone = sec.items.filter(i => checked[i.id]).length;
        const secCost = sectionCost(sec.items);

        return (
          <div key={sec.id} style={{ marginBottom: 16 }}>
            {/* Section header */}
            <div onClick={() => toggleSection(sec.id)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: 10, cursor: "pointer",
              background: "#f0f0f0", userSelect: "none", marginBottom: isCollapsed ? 0 : 6
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, display: "inline-block", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{sec.label}</span>
                <span style={{ fontSize: 12, color: "#888" }}>({secDone}/{sec.items.length})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {secCost > 0 && <span style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600 }}>${secCost.toFixed(2)}</span>}
                <div style={{ width: 48, background: "#ddd", borderRadius: 6, height: 5 }}>
                  <div style={{ background: "#4caf50", width: `${(secDone / sec.items.length) * 100}%`, height: "100%", borderRadius: 6 }} />
                </div>
              </div>
            </div>

            {/* Items */}
            {!isCollapsed && (
              <>
                {sec.items.map(item => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", marginBottom: 5, borderRadius: 10,
                    background: checked[item.id] ? "#e8f5e9" : "#fafafa",
                    border: `1px solid ${checked[item.id] ? "#a5d6a7" : "#e8e8e8"}`,
                    transition: "all 0.2s"
                  }}>
                    {/* Price */}
                    <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "2px 6px", minWidth: 72 }}>
                      <span style={{ fontSize: 11, color: "#aaa", marginRight: 2 }}>$</span>
                      <input type="number" min="0" step="0.50"
                        value={prices[item.id] || ""}
                        onChange={e => setPrice(item.id, e.target.value)}
                        placeholder="0.00"
                        style={{ width: 52, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#333" }}
                      />
                    </div>

                    {/* Checkbox */}
                    <div onClick={() => toggleCheck(item.id)} style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${checked[item.id] ? "#4caf50" : "#bbb"}`,
                      background: checked[item.id] ? "#4caf50" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                    }}>
                      {checked[item.id] && <span style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>✓</span>}
                    </div>

                    {/* Label */}
                    <span onClick={() => toggleCheck(item.id)} style={{
                      fontSize: 14, flex: 1, cursor: "pointer",
                      color: checked[item.id] ? "#999" : "#222",
                      textDecoration: checked[item.id] ? "line-through" : "none"
                    }}>
                      {item.label}
                    </span>

                    {/* Delete */}
                    <button onClick={() => deleteItem(sec.id, item.id)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 16, color: "#ccc", padding: "0 2px", lineHeight: 1,
                      flexShrink: 0
                    }} title="Eliminar">✕</button>
                  </div>
                ))}

                {/* Add item row */}
                {addingTo === sec.id ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input
                      ref={inputRef}
                      value={newItemText[sec.id] || ""}
                      onChange={e => setNewItemText(p => ({ ...p, [sec.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") commitAdd(sec.id); if (e.key === "Escape") setAddingTo(null); }}
                      placeholder="Nuevo artículo..."
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid #4caf50", fontSize: 14, outline: "none" }}
                    />
                    <button onClick={() => commitAdd(sec.id)} style={{
                      padding: "7px 12px", borderRadius: 8, border: "none",
                      background: "#4caf50", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: 14
                    }}>✓</button>
                    <button onClick={() => setAddingTo(null)} style={{
                      padding: "7px 10px", borderRadius: 8, border: "1px solid #ddd",
                      background: "#f5f5f5", cursor: "pointer", fontSize: 14
                    }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => startAdding(sec.id)} style={{
                    width: "100%", marginTop: 4, padding: "7px 0", borderRadius: 9,
                    border: "1px dashed #ccc", background: "transparent",
                    color: "#aaa", fontSize: 13, cursor: "pointer"
                  }}>
                    + Agregar artículo
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      {done === allItems.length && allItems.length > 0 && (
        <div style={{ textAlign: "center", padding: 20, fontSize: 18, color: "#4caf50" }}>
          🎉 ¡Lista completa! Total: ${totalCost.toFixed(2)}
        </div>
      )}
    </div>
  );
}
