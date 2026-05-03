import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { courseService } from '../services/api';

const INITIAL = { course_code: '', course_name: '', credits: 3, description: '' };

function CourseModal({ course, onClose, onSave }) {
  const [form, setForm] = useState(course ? { ...course } : INITIAL);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.course_code.trim()) e.course_code = 'Course code is required';
    if (!form.course_name.trim()) e.course_name = 'Course name is required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{course ? 'Edit Course' : 'Add Course'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Course Code *</label>
              <input className={errors.course_code ? 'input-error' : ''} value={form.course_code}
                onChange={e => set('course_code', e.target.value)} placeholder="CS101" disabled={!!course} />
              {errors.course_code && <span className="error-msg">{errors.course_code}</span>}
            </div>
            <div className="form-group">
              <label>Credits</label>
              <input type="number" min={1} max={12} value={form.credits}
                onChange={e => set('credits', parseInt(e.target.value))} />
            </div>
            <div className="form-group full">
              <label>Course Name *</label>
              <input className={errors.course_name ? 'input-error' : ''} value={form.course_name}
                onChange={e => set('course_name', e.target.value)} placeholder="Introduction to Computer Science" />
              {errors.course_name && <span className="error-msg">{errors.course_name}</span>}
            </div>
            <div className="form-group full">
              <label>Description</label>
              <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
                placeholder="Course description..." rows={3} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><div className="spinner" style={{width:16,height:16}}/> Saving...</> : (course ? 'Update Course' : 'Add Course')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await courseService.getAll();
      setCourses(res.data.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleSave = async (form) => {
    try {
      if (editing) {
        await courseService.update(editing.id, form);
        toast.success('Course updated');
      } else {
        await courseService.create(form);
        toast.success('Course created');
      }
      setShowModal(false);
      setEditing(null);
      fetchCourses();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await courseService.delete(id);
      toast.success('Course deleted');
      setDeleting(null);
      fetchCourses();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = courses.filter(c =>
    c.course_name.toLowerCase().includes(search.toLowerCase()) ||
    c.course_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Courses ({courses.length})</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Course
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <h4>No courses found</h4>
            <p>{search ? `No results for "${search}"` : 'Create your first course'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Course Name</th><th>Credits</th><th>Enrolled</th><th>Description</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td><span className="badge badge-blue">{c.course_code}</span></td>
                    <td style={{ fontWeight: 500 }}>{c.course_name}</td>
                    <td><span className="badge badge-purple">{c.credits} cr</span></td>
                    <td><span className="badge badge-green">{c.enrolled_count}</span></td>
                    <td style={{ color: 'var(--text-3)', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.description || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(c); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleting(c)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <CourseModal course={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSave={handleSave} />
      )}

      {deleting && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Delete Course</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)' }}>
                Delete <strong style={{ color: 'var(--text)' }}>{deleting.course_name}</strong>?
                This will remove all student enrollments in this course.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleting.id)}>Delete Course</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
