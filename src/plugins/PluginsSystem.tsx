import { BaseDirectory, createDir, exists, readDir, readTextFile, writeFile } from "@tauri-apps/api/fs";
import generateUUID from "../utils/generateUUID";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";
import { setGitHubRateLimits } from "../utils/githubRateLimits";

class PluginsSystem {
    plugins: Plugin[];
    pluginSource: PluginSource;
    
    constructor() {
        this.plugins = [];
        // The default source is the debug branch for now.
        this.pluginSource = new PluginSource("ZhichGaming", "Project-Raphael-Plugins", "debug");

        // Constructors don't support async function calls, so I ommited the async keyword. I don't know how it will affect the code.
        this.importPlugins();
    }

    async importPlugins() {
        await this.importPluginsFromLocalDirectory();
        await this.importPluginsFromGitHub(this.pluginSource);
    }

    async importPluginsFromLocalDirectory() {
        try {
            const directory = await appDataDir();
            
            const pluginsDirectory = `${directory}plugins/`;

            if (!await exists(pluginsDirectory)) {
                await createDir("plugins", { dir: BaseDirectory.AppData, recursive: true });
            }

            const files = await readDir(pluginsDirectory);

            for (const file of files) {
                // Skip .DS_Store files. They are created by macOS and are not relevant.
                if (file.name === '.DS_Store') continue;

                const infoPath = `${pluginsDirectory}${file.name}/info.json`;
                const info = await readTextFile(infoPath);

                let plugin: Plugin;

                if (info) {
                    const pluginInfo = JSON.parse(info);
                    plugin = new Plugin(
                        pluginInfo.name, 
                        pluginInfo.id, 
                        infoPath.substring(0, infoPath.indexOf("info.json")), 
                        pluginInfo.remoteSource
                    );

                    this.plugins.push(plugin);
                } else {
                    console.warn('Plugin info not found. Creating a new plugin object without info.');
                    const newId = generateUUID();

                    plugin = new Plugin(
                        file.name ?? "Unknown", 
                        file.name ?? newId, 
                        `${pluginsDirectory}${file.name ?? newId}/`
                    );
                }

                const pluginFiles = await readDir(`${pluginsDirectory}${file.name}`);
                const scriptFile = pluginFiles.find(file => file.name?.startsWith('script'));

                if (scriptFile) {
                    const script = await readTextFile(`${pluginsDirectory}${file.name}/${scriptFile.name}`);

                    if (script) {
                        plugin.content = script;
                        plugin.scriptType = scriptFile.name?.substring(scriptFile.name.lastIndexOf('.') + 1);

                        // For debugging purposes.
                        // console.warn("Remember to remove this function call from the constructor. It is unsafe.")
                        // await plugin.executeScript();
                    }
                }
            }
        } catch (error) {
            console.error('Error importing plugins from local directory:', error);
        }
    }

    async importPluginsFromGitHub(source: PluginSource) {
        try {
            const response = await fetch(source.getURL("plugins"));
            const data = await response.json();

            const githubRequestsLeft = parseInt(response.headers.get('X-RateLimit-Remaining') ?? '0');
            const githubRequestsReset = new Date(parseInt(response.headers.get('X-RateLimit-Reset') ?? '0') * 1000);
            setGitHubRateLimits(githubRequestsLeft, githubRequestsReset);

            // Plugins are stored in a directory called 'plugins' in the root of the GitHub repository normally.
            // This is the default behavior if the path is not specified.
            // A plugin is a directory with a script file and an info file.
            for (const item of data.filter((item: any) => item.type === 'dir')) {
                const pluginDirectory = "plugins/" + item.name;
                const pluginFiles = await fetch(source.getURL(pluginDirectory));
                const pluginData = await pluginFiles.json();

                const infoFile = pluginData.find((item: any) => item.name === 'info.json');
                const scriptFile = pluginData.find((item: any) => item.name.startsWith('script'));

                let infoData: any = undefined;

                if (infoFile) {
                    const info = await fetch(this.getPluginSourceURL(`${pluginDirectory}/${infoFile.name}`));
                    infoData = await info.json();
                }

                let plugin: Plugin;

                if (scriptFile) {
                    const script = await fetch(this.getPluginSourceURL(`${pluginDirectory}/${scriptFile.name}`));
                    const scriptData = await script.text();

                    plugin = new Plugin(
                        infoData?.name ?? "Unknown", 
                        infoData?.id ?? generateUUID(), 
                        undefined,
                        source.getURL(pluginDirectory),
                        scriptFile.name.substring(scriptFile.name.lastIndexOf('.') + 1),
                        scriptData
                    );
                } else {
                    plugin = new Plugin(
                        infoData?.name ?? "Unknown", 
                        infoData?.id ?? generateUUID(),
                        undefined,
                        source.getURL(pluginDirectory),
                    );
                }

                this.plugins.push(plugin);

                // For debugging purposes.
                // console.warn("Remember to remove this function call from the constructor. It is unsafe.")
                // await plugin.executeScript();
            }
        } catch (error) {
            console.error('Error importing plugins from GitHub:', error);
        }
    }

