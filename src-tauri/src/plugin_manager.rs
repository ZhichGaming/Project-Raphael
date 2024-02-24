//! The plugin manager is responsible for managing the plugins.
//! It can install, update, and remove plugins.
//! It can also execute scripts from the plugins.

use std::{fmt, fs, path};
use serde::{Deserialize, Serialize};
use reqwest;

#[derive(Debug)]
pub struct PluginError {
    message: String,
}

impl fmt::Display for PluginError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "PluginError: {}", self.message)
    }
}

pub struct PluginManager {
    pub plugins: Vec<Box<Plugin>>,
    pub sources: Vec<Box<PluginSource>>,
}

impl PluginManager {
    pub fn new() -> PluginManager {
        let mut manager = PluginManager {
            plugins: Vec::new(),
            sources: Vec::new(),
        };

        let debug_source: PluginSource = PluginSource {
            username: Some("ZhichGaming".to_string()),
            repository: Some("Project-Raphael-Plugins".to_string()),
            branch: Some("debug".to_string()),
        };

        manager.sources.push(Box::new(debug_source));

        return manager;
    }

    pub async fn import_plugins(&mut self, plugins_dir: &path::PathBuf) {
        self.plugins.clear();
        self.import_plugins_from_local(plugins_dir).await;
        self.import_plugins_from_remote(plugins_dir).await;
    }

    pub async fn import_plugins_from_local(&mut self, plugins_dir: &path::PathBuf) {
        let plugins_dir = plugins_dir.as_path();
        let plugin_files = match std::fs::read_dir(plugins_dir) {
            Ok(plugins) => plugins,
            Err(err) => {
                println!("Error reading plugins directory: {}", err);
                return;
            }
        };

        for plugin_file in plugin_files {
            let plugin_path = match plugin_file {
                Ok(plugin) => plugin.path(),
                Err(err) => {
                    println!("Error reading plugin: {}", err);
                    continue;
                }
            };

            let unwrapped_plugin_path = match plugin_path.to_str() {
                Some(plugin) => plugin,
                None => {
                    println!("Error reading plugin path.");
                    continue;
                }
            };

            // Check for .DS_Store files
            if unwrapped_plugin_path.ends_with(".DS_Store") {
                continue;
            }

            let plugin = match self.import_plugin_from_local(unwrapped_plugin_path).await {
                Ok(plugin) => plugin,
                Err(err) => {
                    println!("Error importing plugin: {}", err);
                    continue;
                }
            };

            self.plugins.push(Box::new(plugin));
        }
    }

    async fn import_plugin_from_local(&self, plugin_path: &str) -> Result<Plugin, PluginError> {
        // Alright so would someone please explain to me why this works and returns the correct files but not when I unwrapped it safely? see commit `716e24f96284aefcf22e94716ff2be5454874d4b`
        let plugin_script_dir_files: Vec<std::fs::DirEntry> = fs::read_dir(plugin_path.to_string() + "/scripts").unwrap().map(|res| res.unwrap()).collect();

        // Import plugin info
        let plugin_info = match std::fs::read_to_string(plugin_path.to_string() + "/info.json") {
            Ok(plugin) => plugin,
            Err(err) => {
                return Err(PluginError {
                    message: format!("Error reading plugin: {}", err),
                });
            }
        };

        let plugin_info: Plugin = match serde_json::from_str(&plugin_info) {
            Ok(plugin) => plugin,
            Err(err) => {
                return Err(PluginError {
                    message: format!("Error parsing plugin: {}", err),
                });
            }
        };

        // Import startup script
        const STARTUP_SCRIPT_PREFIX: &str = "start";

        let startup_script_filename = plugin_script_dir_files.iter().find(|entry| {
            let entry = entry.file_name();
            let entry = match entry.to_str() {
                Some(entry) => entry,
                None => return false,
            };

            if entry.starts_with(STARTUP_SCRIPT_PREFIX) {
                return true;
            }

            return false;
        });

        let startup_script_filename = match startup_script_filename {
            Some(filename) => {
                

                let filename = match filename.file_name().to_str() {
                    Some(filename) => filename.to_string(),
                    None => {
                        return Err(PluginError {
                            message: format!("Error reading plugin: Encountered an error while getting {}", filename.file_name().to_str().unwrap()),
                        });
                    }
                };

                filename
            },
            None => {
                println!("Plugin {} has no startup script, creating an empty script.", plugin_info.name);
                // Default script type will be JavaScript.
                "start.js".to_string()
            }
        };

        let startup_script_path = String::from(plugin_path.to_string() + "/scripts/" + &startup_script_filename);

        let startup_script = match std::fs::read_to_string(&startup_script_path) {
            Ok(script) => script,
            Err(_) => {
                // Create an empty script at path.
                std::fs::write(&startup_script_path, "").unwrap();

                "".to_string()
            }
        };

        let startup_script = PluginScript {
            path: Some(startup_script_path),
            script: Some(startup_script),
            engine: Some(startup_script_filename.split('.').last().unwrap().to_string()),
        };

        // Import function scripts
        let function_scripts = plugin_script_dir_files.iter().filter_map(|entry| {
            let entry = entry.file_name();
            let entry = match entry.to_str() {
                Some(entry) => entry,
                None => return None,
            };
            
            if entry == ".DS_Store" {
                return None;
            }

            if !entry.starts_with(STARTUP_SCRIPT_PREFIX) {
                let script_path = String::from(plugin_path.to_string() + "/scripts/" + entry);

                let script = match std::fs::read_to_string(&script_path) {
                    Ok(script) => script,
                    Err(err) => {
                        println!("Error reading script: {}", err);
                        return None;
                    }
                };

                let script = PluginScript {
                    path: Some(script_path),
                    script: Some(script),
                    engine: Some(entry.split('.').last().unwrap().to_string()),
                };

                return Some(script);
            }

            return None;
        }).collect();

        let plugin = Plugin {
            name: plugin_info.name,
            id: plugin_info.id,
            version: plugin_info.version,
            local_path: Some(plugin_path.to_string()),
            remote_url: plugin_info.remote_url,
            startup_script: Some(startup_script),
            function_scripts: Some(function_scripts),
        };
        // println!("{:?}", plugin);

        // match self.execute_startup_script(&plugin).await {
        //     Ok(output) => {
        //         println!("Startup script output: {}", output);
        //     },
        //     Err(err) => {
        //         println!("Error executing startup script: {}", err);
        //     }
        // }

        Ok(plugin)
    }

