// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod plugin_manager;
use plugin_manager::PluginManager;
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
            execute_function_script,
            open_compact_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn open_compact_window(app: tauri::AppHandle) {
    
    let file_path = "./compact-index.html";
    
    let _settings_window = tauri::WindowBuilder::new(
        &app,
        "compact", /* the unique window label */
        tauri::WindowUrl::App(file_path.into()),
    );

    let screen = self.current_monitor()?.unwrap();
    let screen_position = screen.position();
    let screen_size = PhysicalSize::<i32> {
        width: screen.size().width as i32,
        height: screen.size().height as i32,
    };

    .position(screen_position.x + (screen_size.width - 500), screen_position.y);
    .inner_size(500, 300);
    .title("compact-window");
    .build();
    .unwrap();

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
async fn execute_function_script(plugin_id: &str, script_path: &str, args: Vec<&str>) -> Result<String, String> {
    let plugin_manager = PLUGIN_MANAGER.lock().await;
    let result = plugin_manager.execute_function_script_from_id(&plugin_id, &script_path, Some(&args)).await;
    match result {
        Ok(result) => Ok(result.into()),
        Err(err) => Err(err.to_string().into()),
    }
}
