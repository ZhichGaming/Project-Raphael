import { BaseDirectory, createDir, exists, readDir, readTextFile, writeFile } from "@tauri-apps/api/fs";
import generateUUID from "../utils/GenerateUUID";
import { Command } from '@tauri-apps/api/shell'
import { appDataDir } from "@tauri-apps/api/path";

class PluginsSystem {
    plugins: Plugin[];

    constructor() {
        this.plugins = [];

        // Constructors don't support async function calls, so I ommited the async keyword. I don't know how it will affect the code.
        this.importPluginsFromLocalDirectory();
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

                        console.warn("Remember to remove this function call from the constructor. It is unsafe.")
                        plugin.executeScript();
                    }
                }
            }
        } catch (error) {
            console.error('Error importing plugins from local directory:', error);
        }
    }

    async importPluginsFromGitHub(username: string, repository: string) {
        try {
            const response = await fetch(`https://api.github.com/repos/${username}/${repository}/contents/plugins`);
            const data = await response.json();

            for (const item of data) {
                if (item.type === 'file' && item.name.endsWith('.js')) {
                    const pluginName = item.name.replace('.js', '');
                    const pluginSource = await this.getPluginSourceURL(username, repository, item.path);
                    const plugin = new Plugin(pluginName, generateUUID(), undefined, pluginSource);

                    await plugin.fetchScript();

                    this.plugins.push(plugin);
                }
            }
        } catch (error) {
            console.error('Error importing plugins from GitHub:', error);
        }
    }

    getPluginSourceURL(username: string, repository: string, path: string) {
        return `https://raw.githubusercontent.com/${username}/${repository}/master/${path}`
    }
}

class Plugin {
    // Information
    name: string;
    id: string;

    // Sources
    path?: string;
    remoteSource?: string; // raw GitHub URL

    scriptFilename?: string;
    scriptType?: string; // Values: 'py', 'js', 'sh'
    content?: string;

    // The process that is running the script (?)
    process?: any;

    constructor(name: string, id: string, path?: string, scriptFilename?: string, remoteSource?: string, scriptType?: string, content?: string) {
        this.name = name;
        this.id = id;
        this.path = path;
        this.remoteSource = remoteSource;
        this.scriptFilename = scriptFilename;
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

    executeScript() {
        if (this.scriptType === 'js') {
            this.executeJS();
        } else if (this.scriptType === 'py') {
            this.executePython();
        } else if (this.scriptType === 'sh') {
            this.executeShellScript();
        }
    }

    executeJS() {
        if (!this.content) { console.error('Script missing'); return; }
        if (this.scriptType !== 'js') { console.error('Trying to execute a script using JavaScript that is not in JavaScript!'); return; }
        
        this.process = new Function(this.content);
        
        this.process();
    }

    executePython() {
    }

    executeShellScript() {
    }
}

export default PluginsSystem;
