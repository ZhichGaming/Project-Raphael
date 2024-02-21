// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod plugin_manager;
use plugin_manager::plugin_manager::PluginManager;
use lazy_static::lazy_static;
use tokio::sync::Mutex;

lazy_static! {
    static ref PLUGIN_MANAGER: Mutex<PluginManager> = Mutex::new(PluginManager::new());
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            import_plugins,
            execute_startup_script,
            execute_function_script
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn import_plugins(app_handle: tauri::AppHandle) -> Result<String, String> {
    let plugins_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .unwrap()
        .join("plugins");
    let mut plugin_manager = PLUGIN_MANAGER.lock().await;
    plugin_manager.import_plugins(&plugins_dir).await;

    let serialized_plugins = serde_json::to_string(&plugin_manager.plugins).unwrap();
    Ok(serialized_plugins)
}

#[tauri::command]
async fn execute_startup_script(plugin_id: &str) -> Result<String, String> {
    let plugin_manager = PLUGIN_MANAGER.lock().await;
    let result = plugin_manager.execute_startup_script_from_id(&plugin_id).await;
    match result {
        Ok(result) => Ok(result.into()),
        Err(err) => Err(err.to_string().into()),
    }
}

#[tauri::command]
async fn execute_function_script(plugin_id: &str, script_path: &str) -> Result<String, String> {
    let plugin_manager = PLUGIN_MANAGER.lock().await;
    let result = plugin_manager.execute_function_script_from_id(&plugin_id, &script_path).await;
    match result {
        Ok(result) => Ok(result.into()),
        Err(err) => Err(err.to_string().into()),
    }
}
