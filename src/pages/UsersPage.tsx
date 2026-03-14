import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { branchService } from '@/services/branch';
import { roleService } from '@/services/role';
import { userService, type UserPayload } from '@/services/user';
import { extractApiError } from '@/lib/api';
import type { User } from '@/types/api';

interface UserFormState {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: string;
  branch_id: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  branch_ids: number[];
}

const emptyForm: UserFormState = {
  name: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
  role_id: '',
  branch_id: '',
  phone: '',
  address: '',
  status: 'active',
  branch_ids: []
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const deferredSearch = useDeferredValue(search);

  const usersQuery = useQuery({
    queryKey: ['users', deferredSearch, page, pageSize],
    queryFn: () =>
      userService.getAll({
        page,
        per_page: pageSize,
        search: deferredSearch || undefined
      }),
    placeholderData: (previousData) => previousData
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getAll()
  });

  const branchesQuery = useQuery({
    queryKey: ['user-form-branches'],
    queryFn: () => branchService.getAll({ per_page: 200 })
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: UserFormState) => {
      const data: UserPayload = {
        name: payload.name.trim(),
        username: payload.username.trim(),
        email: payload.email.trim(),
        role_id: Number(payload.role_id),
        branch_id: payload.branch_id ? Number(payload.branch_id) : undefined,
        phone: payload.phone.trim() || undefined,
        address: payload.address.trim() || undefined,
        status: payload.status,
        branch_ids: payload.branch_ids
      };

      if (payload.password) {
        data.password = payload.password;
        data.password_confirmation = payload.password_confirmation;
      }

      if (editingUser) {
        return userService.update(editingUser.id, data);
      }

      if (!data.password) {
        throw new Error('Password is required for a new user.');
      }

      return userService.create(data as UserPayload & { password: string });
    },
    onSuccess: async () => {
      toast.success(editingUser ? 'User updated.' : 'User created.');
      resetEditor();
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: async () => {
      toast.success('User deleted.');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const users = (usersQuery.data?.data ?? []) as User[];
  const roles = rolesQuery.data ?? [];
  const branches = branchesQuery.data ?? [];
  const usersMeta = getPaginationMeta(usersQuery.data?.meta);
  const isUsersInitialLoad = usersQuery.isLoading && !usersQuery.data;
  const isUserReferencesInitialLoad =
    (rolesQuery.isLoading && !rolesQuery.data) || (branchesQuery.isLoading && !branchesQuery.data);

  function resetEditor() {
    setIsEditorOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setIsEditorOpen(true);
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setForm({
      name: user.name ?? '',
      username: user.username ?? '',
      email: user.email ?? '',
      password: '',
      password_confirmation: '',
      role_id: String(user.role?.id ?? user.role_id ?? ''),
      branch_id: String(user.primary_branch?.id ?? user.branch_id ?? ''),
      phone: user.phone ?? '',
      address: user.address ?? '',
      status: user.status === 'inactive' ? 'inactive' : 'active',
      branch_ids: (user.branches ?? []).map((branch) => branch.id)
    });
    setIsEditorOpen(true);
  }

  function toggleBranch(branchId: number) {
    setForm((current) => {
      const nextBranchIds = current.branch_ids.includes(branchId)
        ? current.branch_ids.filter((id) => id !== branchId)
        : [...current.branch_ids, branchId];

      return {
        ...current,
        branch_ids: nextBranchIds,
        branch_id:
          current.branch_id && !nextBranchIds.includes(Number(current.branch_id))
            ? ''
            : current.branch_id
      };
    });
  }

  if (isUsersInitialLoad || isUserReferencesInitialLoad) {
    return <LoadingState label="Loading users..." />;
  }

  if (usersQuery.isError && !usersQuery.data) {
    return <ErrorState message={usersQuery.error.message} />;
  }

  if (rolesQuery.isError && !rolesQuery.data) {
    return <ErrorState message={rolesQuery.error.message} />;
  }

  if (branchesQuery.isError && !branchesQuery.data) {
    return <ErrorState message={branchesQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage staff accounts, roles, and branch access."
        actions={
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            New user
          </button>
        }
      />

      {isEditorOpen ? (
        <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                {editingUser ? 'Edit user' : 'Create user'}
              </h2>
              <p className="text-sm text-surface-500">
                {editingUser
                  ? 'Update user role, branch access, and profile details.'
                  : 'Create a new team member account.'}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={resetEditor}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div>
              <label className="label" htmlFor="user-name">
                Name
              </label>
              <input
                id="user-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="user-username">
                Username
              </label>
              <input
                id="user-username"
                className="input"
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="user-email">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                className="input"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="user-role">
                Role
              </label>
              <select
                id="user-role"
                className="input"
                value={form.role_id}
                onChange={(event) => setForm((current) => ({ ...current, role_id: event.target.value }))}
                required
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="user-status">
                Status
              </label>
              <select
                id="user-status"
                className="input"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as 'active' | 'inactive'
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="user-primary-branch">
                Primary branch
              </label>
              <select
                id="user-primary-branch"
                className="input"
                value={form.branch_id}
                onChange={(event) => setForm((current) => ({ ...current, branch_id: event.target.value }))}
              >
                <option value="">No primary branch</option>
                {branches
                  .filter((branch) => form.branch_ids.includes(branch.id))
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="user-phone">
                Phone
              </label>
              <input
                id="user-phone"
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label" htmlFor="user-address">
                Address
              </label>
              <textarea
                id="user-address"
                className="input min-h-24"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
            </div>

            <div>
              <label className="label" htmlFor="user-password">
                Password
              </label>
              <input
                id="user-password"
                type="password"
                className="input"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                required={!editingUser}
              />
            </div>

            <div>
              <label className="label" htmlFor="user-password-confirmation">
                Confirm password
              </label>
              <input
                id="user-password-confirmation"
                type="password"
                className="input"
                value={form.password_confirmation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password_confirmation: event.target.value
                  }))
                }
                required={!editingUser || Boolean(form.password)}
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="label">Branch access</label>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {branches.map((branch) => (
                  <label
                    key={branch.id}
                    className="flex items-center gap-3 rounded-2xl border border-surface-200 px-4 py-3 text-sm text-surface-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.branch_ids.includes(branch.id)}
                      onChange={() => toggleBranch(branch.id)}
                    />
                    <span>{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingUser ? 'Update user' : 'Create user'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetEditor}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="card">
        <input
          className="input"
          placeholder="Search users by name, username, or email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={users}
            keyExtractor={(user) => user.id}
            emptyMessage="No users matched the current search."
            isUpdating={usersQuery.isFetching}
            updateLabel="Refreshing users..."
            pagination={{
              page,
              pageSize,
              totalItems: usersMeta.totalItems,
              totalPages: usersMeta.totalPages,
              pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
              onPageChange: setPage,
              onPageSizeChange: (nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }
            }}
            columns={[
              {
                header: 'User',
                cell: (user) => (
                  <div>
                    <p className="font-medium text-surface-900">{user.name}</p>
                    <p className="text-xs text-surface-500">@{user.username}</p>
                  </div>
                )
              },
              {
                header: 'Email',
                cell: (user) => user.email
              },
              {
                header: 'Role',
                cell: (user) => user.role?.name ?? 'Unassigned'
              },
              {
                header: 'Branches',
                cell: (user) =>
                  user.can_access_all_branches
                    ? 'All branches'
                    : (user.branches ?? []).map((branch) => branch.name).join(', ') || 'No branches'
              },
              {
                header: 'Status',
                cell: (user) => <StatusBadge value={user.status ?? 'active'} />
              },
              {
                header: 'Actions',
                cell: (user) => (
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary btn-icon" onClick={() => startEdit(user)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => {
                        if (window.confirm(`Delete user "${user.name}"?`)) {
                          deleteMutation.mutate(user.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
