import { useEffect } from "react";
import Animation from "./Animation";
import MainMenu from "./main/MainMenu";

export let animation: Animation;

function App() {
	useEffect(() => {
		animation = new Animation();
	}, []);

	return (
		<div>
			<MainMenu />
		</div>
	);
}

export default App;