    pub async fn import_plugins_from_remote(&mut self, plugins_dir: &path::PathBuf) {
        for source in &self.sources {
            let folder_url = match source.get_folder_url("plugins") {
                Ok(url) => url,
                Err(err) => {
                    println!("Error getting folder URL: {}", err);
                    continue;
                }
            };

            let folder_contents = match reqwest::Client::new().get(&folder_url).header("User-Agent", "Mozilla/5.0").send().await {
                Ok(response) => response,
                Err(err) => {
                    println!("Error getting folder contents: {}", err);
                    continue;
                }
            };

            let folder_contents: String = match folder_contents.text().await {
                Ok(contents) => contents,
                Err(err) => {
                    println!("Error parsing folder contents: {}", err);
                    continue;
                }
            };

            let folder_contents: Vec<serde_json::Value> = match serde_json::from_str(&folder_contents) {
                Ok(contents) => contents,
                Err(err) => {
                    println!("Error parsing folder contents to JSON: {}", err);
                    continue;
                }
            };

            for plugin_folder in folder_contents {
                let plugin_folder = match plugin_folder.as_object() {
                    Some(content) => content,
                    None => {
                        println!("Error parsing folder content.");
                        continue;
                    }
                };

                let plugin_folder_type = match plugin_folder.get("type") {
                    Some(content_type) => content_type,
                    None => {
                        println!("Error getting folder content type.");
                        continue;
                    }
                };

                let plugin_folder_type = match plugin_folder_type.as_str() {
                    Some(content_type) => content_type,
                    None => {
                        println!("Error parsing folder content type.");
                        continue;
                    }
                };

                if plugin_folder_type != "dir" {
                    continue;
                }

                let plugin_folder_name = match plugin_folder.get("name") {
                    Some(content_name) => content_name,
                    None => {
                        println!("Error getting folder content name.");
                        continue;
                    }
                };

                let plugin_folder_name = match plugin_folder_name.as_str() {
                    Some(content_name) => content_name,
                    None => {
                        println!("Error parsing folder content name.");
                        continue;
                    }
                };

                let local_plugin_path = plugins_dir.to_str().unwrap().to_string() + "/" + plugin_folder_name;

                // Check if this plugin is already installed
                if std::path::Path::new(&local_plugin_path).exists() {
                    println!("Plugin {} is already installed.", plugin_folder_name);
                    continue;
                }

                let plugin_info_url = match source.get_file_url(&("plugins/".to_string() + plugin_folder_name + "/info.json")) {
                    Ok(url) => url,
                    Err(err) => {
                        println!("Error getting plugin info URL: {}", err);
                        continue;
                    }
                };

                let plugin_info = match reqwest::get(&plugin_info_url).await {
                    Ok(response) => response,
                    Err(err) => {
                        println!("Error getting plugin info: {}", err);
                        continue;
                    }
                };

                let plugin_info = match plugin_info.text().await {
                    Ok(info) => info,
                    Err(err) => {
                        println!("Error parsing plugin info: {}", err);
                        continue;
                    }
                };

                let parsed_plugin_info: Plugin = match serde_json::from_str(&plugin_info) {
                    Ok(info) => info,
                    Err(err) => {
                        println!("Error parsing plugin info: {}", err);
                        continue;
                    }
                };

                let plugin_scripts_url = match source.get_folder_url(&("plugins/".to_string() + plugin_folder_name + "/scripts")) {
                    Ok(url) => url,
                    Err(err) => {
                        println!("Error getting plugin URL: {}", err);
                        continue;
                    }
                };

                let plugin_scripts = match reqwest::Client::new().get(&plugin_scripts_url).header("User-Agent", "Mozilla/5.0").send().await {
                    Ok(response) => response,
                    Err(err) => {
                        println!("Error getting plugin scripts: {}", err);
                        continue;
                    }
                };

                let plugin_scripts: String = match plugin_scripts.text().await {
                    Ok(contents) => contents,
                    Err(err) => {
                        println!("Error parsing plugin scripts: {}", err);
                        continue;
                    }
                };

                let plugin_scripts: Vec<serde_json::Value> = match serde_json::from_str(&plugin_scripts) {
                    Ok(contents) => contents,
                    Err(err) => {
                        println!("Error parsing plugin scripts to JSON: {}", err);
                        continue;
                    }
                };

                let mut startup_script: Option<PluginScript> = None;

                let mut function_scripts: Vec<PluginScript> = Vec::new();

                for content in plugin_scripts.iter() {
                    let content = match content.as_object() {
                        Some(content) => content,
                        None => {
                            println!("Error parsing plugin script.");
                            continue;
                        }
                    };

                    let content_type = match content.get("type") {
                        Some(content_type) => content_type,
                        None => {
                            println!("Error getting plugin script type.");
                            continue;
                        }
                    };

                    let content_type = match content_type.as_str() {
                        Some(content_type) => content_type,
                        None => {
                            println!("Error parsing plugin script type.");
                            continue;
                        }
                    };

                    if content_type == "file" {
                        let script_file_name = match content.get("name") {
                            Some(content_name) => content_name,
                            None => {
                                println!("Error getting plugin script name.");
                                continue;
                            }
                        };

                        let script_file_name = match script_file_name.as_str() {
                            Some(content_name) => content_name,
                            None => {
                                println!("Error parsing plugin script name.");
                                continue;
                            }
                        };

                        let script_url = match source.get_file_url(&("plugins/".to_string() + plugin_folder_name + "/scripts/" + script_file_name)) {
                            Ok(url) => url,
                            Err(err) => {
                                println!("Error getting plugin script URL: {}", err);
                                continue;
                            }
                        };

                        let script = match reqwest::get(&script_url).await {
                            Ok(response) => response,
                            Err(err) => {
                                println!("Error getting plugin script: {}", err);
                                continue;
                            }
                        };

                        let script = match script.text().await {
                            Ok(script) => script,
                            Err(err) => {
                                println!("Error parsing plugin script: {}", err);
                                continue;
                            }
                        };

                        let script = PluginScript {
                            path: Some(format!("{}{}{}", &local_plugin_path, "/scripts/", script_file_name)),
                            script: Some(script),
                            engine: Some(plugin_folder_name.split('.').last().unwrap().to_string()),
                        };

                        if script_file_name.starts_with("start") {
                            startup_script = Some(script);
                        } else {
                            function_scripts.push(script);
                        }
                    }
                }

                let plugin = Plugin {
                    name: parsed_plugin_info.name,
                    id: parsed_plugin_info.id,
                    version: parsed_plugin_info.version,
                    local_path: Some(local_plugin_path),
                    remote_url: Some(plugin_info_url),
                    startup_script: startup_script.clone(),
                    function_scripts: Some(function_scripts.to_vec()),
                };

                // Save the plugin to the local directory
                let plugin_dir = plugins_dir.to_str().unwrap().to_string() + "/" + plugin_folder_name;
                std::fs::create_dir_all(&plugin_dir).unwrap();

                let plugin_info_path = plugin_dir.to_string() + "/info.json";
                std::fs::write(&plugin_info_path, plugin_info).unwrap();

                let plugin_scripts_dir = plugin_dir.to_string() + "/scripts";
                std::fs::create_dir_all(&plugin_scripts_dir).unwrap();

                for script in &function_scripts {
                    let script_path = script.path.as_ref().unwrap();
                    let script_path = script_path.split('/').last().unwrap();
                    let script_path = plugin_scripts_dir.to_string() + "/" + script_path;
                    std::fs::write(&script_path, script.script.as_ref().unwrap()).unwrap();
                }

                if !startup_script.is_none() {
                    let startup_script = startup_script.as_ref().unwrap();
                    let startup_script_path = startup_script.path.as_ref().unwrap();
                    let startup_script_path = startup_script_path.split('/').last().unwrap();
                    let startup_script_path = plugin_scripts_dir.to_string() + "/" + startup_script_path;

                    std::fs::write(&startup_script_path, startup_script.script.as_ref().unwrap()).unwrap();
                } else {
                    let startup_script_path = plugin_scripts_dir.to_string() + "/start.js";
                    std::fs::write(&startup_script_path, "").unwrap();
                }

                self.plugins.push(Box::new(plugin));

                println!("Plugin {} has been installed.", plugin_folder_name);
            }
        }       
    }

