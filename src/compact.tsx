import ReactDOM from "react-dom/client";
import CompactApp from "./CompactApp";
import "./styles/compact-global.css";

ReactDOM.createRoot(document.getElementById("compact-root") as HTMLElement).render(
  <>
    <CompactApp/>
  </>,
);
