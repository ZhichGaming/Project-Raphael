import { useEffect, useState } from "react";
import Animation from "./Animation";
import DefaultMenu from "./main/main";
import PluginsSystem from "./plugins/PluginsSystem";
import PluginManager, { RaphaelPlugin, RaphaelPluginScript } from "./plugins/PluginManager";
import generateUUID from "./utils/generateUUID";

export let animation: Animation;
export let pluginsSystem: PluginsSystem;
export let pluginManager: PluginManager;

function App() {
	const [plugins, setPlugins] = useState<RaphaelPlugin[]>([]);
	const [parameters, setParameters] = useState<string>("");

	const onPluginStartupClick = (plugin: RaphaelPlugin) => {
		if (!plugin.startupScript) {
			return;
		}

		pluginManager.executeStartupScript(plugin.id);
	}

	const onPluginClick = (plugin: RaphaelPlugin, path?: string) => {
		if (!path) {
			return;
		}

		pluginManager.executeFunctionScript(plugin.id, path, parameters.split(" "));
	}

	const handleParametersChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setParameters(event.target.value);
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
			<DefaultMenu />
			{/* function script parameters */}
			<textarea value={parameters} onChange={handleParametersChange} placeholder="Function Script Parameters" />
			{
				plugins.map((plugin) => {
					return (
						<div key={generateUUID()}>
							<h2>{plugin.name}</h2>
							{
								plugin.startupScript && (
									<button onClick={() => onPluginStartupClick(plugin)}>Run Startup Script</button>
								)
							}
							{
								plugin.functionScripts?.map((script: RaphaelPluginScript) => {
									return (
										<button key={generateUUID()} onClick={() => onPluginClick(plugin, script.path)}>{ script?.path?.split("/")[script?.path?.split("/").length-1] ?? "Run Function Script"}</button>
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
