#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager, GlobalShortcutManager, AppHandle, Menu, MenuItem, Submenu, Window};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct LARSConfig {
    #[serde(default, rename = "apiKey")]
    api_key: String,
    #[serde(default, rename = "openaiKey")]
    openai_key: String,
    #[serde(default, rename = "anthropicKey")]
    anthropic_key: String,
    #[serde(default, rename = "moonshotKey")]
    moonshot_key: String,
    #[serde(default, rename = "modelType")]
    model_type: String,
    #[serde(default, rename = "useLocalModel")]
    use_local_model: bool,
    #[serde(default, rename = "ollamaEndpoint")]
    ollama_endpoint: String,
    #[serde(default, rename = "securityLevel")]
    security_level: String,
    #[serde(default, rename = "userName")]
    user_name: String,
    #[serde(default, rename = "userEmail")]
    user_email: String,
    #[serde(default, rename = "phoneNumber")]
    phone_number: String,
    #[serde(default, rename = "avatarUrl")]
    avatar_url: String,
    #[serde(default, rename = "enableTokenOptimization")]
    enable_token_optimization: bool,
    #[serde(default, rename = "enableMemory")]
    enable_memory: bool,
    #[serde(default, rename = "enableNotifications")]
    enable_notifications: bool,
    #[serde(default, rename = "theme")]
    theme: String,
    #[serde(default, rename = "language")]
    language: String,
    #[serde(default, rename = "encryptionEnabled")]
    encryption_enabled: bool,
    #[serde(default, rename = "enableOmniControl")]
    enable_omni_control: bool,
    #[serde(default, rename = "temperature")]
    temperature: f64,
    #[serde(default, rename = "autoApplyPatches")]
    auto_apply_patches: bool,
    #[serde(default, rename = "piiScrubbingLevel")]
    pii_scrubbing_level: String,
    #[serde(default, rename = "terminalShell")]
    terminal_shell: String,
}

