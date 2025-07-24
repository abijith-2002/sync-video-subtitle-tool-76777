import React, { useEffect, useRef, useState } from "react";
import "./App.css";

// Color palette (to match spec, also defined in App.css :root for CSS usage)
const COLORS = {
  primary: "#1976D2",
  secondary: "#424242",
  accent: "#00B8D4",
  error: "#D32F2F",
  success: "#388E3C"
};

/*
  PUBLIC_INTERFACE
  Main application for subtitle/video sync web tool.
  - Users upload video and subtitle files (multi-format)
  - Submit for sync check/fix (no authentication)
  - Download the adjusted output file

  Modern, minimal UI with drag-and-drop/component selection.
*/
function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [theme, setTheme] = useState("light");

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  function toggleTheme() {
    setTheme((cur) => (cur === "light" ? "dark" : "light"));
  }

  // Trigger input when clicking the drop area (for accessibility)
  function handleAreaClick() {
    fileInputRef.current && fileInputRef.current.click();
  }

  // Handle file drag events for UX
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    onFilesChosen(files);
  }

  // PUBLIC_INTERFACE
  function onFilesChosen(fileList) {
    // Accept 1 video and 1 subtitle file in any order
    let video = null, subtitle = null;
    for (let file of fileList) {
      if (isSubtitleFile(file) && !subtitle) subtitle = file;
      else if (isVideoFile(file) && !video) video = file;
    }
    if (video) setVideoFile(video);
    if (subtitle) setSubtitleFile(subtitle);
    setError(""); setSuccessMsg("");
  }

  // Helper: recognize video file by MIME/extension
  function isVideoFile(file) {
    const exts = ["mp4", "mov", "avi", "mkv", "webm"];
    return (
      file.type.startsWith("video/") ||
      exts.some((x) => file.name.toLowerCase().endsWith("." + x))
    );
  }
  // Helper: recognize subtitle file by extension (most common)
  function isSubtitleFile(file) {
    const exts = [
      "srt",
      "vtt",
      "ass",
      "ssa",
      "sub",
      "txt",
      "json"
    ];
    return exts.some((x) => file.name.toLowerCase().endsWith("." + x));
  }

  // PUBLIC_INTERFACE
  function handleFileInputChange(e) {
    onFilesChosen(Array.from(e.target.files));
    // Reset input so user can upload duplicate file.
    e.target.value = null;
  }

  // PUBLIC_INTERFACE
  async function handleProcessSync() {
    setProcessing(true);
    setError(""); setSuccessMsg(""); setDownloadUrl("");

    try {
      // Send files to backend API (update the URL as per deployment)
      const apiUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000/sync"; // change according to deployment
      const formData = new FormData();
      if (!videoFile || !subtitleFile) {
        setError("Both video and subtitle files are required.");
        setProcessing(false); return;
      }
      formData.append("video_file", videoFile);
      formData.append("subtitle_file", subtitleFile);

      // POST to backend
      const resp = await fetch(apiUrl, {
        method: "POST",
        body: formData
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(
          errText || `Sync failed: ${resp.status} ${resp.statusText}`
        );
      }
      // The backend should return a blob/file to download:
      // e.g. Content-Disposition: attachment; filename="...srt"
      const blob = await resp.blob();
      const contentDisp = resp.headers.get("Content-Disposition");
      let filename = "synced_output";
      if (contentDisp) {
        // Try to extract filename
        const match = contentDisp.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      } else if (subtitleFile) {
        filename = "synced_" + subtitleFile.name;
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      setDownloadUrl({ url: downloadUrl, filename });
      setSuccessMsg(
        "Subtitle has been synchronized! Click below to download your file."
      );
    } catch (err) {
      setError("Sync failed. " + (err.message || "Unexpected error"));
    }
    setProcessing(false);
  }

  // PUBLIC_INTERFACE
  function handleReset() {
    setVideoFile(null);
    setSubtitleFile(null);
    setDownloadUrl("");
    setError("");
    setSuccessMsg("");
  }

  return (
    <div className="App" style={{ minHeight: "100vh" }}>
      <header className="App-header" style={{ alignItems: "stretch", minHeight: "unset" }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <div className="container fade-in" style={{ marginTop: 52, padding: 32, maxWidth: 500, width: "100%" }}>
          <h1 className="title" style={{ marginBottom: 12, color: COLORS.primary }}>
            Video/Subtitle Sync Tool
          </h1>
          <p className="description" style={{ color: "var(--text-secondary)" }}>
            Upload a video and subtitle, check/fix sync, and download the result.<br />
            <span style={{ fontSize: 13 }}>
                Supports formats: mp4, mov, avi, mkv (video), srt, vtt, ass (subtitle)
            </span>
          </p>
          <div
            className={`drop-area${isDragging ? " drag" : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tabIndex={0}
            onClick={handleAreaClick}
            role="button"
            aria-label="Drop video and subtitle files here or click to select"
            style={{
              border: `2px dashed ${COLORS.accent}`,
              minHeight: 120,
              background: isDragging ? "rgba(0, 184, 212, 0.08)" : "var(--bg-secondary)",
              borderRadius: 12,
              color: COLORS.secondary,
              marginTop: 22,
              marginBottom: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s"
            }}
          >
            {!videoFile && !subtitleFile ? (
              <span>
                <strong>Drag and drop</strong> or <strong>click</strong> to select video + subtitle files<br />
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  (One video, one subtitle. No login required.)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".mp4,.mov,.avi,.mkv,.webm,.srt,.vtt,.ass,.ssa,.sub,.txt,.json,video/*"
                  style={{ display: "none" }}
                  onChange={handleFileInputChange}
                />
              </span>
            ) : (
              <div style={{ width: "100%" }}>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    fontSize: 15,
                    textAlign: "left",
                    color: COLORS.secondary
                  }}
                >
                  <li>
                    <strong>Video:</strong>{" "}
                    {videoFile ? (
                      <span style={{ color: COLORS.primary }}>{videoFile.name}</span>
                    ) : (
                      <span style={{ color: COLORS.error }}>Not selected</span>
                    )}
                  </li>
                  <li>
                    <strong>Subtitle:</strong>{" "}
                    {subtitleFile ? (
                      <span style={{ color: COLORS.primary }}>{subtitleFile.name}</span>
                    ) : (
                      <span style={{ color: COLORS.error }}>Not selected</span>
                    )}
                  </li>
                </ul>
                <button
                  className="btn-outline"
                  style={{
                    marginTop: 16,
                    background: "none",
                    border: `1.5px solid ${COLORS.accent}`,
                    color: COLORS.accent,
                    borderRadius: 6,
                    padding: "7px 18px",
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                  onClick={handleReset}
                  disabled={processing}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              className="btn"
              style={{
                background: !videoFile || !subtitleFile ? "#bdbdbd" : COLORS.primary,
                color: "#fff",
                padding: "12px 36px",
                borderRadius: 7,
                border: "none",
                fontWeight: 500,
                fontSize: 16,
                marginRight: 12,
                cursor: !videoFile || !subtitleFile || processing ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
                transition: "background 0.2s"
              }}
              disabled={!videoFile || !subtitleFile || processing}
              onClick={handleProcessSync}
              aria-disabled={!videoFile || !subtitleFile || processing}
            >
              {processing ? "Processing..." : "Check & Fix Sync"}
            </button>
          </div>
          {!!error && (
            <div style={{ color: COLORS.error, fontWeight: 500, margin: "16px 0" }}>
              {error}
            </div>
          )}
          {!!successMsg && (
            <div style={{ color: COLORS.success, fontWeight: 500, margin: "16px 0" }}>
              {successMsg}
            </div>
          )}
          {!!downloadUrl && (
            <div style={{ marginTop: 10 }}>
              <a
                href={downloadUrl.url}
                download={downloadUrl.filename}
                className="btn"
                style={{
                  background: COLORS.accent,
                  color: "#fff",
                  padding: "10px 28px",
                  borderRadius: 7,
                  border: "none",
                  fontWeight: 500,
                  fontSize: 15,
                  marginTop: 3,
                  textDecoration: "none",
                  boxShadow: "0 2px 9px rgba(0,184,212,0.08)",
                  display: 'inline-block'
                }}
              >
                ⬇️ Download Synced File
              </a>
            </div>
          )}
        </div>
        <footer style={{
          padding: "2.5em 0 0.3em 0",
          color: "var(--text-secondary)",
          fontSize: "13px"
        }}>
          &copy; {new Date().getFullYear()} Subtitle Sync Tool &mdash; No files or account saved.
        </footer>
      </header>
    </div>
  );
}

export default App;
