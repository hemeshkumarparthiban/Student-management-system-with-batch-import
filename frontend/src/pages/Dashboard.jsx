import React, { useState, useEffect } from 'react';
import { statsService, studentService } from '../services/api';
import { format } from 'date-fns';

const StatCard = ({ label, value, icon, color }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
    <div className="stat-icon">{icon}</div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      statsService.get(),
      studentService.getAll({ page: 1, limit: 5, sortBy: 'created_at', sortOrder: 'DESC' })
    ]).then(([statsRes, studentsRes]) => {
      setStats(statsRes.data.data);
      setRecentStudents(studentsRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  return (
    <div className="page-content">
      <div className="stats-grid">
        <StatCard label="Total Students" value={stats?.total_students} color="var(--accent)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
        <StatCard label="Total Courses" value={stats?.total_courses} color="var(--blue)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
        />
        <StatCard label="Enrollments" value={stats?.total_enrollments} color="var(--purple)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        />
        <StatCard label="Avg Grade" value={stats?.avg_grade ? `${stats.avg_grade}%` : 'N/A'} color="var(--yellow)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <StatCard label="Imports (7d)" value={stats?.recent_imports} color="var(--red)"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recently Added Students</span>
        </div>
        {recentStudents.length === 0 ? (
          <div className="empty-state">
            <p>No students yet. Add students or import via CSV.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Courses</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{s.student_id}</span></td>
                    <td style={{ color: 'var(--text-2)' }}>{s.email}</td>
                    <td><span className="badge badge-purple">{s.enrolled_courses}</span></td>
                    <td style={{ color: 'var(--text-3)', fontSize: 13 }}>
                      {format(new Date(s.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
