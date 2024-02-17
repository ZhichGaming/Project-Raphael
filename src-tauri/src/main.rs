// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![check_for_python3, execute_python_script, execute_shell_script])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Oh by the way, I don't know how to write in Rust. Gonna hope this doesn't break anything haha...
#[tauri::command]
fn check_for_python3() -> bool {
    let output = std::process::Command::new("python3")
        .arg("--version")
        .output()
        .expect("failed to execute process");

    let output = String::from_utf8_lossy(&output.stdout);
    let output = output.trim();    

    output.starts_with("Python 3").into()
}

#[tauri::command]
fn execute_python_script(script: String) -> String {
    let output = std::process::Command::new("python3")
        .args(["-c", &script])
        .output()
        .expect("failed to execute process");

    let output = String::from_utf8_lossy(&output.stdout);
    output.to_string().into()
}

#[tauri::command]
async fn execute_shell_script(script: String) -> String {
    let output = std::process::Command::new("sh")
        .args(["-c", &script])
        .output()
        .expect("failed to execute process");

    let output = String::from_utf8_lossy(&output.stdout);
    let output = output.to_string();

    output.into()
}
