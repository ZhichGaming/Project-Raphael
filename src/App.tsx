import { useEffect } from "react";
import Animation from "./Animation";

function App() {
  useEffect(() => {
    new Animation();
  }, []);

  return (
    <div>
      <canvas id="sun"/>
    </div>
  );
}

export default App;
