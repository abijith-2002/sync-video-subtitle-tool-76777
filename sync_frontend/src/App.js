import React, { useState, useRef } from 'react';
import './App.css';

// PUBLIC_INTERFACE
function App() {
  /** Modern, minimal UI for uploading video + subtitle, processing sync, and downloading result. */
  // File state
  const [videoFile, setVideoFile] = useState(null);
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // For manual input triggers
  const videoInputRef = useRef(null);
  const subtitleInputRef = useRef(null);

  // PUBLIC_INTERFACE
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  // PUBLIC_INTERFACE
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  // PUBLIC_INTERFACE
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Only accept video + subtitle, distinguish by file type/extension
    const files = Array.from(e.dataTransfer.files);
    let video = null, sub = null;
    files.forEach((f) => {
      if (isVideoFile(f)) video = f;
      else if (isSubtitleFile(f)) sub = f;
    });
    if (video) setVideoFile(video);
    if (sub) setSubtitleFile(sub);
  }

  // PUBLIC_INTERFACE
  function isVideoFile(file) {
    // Accept mp4, mkv, mov for demo, expand as needed
    const videoTypes = ['video/mp4', 'video/mkv', 'video/quicktime', 'video/x-matroska'];
    const exts = ['.mp4', '.mkv', '.mov'];
    return (
      videoTypes.includes(file.type) ||
      exts.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  }

  // PUBLIC_INTERFACE
  function isSubtitleFile(file) {
    // Accept common subtitle extensions
    const subtitleExts = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
    return (
      subtitleExts.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  }

  // PUBLIC_INTERFACE
  function handleVideoInputChange(e) {
    const file = e.target.files[0];
    if (file && isVideoFile(file)) setVideoFile(file);
  }

  // PUBLIC_INTERFACE
  function handleSubtitleInputChange(e) {
    const file = e.target.files[0];
    if (file && isSubtitleFile(file)) setSubtitleFile(file);
  }

  // PUBLIC_INTERFACE
  async function handleProcess() {
    // Basic validation
    setStatus('');
    setDownloadUrl(null);
    if (!videoFile || !subtitleFile) {
      setStatus('Please select both video and subtitle file.');
      return;
    }
    setProcessing(true);
    setStatus('Processing...');
    // API endpoint: adjust base URL as needed for deployment
    // Try to grab the backend URL from env, else fallback to relative
    let endpoint = process.env.REACT_APP_BACKEND_URL?.replace(/\/$/, '') || '';
    endpoint += '/api/sync';  // Assume backend POST /api/sync
    const formData = new FormData();
    formData.append('video_file', videoFile);
    formData.append('subtitle_file', subtitleFile);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Backend error (${response.status})`);
      }
      // Assume backend provides: { sync_status: "fixed", download_url: "<url>" } or file blob
      // Try content-type; if application/json, fetch url from JSON else download directly
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const result = await response.json();
        if (result.download_url) {
          setDownloadUrl(result.download_url);
          setStatus(result.sync_status === "fixed"
            ? "Sync complete! Download below." : "Checked, no fix needed."
          );
        } else {
          setStatus("Processing complete, but no download available.");
        }
      } else { // If file blob
        // Create blob url
        const disposition = response.headers.get('content-disposition');
        let outFileName = "synced_output";
        if (disposition && disposition.indexOf('filename=') !== -1) {
          outFileName = disposition.split('filename=')[1].replace(/['"]/g, '');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setDownloadUrl({ url, name: outFileName });
        setStatus('Sync complete! Download below.');
      }
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
    }
    setProcessing(false);
  }

  // PUBLIC_INTERFACE
  function triggerVideoInput() {
    videoInputRef.current?.click();
  }

  // PUBLIC_INTERFACE
  function triggerSubtitleInput() {
    subtitleInputRef.current?.click();
  }

  // PUBLIC_INTERFACE
  function handleReset() {
    setVideoFile(null);
    setSubtitleFile(null);
    setDownloadUrl(null);
    setStatus('');
    setProcessing(false);
  }

  // Render UI
  return (
    <div className="main-bg">
      <header className="header">
        <span className="logo-dot" />
        <h1 className="title">Subtitle Sync Tool</h1>
        <p className="subtitle">
          Upload a video & a subtitle, click <b>Sync &amp; Fix</b>, then download your synced file.
        </p>
      </header>
      {/* Drag-and-drop, or buttons */}
      <div
        className={`drop-area${dragActive ? ' active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div>
          <button className="upload-btn" onClick={triggerVideoInput} disabled={processing}>
            {videoFile
              ? `✔ Video: ${videoFile.name}`
              : 'Upload Video'}
          </button>
          <input
            style={{ display: 'none' }}
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/mkv,video/quicktime"
            onChange={handleVideoInputChange}
            disabled={processing}
          />
        </div>
        <div>
          <button className="upload-btn" onClick={triggerSubtitleInput} disabled={processing}>
            {subtitleFile
              ? `✔ Subtitle: ${subtitleFile.name}`
              : 'Upload Subtitle'}
          </button>
          <input
            style={{ display: 'none' }}
            ref={subtitleInputRef}
            type="file"
            accept=".srt,.vtt,.ass,.ssa,.sub"
            onChange={handleSubtitleInputChange}
            disabled={processing}
          />
        </div>
        <p className="drop-text">or drag both files here</p>
      </div>
      <div className="actions">
        <button
          className="action-btn"
          onClick={handleProcess}
          disabled={!videoFile || !subtitleFile || processing}
        >
          {processing ? 'Processing...' : 'Sync & Fix'}
        </button>
        <button className="reset-btn" onClick={handleReset} disabled={processing && !downloadUrl}>
          Reset
        </button>
      </div>
      {status && (
        <div className="status-text">{status}</div>
      )}
      {downloadUrl && (
        <div className="download-area">
          {
            typeof downloadUrl === "string"
              ? (
                <a className="download-btn" href={downloadUrl} download>
                  Download Synced File
                </a>
              )
              : (
                <a
                  className="download-btn"
                  href={downloadUrl.url}
                  download={downloadUrl.name || "synced_output"}
                >
                  Download Synced File
                </a>
              )
          }
        </div>
      )}
      <footer className="footer">
        &copy; {new Date().getFullYear()} | Minimal Subtitle Sync Tool
      </footer>
    </div>
  );
}

export default App;