impl Default for LARSConfig {
    fn default() -> Self {
        LARSConfig {
            api_key: "".into(), openai_key: "".into(), anthropic_key: "".into(), moonshot_key: "".into(),
            model_type: "LARS-Native".into(), use_local_model: false,
            ollama_endpoint: "http://localhost:11434".into(), security_level: "Standard".into(),
            user_name: "Jongsoo".into(), user_email: "jongsoo@example.com".into(), 
            phone_number: "+821096849284".into(), avatar_url: "".into(),
            enable_token_optimization: true, enable_memory: true, enable_notifications: true,
            theme: "dark".into(), language: "ko".into(), encryption_enabled: false,
            enable_omni_control: true, temperature: 0.7, auto_apply_patches: false,
            pii_scrubbing_level: "Standard".into(), terminal_shell: "zsh".into(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ChatHistoryItem {
    id: String,
    title: String,
    date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    input: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    response: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct FileNode {
    name: String, path: String, is_dir: bool, children: Option<Vec<FileNode>>,
}

#[derive(Serialize, Deserialize, Debug)]
struct SecurityInfo {
    total_events: usize, last_audit: String, threat_level: String, logs: Vec<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
struct AuthProviderStatus {
    provider: String, env_var: String, detected: bool, source: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Project {
    id: String, name: String, path: String, description: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Skill {
    id: String, name: String, capability: String, status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Connector {
    id: String, name: String, service_type: String, status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct AppItem {
    id: String, name: String, desc: String, category: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct InstalledApp {
    id: String, name: String, desc: String, category: String, version: String, installed_at: String, enabled: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Agent {
    id: String, name: String, category: String, status: String, description: String, path: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct OAuthService {
    id: String, service: String, status: String, created_at: Option<String>, scopes: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct GeneratedImage {
    id: String, prompt: String, model: String, image_url: String, status: String,
    created_at: String, quality: Option<String>, style: Option<String>, size: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct NPUInfo {
    chip_name: String,
    ane_cores: i32,
    ane_tops: f64,
    cpu_cores: i32,
    memory_gb: i32,
    is_apple_silicon: bool,
    mlx_available: bool,
    coremltools_available: bool,
    mps_available: bool,
    recommended_backend: String,
    available_backends: Vec<String>,
}

// --- Helper Functions ---

fn get_config_dir(app_handle: &AppHandle) -> PathBuf {
    let path = app_handle.path_resolver().app_config_dir().unwrap_or_else(|| PathBuf::from("."));
    if !path.exists() { fs::create_dir_all(&path).unwrap_or(()); }
    path
}

fn get_ecosystem_path(file_name: &str) -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    let path = std::path::PathBuf::from(home).join(".lars").join("ecosystem");
    if !path.exists() { let _ = fs::create_dir_all(&path); }
    path.join(file_name)
}

// --- Tauri Commands ---

#[tauri::command]
async fn execute_lars_command(app_handle: AppHandle, window: Window, command: String, engine: String) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::io::{BufRead, BufReader};

    let config = load_config(app_handle.clone()).await.unwrap_or_default();

    // Python 스크립트 경로 (프로젝트 루트 기준)
    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    // 스트리밍 방식으로 실행 - Python 직접 호출
    let mut child = Command::new("python3")
        .arg(&python_script)
        .arg("query")
        .arg(&command)
        .arg("--engine")
        .arg(&engine)
        .env("LARS_AI_KEY", &config.api_key)
        .env("OPENAI_API_KEY", &config.openai_key)
        .env("ANTHROPIC_API_KEY", &config.anthropic_key)
        .env("MOONSHOT_API_KEY", &config.moonshot_key)
        .env("LARS_OMNI", if config.enable_omni_control { "true" } else { "false" })
        .env("LARS_TEMP", config.temperature.to_string())
        .env("LARS_PII_LEVEL", config.pii_scrubbing_level)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("LARS 실행 실패: {}", e))?;

    let stdout = child.stdout.take().ok_or("stdout 캡처 실패")?;
    let mut stderr = child.stderr.take().ok_or("stderr 캡처 실패")?;
    let reader = BufReader::new(stdout);
    let mut full_response = String::new();
    let mut stderr_output = String::new();

    for line in reader.lines() {
        match line {
            Ok(l) => {
                eprintln!("[STDOUT_LINE] {}", l);
                // 토큰 메타데이터 파싱
                if l.starts_with("[TOKEN_UPDATE:") {
                    if let Some(data) = l.strip_prefix("[TOKEN_UPDATE:").and_then(|s| s.strip_suffix("]")) {
                        let parts: Vec<&str> = data.split(',').collect();
                        if parts.len() >= 2 {
                            if let (Ok(input), Ok(output)) = (
                                parts[0].strip_prefix("input=").unwrap_or("0").parse::<i32>(),
                                parts[1].strip_prefix("output=").unwrap_or("0").parse::<i32>()
                            ) {
                                if let Err(e) = window.emit("token-update", (input, output)) {
                                    eprintln!("[EMIT_ERROR] token-update: {}", e);
                                }
                            }
                        }
                    }
                } else if l.starts_with("[TOKENS_FINAL:") {
                    if let Some(data) = l.strip_prefix("[TOKENS_FINAL:").and_then(|s| s.strip_suffix("]")) {
                        let parts: Vec<&str> = data.split(',').collect();
                        if parts.len() >= 3 {
                            if let (Ok(input), Ok(output), Ok(total)) = (
                                parts[0].strip_prefix("input=").unwrap_or("0").parse::<i32>(),
                                parts[1].strip_prefix("output=").unwrap_or("0").parse::<i32>(),
                                parts[2].strip_prefix("total=").unwrap_or("0").parse::<i32>()
                            ) {
                                if let Err(e) = window.emit("tokens-final", (input, output, total)) {
                                    eprintln!("[EMIT_ERROR] tokens-final: {}", e);
                                }
                            }
                        }
                    }
                } else if !l.is_empty() {
                    full_response.push_str(&l);
                    full_response.push('\n');
                    if let Err(e) = window.emit("streaming-content", &l) {
                        eprintln!("[EMIT_ERROR] streaming-content: {}", e);
                    }
                }
            }
            Err(e) => return Err(format!("라인 읽기 실패: {}", e))
        }
    }

    use std::io::Read;
    stderr.read_to_string(&mut stderr_output).ok();
    if !stderr_output.is_empty() {
        eprintln!("[STDERR] {}", stderr_output);
    }

    let exit_status = child.wait().map_err(|e| format!("프로세스 대기 실패: {}", e))?;
    if exit_status.success() {
        Ok(full_response.trim().to_string())
    } else {
        let error_msg = if !stderr_output.is_empty() {
            format!("AI 엔진 오류: {}", stderr_output.trim())
        } else {
            format!("AI 엔진 오류 (코드: {:?})", exit_status.code())
        };
        Err(error_msg)
    }
}

#[tauri::command]
async fn execute_claude_stream(app_handle: AppHandle, query: String, model: String) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::io::Read;
    use std::path::Path;
    let config = load_config(app_handle).await.unwrap_or_default();
    let paths_to_check = ["../lars.sh", "./lars.sh", "../../lars.sh"];
    let mut found_path = None;
    for p in paths_to_check { if Path::new(p).exists() { found_path = Some(Path::new(p).to_path_buf()); break; } }
    let script_path = match found_path {
        Some(p) => std::fs::canonicalize(p).map_err(|e| format!("경로 정규화 실패: {}", e))?,
        None => return Err("LARS 실행 스크립트(lars.sh)를 찾을 수 없습니다.".into())
    };

    // Claude 스트리밍 쿼리 실행
    let mut child = Command::new("sh")
        .current_dir("..")
        .arg(&script_path)
        .arg("stream")
        .arg(&query)
        .arg("--engine")
        .arg(&model)
        .env("ANTHROPIC_API_KEY", &config.anthropic_key)
        .env("LARS_TEMP", config.temperature.to_string())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Claude 스트리밍 시작 실패: {}", e))?;

    let mut stdout = child.stdout.take().ok_or("stdout 캡처 실패")?;
    let mut result = String::new();
    stdout.read_to_string(&mut result).map_err(|e| format!("스트리밍 읽기 실패: {}", e))?;

    child.wait().map_err(|e| format!("프로세스 대기 실패: {}", e))?;
    Ok(result)
}

#[tauri::command]
async fn execute_chat_command(app_handle: AppHandle, window: Window, prompt: String, engine: String) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::io::BufRead;

    let config = load_config(app_handle.clone()).await.unwrap_or_default();
    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    let mut child = Command::new("python3")
        .arg(&python_script)
        .arg("chat")
        .arg(&prompt)
        .arg("--engine")
        .arg(&engine)
        .env("LARS_AI_KEY", &config.api_key)
        .env("OPENAI_API_KEY", &config.openai_key)
        .env("ANTHROPIC_API_KEY", &config.anthropic_key)
        .env("MOONSHOT_API_KEY", &config.moonshot_key)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Chat 실행 실패: {}", e))?;

    let stdout = child.stdout.take().ok_or("stdout 캡처 실패")?;
    let mut stderr = child.stderr.take().ok_or("stderr 캡처 실패")?;
    let reader = std::io::BufReader::new(stdout);
    let mut full_response = String::new();
    let mut stderr_output = String::new();

    for line in reader.lines() {
        match line {
            Ok(l) => {
                if !l.is_empty() {
                    full_response.push_str(&l);
                    full_response.push('\n');
                    if let Err(e) = window.emit("chat-streaming", &l) {
                        eprintln!("[EMIT_ERROR] chat-streaming: {}", e);
                    }
                }
            }
            Err(e) => return Err(format!("라인 읽기 실패: {}", e))
        }
    }

    use std::io::Read;
    stderr.read_to_string(&mut stderr_output).ok();
    let exit_status = child.wait().map_err(|e| format!("프로세스 대기 실패: {}", e))?;

    if exit_status.success() {
        Ok(full_response.trim().to_string())
    } else {
        Err(format!("Chat 오류: {}", stderr_output.trim()))
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn execute_dev_command(app_handle: AppHandle, window: Window, prompt: String, engine: String, autoApprove: bool, projectPath: String) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::io::Read;
    use std::thread;
    use std::sync::{Arc, Mutex};

    let config = load_config(app_handle.clone()).await.unwrap_or_default();
    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    let mut args = vec!["dev".to_string(), prompt, "--engine".to_string(), engine.clone()];
    if autoApprove {
        args.push("--auto-approve".to_string());
    }
    if !projectPath.is_empty() {
        args.push("--output-dir".to_string());
        args.push(projectPath.clone());
    }

    eprintln!("[DEV_COMMAND] 시작: engine={}, auto_approve={}", engine, autoApprove);

    let mut cmd = Command::new("python3");
    cmd.arg(&python_script)
        .args(&args)
        .env("LARS_AI_KEY", &config.api_key)
        .env("OPENAI_API_KEY", &config.openai_key)
        .env("ANTHROPIC_API_KEY", &config.anthropic_key)
        .env("MOONSHOT_API_KEY", &config.moonshot_key)
        .env("PYTHONUNBUFFERED", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if !projectPath.is_empty() {
        if let Ok(p) = std::fs::canonicalize(&projectPath) {
            cmd.current_dir(p);
        }
    }

    let mut child = cmd.spawn().map_err(|e| format!("Dev 실행 실패: {}", e))?;

    let stdout = child.stdout.take().ok_or("stdout 캡처 실패")?;
    let stderr = child.stderr.take().ok_or("stderr 캡처 실패")?;

    let mut full_response = String::new();
    let mut all_output = String::new();

    // 두 스트림을 동시에 처리하여 데드락 방지
    let stdout_output = Arc::new(Mutex::new(String::new()));
    let stderr_output = Arc::new(Mutex::new(String::new()));

    let stdout_clone = stdout_output.clone();
    let window_clone = window.clone();
    let stdout_handle = thread::spawn(move || {
        let mut buf = [0; 4096];
        let mut stdout_reader = stdout;
        loop {
            match stdout_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]);
                    for line in chunk.lines() {
                        if !line.is_empty() {
                            let _ = window_clone.emit("dev-streaming", line);
                        }
                    }
                    stdout_clone.lock().unwrap().push_str(&chunk);
                }
                Err(_) => break,
            }
        }
    });

    let stderr_clone = stderr_output.clone();
    let stderr_handle = thread::spawn(move || {
        let mut buf = [0; 4096];
        let mut stderr_reader = stderr;
        loop {
            match stderr_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]);
                    stderr_clone.lock().unwrap().push_str(&chunk);
                }
                Err(_) => break,
            }
        }
    });

    let exit_status = child.wait().map_err(|e| format!("프로세스 대기 실패: {}", e))?;

    // 스레드가 완료될 때까지 대기
    let _ = stdout_handle.join();
    let _ = stderr_handle.join();

    let stdout_str = stdout_output.lock().unwrap().clone();
    let stderr_str = stderr_output.lock().unwrap().clone();
    all_output = format!("{}{}", stdout_str, stderr_str);

    eprintln!("[DEV_COMMAND] 종료: success={}", exit_status.success());

    if exit_status.success() {
        Ok(stdout_str.trim().to_string())
    } else {
        Err(format!("Dev 오류\n\n{}", all_output))
    }
}

#[tauri::command]
async fn perform_code_review(app_handle: AppHandle, filepath: String, notes: String) -> Result<serde_json::Value, String> {
    use std::process::Command;

    let config = load_config(app_handle).await.unwrap_or_default();
    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    let output = Command::new("python3")
        .arg("-c")
        .arg(&format!(r#"
import sys
sys.path.insert(0, '.')
from src.cli.main import perform_code_review as pcr
result = pcr('{}', '{}')
print(result)
"#, filepath.replace("'", "\\'"), notes.replace("'", "\\'")))
        .output()
        .map_err(|e| format!("코드 리뷰 실패: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if output.status.success() {
        Ok(serde_json::json!({
            "status": "completed",
            "filepath": filepath,
            "result": stdout.trim()
        }))
    } else {
        Err(format!("코드 리뷰 오류: {}", stdout))
    }
}

#[tauri::command]
async fn generate_and_run_tests(app_handle: AppHandle, tests: Vec<String>) -> Result<serde_json::Value, String> {
    use std::process::Command;

    let tests_json = serde_json::to_string(&tests).unwrap_or_default();
    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    let output = Command::new("python3")
        .arg("-c")
        .arg(&format!(r#"
import sys, json
sys.path.insert(0, '.')
from src.cli.main import generate_and_run_tests as grt
tests = json.loads('{}')
result = grt(tests)
print(json.dumps(result))
"#, tests_json.replace("'", "\\'")))
        .output()
        .map_err(|e| format!("테스트 실행 실패: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if output.status.success() {
        serde_json::from_str(&stdout).or_else(|_| {
            Ok(serde_json::json!({
                "status": "completed",
                "message": stdout.trim()
            }))
        })
    } else {
        Err(format!("테스트 실행 오류: {}", stdout))
    }
}

#[tauri::command]
async fn perform_security_scan(app_handle: AppHandle, filepath: String) -> Result<serde_json::Value, String> {
    use std::process::Command;

    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    let output = Command::new("python3")
        .arg("-c")
        .arg(&format!(r#"
import sys
sys.path.insert(0, '.')
from src.cli.main import perform_security_scan as pss
result = pss('{}')
print(result)
"#, filepath.replace("'", "\\'")))
        .output()
        .map_err(|e| format!("보안 스캔 실패: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if output.status.success() {
        Ok(serde_json::json!({
            "status": "completed",
            "filepath": filepath,
            "vulnerabilities": stdout.trim()
        }))
    } else {
        Err(format!("보안 스캔 오류: {}", stdout))
    }
}

#[tauri::command]
async fn generate_documentation(app_handle: AppHandle, docs: Vec<serde_json::Value>) -> Result<serde_json::Value, String> {
    use std::process::Command;

    let docs_json = serde_json::to_string(&docs).unwrap_or_default();
    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    let output = Command::new("python3")
        .arg("-c")
        .arg(&format!(r#"
import sys, json
sys.path.insert(0, '.')
from src.cli.main import generate_documentation as gd
docs = json.loads('{}')
result = gd(docs)
print(json.dumps(result))
"#, docs_json.replace("'", "\\'")))
        .output()
        .map_err(|e| format!("문서화 생성 실패: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if output.status.success() {
        serde_json::from_str(&stdout).or_else(|_| {
            Ok(serde_json::json!({
                "status": "completed",
                "message": stdout.trim()
            }))
        })
    } else {
        Err(format!("문서화 생성 오류: {}", stdout))
    }
}

#[tauri::command]
async fn execute_orchestration(app_handle: AppHandle, orchestration: serde_json::Value) -> Result<serde_json::Value, String> {
    use std::process::Command;

    let orch_json = serde_json::to_string(&orchestration).unwrap_or_default();
    let python_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or("프로젝트 루트 찾기 실패")?
        .join("src/cli/main.py");

    let output = Command::new("python3")
        .arg("-c")
        .arg(&format!(r#"
import sys, json
sys.path.insert(0, '.')
from src.cli.main import execute_orchestrated_workflow as eow
orch = json.loads('{}')
result = eow(orch)
print(json.dumps(result))
"#, orch_json.replace("'", "\\'")))
        .output()
        .map_err(|e| format!("다중 에이전트 조율 실패: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if output.status.success() {
        serde_json::from_str(&stdout).or_else(|_| {
            Ok(serde_json::json!({
                "status": "completed",
                "message": stdout.trim()
            }))
        })
    } else {
        Err(format!("다중 에이전트 조율 오류: {}", stdout))
    }
}

#[tauri::command]
async fn amazon_q_query(question: String) -> Result<String, String> {
    use std::process::Command;
    use std::path::PathBuf;

    // LARS 플랫폼 디렉토리 찾기
    let home = std::env::var("HOME").unwrap_or_default();
    let platform_dir = PathBuf::from(&format!("{}/Documents/LARS/Prism/lars-platform", home));

    if !platform_dir.exists() {
        return Err("LARS 플랫폼 디렉토리를 찾을 수 없습니다.".into());
    }

    // venv의 Python 경로
    let venv_python = platform_dir.join("venv/bin/python3");
    let python_cmd = if venv_python.exists() {
        venv_python.to_str().unwrap_or("python3").to_string()
    } else {
        "python3".to_string()
    };

    // Python 스크립트로 직접 실행
    let python_code = r#"
import asyncio
import sys
import os

sys.path.insert(0, '.')
os.chdir(sys.argv[1])

from src.core.platform_aws_mapping import RekoraPrecision

async def main(question):
    rekora = RekoraPrecision()
    response = await rekora.ask_field_q(question)
    print(response, end='')

if __name__ == '__main__':
    question = sys.argv[2] if len(sys.argv) > 2 else ''
    asyncio.run(main(question))
"#;

    let output = Command::new(&python_cmd)
        .arg("-c")
        .arg(python_code)
        .arg(platform_dir.to_str().unwrap_or("."))
        .arg(&question)
        .output()
        .map_err(|e| format!("Amazon Q 쿼리 실패: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(stdout.trim().to_string())
    } else {
        // 에러가 있어도 stdout이 있으면 반환 (모의 응답일 수 있음)
        if !stdout.is_empty() {
            Ok(stdout.trim().to_string())
        } else {
            // stderr에 실제 오류 메시지 포함
            Err(format!("Amazon Q 오류: {}",
                if stderr.contains("ModuleNotFoundError") {
                    "필수 모듈을 찾을 수 없습니다. venv가 올바르게 설정되었는지 확인하세요."
                } else if stderr.is_empty() {
                    "알 수 없는 오류"
                } else {
                    &stderr
                }
            ))
        }
    }
}

#[tauri::command]
async fn apply_patch(response_text: String) -> Result<Vec<String>, String> {
    use std::process::Command;
    use std::path::Path;
    let paths_to_check = ["../lars.sh", "./lars.sh", "../../lars.sh"];
    let mut found_path = None;
    for p in paths_to_check { if Path::new(p).exists() { found_path = Some(Path::new(p).to_path_buf()); break; } }
    let script_path = match found_path {
        Some(p) => std::fs::canonicalize(p).map_err(|e| format!("경로 정규화 실패: {}", e))?,
        None => return Err("LARS 실행 스크립트(lars.sh)를 찾을 수 없습니다.".into())
    };
    let output = Command::new("sh")
        .current_dir("..")
        .arg(script_path)
        .arg("patch")
        .arg(&response_text)
        .env("LARS_AUTO_CREATE", "true") 
        .output();
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() { Ok(stdout.lines().map(|s| s.to_string()).collect()) }
            else { Err(format!("패치 적용 실패:\n{}\n{}", stdout, stderr)) }
        }
        Err(e) => Err(format!("LARS 패치 실행 오류: {}", e))
    }
}

#[tauri::command]
async fn get_projects() -> Result<Vec<Project>, String> {
    let path = get_ecosystem_path("projects.json");
    if !path.exists() {
        return Ok(vec![
            Project { id: "p1".into(), name: "LARS Platform".into(), path: "/Users/larsinc./Documents/LARS/Prism".into(), description: "AI Reasoning Infrastructure".into() },
            Project { id: "p2".into(), name: "Rekora Engine".into(), path: "/Users/larsinc./Documents/LARS/Rekora".into(), description: "3D Visualizer Core".into() }
        ]);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_project(name: String, path: String, description: String) -> Result<Project, String> {
    let file_path = get_ecosystem_path("projects.json");
    let mut items: Vec<Project> = if file_path.exists() {
        let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        if content.trim().is_empty() { vec![] } else { serde_json::from_str(&content).unwrap_or_else(|_| vec![]) }
    } else { vec![] };
    let new_item = Project { id: format!("proj_{}", items.len() + 1), name, path, description };
    items.push(new_item.clone());
    fs::write(file_path, serde_json::to_string_pretty(&items).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(new_item)
}

#[tauri::command]
async fn get_skills() -> Result<Vec<Skill>, String> {
    let path = get_ecosystem_path("skills.json");
    if !path.exists() {
        return Ok(vec![
            Skill { id: "s1".into(), name: "Surgical Patching".into(), capability: "SEARCH/REPLACE file editing".into(), status: "active".into() },
            Skill { id: "s2".into(), name: "Self-Healing".into(), capability: "Automated error diagnostics".into(), status: "active".into() }
        ]);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_skill(name: String, capability: String) -> Result<Skill, String> {
    let file_path = get_ecosystem_path("skills.json");
    let mut items: Vec<Skill> = if file_path.exists() {
        let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        if content.trim().is_empty() { vec![] } else { serde_json::from_str(&content).unwrap_or_else(|_| vec![]) }
    } else { vec![] };
    let new_item = Skill { id: format!("skill_{}", items.len() + 1), name, capability, status: "active".into() };
    items.push(new_item.clone());
    fs::write(file_path, serde_json::to_string_pretty(&items).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(new_item)
}

#[tauri::command]
async fn get_connectors() -> Result<Vec<Connector>, String> {
    let path = get_ecosystem_path("connectors.json");
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_connector(name: String, service_type: String) -> Result<Connector, String> {
    let file_path = get_ecosystem_path("connectors.json");
    let mut items: Vec<Connector> = if file_path.exists() {
        let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        if content.trim().is_empty() { vec![] } else { serde_json::from_str(&content).unwrap_or_else(|_| vec![]) }
    } else { vec![] };
    let new_item = Connector { id: format!("conn_{}", items.len() + 1), name, service_type, status: "connected".into() };
    items.push(new_item.clone());
    fs::write(file_path, serde_json::to_string_pretty(&items).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(new_item)
}

#[tauri::command]
async fn get_available_apps() -> Result<Vec<AppItem>, String> {
    Ok(vec![
        AppItem { id: "app_zapier".into(), name: "Zapier Connect".into(), desc: "9,000+ 앱과 LARS를 연결하는 범용 자동화".into(), category: "Workflow".into() },
        AppItem { id: "app_make".into(), name: "Make (Integromat)".into(), desc: "시각적 플로우 설계를 통한 고급 자동화 브릿지".into(), category: "Workflow".into() },
        AppItem { id: "app_n8n".into(), name: "n8n Orchestrator".into(), desc: "오픈소스 기반의 자율 에이전트 워크플로우 제어".into(), category: "Workflow".into() },
        AppItem { id: "app_langgraph".into(), name: "LangGraph Engine".into(), desc: "상태 기반 멀티 에이전트 오케스트레이션".into(), category: "Agentic".into() },
        AppItem { id: "app_crewai".into(), name: "CrewAI Manager".into(), desc: "역할 기반 협업 에이전트 조직 및 관리".into(), category: "Agentic".into() },
        AppItem { id: "app_dify".into(), name: "Dify LLMOps".into(), desc: "기업용 LLM 앱 개발 및 API 관리 플랫폼".into(), category: "Agentic".into() },
        AppItem { id: "app_uipath".into(), name: "UiPath RPA Bridge".into(), desc: "데스크톱 및 웹 화면 조작 자동화 연동".into(), category: "RPA".into() },
        AppItem { id: "app_airtable".into(), name: "Airtable DB".into(), desc: "지능형 데이터베이스 연동 및 상태 저장".into(), category: "Data".into() },
        AppItem { id: "app_notion".into(), name: "Notion AI Sync".into(), desc: "문서 관리 및 지식 베이스 자동 동기화".into(), category: "Document".into() },
        AppItem { id: "app_retool".into(), name: "Retool Admin".into(), desc: "사내 관리 시스템 및 대시보드 즉시 구축".into(), category: "System".into() }
    ])
}

#[tauri::command]
async fn install_app(app_id: String, _config: serde_json::Value) -> Result<InstalledApp, String> {
    let apps = get_available_apps().await?;
    let app = apps.iter().find(|a| a.id == app_id).ok_or("앱을 찾을 수 없습니다.")?;

    let path = get_ecosystem_path("installed_apps.json");
    let mut installed: Vec<InstalledApp> = if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_else(|_| "[]".into());
        serde_json::from_str(&content).unwrap_or_else(|_| vec![])
    } else { vec![] };

    if installed.iter().any(|a| a.id == app_id) {
        return Err("이미 설치된 앱입니다.".into());
    }

    let now = format!("2024-01-{:02}T12:00:00", (std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() % 28) + 1);
    let new_app = InstalledApp {
        id: app_id.clone(),
        name: app.name.clone(),
        desc: app.desc.clone(),
        category: app.category.clone(),
        version: "1.0.0".into(),
        installed_at: now,
        enabled: true
    };

    installed.push(new_app.clone());
    fs::write(path, serde_json::to_string_pretty(&installed).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;

    Ok(new_app)
}

#[tauri::command]
async fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let path = get_ecosystem_path("installed_apps.json");
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_app(app_id: String) -> Result<(), String> {
    let path = get_ecosystem_path("installed_apps.json");
    if !path.exists() { return Err("앱이 설치되지 않았습니다.".into()); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut apps: Vec<InstalledApp> = serde_json::from_str(&content).unwrap_or_else(|_| vec![]);
    apps.retain(|a| a.id != app_id);
    fs::write(path, serde_json::to_string_pretty(&apps).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn enable_app(app_id: String) -> Result<(), String> {
    let path = get_ecosystem_path("installed_apps.json");
    if !path.exists() { return Err("앱이 설치되지 않았습니다.".into()); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut apps: Vec<InstalledApp> = serde_json::from_str(&content).unwrap_or_else(|_| vec![]);
    if let Some(app) = apps.iter_mut().find(|a| a.id == app_id) {
        app.enabled = true;
    }
    fs::write(path, serde_json::to_string_pretty(&apps).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn discover_agents() -> Result<Vec<Agent>, String> {
    use std::process::Command;
    use std::env;

    let base_dir = env::current_dir()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let output = Command::new("python3.12")
        .arg("-c")
        .arg(r#"
import json, sys, os
sys.path.insert(0, os.getcwd())
try:
    from src.core.ecosystem import lars_ecosystem
    agents = lars_ecosystem.discover_agents()
    print(json.dumps(agents))
except Exception as e:
    print(json.dumps([]))
"#)
        .current_dir(&base_dir)
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if stdout.is_empty() {
                return Ok(vec![
                    Agent { id: "agent_claude".into(), name: "Claude Code".into(), category: "Development".into(), status: "available".into(), description: "AI Code Assistant for LARS Platform".into(), path: Some(".claude/agents/claude.md".into()) },
                    Agent { id: "agent_researcher".into(), name: "Researcher Agent".into(), category: "Research".into(), status: "available".into(), description: "Requirements and tech stack analysis".into(), path: Some(".claude/agents/researcher.md".into()) },
                    Agent { id: "agent_backend".into(), name: "Backend Agent".into(), category: "Development".into(), status: "available".into(), description: "API development and database schema".into(), path: Some(".claude/agents/backend.md".into()) },
                    Agent { id: "agent_frontend".into(), name: "Frontend Agent".into(), category: "Development".into(), status: "available".into(), description: "UI/UX development and design system".into(), path: Some(".claude/agents/frontend.md".into()) },
                    Agent { id: "agent_qa".into(), name: "QA Agent".into(), category: "Quality".into(), status: "available".into(), description: "Testing and quality assurance".into(), path: Some(".claude/agents/qa.md".into()) }
                ]);
            }
            match serde_json::from_str::<Vec<Agent>>(&stdout) {
                Ok(agents) if !agents.is_empty() => Ok(agents),
                _ => Ok(vec![
                    Agent { id: "agent_claude".into(), name: "Claude Code".into(), category: "Development".into(), status: "available".into(), description: "AI Code Assistant for LARS Platform".into(), path: Some(".claude/agents/claude.md".into()) },
                    Agent { id: "agent_researcher".into(), name: "Researcher Agent".into(), category: "Research".into(), status: "available".into(), description: "Requirements and tech stack analysis".into(), path: Some(".claude/agents/researcher.md".into()) },
                    Agent { id: "agent_backend".into(), name: "Backend Agent".into(), category: "Development".into(), status: "available".into(), description: "API development and database schema".into(), path: Some(".claude/agents/backend.md".into()) },
                    Agent { id: "agent_frontend".into(), name: "Frontend Agent".into(), category: "Development".into(), status: "available".into(), description: "UI/UX development and design system".into(), path: Some(".claude/agents/frontend.md".into()) },
                    Agent { id: "agent_qa".into(), name: "QA Agent".into(), category: "Quality".into(), status: "available".into(), description: "Testing and quality assurance".into(), path: Some(".claude/agents/qa.md".into()) }
                ])
            }
        }
        Err(_) => Ok(vec![
            Agent { id: "agent_claude".into(), name: "Claude Code".into(), category: "Development".into(), status: "available".into(), description: "AI Code Assistant for LARS Platform".into(), path: Some(".claude/agents/claude.md".into()) },
            Agent { id: "agent_researcher".into(), name: "Researcher Agent".into(), category: "Research".into(), status: "available".into(), description: "Requirements and tech stack analysis".into(), path: Some(".claude/agents/researcher.md".into()) },
            Agent { id: "agent_backend".into(), name: "Backend Agent".into(), category: "Development".into(), status: "available".into(), description: "API development and database schema".into(), path: Some(".claude/agents/backend.md".into()) },
            Agent { id: "agent_frontend".into(), name: "Frontend Agent".into(), category: "Development".into(), status: "available".into(), description: "UI/UX development and design system".into(), path: Some(".claude/agents/frontend.md".into()) },
            Agent { id: "agent_qa".into(), name: "QA Agent".into(), category: "Quality".into(), status: "available".into(), description: "Testing and quality assurance".into(), path: Some(".claude/agents/qa.md".into()) }
        ])
    }
}

#[tauri::command]
async fn install_agent(agent_id: String) -> Result<(), String> {
    use std::process::Command;
    use std::env;

    let base_dir = env::current_dir()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let output = Command::new("python3.12")
        .arg("-c")
        .arg(format!(r#"
import json, sys, os
sys.path.insert(0, os.getcwd())
from src.core.ecosystem import lars_ecosystem
result = lars_ecosystem.install_agent("{}")
print(json.dumps(result))
"#, agent_id))
        .current_dir(&base_dir)
        .output();

    match output {
        Ok(out) => {
            if out.status.success() { Ok(()) } else {
                let stderr = String::from_utf8_lossy(&out.stderr);
                Err(format!("에이전트 설치 실패: {}", stderr))
            }
        }
        Err(e) => Err(format!("에이전트 설치 오류: {}", e))
    }
}

#[tauri::command]
async fn enable_agent(agent_id: String) -> Result<(), String> {
    use std::process::Command;
    use std::env;

    let base_dir = env::current_dir()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let output = Command::new("python3.12")
        .arg("-c")
        .arg(format!(r#"
import json, sys, os
sys.path.insert(0, os.getcwd())
from src.core.ecosystem import lars_ecosystem
result = lars_ecosystem.enable_agent("{}")
print(json.dumps(result))
"#, agent_id))
        .current_dir(&base_dir)
        .output();

    match output {
        Ok(out) => {
            if out.status.success() { Ok(()) } else {
                let stderr = String::from_utf8_lossy(&out.stderr);
                Err(format!("에이전트 활성화 실패: {}", stderr))
            }
        }
        Err(e) => Err(format!("에이전트 활성화 오류: {}", e))
    }
}

#[tauri::command]
async fn get_oauth_services() -> Result<Vec<OAuthService>, String> {
    let path = get_ecosystem_path("oauth_credentials.json");
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let oauth_map: std::collections::HashMap<String, serde_json::Value> = serde_json::from_str(&content).unwrap_or_default();
    let services: Vec<OAuthService> = oauth_map.iter().map(|(service, data)| {
        OAuthService {
            id: format!("oauth_{}", service),
            service: service.clone(),
            status: "connected".into(),
            created_at: data.get("created_at").and_then(|v| v.as_str()).map(|s| s.to_string()),
            scopes: data.get("scopes").and_then(|v| v.as_array()).map(|arr| arr.iter().filter_map(|s| s.as_str().map(String::from)).collect())
        }
    }).collect();
    Ok(services)
}

#[tauri::command]
async fn setup_oauth(service: String, client_id: String, client_secret: String) -> Result<(), String> {
    use std::process::Command;
    use std::env;

    let base_dir = env::current_dir()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let output = Command::new("python3.12")
        .arg("-c")
        .arg(format!(r#"
import json, sys, os
sys.path.insert(0, os.getcwd())
from src.core.ecosystem import lars_ecosystem
result = lars_ecosystem.setup_oauth_connector("{}", "{}", "{}")
print(json.dumps(result))
"#, service, client_id, client_secret))
        .current_dir(&base_dir)
        .output();

    match output {
        Ok(out) => {
            if out.status.success() { Ok(()) } else {
                let stderr = String::from_utf8_lossy(&out.stderr);
                Err(format!("OAuth 설정 실패: {}", stderr))
            }
        }
        Err(e) => Err(format!("OAuth 설정 오류: {}", e))
    }
}

#[tauri::command]
async fn execute_terminal_command(command: String) -> Result<String, String> {
    use std::process::Command;
    let output = if cfg!(target_os = "windows") { Command::new("cmd").args(["/C", &command]).output() } 
    else { Command::new("sh").args(["-c", &command]).output() };
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() { Ok(stdout) } else { Err(format!("{}\n{}", stdout, stderr)) }
        }
        Err(e) => Err(format!("실행 오류: {}", e))
    }
}

#[tauri::command]
fn get_project_files(root_path: String) -> Result<Vec<FileNode>, String> {
    let base_path = if root_path == "./" { std::env::current_dir().map_err(|e| e.to_string())? } else { std::path::PathBuf::from(&root_path) };
    if !base_path.exists() { return Err("경로가 존재하지 않습니다.".into()); }
    let paths = fs::read_dir(&base_path).map_err(|e| e.to_string())?;
    let mut nodes = Vec::new();
    for entry in paths {
        if let Ok(entry) = entry {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == "venv" || name == "Library" { continue; }
            nodes.push(FileNode { name, path: path.to_string_lossy().into_owned(), is_dir: path.is_dir(), children: None });
        }
    }
    nodes.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(nodes)
}

#[tauri::command]
fn get_chat_history(app_handle: AppHandle) -> Result<Vec<ChatHistoryItem>, String> {
    let path = get_config_dir(&app_handle).join("lars_history.json");
    if let Ok(content) = fs::read_to_string(path) {
        let history: Vec<ChatHistoryItem> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(history)
    } else { Ok(Vec::new()) }
}

#[tauri::command]
fn save_chat(app_handle: AppHandle, item: ChatHistoryItem) -> Result<(), String> {
    let mut history = get_chat_history(app_handle.clone()).unwrap_or_default();
    if let Some(existing) = history.iter_mut().find(|c| c.id == item.id) {
        existing.title = item.title;
        existing.date = item.date;
        existing.input = item.input;
        existing.response = item.response;
    }
    else { history.insert(0, item); }
    let json = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    fs::write(get_config_dir(&app_handle).join("lars_history.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_chat_record(_app_handle: AppHandle, _id: String) -> Result<(), String> { Ok(()) }


#[tauri::command]
async fn run_security_scan(_app_handle: AppHandle) -> Result<String, String> {
    use std::process::{Command, Stdio};
    let home = std::env::var("HOME").unwrap_or_default();
    let platform_dir = format!("{}/Documents/LARS/Prism/lars-platform", home);
    let output = Command::new("python3.12")
        .args(["-m", "src.cli", "security", "scan", "--no-patch"])
        .current_dir(&platform_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() || !stdout.trim().is_empty() {
                Ok(stdout.trim().to_string())
            } else {
                Err(format!("스캔 실패: {}", stderr.lines().last().unwrap_or(&stderr)))
            }
        }
        Err(e) => Err(format!("스캔 실행 오류: {}", e)),
    }
}

#[tauri::command]
async fn load_security_report(_app_handle: AppHandle) -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let report_path = format!("{}/Documents/LARS/Prism/lars-platform/security_reports/latest_report.json", home);
    match std::fs::read_to_string(&report_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("리포트 파일 읽기 실패 ({}): {}", report_path, e))
    }
}

#[tauri::command]
async fn apply_security_patches(patch_types: Vec<String>) -> Result<String, String> {
    use std::process::{Command, Stdio};
    let home = std::env::var("HOME").unwrap_or_default();
    let platform_dir = format!("{}/Documents/LARS/Prism/lars-platform", home);

    // 1) 패치 실행
    let patch_script = format!("{}/scripts/auto_patch.py", platform_dir);
    let types_str = patch_types.join(",");
    let patch_out = Command::new("python3.12")
        .arg(&patch_script)
        .arg("--types").arg(&types_str)
        .current_dir(&platform_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("패치 오류: {}", e))?;

    let patch_json = String::from_utf8_lossy(&patch_out.stdout).trim().to_string();
    if !patch_out.status.success() && patch_json.is_empty() {
        let err = String::from_utf8_lossy(&patch_out.stderr).to_string();
        return Err(format!("패치 실패: {}", err));
    }

    // 2) 재스캔 — 완료될 때까지 동기 대기 (리포트 갱신 보장)
    let _ = Command::new("python3.12")
        .args(["-m", "src.cli", "security", "scan", "--no-patch"])
        .current_dir(&platform_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .output(); // .output() 는 프로세스 종료까지 블로킹

    Ok(patch_json)
}

#[tauri::command]
fn get_security_info() -> Result<SecurityInfo, String> {
    Ok(SecurityInfo { total_events: 0, last_audit: "".into(), threat_level: "LOW".into(), logs: vec![] })
}

#[tauri::command]
async fn save_config(app_handle: AppHandle, config: LARSConfig) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(get_config_dir(&app_handle).join("lars_config.json"), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_config(app_handle: AppHandle) -> Result<LARSConfig, String> {
    let path = get_config_dir(&app_handle).join("lars_config.json");
    if let Ok(content) = fs::read_to_string(path) {
        let config: LARSConfig = serde_json::from_str(&content).unwrap_or_else(|_| LARSConfig::default());
        Ok(config)
    } else { Ok(LARSConfig::default()) }
}

#[tauri::command]
async fn get_auth_status(_app_handle: AppHandle) -> Result<Vec<AuthProviderStatus>, String> { Ok(vec![]) }

#[tauri::command]
async fn upload_avatar(_app_handle: AppHandle) -> Result<String, String> { Ok("".into()) }

#[tauri::command]
async fn generate_image(prompt: String, model: String, quality: String, style: String, size: String) -> Result<serde_json::Value, String> {
    use std::process::Command;
    use std::env;

    let base_dir = env::current_dir()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let output = Command::new("python3.12")
        .arg("-c")
        .arg(format!(r#"
import json, sys, os
sys.path.insert(0, os.getcwd())
from src.core.image_generator import image_generator
result = image_generator.generate_image("{}", "{}", "{}", "{}", "{}")
print(json.dumps(result))
"#, prompt.replace("\"", "\\\""), model, quality, style, size))
        .current_dir(&base_dir)
        .output();

    match output {
        Ok(out) => {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if stdout.is_empty() {
                    return Err("이미지 생성 응답이 없습니다.".into());
                }
                serde_json::from_str(&stdout).map_err(|e| format!("이미지 파싱 오류: {}", e))
            } else {
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                Err(format!("이미지 생성 실패: {}", stderr))
            }
        }
        Err(e) => Err(format!("이미지 생성 오류: {}", e))
    }
}

#[tauri::command]
async fn get_image_history(limit: Option<i32>) -> Result<Vec<GeneratedImage>, String> {
    use std::process::Command;
    use std::env;

    let base_dir = env::current_dir()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let limit_val = limit.unwrap_or(50);

    let output = Command::new("python3.12")
        .arg("-c")
        .arg(format!(r#"
import json, sys, os
sys.path.insert(0, os.getcwd())
from src.core.image_generator import image_generator
history = image_generator.get_generation_history({})
print(json.dumps(history))
"#, limit_val))
        .current_dir(&base_dir)
        .output();

    match output {
        Ok(out) => {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if stdout.is_empty() {
                    return Ok(vec![]);
                }
                serde_json::from_str(&stdout).map_err(|e| format!("이미지 이력 파싱 오류: {}", e))
            } else {
                Ok(vec![])
            }
        }
        Err(_) => Ok(vec![])
    }
}

#[tauri::command]
async fn delete_image(image_id: String) -> Result<(), String> {
    use std::process::Command;
    use std::env;

    let base_dir = env::current_dir()
        .ok()
        .and_then(|p| p.parent().map(|x| x.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let output = Command::new("python3.12")
        .arg("-c")
        .arg(format!(r#"
import json, sys, os
sys.path.insert(0, os.getcwd())
from src.core.image_generator import image_generator
result = image_generator.delete_image("{}")
print(json.dumps(result))
"#, image_id))
        .current_dir(&base_dir)
        .output();

    match output {
        Ok(out) => {
            if out.status.success() { Ok(()) } else { Err("이미지 삭제 실패".into()) }
        }
        Err(e) => Err(format!("이미지 삭제 오류: {}", e))
    }
}

#[tauri::command]
async fn get_npu_info() -> Result<NPUInfo, String> {
    use std::process::Command;
    let python_code = r#"
import json
import sys
sys.path.insert(0, '.')
from src.core.npu_detector import npu_info
data = {
    'chip_name': npu_info.chip_name,
    'ane_cores': npu_info.ane_cores,
    'ane_tops': npu_info.ane_tops,
    'cpu_cores': npu_info.cpu_cores,
    'memory_gb': npu_info.memory_gb,
    'is_apple_silicon': npu_info.is_apple_silicon,
    'mlx_available': npu_info.mlx_available,
    'coremltools_available': npu_info.coremltools_available,
    'mps_available': npu_info.mps_available,
    'recommended_backend': npu_info.recommended_backend,
    'available_backends': npu_info.available_backends
}
print(json.dumps(data))
"#;
    let output = Command::new("python3.12")
        .arg("-c")
        .arg(python_code)
        .current_dir("..")
        .output();
    match output {
        Ok(out) => {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                serde_json::from_str(&stdout).map_err(|e| format!("NPU 정보 파싱 오류: {}", e))
            } else {
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                Err(format!("NPU 감지 실패: {}", stderr))
            }
        }
        Err(e) => Err(format!("NPU 감지 실행 오류: {}", e))
    }
}

#[tauri::command]
async fn open_file_dialog(_app_handle: AppHandle) -> Result<Option<String>, String> {
    use tauri::api::dialog::FileDialogBuilder;
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    FileDialogBuilder::new()
        .set_title("파일 선택")
        .pick_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string_lossy().to_string()));
        });

    rx.recv().map_err(|e| format!("채널 오류: {}", e))
}

fn get_lars_platform_dir() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    format!("{}/Documents/LARS/Prism/lars-platform", home)
}

fn run_cli_command(args: &[&str]) -> Result<String, String> {
    use std::process::Command;
    let output = Command::new("python3.12")
        .args(["-m", "src.cli"].iter().chain(args.iter()).copied())
        .current_dir(get_lars_platform_dir())
        .output()
        .map_err(|e| format!("실행 오류: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
async fn llm_generate(prompt: String, model: String, max_tokens: i32) -> Result<String, String> {
    run_cli_command(&["local-llm", "generate", &prompt, "--model", &model, "--max-tokens", &max_tokens.to_string()])
}

#[tauri::command]
async fn llm_benchmark(model: String) -> Result<String, String> {
    run_cli_command(&["local-llm", "benchmark", "--model", &model])
}

#[tauri::command]
async fn llm_load_pretrained(model: String) -> Result<String, String> {
    run_cli_command(&["local-llm", "load-pretrained", "--model", &model])
}

#[tauri::command]
async fn llm_train(dataset: String, epochs: i32) -> Result<String, String> {
    run_cli_command(&["local-llm", "train", "--dataset", &dataset, "--epochs", &epochs.to_string()])
}

#[tauri::command]
async fn list_lars_models() -> Result<String, String> {
    run_cli_command(&["models", "list"])
}

#[tauri::command]
async fn install_lars_models(model: String) -> Result<String, String> {
    run_cli_command(&["models", "install", &model])
}

#[tauri::command]
async fn status_lars_models() -> Result<String, String> {
    run_cli_command(&["models", "status"])
}

#[tauri::command]
async fn chat_with_lars_model(model: String, message: String) -> Result<String, String> {
    run_cli_command(&["models", "chat", "--model", &model, &message])
}

#[tauri::command]
async fn browse_skills() -> Result<String, String> {
    run_cli_command(&["marketplace", "browse-skills"])
}

#[tauri::command]
async fn install_skill(skill_id: String) -> Result<String, String> {
    run_cli_command(&["marketplace", "install-skill", "--id", &skill_id])
}

#[tauri::command]
async fn uninstall_skill(skill_id: String) -> Result<String, String> {
    run_cli_command(&["marketplace", "uninstall-skill", "--id", &skill_id])
}

#[tauri::command]
async fn browse_connectors() -> Result<String, String> {
    run_cli_command(&["marketplace", "browse-connectors"])
}

#[tauri::command]
async fn install_connector(connector_id: String) -> Result<String, String> {
    run_cli_command(&["marketplace", "install-connector", "--id", &connector_id])
}

#[tauri::command]
async fn uninstall_connector(connector_id: String) -> Result<String, String> {
    run_cli_command(&["marketplace", "uninstall-connector", "--id", &connector_id])
}

#[tauri::command]
async fn show_installed() -> Result<String, String> {
    run_cli_command(&["marketplace", "installed"])
}

#[tauri::command]
async fn domain_run(domain: String, query: String) -> Result<String, String> {
    run_cli_command(&["domain-intel", "run", "--domain", &domain, &query])
}

#[tauri::command]
async fn domain_fact_check(statement: String, category: String) -> Result<String, String> {
    run_cli_command(&["domain-intel", "fact-check", &statement, "--category", &category])
}

#[tauri::command]
async fn domain_finetune(dataset: String, output_model: String) -> Result<String, String> {
    run_cli_command(&["domain-intel", "finetune", "--dataset", &dataset, "--output", &output_model])
}

#[tauri::command]
async fn domain_snappo_reward(trajectory: String) -> Result<String, String> {
    run_cli_command(&["domain-intel", "snappo-reward", &trajectory])
}

#[tauri::command]
async fn domain_deploy_stack(template: String, region: String) -> Result<String, String> {
    run_cli_command(&["domain-intel", "deploy-stack", "--template", &template, "--region", &region])
}

#[tauri::command]
async fn run_autonomous_agent(goal: String, max_iterations: i32) -> Result<String, String> {
    run_cli_command(&["autonomous-agent", "--goal", &goal, "--max-iterations", &max_iterations.to_string()])
}

#[tauri::command]
async fn execute_sub_agent(goal: String, agents: String) -> Result<String, String> {
    run_cli_command(&["sub-agent", &goal, "--agents", &agents, "--output", "json"])
}

fn main() {
    let about_menu = CustomMenuItem::new("about".to_string(), "LARS Prism 정보 (About)...");
    let settings_menu = CustomMenuItem::new("settings".to_string(), "설정 (Settings)...").accelerator("CmdOrCtrl+,");

    let app_menu = Submenu::new(
        "LARS Prism", 
        Menu::new()
            .add_item(about_menu)
            .add_native_item(MenuItem::Separator)
            .add_item(settings_menu)
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("check_updates".to_string(), "업데이트 확인..."))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Hide)
            .add_native_item(MenuItem::HideOthers)
            .add_native_item(MenuItem::ShowAll)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Quit)
    );

    let file_menu = Submenu::new(
        "파일",
        Menu::new()
            .add_item(CustomMenuItem::new("new_project".to_string(), "새 프로젝트").accelerator("CmdOrCtrl+N"))
            .add_item(CustomMenuItem::new("open".to_string(), "열기...").accelerator("CmdOrCtrl+O"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("save".to_string(), "저장").accelerator("CmdOrCtrl+S"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("close_window".to_string(), "윈도우 닫기").accelerator("CmdOrCtrl+W"))
    );

    let edit_menu = Submenu::new(
        "편집", 
        Menu::new()
            .add_native_item(MenuItem::Undo)
            .add_native_item(MenuItem::Redo)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::SelectAll)
    );

    let view_menu = Submenu::new(
        "보기",
        Menu::new()
            .add_item(CustomMenuItem::new("toggle_sidebar".to_string(), "사이드바 토글").accelerator("CmdOrCtrl+S"))
            .add_item(CustomMenuItem::new("show_logs".to_string(), "로그 모니터").accelerator("CmdOrCtrl+L"))
            .add_item(CustomMenuItem::new("show_terminal".to_string(), "통합 터미널").accelerator("CmdOrCtrl+T"))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::EnterFullScreen)
    );

    let window_menu = Submenu::new(
        "윈도우",
        Menu::new()
            .add_native_item(MenuItem::Minimize)
            .add_native_item(MenuItem::Zoom)
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("front".to_string(), "모두 앞으로 가져오기"))
    );

    let help_menu = Submenu::new(
        "도움말",
        Menu::new()
            .add_item(CustomMenuItem::new("docs".to_string(), "LARS 문서 보기"))
            .add_item(CustomMenuItem::new("feedback".to_string(), "피드백 보내기"))
    );

    let menu = Menu::new()
        .add_submenu(app_menu)
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(window_menu)
        .add_submenu(help_menu);

    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "LARS 열기"))
        .add_item(CustomMenuItem::new("quit", "종료"));
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "settings" => { event.window().emit("menu-settings", {}).unwrap(); }
                "about" => { event.window().emit("menu-about", {}).unwrap(); }
                "toggle_sidebar" => { event.window().emit("menu-toggle-sidebar", {}).unwrap(); }
                "show_logs" => { event.window().emit("menu-show-logs", {}).unwrap(); }
                "show_terminal" => { event.window().emit("menu-show-terminal", {}).unwrap(); }
                _ => {}
            }
        })
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => std::process::exit(0),
                "show" => { let window = app.get_window("main").unwrap(); window.show().unwrap(); window.set_focus().unwrap(); }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            execute_lars_command, execute_chat_command, execute_dev_command, execute_claude_stream, amazon_q_query, apply_patch, execute_terminal_command, save_config, load_config, get_project_files,
            get_security_info, run_security_scan, load_security_report, apply_security_patches, get_chat_history, save_chat, delete_chat_record, upload_avatar, get_npu_info,
            get_projects, get_skills, get_connectors, get_auth_status, add_project, add_skill, add_connector,
            get_available_apps, install_app, get_installed_apps, remove_app, enable_app,
            discover_agents, install_agent, enable_agent, get_oauth_services, setup_oauth,
            generate_image, get_image_history, delete_image, open_file_dialog,
            perform_code_review, generate_and_run_tests, perform_security_scan, generate_documentation, execute_orchestration,
            llm_generate, llm_benchmark, llm_load_pretrained, llm_train,
            list_lars_models, install_lars_models, status_lars_models, chat_with_lars_model,
            browse_skills, install_skill, uninstall_skill, browse_connectors, install_connector, uninstall_connector, show_installed,
            domain_run, domain_fact_check, domain_finetune, domain_snappo_reward, domain_deploy_stack,
            run_autonomous_agent, execute_sub_agent
        ])
        .setup(|app| {
            let mut shortcut_manager = app.global_shortcut_manager();
            let handle = app.handle();
            shortcut_manager.register("CmdOrCtrl+Shift+K", move || {
                let window = handle.get_window("main").unwrap();
                if window.is_visible().unwrap() { window.hide().unwrap(); } else { window.show().unwrap(); window.set_focus().unwrap(); }
            }).expect("전역 단축키 등록 실패");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Tauri 애플리케이션 실행 중 오류 발생");
}
