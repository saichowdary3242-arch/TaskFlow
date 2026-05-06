import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, isAfter, isBefore, startOfToday } from 'date-fns';
import { 
  CheckSquare, Clock, AlertCircle, Filter, 
  ChevronDown, Search, ExternalLink, CheckCircle2, Circle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyTasks() {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/my-tasks-unified');
      setTasks(data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (task, newStatus) => {
    try {
      if (task.task_type === 'project_task') {
        await api.put(`/projects/${task.project_id}/tasks/${task.id}`, { status: newStatus });
      } else {
        await api.put(`/user-tasks/${task.id}`, { status: newStatus });
      }
      
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      toast.success('Task updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

    try {
      if (task.task_type === 'project_task') {
        await api.delete(`/projects/${task.project_id}/tasks/${task.id}`);
      } else {
        await api.delete(`/user-tasks/${task.id}`);
      }
      
      setTasks(tasks.filter(t => t.id !== task.id));
      toast.success('Task deleted successfully');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const isCompleted = t.status === 'done' || t.status === 'completed';
    
    if (filterStatus === 'pending') return matchesSearch && !isCompleted;
    if (filterStatus === 'completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="section-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Tasks</h1>
          <p className="text-muted">
            {currentUser.role === 'admin' ? 'Manage all member tasks' : 'View and manage your assigned tasks'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="form-input" 
              style={{ paddingLeft: 44 }} 
              placeholder={currentUser.role === 'admin' ? "Search tasks or members..." : "Search tasks..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button 
              className={`btn ${filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilterStatus('pending')}
            >
              Pending
            </button>
            <button 
              className={`btn ${filterStatus === 'completed' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilterStatus('completed')}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredTasks.map(task => {
          const isCompleted = task.status === 'done' || task.status === 'completed';
          const isOverdue = task.due_date && isBefore(parseISO(task.due_date), startOfToday()) && !isCompleted;

          return (
            <div key={task.id} className={`card ${isCompleted ? 'opacity-70' : ''}`} style={{ padding: '16px 20px', borderLeft: `4px solid ${task.project_color}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <button 
                  className="btn-ghost" 
                  style={{ padding: 0, color: isCompleted ? 'var(--success)' : 'var(--text-muted)' }}
                  onClick={() => handleUpdateStatus(task, isCompleted ? (task.task_type === 'project_task' ? 'todo' : 'pending') : (task.task_type === 'project_task' ? 'done' : 'completed'))}
                >
                  {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {task.title}
                      </h3>
                      {currentUser.role === 'admin' && task.assigned_to_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="avatar" style={{ width: 16, height: 16, fontSize: '0.5rem', background: task.assigned_to_color }}>
                            {task.assigned_to_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          Assigned to: {task.assigned_to_name}
                        </div>
                      )}
                    </div>
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  </div>
                  
                  {task.description && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 'auto' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>
                        <ExternalLink size={12} /> {task.project_name}
                      </span>
                      {task.due_date ? (
                        <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: isOverdue ? 'rgba(239,68,68,0.1)' : 'var(--bg-hover)' }} className={isOverdue ? 'overdue' : 'text-muted'}>
                          <Clock size={12} /> 
                          <span style={{ fontWeight: 600 }}>Due:</span> {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', padding: '2px 8px' }}>
                          <Clock size={12} /> No due date
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                      {currentUser.role === 'admin' && (
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                          onClick={() => handleDeleteTask(task)}
                          title="Delete Task"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                      {!isCompleted ? (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleUpdateStatus(task, task.task_type === 'project_task' ? 'done' : 'completed')}
                        >
                          Mark Complete
                        </button>
                      ) : (
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleUpdateStatus(task, task.task_type === 'project_task' ? 'todo' : 'pending')}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="empty-state">
            <CheckSquare size={48} />
            <h3>No tasks found</h3>
            <p>You don't have any tasks matching your criteria.</p>
          </div>
        )}
      </div>

      <style>{`
        .opacity-70 { opacity: 0.7; }
        .opacity-70:hover { opacity: 1; }
      `}</style>
    </div>
  );
}
