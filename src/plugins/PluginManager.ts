import { invoke } from "@tauri-apps/api";
import { recursiveToCamel } from "../utils/toCamelCase";

export default class PluginManager {
    plugins: RaphaelPlugin[] = [];

    constructor() {
        // this.loadPlugins();
    }

    async loadPlugins() {
        let plugins: RaphaelPlugin[] = [];

        await invoke("import_plugins").then((result: unknown) => {
            const parsedResult = recursiveToCamel(JSON.parse(result as string));

            plugins = parsedResult as RaphaelPlugin[];
            this.plugins = plugins;
        }).catch((error) => {
            console.error(error);
        });

        // The scripts are executed asynchronously because they aren't called using the `await` keyword.
        for (let plugin of plugins) {
            this.executeStartupScript(plugin.id);
        }
    }

    async executeStartupScript(pluginId: string) {
        invoke("execute_startup_script", { pluginId: pluginId }).then((result) => {
            console.log(result);
        }).catch((error) => {
            console.error(error);
        });
    }

    async executeFunctionScript(pluginId: string, scriptPath: string) {
        await invoke("execute_function_script", { pluginId: pluginId, scriptPath: scriptPath }).then((result: unknown) => {
            console.log(result);
        }).catch((error) => {
            console.error(error);
        });
    }
}

type RaphaelPlugin = {
    id: string;
    name: string;
    version?: string;

    localPath?: string;
    remoteUrl?: string;

    startupScript?: RaphaelPluginScript;
    functionScripts?: RaphaelPluginScript[];
}

type RaphaelPluginScript = {
    path?: string;
    script?: string;
    engine?: string;
}

export type { RaphaelPlugin, RaphaelPluginScript };
