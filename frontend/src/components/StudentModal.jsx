import React, { useState, useEffect } from 'react';

const INITIAL = {
  student_id: '', first_name: '', last_name: '', email: '',
  phone: '', date_of_birth: '', gender: '', address: ''
};

export default function StudentModal({ student, onClose, onSave }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        student_id: student.student_id || '',
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
        gender: student.gender || '',
        address: student.address || '',
      });
    }
  }, [student]);

  const validate = () => {
    const e = {};
    if (!form.student_id.trim()) e.student_id = 'Student ID is required';
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{student ? 'Edit Student' : 'Add New Student'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Student ID *</label>
              <input
                className={errors.student_id ? 'input-error' : ''}
                value={form.student_id} onChange={e => set('student_id', e.target.value)}
                placeholder="STU001" disabled={!!student}
              />
              {errors.student_id && <span className="error-msg">{errors.student_id}</span>}
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>First Name *</label>
              <input
                className={errors.first_name ? 'input-error' : ''}
                value={form.first_name} onChange={e => set('first_name', e.target.value)}
                placeholder="John"
              />
              {errors.first_name && <span className="error-msg">{errors.first_name}</span>}
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                className={errors.last_name ? 'input-error' : ''}
                value={form.last_name} onChange={e => set('last_name', e.target.value)}
                placeholder="Doe"
              />
              {errors.last_name && <span className="error-msg">{errors.last_name}</span>}
            </div>
            <div className="form-group full">
              <label>Email *</label>
              <input
                className={errors.email ? 'input-error' : ''}
                type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="john.doe@example.com"
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1234567890" />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Address</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Enter address..." rows={2} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><div className="spinner" style={{width:16,height:16}}/> Saving...</> : (student ? 'Update Student' : 'Add Student')}
          </button>
        </div>
      </div>
    </div>
  );
}
