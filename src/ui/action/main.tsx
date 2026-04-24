import { createRoot } from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import { ActionPanel } from "./ActionPanel";

const root = createRoot(document.getElementById("root")!);

function render() {
  root.render(<ActionPanel />);
}

// The popover HTML can load either inside OBR (normal) or stand-alone (dev).
if (typeof OBR?.onReady === "function") {
  OBR.onReady(render);
} else {
  render();
}
