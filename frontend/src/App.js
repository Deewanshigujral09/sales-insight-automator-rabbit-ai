import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '';

// ─── Icons (inline SVG for zero deps) ──────────────────────────────
const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

// ─── Utility ───────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [requestId, setRequestId] = useState('');
  const fileInputRef = useRef(null);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleFileSelect = useCallback((selected) => {
    if (!selected) return;
    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setErrorMsg('Invalid file type. Please upload a .csv or .xlsx file.');
      setStatus('error');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg('File is too large. Maximum size is 10MB.');
      setStatus('error');
      return;
    }
    setFile(selected);
    setStatus('idle');
    setErrorMsg('');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [handleFileSelect]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError && validateEmail(e.target.value)) setEmailError('');
  };

  const handleSubmit = async () => {
    // Validate
    if (!file) { setErrorMsg('Please select a file to upload.'); setStatus('error'); return; }
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address.'); return; }

    setStatus('loading');
    setErrorMsg('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);

    try {
      const res = await axios.post(`${API_URL}/api/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      setStatus('success');
      setResult(res.data);
      setRequestId(res.data.requestId || '');
    } catch (err) {
      setStatus('error');
      const msg = err.response?.data?.error
        || err.response?.data?.details?.[0]
        || err.message
        || 'Something went wrong. Please try again.';
      setErrorMsg(msg);
      setRequestId(err.response?.data?.requestId || '');
    }
  };

  const handleReset = () => {
    setFile(null);
    setEmail('');
    setEmailError('');
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setRequestId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app">
      {/* Background grid + blobs */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />
      <div className="blob blob-3" aria-hidden="true" />

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">🐇</span>
            <div>
              <span className="logo-name">Rabbitt AI</span>
              <span className="logo-sep">|</span>
              <span className="logo-product">Sales Insight Automator</span>
            </div>
          </div>
          <a
            href={`${API_URL}/api/docs`}
            target="_blank"
            rel="noreferrer"
            className="api-badge"
          >
            <span className="api-badge-dot" />
            API Docs
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="main">
        <div className="hero">
          <div className="eyebrow">
            <span className="eyebrow-tag">Q1 · 2026</span>
            <span className="eyebrow-text">Powered by OpenAI GPT</span>
          </div>
          <h1 className="hero-title">
            Turn raw sales data<br />
            into <span className="accent">executive briefs</span>
          </h1>
          <p className="hero-subtitle">
            Upload a CSV or Excel file. Our AI distills your numbers into a clear, professional narrative — delivered straight to your inbox.
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {status === 'success' ? (
            <SuccessView result={result} email={email} filename={file?.name} onReset={handleReset} />
          ) : (
            <UploadForm
              file={file}
              email={email}
              emailError={emailError}
              isDragging={isDragging}
              status={status}
              errorMsg={errorMsg}
              requestId={requestId}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              onEmailChange={handleEmailChange}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onSubmit={handleSubmit}
              onRemoveFile={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            />
          )}
        </div>

        {/* Feature pills */}
        <div className="feature-row">
          {[
            { icon: '🔒', text: 'Rate-limited & secured' },
            { icon: '🤖', text: 'GPT-powered analysis' },
            { icon: '📧', text: 'Instant email delivery' },
            { icon: '📊', text: 'CSV & Excel support' },
          ].map((f) => (
            <div key={f.text} className="feature-pill">
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="footer">
        <p>© 2026 Rabbitt AI Engineering · <a href={`${API_URL}/api/docs`} target="_blank" rel="noreferrer">Swagger Docs</a></p>
      </footer>
    </div>
  );
}

// ─── Upload Form ───────────────────────────────────────────────────
function UploadForm({
  file, email, emailError, isDragging, status, errorMsg, requestId,
  fileInputRef, onFileSelect, onEmailChange, onDrop, onDragOver, onDragLeave,
  onSubmit, onRemoveFile,
}) {
  const isLoading = status === 'loading';

  return (
    <div className="form">
      <div className="form-header">
        <h2 className="form-title">Upload Sales Data</h2>
        <p className="form-subtitle">Supported formats: <code>.csv</code> &nbsp;·&nbsp; <code>.xlsx</code> &nbsp;·&nbsp; max 10MB</p>
      </div>

      {/* Drop Zone */}
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !file && fileInputRef.current?.click()}
        aria-label="File upload area"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => onFileSelect(e.target.files[0])}
        />

        {file ? (
          <div className="file-info">
            <div className="file-icon-wrap">
              <FileIcon />
            </div>
            <div className="file-details">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatBytes(file.size)}</span>
            </div>
            <button
              className="file-remove"
              onClick={(e) => { e.stopPropagation(); onRemoveFile(); }}
              aria-label="Remove file"
            >
              <XIcon />
            </button>
          </div>
        ) : (
          <div className="dropzone-inner">
            <div className="upload-icon-wrap">
              <UploadIcon />
            </div>
            <p className="dropzone-label">
              <strong>Drag & drop</strong> your file here
            </p>
            <p className="dropzone-hint">or click to browse</p>
          </div>
        )}
      </div>

      {/* Email Input */}
      <div className="field">
        <label className="field-label" htmlFor="email">
          <MailIcon />
          Recipient Email
        </label>
        <input
          id="email"
          type="email"
          className={`field-input ${emailError ? 'error' : ''}`}
          placeholder="executive@company.com"
          value={email}
          onChange={onEmailChange}
          disabled={isLoading}
          autoComplete="email"
        />
        {emailError && <p className="field-error">{emailError}</p>}
      </div>

      {/* Error Banner */}
      {status === 'error' && errorMsg && (
        <div className="alert alert-error">
          <span>⚠</span>
          <div>
            <strong>Error:</strong> {errorMsg}
            {requestId && <p className="alert-meta">Request ID: {requestId}</p>}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        className={`submit-btn ${isLoading ? 'loading' : ''}`}
        onClick={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            <span>Generating AI Summary…</span>
          </>
        ) : (
          <>
            <span>Generate & Send Summary</span>
            <span className="btn-arrow">→</span>
          </>
        )}
      </button>

      {isLoading && (
        <p className="loading-hint">
          Parsing data · Running AI analysis · Sending email…
        </p>
      )}
    </div>
  );
}

// ─── Success View ──────────────────────────────────────────────────
function SuccessView({ result, email, filename, onReset }) {
  return (
    <div className="success-view">
      <div className="success-icon">
        <CheckIcon />
      </div>
      <h2 className="success-title">Summary Sent!</h2>
      <p className="success-msg">
        Your AI-generated sales brief for <strong>{filename}</strong> has been delivered to
      </p>
      <div className="success-email">{email}</div>

      {result?.preview && (
        <div className="preview-box">
          <p className="preview-label">Preview</p>
          <p className="preview-text">{result.preview}</p>
        </div>
      )}

      {result?.requestId && (
        <p className="success-meta">Request ID: {result.requestId}</p>
      )}

      <button className="submit-btn reset-btn" onClick={onReset}>
        ← Analyze Another File
      </button>
    </div>
  );
}