    /**
     * Executes the startup script of the plugin from the plugin id.
     */
    pub async fn execute_startup_script_from_id(&self, plugin_id: &str) -> Result<String, PluginError> {
        let plugin = match self.plugins.iter().find(|plugin| plugin.id == plugin_id) {
            Some(plugin) => plugin,
            None => {
                return Err(PluginError {
                    message: format!("Plugin with id {} not found.", plugin_id),
                });
            }
        };

        self.execute_startup_script(&plugin).await
    }

    /**
     * Executes the startup script of the plugin.
     */
    async fn execute_startup_script(&self, plugin: &Plugin) -> Result<String, PluginError> {
        if plugin.startup_script.is_none() {
            return Err(PluginError {
                message: format!("Plugin {} has no startup script.", plugin.name),
            });
        }

        let script = plugin.startup_script.as_ref().unwrap();
        let script_code = match script.script {
            Some(ref script) => script,
            None => {
                return Err(PluginError {
                    message: format!("Plugin {} has no startup script.", plugin.name),
                });
            }
        };
        let engine = match script.engine {
            Some(ref engine) => engine,
            None => {
                return Err(PluginError {
                    message: format!("Plugin {}'s startup script does not have a type.", plugin.name),
                });
            }
        };

        match engine.as_str() {
            "py" => {
                return self.execute_python_script(script_code, None).await;
            }
            "js" => {
                return self.execute_javascript_script(script_code, None).await;
            }
            "sh" => {
                return Err(PluginError {
                    message: format!("Plugin {}'s startup script is a shell script, which is not allowed.", plugin.name),
                });
            }
            _ => {
                return Err(PluginError {
                    message: format!("Plugin {}'s startup script has an unsupported type.", plugin.name),
                });
            }
        }
    }

