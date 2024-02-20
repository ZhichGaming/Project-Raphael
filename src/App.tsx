import { useEffect } from "react";
import Animation from "./Animation";
import MainMenu from "./main/MainMenu";
import PluginsSystem from "./plugins/PluginsSystem";
import { invoke } from "@tauri-apps/api/tauri";

export let animation: Animation;
export let pluginsSystem: PluginsSystem;

function App() {
	useEffect(() => {
		animation = new Animation();
		// pluginsSystem = new PluginsSystem();

		invoke("import_plugins").then((result) => {
			console.log(result);
		});

		// invoke("execute_startup_script", { pluginId: "test" }).then((result) => {
		// 	console.log(result);
		// });
	}, []);

	return (
		<div>
			<MainMenu />
		</div>
	);
}

export default App;
