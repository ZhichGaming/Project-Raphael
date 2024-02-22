//! The plugin manager is responsible for managing the plugins.
//! It can install, update, and remove plugins.
//! It can also execute scripts from the plugins.

use std::{fmt, path};
use serde::{Deserialize, Serialize};

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
}

impl PluginManager {
    pub fn new() -> PluginManager {
        let manager = PluginManager {
            plugins: Vec::new(),
        };

        return manager;
    }

    pub async fn import_plugins(&mut self, plugins_dir: &path::PathBuf) {
        self.plugins.clear();
        self.import_plugins_from_local(plugins_dir).await;
        self.import_plugins_from_remote().await;
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
        // I don't know why this has to be mutable, but it does.
        let mut plugin_script_dir_files = match std::fs::read_dir(plugin_path.to_string() + "/scripts") {
            Ok(files) => files,
            Err(err) => {
                return Err(PluginError {
                    message: format!("Error reading plugin: {}", err),
                });
            }
        };

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

        let startup_script_filename = plugin_script_dir_files.find(|entry| {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => return false,
            };

            let entry = entry.file_name();
            let entry = match entry.to_str() {
                Some(entry) => entry,
                None => return false,
            };

            entry.starts_with(STARTUP_SCRIPT_PREFIX)
        });

        let startup_script_filename = match startup_script_filename {
            Some(filename) => {
                let unwrapped_filename = match filename {
                    Ok(filename) => filename.file_name(),
                    Err(err) => {
                        return Err(PluginError {
                            message: format!("Error reading plugin: {}", err),
                        });
                    }
                };

                let filename = match unwrapped_filename.to_str() {
                    Some(filename) => filename.to_string(),
                    None => {
                        return Err(PluginError {
                            message: format!("Error reading plugin: Encountered an error while getting {}", unwrapped_filename.to_str().unwrap()),
                        });
                    }
                };

                filename
            },
            None => {
                return Err(PluginError {
                    message: format!("Plugin {} has no startup script.", plugin_info.name),
                });
            }
        };

        let startup_script_path = String::from(plugin_path.to_string() + "/scripts/" + &startup_script_filename);

        let startup_script = match std::fs::read_to_string(&startup_script_path) {
            Ok(script) => script,
            Err(err) => {
                return Err(PluginError {
                    message: format!("Error reading plugin: {}", err),
                });
            }
        };

        let startup_script = PluginScript {
            path: Some(startup_script_path),
            script: Some(startup_script),
            engine: Some(startup_script_filename.split('.').last().unwrap().to_string()),
        };

        // Import function scripts
        let function_scripts = plugin_script_dir_files.filter_map(|entry| {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => return None,
            };

            let entry = entry.file_name();
            let entry = match entry.to_str() {
                Some(entry) => entry,
                None => return None,
            };

            if !entry.starts_with(STARTUP_SCRIPT_PREFIX) {
                let script_path = String::from(plugin_path.to_string() + "/scripts/" + entry);

                let script = match std::fs::read_to_string(&script_path) {
                    Ok(script) => script,
                    Err(_) => {
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

    pub async fn import_plugins_from_remote(&self) {
        
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
                return self.execute_python_script(script_code).await;
            }
            "js" => {
                return self.execute_javascript_script(script_code).await;
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

    pub async fn execute_function_script_from_id(&self, plugin_id: &str, function_path: &str) -> Result<String, PluginError> {
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

        self.execute_function_script(&plugin, function).await
    }

    /**
     * Executes a function script of the plugin.
        */
    pub async fn execute_function_script(&self, plugin: &Plugin, plugin_script: &PluginScript) -> Result<String, PluginError> {
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
                return self.execute_python_script(script_code).await;
            }
            "js" => {
                return self.execute_javascript_script(script_code).await;
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
    async fn execute_python_script(&self, script: &str) -> Result<String, PluginError> {
        let output = std::process::Command::new("python3")
            .args(["-c", script])
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
    async fn execute_javascript_script(&self, script: &str) -> Result<String, PluginError> {
        let output = std::process::Command::new("node")
            .args(["-e", script])
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

#[derive(Debug, Serialize, Deserialize)]
pub struct PluginScript {
    path: Option<String>,
    script: Option<String>,
    engine: Option<String>,
}