    getPluginSourceURL(path: string) {
        return `https://raw.githubusercontent.com/${this.pluginSource.username!}/${this.pluginSource.repository!}/${this.pluginSource.branch!}/${path}`
    }
}

/**
 * A class that represents a source of plugins.
 * Assumes that the plugins are stored in a directory called 'plugins' in the root of the GitHub repository if unspecified.
 */
class PluginSource {
    // Information
    username?: string;
    repository?: string;
    branch?: string;

    constructor(username?: string, repository?: string, branch?: string) {
        this.username = username;
        this.repository = repository;
        this.branch = branch;
    }

    getURL(path?: string) {
        if (!this.username || !this.repository || !this.branch) {
            console.error('Plugin source is missing information');
            return '';
        }

        if (!path) {
            return `https://api.github.com/repos/${this.username}/${this.repository}/contents?ref=${this.branch}`;
        }

        return `https://api.github.com/repos/${this.username}/${this.repository}/contents/${path}?ref=${this.branch}`;
    }
}

class Plugin {
    // Information
    name: string;
    id: string;
    version?: string;

    // Sources
    path?: string;
    remoteSource?: string; // raw GitHub URL

    scriptFilename?: string;
    scriptType?: string; // Values: 'py', 'js', 'sh'
    content?: string;

    // The process that is running the script (?)
    process?: any;

    constructor(
        name: string, 
        id: string, 
        path?: string, 
        remoteSource?: string, 
        scriptType?: string, 
        content?: string
    ) {     
        this.name = name;
        this.id = id;
        this.path = path;
        this.remoteSource = remoteSource;
        this.scriptType = scriptType;
        this.content = content;

        console.log('Plugin created:', this);
    }

    writeToFileSystem() {
        this.writeContentToFileSystem();
        this.writeInfoToFileSystem();
    }

    async writeContentToFileSystem() {
        const baseDirectory = await appDataDir();

        if (!this.path) {
            this.path = `${baseDirectory}/plugins/${this.id}/script.${this.scriptType}`;
        }

        writeFile({
            path: this.path,
            contents: this.content ?? "",
        });
    }

    async writeInfoToFileSystem() {
        const baseDirectory = await appDataDir();

        const infoPath = `${baseDirectory}/plugins/${this.id}/info.json`;

        writeFile({
            path: infoPath,
            contents: JSON.stringify({
                name: this.name,
                id: this.id,
                remoteSource: this.remoteSource
            }),
        });
    }

    async fetchScript() {
        if (this.remoteSource) {
            try {
                const response = await fetch(this.remoteSource);
                this.content = await response.text();

                this.writeContentToFileSystem();
            } catch (error) {
                console.error('Error fetching plugin content:', error);
            }
        }
    }

    async executeScript() {
        if (this.scriptType === 'js') {
            this.executeJS();
        } else if (this.scriptType === 'py') {
            await this.executePython();
        } else if (this.scriptType === 'sh') {
            await this.executeShellScript();
        }
    }

    executeJS() {
        if (!this.content) { console.error('Script missing'); return; }
        if (this.scriptType !== 'js') { console.error('Trying to execute a script using JavaScript that is not in JavaScript!'); return; }
        
        this.process = new Function(this.content);
        
        this.process();
    }

    async executePython() {
        if (!this.content) { console.error('Script missing'); return; }
        if (this.scriptType !== 'py') { console.error('Trying to execute a script using Python that is not in Python!'); return; }

        let pythonExists = false;

        await invoke("check_for_python3").then((response: any) => {
            pythonExists = response;
        });

        if (!pythonExists) {
            console.error('Python 3 is not installed');
            return;
        }

        this.process = invoke("execute_python_script", { script: this.content })
        await this.process.then((response: any) => console.log(response));
    }

    async executeShellScript() {
        if (!this.content) { console.error('Script missing'); return; }
        if (this.scriptType !== 'sh') { console.error('Trying to execute a script using Shell that is not a Shell script!'); return; }

        this.process = invoke("execute_shell_script", { script: this.content })
        await this.process.then((response: any) => console.log(response));
    }
}

export default PluginsSystem;
