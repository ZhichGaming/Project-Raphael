import { useEffect } from "react";
import Animation from "./Animation";
import MainMenu from "./main/MainMenu";
import PluginsSystem from "./plugins/PluginsSystem";

export let animation: Animation;
export let pluginsSystem: PluginsSystem;

function App() {
	useEffect(() => {
		animation = new Animation();
		pluginsSystem = new PluginsSystem();
	}, []);

	return (
		<div>
			<MainMenu />
		</div>
	);
}

export default App;
