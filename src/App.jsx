import { useState } from "react";
import ShoppingList from "./ShoppingList";
import OcrView from "./OcrView";

export default function App() {
  const [view, setView] = useState("list");

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {view === "list" && <ShoppingList onNavigate={setView} />}
      {view === "ocr" && <OcrView onNavigate={setView} />}
    </div>
  );
}
