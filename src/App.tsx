import { useEffect } from "react";
import Animation from "./Animation";
import DefaultMenu from "./main/main";

export let animation: Animation;

function App() {
	useEffect(() => {
		animation = new Animation();
	}, []);

	return (
		<div>
			<DefaultMenu />
		</div>
	);
}

export default App;
