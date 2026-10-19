/// Comando richiamabile dal frontend con
/// `invoke('conta_esauriti', { scorte: [3, 0, 7] })`.
/// Conta gli articoli con scorta a zero: e' l'esempio minimo di codice Rust
/// che il frontend puo' chiamare attraverso il canale IPC di Tauri.
#[tauri::command]
fn conta_esauriti(scorte: Vec<i64>) -> usize {
    scorte.iter().filter(|scorta| **scorta <= 0).count()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![conta_esauriti])
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
