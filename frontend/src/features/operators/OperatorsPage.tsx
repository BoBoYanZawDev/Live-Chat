import { useState, type FormEvent } from 'react';
import { Avatar } from '../../components/Avatar';
import { formatDate } from '../../lib/format';
import { useAuthStore } from '../../stores/auth.store';
import { usePortalStore } from '../../stores/portal.store';
import type { OperatorRole } from '../../types';
import { useCreateOperator, useOperators, useUpdateOperator } from './api';

const emptyForm = { name: '', email: '', password: '', role: 'OPERATOR' as OperatorRole };

export function OperatorsPage() {
  const meId = useAuthStore((s) => s.operator?.id);
  const online = usePortalStore((s) => s.onlineOperators);
  const { data: operators = [], isLoading, error } = useOperators();
  const create = useCreateOperator();
  const update = useUpdateOperator();
  const [form, setForm] = useState(emptyForm);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(form, { onSuccess: () => setForm(emptyForm) });
  };

  const resetPassword = (id: string, name: string) => {
    const password = window.prompt(`New password for ${name} (min 8 characters). They will be signed out.`);
    if (password) update.mutate({ id, password });
  };

  return (
    <section className="operators-page">
      <header>
        <h1>Team</h1>
        <p className="muted">Operators answer customer chats from this portal. Admins can also manage the team.</p>
      </header>

      <form className="card operator-form" onSubmit={onSubmit}>
        <h2>Add operator</h2>
        <div className="form-grid">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            placeholder="Temporary password (min 8)"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as OperatorRole })}>
            <option value="OPERATOR">Operator</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
        {create.error && <p className="error">{create.error.message}</p>}
      </form>

      <div className="card">
        {isLoading && <p className="muted">Loading…</p>}
        {error && <p className="error">{error.message}</p>}
        {update.error && <p className="error">{update.error.message}</p>}
        <table className="table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Role</th>
              <th>Status</th>
              <th>Added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {operators.map((o) => {
              const isOnline = online.some((x) => x.id === o.id);
              return (
                <tr key={o.id} className={o.isActive ? '' : 'inactive'}>
                  <td>
                    <div className="op-cell">
                      <Avatar name={o.name} seed={o.id} size={32} online={isOnline} />
                      <div>
                        <strong>
                          {o.name}
                          {o.id === meId && <span className="muted"> (you)</span>}
                        </strong>
                        <div className="muted small">{o.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={o.role}
                      onChange={(e) => update.mutate({ id: o.id, role: e.target.value as OperatorRole })}
                      disabled={update.isPending}
                    >
                      <option value="OPERATOR">Operator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-pill ${o.isActive ? 'open' : ''}`}>{o.isActive ? 'Active' : 'Deactivated'}</span>
                  </td>
                  <td className="muted small">{formatDate(o.createdAt)}</td>
                  <td className="row-actions">
                    <button className="secondary" onClick={() => resetPassword(o.id, o.name)} disabled={update.isPending}>
                      Reset password
                    </button>
                    {o.id !== meId && (
                      <button
                        className={o.isActive ? 'danger' : 'secondary'}
                        onClick={() => update.mutate({ id: o.id, isActive: !o.isActive })}
                        disabled={update.isPending}
                      >
                        {o.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
