import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Search, Mail, Shield, User as UserIcon, Plus, X, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenTaskModal = (user) => {
    setSelectedUser(user);
    setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
    setShowTaskModal(true);
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return toast.error('Title is required');
    if (!taskForm.due_date) return toast.error('Due date is required');

    try {
      const payload = {
        ...taskForm,
        assigned_to: selectedUser.id,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString().split('T')[0] : null
      };

      await api.post('/user-tasks', payload);
      toast.success(`Task assigned to ${selectedUser.name}`);
      setShowTaskModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign task');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="section-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>User Management</h1>
          <p className="text-muted">Manage system users and assign direct tasks</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 44 }} 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-3">
        {filteredUsers.map(u => (
          <div key={u.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar avatar-lg" style={{ background: u.avatar_color }}>
                {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.name} {u.id === currentUser.id && <span className="text-muted" style={{ fontWeight: 400 }}>(You)</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <Mail size={12} /> {u.email}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge badge-${u.role}`}>
                {u.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                {u.role}
              </span>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ flex: 1 }}
                onClick={() => handleOpenTaskModal(u)}
              >
                <Plus size={14} /> Assign Task
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="empty-state">
          <UserIcon size={48} />
          <h3>No users found</h3>
          <p>Try adjusting your search term.</p>
        </div>
      )}

      {/* Assign Task Modal */}
      {showTaskModal && (
        <div className="modal-backdrop" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Assign Direct Task</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Assigning to <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{selectedUser?.name}</span>
                </div>
              </div>
              <button className="btn-icon btn-ghost" onClick={() => setShowTaskModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAssignTask}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input 
                  autoFocus 
                  className="form-input" 
                  placeholder="What needs to be done?" 
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Provide more details..." 
                  value={taskForm.description}
                  onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select 
                    className="form-select"
                    value={taskForm.priority}
                    onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={taskForm.due_date}
                    onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