    pub async fn execute_function_script_from_id(&self, plugin_id: &str, function_path: &str, args: Option<&Vec<&str>>) -> Result<String, PluginError> {
        let plugin = match self.plugins.iter().find(|plugin| plugin.id == plugin_id) {
            Some(plugin) => plugin,
            None => {
                return Err(PluginError {
                    message: format!("Plugin with id {} not found.", plugin_id),
                });
            }
        };

        let function = match plugin.function_scripts.as_ref().unwrap().iter().find(|script| script.path.as_ref().unwrap() == function_path) {
            Some(function) => function,
            None => {
                return Err(PluginError {
                    message: format!("Plugin {} has no function script at path {}.", plugin.name, function_path),
                });
            }
        };

        self.execute_function_script(&plugin, function, args).await
    }

    /**
     * Executes a function script of the plugin.
     */
    pub async fn execute_function_script(&self, plugin: &Plugin, plugin_script: &PluginScript, args: Option<&Vec<&str>>) -> Result<String, PluginError> {
        let unwrapped_plugin_script_path = match plugin_script.path {
            Some(ref path) => path,
            None => {
                return Err(PluginError {
                    message: format!("Plugin {} has no such function script.", plugin.name),
                });
            }
        };

        let unwrapped_plugin_script_script = match plugin_script.script {
            Some(ref script) => script,
            None => {
                return Err(PluginError {
                    message: format!("Plugin {} has no function script at path {}.", plugin.name, unwrapped_plugin_script_path),
                });
            }
        };

        let script_code = unwrapped_plugin_script_script;
        let engine = match plugin_script.engine {
            Some(ref engine) => engine,
            None => {
                return Err(PluginError {
                    message: format!("Plugin {}'s function script at path {} does not have a type.", plugin.name, unwrapped_plugin_script_path),
                });
            }
        };

        match engine.as_str() {
            "py" => {
                return self.execute_python_script(script_code, args).await;
            }
            "js" => {
                return self.execute_javascript_script(script_code, args).await;
            }
            "sh" => {
                return Err(PluginError {
                    message: format!("Plugin {}'s function script {} is a shell script, which is not allowed.", plugin.name, unwrapped_plugin_script_path),
                });
            }
            _ => {
                return Err(PluginError {
                    message: format!("Plugin {}'s function script at path {} has an unsupported type.", plugin.name, unwrapped_plugin_script_path),
                });
            }
        }
    }

