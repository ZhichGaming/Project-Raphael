import { useEffect, useState } from "react";
import Animation from "./Animation";
import MainMenu from "./main/MainMenu";
import PluginsSystem from "./plugins/PluginsSystem";
import PluginManager, { RaphaelPlugin, RaphaelPluginScript } from "./plugins/PluginManager";
import generateUUID from "./utils/generateUUID";

export let animation: Animation;
export let pluginsSystem: PluginsSystem;
export let pluginManager: PluginManager;

function App() {
	const [plugins, setPlugins] = useState<RaphaelPlugin[]>([]);

	const onPluginClick = (plugin: RaphaelPlugin, path?: string) => {
		if (!path) {
			return;
		}

		pluginManager.executeFunctionScript(plugin.id, path);
	}
	
	useEffect(() => {
		animation = new Animation();
		pluginManager = new PluginManager();

		// Call the `loadPlugins` method asynchronously and set the `plugins` state to the result.
		(async () => {
			await pluginManager.loadPlugins();
			setPlugins(pluginManager.plugins);
		})();
	}, []);

	return (
		<div>
			<MainMenu />
			{
				plugins.map((plugin) => {
					return (
						<div key={generateUUID()}>
							<h2>{plugin.name}</h2>
							{
								plugin.startupScript && (
									<button onClick={() => onPluginClick(plugin, plugin.startupScript?.path)}>Run Startup Script</button>
								)
							}
							{
								plugin.functionScripts?.map((script: RaphaelPluginScript) => {
									return (
										<button key={generateUUID()} onClick={() => onPluginClick(plugin, script.path)}>{plugin.startupScript?.path?.split("/")[plugin.startupScript?.path?.split("/").length-1] ?? "Run Function Script"}</button>
									);
								})
							}
						</div>
					);
				})
			}
		</div>
	);
}

export default App;
