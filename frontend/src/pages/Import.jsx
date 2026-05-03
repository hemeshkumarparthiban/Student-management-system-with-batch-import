import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { importService } from '../services/api';
import { format } from 'date-fns';

function JobCard({ job, onRefresh }) {
  const isActive = job.status === 'pending' || job.status === 'processing';
  const pct = job.total_rows > 0 ? Math.round((job.processed_rows / job.total_rows) * 100) : 0;

  return (
    <div className="job-item">
      <div style={{ fontSize: 28 }}>
        {job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : job.status === 'processing' ? '⏳' : '🕐'}
      </div>
      <div className="job-info">
        <div className="job-filename">{job.filename}</div>
        <div className="job-meta">
          {job.status === 'processing' || job.status === 'pending' ? (
            <>Processing {job.processed_rows}/{job.total_rows} rows...</>
          ) : job.status === 'completed' ? (
            <>{job.success_rows} imported · {job.error_rows} errors</>
          ) : (
            <>Failed</>
          )}
        </div>
        {(job.status === 'processing') && (
          <div style={{ marginTop: 8 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{pct}%</div>
          </div>
        )}
        {job.errors?.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 12, color: 'var(--red)', cursor: 'pointer' }}>
              {job.errors.length} validation error(s)
            </summary>
            <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto' }}>
              {job.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 0', borderBottom: '1px solid var(--border)' }}>
                  {e}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        <span className={`badge ${
          job.status === 'completed' ? 'badge-green' :
          job.status === 'failed' ? 'badge-red' :
          job.status === 'processing' ? 'badge-yellow' : 'badge-blue'
        }`}>
          {job.status}
        </span>
      </div>
      {isActive && (
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>↻</button>
      )}
    </div>
  );
}

export default function Import() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeJobs, setActiveJobs] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const pollingRef = useRef(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    multiple: true,
    maxFiles: 10,
    onDrop: acceptedFiles => setFiles(prev => [...prev, ...acceptedFiles]),
  });

  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx));

  const fetchHistory = async () => {
    try {
      const res = await importService.getAllJobs();
      setHistoryJobs(res.data.data);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => clearInterval(pollingRef.current);
  }, []);

  const pollJobs = (jobIds) => {
    clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const results = await Promise.all(jobIds.map(id => importService.getJobStatus(id).catch(() => null)));
      const updated = results.filter(Boolean).map(r => r.data.data);
      setActiveJobs(updated);
      const allDone = updated.every(j => j.status === 'completed' || j.status === 'failed');
      if (allDone) {
        clearInterval(pollingRef.current);
        fetchHistory();
      }
    }, 1500);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await importService.uploadFiles(files, (e) => {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      const jobs = res.data.jobs.map(j => ({
        id: j.jobId, filename: j.filename,
        status: 'pending', total_rows: 0, processed_rows: 0,
        success_rows: 0, error_rows: 0, errors: []
      }));
      setActiveJobs(jobs);
      setFiles([]);
      toast.success(`${jobs.length} file(s) queued for processing`);
      pollJobs(jobs.map(j => j.id));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="page-content" style={{ display: 'grid', gap: 20 }}>
      {/* Upload Zone */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Batch CSV Import</span>
          <button className="btn btn-secondary btn-sm" onClick={importService.downloadTemplate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Template
          </button>
        </div>

        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <h4>{isDragActive ? 'Drop CSV files here' : 'Drag & drop CSV files'}</h4>
          <p>or click to browse · Up to 10 files · Max 10MB each</p>
          <p style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)', opacity: 0.7 }}>
            Multiple files upload in parallel
          </p>
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              {files.length} file(s) ready
            </div>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{(f.size / 1024).toFixed(1)} KB</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeFile(i)}>Remove</button>
              </div>
            ))}

            {uploading && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>Uploading... {uploadProgress}%</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Uploading...</> : `Upload ${files.length} File(s)`}
              </button>
              <button className="btn btn-secondary" onClick={() => setFiles([])} disabled={uploading}>
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Format */}
      <div className="card">
        <div className="card-header"><span className="card-title">Expected CSV Format</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Column</th><th>Required</th><th>Format</th><th>Example</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['student_id', true, 'Text (unique)', 'STU001'],
                ['first_name', true, 'Text', 'John'],
                ['last_name', true, 'Text', 'Doe'],
                ['email', true, 'Valid email', 'john@example.com'],
                ['phone', false, 'Text', '+1234567890'],
                ['date_of_birth', false, 'YYYY-MM-DD', '2000-01-15'],
                ['gender', false, 'Male/Female/Other', 'Male'],
                ['address', false, 'Text', '123 Main St'],
              ].map(([col, req, fmt, ex]) => (
                <tr key={col}>
                  <td><code style={{ color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>{col}</code></td>
                  <td>{req ? <span className="badge badge-red">Required</span> : <span className="badge">Optional</span>}</td>
                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{fmt}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Jobs</span>
            <button className="btn btn-ghost btn-sm" onClick={() => pollJobs(activeJobs.map(j => j.id))}>↻ Refresh</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeJobs.map(job => (
              <JobCard key={job.id} job={job} onRefresh={() => pollJobs(activeJobs.map(j => j.id))} />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Import History</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchHistory}>↻ Refresh</button>
        </div>
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: 30 }}><div className="spinner" /></div>
        ) : historyJobs.length === 0 ? (
          <div className="empty-state"><p>No import history yet</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historyJobs.map(job => (
              <div key={job.id} className="job-item">
                <div style={{ fontSize: 28 }}>
                  {job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '⏳'}
                </div>
                <div className="job-info">
                  <div className="job-filename">{job.filename}</div>
                  <div className="job-meta">
                    {job.status === 'completed'
                      ? `${job.success_rows} imported · ${job.error_rows} errors · ${format(new Date(job.created_at), 'MMM d, yyyy HH:mm')}`
                      : job.status}
                  </div>
                  {job.errors?.length > 0 && (
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: 12, color: 'var(--red)', cursor: 'pointer' }}>
                        {job.errors.length} error(s)
                      </summary>
                      <div style={{ marginTop: 4, maxHeight: 80, overflowY: 'auto' }}>
                        {job.errors.slice(0, 5).map((e, i) => (
                          <div key={i} style={{ fontSize: 11, color: 'var(--text-3)' }}>{e}</div>
                        ))}
                        {job.errors.length > 5 && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>...and {job.errors.length - 5} more</div>}
                      </div>
                    </details>
                  )}
                </div>
                <span className={`badge ${job.status === 'completed' ? 'badge-green' : job.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