    /**
     * Executes a python script from the plugin. 
     */
    async fn execute_python_script(&self, script: &str, args: Option<&Vec<&str>>) -> Result<String, PluginError> {
        let output = std::process::Command::new("python3")
            .args([["-c", script].as_slice(), args.unwrap_or(&Vec::<&str>::new()).as_slice()].concat())
            .output()
            .expect("failed to execute process");

        let output = String::from_utf8_lossy(&output.stdout);
        let output = output.to_string();

        Ok(output)
    }

    /**
     * Executes a JavaScript script from the plugin. 
     * This implementation might change in the future to support manipulating the DOM.
     */
    async fn execute_javascript_script(&self, script: &str, args: Option<&Vec<&str>>) -> Result<String, PluginError> {
        let output = std::process::Command::new("node")
            .args([["-e", script].as_slice(), args.unwrap_or(&Vec::<&str>::new()).as_slice()].concat())
            .output()
            .expect("failed to execute process");

        let output = String::from_utf8_lossy(&output.stdout);
        let output = output.to_string();

        Ok(output)
    }

    /**
     * Executes a shell script from the plugin. 
     * This has been temporarily disabled due to security concerns.
     */
    async fn execute_shell_script(&self, script: &str) -> Result<String, PluginError> {
        let output = std::process::Command::new("sh")
            .args(["-c", script])
            .output()
            .expect("failed to execute process");

        let output = String::from_utf8_lossy(&output.stdout);
        let output = output.to_string();

        Ok(output)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PluginSource {
    username: Option<String>,
    repository: Option<String>,
    branch: Option<String>,
}

impl PluginSource {
    pub fn new(username: Option<String>, repository: Option<String>, branch: Option<String>) -> PluginSource {
        PluginSource {
            username,
            repository,
            branch,
        }
    }
    
    pub fn get_folder_url(&self, path: &str) -> Result<String, PluginError> {
        let username = match self.username {
            Some(ref username) => username,
            None => {
                return Err(PluginError {
                    message: "Username is not set.".to_string(),
                });
            }
        };

        let repository = match self.repository {
            Some(ref repository) => repository,
            None => {
                return Err(PluginError {
                    message: "Repository is not set.".to_string(),
                });
            }
        };

        let branch_param = match self.branch {
            Some(ref branch) => format!("?ref={}", branch),
            None => "".to_string()
        };

        Ok(format!("https://api.github.com/repos/{}/{}/contents/{}{}", username, repository, path, &branch_param))
    }

    pub fn get_file_url(&self, path: &str) -> Result<String, PluginError> {
        let username = match self.username {
            Some(ref username) => username,
            None => {
                return Err(PluginError {
                    message: "Username is not set.".to_string(),
                });
            }
        };

        let repository = match self.repository {
            Some(ref repository) => repository,
            None => {
                return Err(PluginError {
                    message: "Repository is not set.".to_string(),
                });
            }
        };

        let branch = match self.branch {
            Some(ref branch) => branch,
            None => {
                return Err(PluginError {
                    message: "Branch is not set.".to_string(),
                });
            }
        };

        Ok(format!("https://raw.githubusercontent.com/{}/{}/{}/{}", username, repository, branch, path))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Plugin {
    // Information
    /// The name of the plugin.
    name: String,
    /// The id of the plugin. Randomly generated UUID.
    id: String,
    /// The version of the plugin in semver format.
    version: Option<String>,

    // Sources
    /// The local path to the plugin.
    local_path: Option<String>,
    /// Link to the GitHub API, fetching the folder contents of the plugin.
    remote_url: Option<String>,

    // Scripts
    startup_script: Option<PluginScript>,
    function_scripts: Option<Vec<PluginScript>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginScript {
    path: Option<String>,
    script: Option<String>,
    engine: Option<String>,
}
