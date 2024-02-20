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
    Ok("Plugins imported.".to_string())
}

#[tauri::command]
async fn execute_startup_script(plugin_id: String) -> Result<String, String> {
    let plugin_manager = PLUGIN_MANAGER.lock().await;
    let result = plugin_manager.execute_startup_script_from_id(&plugin_id).await;
    match result {
        Ok(result) => Ok(result.into()),
        Err(err) => Err(err.to_string().into()),
    }
}

#[tauri::command]
async fn execute_function_script(app_handle: tauri::AppHandle, plugin_id: String, function: String, args: String) -> Result<String, String> {
    // let plugin_manager = PLUGIN_MANAGER.lock().unwrap();
    // let plugin = plugin_manager.get_plugin_by_name(&plugin).unwrap();
    // let result = plugin_manager.execute_function_script(&plugin, &function, &args);
    // match result {
    //     Ok(result) => Ok(result),
    //     Err(err) => Err(err.to_string()),
    // }
    Ok("".to_string())
}
