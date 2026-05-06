import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { format, isBefore, parseISO, startOfToday } from 'date-fns';
import {
  FolderKanban, CheckSquare, AlertTriangle,
  TrendingUp, Clock, ArrowRight
} from 'lucide-react';

const priorityClass = (p) => ({
  low: 'badge badge-low', medium: 'badge badge-medium',
  high: 'badge badge-high', urgent: 'badge badge-urgent'
}[p] || 'badge badge-medium');

const statusClass = (s) => ({
  todo: 'badge badge-todo', in_progress: 'badge badge-progress', done: 'badge badge-done',
  pending: 'badge badge-todo', completed: 'badge badge-done'
}[s] || 'badge badge-todo');

const statusLabel = (s) => ({ 
  todo: 'To Do', in_progress: 'In Progress', done: 'Done',
  pending: 'Pending', completed: 'Completed'
}[s] || s);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-center"><div className="spinner" /></div>
  );

  const { projects, tasks, urgentTasks, myTasks } = stats || {};
  const completionRate = tasks?.total_tasks > 0
    ? Math.round((tasks.done_tasks / tasks.total_tasks) * 100) : 0;

  const isOverdue = (due) => due && isBefore(parseISO(due), startOfToday());

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {format(new Date(), 'EEEE, MMMM do yyyy')} · Here's what's happening today
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #06b6d4, #22d3ee)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <CheckSquare size={20} color="#06b6d4" />
            <span className="badge badge-progress">{tasks?.todo_tasks || 0} pending</span>
          </div>
          <div className="stat-value">{tasks?.total_tasks || 0}</div>
          <div className="stat-label">Total Tasks</div>
        </div>

        <div className="stat-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #10b981, #34d399)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TrendingUp size={20} color="#10b981" />
            <span className="badge badge-done">{tasks?.done_tasks || 0} done</span>
          </div>
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">Completion Rate</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ef4444, #f87171)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: tasks?.overdue_tasks > 0 ? 'var(--danger)' : 'inherit' }}>
            {tasks?.overdue_tasks || 0}
          </div>
          <div className="stat-label">Overdue Tasks</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Urgent / overdue tasks */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="var(--warning)" />
              <span className="section-title">Needs Attention</span>
            </div>
            <Link to="/tasks" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {urgentTasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <CheckSquare size={32} />
              <h3>All clear!</h3>
              <p>No urgent or overdue tasks right now.</p>
            </div>
          ) : (
            urgentTasks?.map(task => (
              <div key={task.id} className="task-card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div className="task-card-title" style={{ marginBottom: 4 }}>{task.title}</div>
                    {user?.role === 'admin' && task.assigned_to_name && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div className="avatar" style={{ width: 14, height: 14, fontSize: '0.45rem', background: task.assigned_to_color }}>
                          {task.assigned_to_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        {task.assigned_to_name}
                      </div>
                    )}
                  </div>
                  <span className={priorityClass(task.priority)}>{task.priority}</span>
                </div>
                <div className="task-card-meta" style={{ marginTop: 8 }}>
                  <span className={statusClass(task.status)}>{statusLabel(task.status)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                    className={isOverdue(task.due_date) ? 'overdue' : 'text-muted'}>
                    <Clock size={12} />
                    {task.due_date ? format(parseISO(task.due_date), 'MMM d') : 'No due date'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* My tasks */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckSquare size={16} color="var(--primary-light)" />
              <span className="section-title">My Tasks</span>
            </div>
          </div>
          {user?.role === 'admin' ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <FolderKanban size={32} />
              <h3>Admin view</h3>
              <p>As admin you see all tasks in the urgent panel above.</p>
            </div>
          ) : myTasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <CheckSquare size={32} />
              <h3>No tasks assigned</h3>
              <p>You have no pending tasks.</p>
            </div>
          ) : (
            myTasks?.map(task => (
              <div key={task.id} className="task-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div className="task-card-title">{task.title}</div>
                  <span className={priorityClass(task.priority)}>{task.priority}</span>
                </div>
                <div className="task-card-meta">
                  <span className={statusClass(task.status)}>{statusLabel(task.status)}</span>
                  {task.due_date && (
                    <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                      className={isOverdue(task.due_date) ? 'overdue' : 'text-muted'}>
                      <Clock size={12} />{format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.project_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
