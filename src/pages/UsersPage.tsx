import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { userService } from '@/services/user';
import type { User } from '@/types/api';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const usersQuery = useQuery({
    queryKey: ['users', deferredSearch],
    queryFn: () => userService.getAll({ per_page: 50, search: deferredSearch || undefined })
  });

  if (usersQuery.isLoading) {
    return <LoadingState label="Loading users..." />;
  }

  if (usersQuery.isError) {
    return <ErrorState message={usersQuery.error.message} />;
  }

  const users = (usersQuery.data?.data ?? []) as User[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Review staff accounts, branch access, and assigned roles."
      />

      <div className="card">
        <input
          className="input"
          placeholder="Search users by name, username, or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={users}
            keyExtractor={(user) => user.id}
            emptyMessage="No users matched the current search."
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
                  user.can_access_all_branches ? 'All branches' : String(user.branches?.length ?? 0)
              },
              {
                header: 'Status',
                cell: (user) => <StatusBadge value={user.status ?? 'active'} />
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
