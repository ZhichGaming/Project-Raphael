import { useEffect } from "react";
import Animation from "./Animation";
import Default from "./main/default";
import PluginManager from "./plugins/PluginManager";
import { invoke } from "@tauri-apps/api";

export let animation: Animation;
export let pluginManager: PluginManager;

function App() {
	
	useEffect(() => {
		animation = new Animation();
		pluginManager = new PluginManager();
	}, []);

	return (
		<div>
			<Default />
		</div>
	);
}

export default App;
