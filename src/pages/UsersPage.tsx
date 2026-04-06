import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CrudEditorLayout, CRUD_EDITOR_ACTIONS_CLASS, CRUD_EDITOR_FORM_GRID_CLASS } from '@/components/ui/CrudEditorLayout';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
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
  const deferredSearch = useDeferredValue(search);
  const crudTabs = useCrudTabs<UserFormState, User>({
    createEmptyForm: () => ({ ...emptyForm, branch_ids: [] }),
    getEditForm: (user) => ({
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
    })
  });

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
    mutationFn: async (tab: CrudEditorTab<UserFormState>) => {
      const payload = tab.form;
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

      if (tab.type === 'edit' && tab.entityId) {
        return userService.update(tab.entityId, data);
      }

      if (!data.password) {
        throw new Error('Password is required for a new user.');
      }

      return userService.create(data as UserPayload & { password: string });
    },
    onSuccess: async (_data, tab) => {
      toast.success(tab.type === 'edit' ? 'User updated.' : 'User created.');
      crudTabs.closeTab(tab.id);
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
  const activeEditorTab = crudTabs.activeEditorTab;
  const inputClass = 'input input-bordered w-full';
  const selectClass = 'select select-bordered w-full';
  const textareaClass = 'textarea textarea-bordered min-h-24 w-full';
  const tabItems = [
    { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Users' },
    ...crudTabs.tabs.map((tab) => ({ id: tab.id, type: tab.type, title: tab.title }))
  ];

  function toggleBranch(branchId: number) {
    if (!activeEditorTab) {
      return;
    }

    crudTabs.updateTabForm(activeEditorTab.id, (current) => {
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
      />

      <CrudTabs
        activeTabId={crudTabs.activeTabId}
        tabs={tabItems}
        onSelectTab={crudTabs.setActiveTabId}
        onCloseTab={crudTabs.closeTab}
        onCreateTab={crudTabs.openCreateTab}
      >
        {activeEditorTab ? (
          <CrudEditorLayout
            title={activeEditorTab.type === 'edit' ? 'Edit user' : 'Create user'}
            description={
              activeEditorTab.type === 'edit'
                ? 'Update user role, branch access, and profile details.'
                : 'Create a new team member account.'
            }
            onClose={() => crudTabs.closeTab(activeEditorTab.id)}
          >
            <form
              className={CRUD_EDITOR_FORM_GRID_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate(activeEditorTab);
              }}
            >
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Name</legend>
                <input
                  id="user-name"
                  className={inputClass}
                  value={activeEditorTab.form.name}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Username</legend>
                <input
                  id="user-username"
                  className={inputClass}
                  value={activeEditorTab.form.username}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, username: event.target.value }))
                  }
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Email</legend>
                <input
                  id="user-email"
                  type="email"
                  className={inputClass}
                  value={activeEditorTab.form.email}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Role</legend>
                <select
                  id="user-role"
                  className={selectClass}
                  value={activeEditorTab.form.role_id}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, role_id: event.target.value }))
                  }
                  required
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Status</legend>
                <select
                  id="user-status"
                  className={selectClass}
                  value={activeEditorTab.form.status}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                      ...current,
                      status: event.target.value as 'active' | 'inactive'
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Primary branch</legend>
                <select
                  id="user-primary-branch"
                  className={selectClass}
                  value={activeEditorTab.form.branch_id}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, branch_id: event.target.value }))
                  }
                >
                  <option value="">No primary branch</option>
                  {branches
                    .filter((branch) => activeEditorTab.form.branch_ids.includes(branch.id))
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Phone</legend>
                <input
                  id="user-phone"
                  className={inputClass}
                  value={activeEditorTab.form.phone}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </fieldset>

              <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                <legend className="fieldset-legend">Address</legend>
                <textarea
                  id="user-address"
                  className={textareaClass}
                  value={activeEditorTab.form.address}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, address: event.target.value }))
                  }
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Password</legend>
                <input
                  id="user-password"
                  type="password"
                  className={inputClass}
                  value={activeEditorTab.form.password}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder={activeEditorTab.type === 'edit' ? 'Leave blank to keep current password' : ''}
                  required={activeEditorTab.type === 'create'}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Confirm password</legend>
                <input
                  id="user-password-confirmation"
                  type="password"
                  className={inputClass}
                  value={activeEditorTab.form.password_confirmation}
                  onChange={(event) =>
                    crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                      ...current,
                      password_confirmation: event.target.value
                    }))
                  }
                  required={activeEditorTab.type === 'create' || Boolean(activeEditorTab.form.password)}
                />
              </fieldset>

              <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                <legend className="fieldset-legend">Branch access</legend>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {branches.map((branch) => (
                    <label key={branch.id} className="app-soft-panel flex items-center gap-3 px-4 py-3 text-sm text-surface-700">
                      <input
                        type="checkbox"
                        checked={activeEditorTab.form.branch_ids.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      <span>{branch.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={CRUD_EDITOR_ACTIONS_CLASS}>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? 'Saving...'
                    : activeEditorTab.type === 'edit'
                      ? 'Update user'
                      : 'Create user'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
                  Cancel
                </button>
              </div>
            </form>
          </CrudEditorLayout>
        ) : (
          <div className="space-y-4">
            <input
              className="input"
              placeholder="Search users by name, username, or email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />

            <div className="app-table-shell">
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
                        <button type="button" className="btn btn-sm btn-square" title="Edit" onClick={() => crudTabs.openEditTab(user)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-error btn-sm btn-square"
                          title="Delete"
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
        )}
      </CrudTabs>
    </div>
  );
}
