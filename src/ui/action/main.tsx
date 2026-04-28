import { createRoot } from "react-dom/client";
import { runWhenReady } from "../../obr";
import { ActionPanel } from "./ActionPanel";

const root = createRoot(document.getElementById("root")!);

function render() {
  root.render(<ActionPanel />);
}

runWhenReady(render);
