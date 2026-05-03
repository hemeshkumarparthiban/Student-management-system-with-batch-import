import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { studentService } from '../services/api';
import StudentModal from '../components/StudentModal';
import { format } from 'date-fns';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchStudents = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const res = await studentService.getAll({ page, limit: pagination.limit, search: q, sortBy, sortOrder });
      setStudents(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, sortBy, sortOrder]);

  useEffect(() => { fetchStudents(1); }, [sortBy, sortOrder]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => fetchStudents(1, val), 400));
  };

  const handleSave = async (form) => {
    try {
      if (editing) {
        await studentService.update(editing.id, form);
        toast.success('Student updated successfully');
      } else {
        await studentService.create(form);
        toast.success('Student added successfully');
      }
      setShowModal(false);
      setEditing(null);
      fetchStudents(pagination.page);
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await studentService.delete(id);
      toast.success('Student deleted');
      setDeleting(null);
      fetchStudents(pagination.page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(col); setSortOrder('ASC'); }
  };

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 4, opacity: sortBy === col ? 1 : 0.3 }}>
      {sortBy === col ? (sortOrder === 'ASC' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Students ({pagination.total})</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                placeholder="Search students..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Student
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <h4>No students found</h4>
            <p>{search ? `No results for "${search}"` : 'Add your first student to get started'}</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th onClick={() => handleSort('student_id')} style={{ cursor: 'pointer' }}>
                      ID <SortIcon col="student_id" />
                    </th>
                    <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                      Email <SortIcon col="email" />
                    </th>
                    <th>Phone</th>
                    <th>Gender</th>
                    <th>Courses</th>
                    <th>Avg Grade</th>
                    <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                      Added <SortIcon col="created_at" />
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{s.first_name[0]}{s.last_name[0]}</div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{s.first_name} {s.last_name}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-blue">{s.student_id}</span></td>
                      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{s.email}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{s.phone || '—'}</td>
                      <td>
                        {s.gender ? (
                          <span className={`badge ${s.gender === 'Male' ? 'badge-blue' : s.gender === 'Female' ? 'badge-purple' : 'badge-yellow'}`}>
                            {s.gender}
                          </span>
                        ) : '—'}
                      </td>
                      <td><span className="badge badge-green">{s.enrolled_courses}</span></td>
                      <td style={{ color: s.avg_grade ? 'var(--yellow)' : 'var(--text-3)' }}>
                        {s.avg_grade ? `${parseFloat(s.avg_grade).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                        {format(new Date(s.created_at), 'MMM d, yyyy')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(s); setShowModal(true); }}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleting(s)}>
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <span style={{ fontSize: 13, color: 'var(--text-3)', marginRight: 8 }}>
                  {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <button className="page-btn" disabled={pagination.page === 1} onClick={() => fetchStudents(pagination.page - 1)}>‹</button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const p = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
                  return (
                    <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchStudents(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="page-btn" disabled={pagination.page === pagination.totalPages} onClick={() => fetchStudents(pagination.page + 1)}>›</button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <StudentModal
          student={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {deleting && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Delete Student</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)' }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>{deleting.first_name} {deleting.last_name}</strong>?
                This will also remove all their enrollments.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleting.id)}>Delete Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
