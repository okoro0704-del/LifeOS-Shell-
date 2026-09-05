use tauri::{
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  Manager, WebviewWindow,
};

fn set_workspace_mode(window: &WebviewWindow, mode: &str) {
  // Persist workspace for WorkspaceContext, then soft-reload the SPA shell.
  let script = format!(
    r#"
      try {{
        localStorage.setItem('lifeos_active_workspace', '{mode}');
        document.cookie = 'lifeos_active_workspace={mode}; path=/; max-age=31536000; SameSite=Lax';
        window.dispatchEvent(new CustomEvent('lifeos:workspace-change', {{ detail: {{ mode: '{mode}' }} }}));
      }} catch (e) {{}}
      location.reload();
    "#,
    mode = mode
  );
  let _ = window.eval(&script);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      let personal = MenuItem::with_id(
        app,
        "workspace_personal",
        "Switch to Personal Space",
        true,
        None::<&str>,
      )?;
      let business = MenuItem::with_id(
        app,
        "workspace_business",
        "Switch to Business Space",
        true,
        None::<&str>,
      )?;
      let quit = MenuItem::with_id(app, "quit", "Quit LifeOS", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&personal, &business, &quit])?;

      let _tray = TrayIconBuilder::with_id("lifeos-tray")
        .menu(&menu)
        .tooltip("LifeOS — Unified Workspace")
        .icon(app.default_window_icon().expect("missing window icon").clone())
        .on_menu_event(|app, event| match event.id.as_ref() {
          "workspace_personal" => {
            if let Some(window) = app.get_webview_window("main") {
              set_workspace_mode(&window, "PERSONAL");
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "workspace_business" => {
            if let Some(window) = app.get_webview_window("main") {
              set_workspace_mode(&window, "BUSINESS");
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        })
        .build(app)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running LifeOS desktop");
}
