import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { branchService } from '@/services/branch';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import type { Branch } from '@/types/api';

interface BranchSelectorProps {
  className?: string;
  fullWidth?: boolean;
  showMobileLabel?: boolean;
  labelVariant?: 'text' | 'icon';
}

function toBranchOption(branch: Branch) {
  return {
    id: branch.id,
    name: branch.name
  };
}

export function BranchSelector({
  className = '',
  fullWidth = false,
  showMobileLabel = false,
  labelVariant = 'text'
}: BranchSelectorProps) {
  const user = useAuthStore((state) => state.user);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);
  const setBranches = useBranchStore((state) => state.setBranches);

  const branchQuery = useQuery({
    queryKey: ['branch-selector', user?.id],
    queryFn: () => branchService.getAll({ per_page: 100 }),
    enabled: Boolean(user?.can_access_all_branches)
  });

  const availableBranches = branchQuery.data?.length
    ? branchQuery.data
    : (user?.branches ?? []);

  useEffect(() => {
    if (availableBranches.length === 0) {
      return;
    }

    setBranches(availableBranches.map(toBranchOption));

    const hasCurrentSelection = availableBranches.some((branch) => branch.id === selectedBranchId);
    if (hasCurrentSelection) {
      return;
    }

    const defaultBranchId =
      user?.primary_branch?.id ??
      user?.branch_id ??
      availableBranches[0]?.id ??
      null;

    setSelectedBranch(defaultBranchId);
  }, [
    availableBranches,
    selectedBranchId,
    setBranches,
    setSelectedBranch,
    user?.branch_id,
    user?.primary_branch?.id
  ]);

  if (availableBranches.length === 0) {
    return null;
  }

  return (
    <label
      className={`flex text-sm text-surface-600 ${
        fullWidth ? 'w-full flex-col items-stretch gap-1.5' : 'items-center gap-2'
      } ${className}`.trim()}
    >
      {labelVariant === 'icon' ? (
        <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <span className={showMobileLabel ? '' : 'hidden sm:inline'}>Branch</span>
      )}
      <select
        className={`select select-bordered min-h-11 rounded-box bg-base-100 text-base-content ${
          fullWidth ? 'w-full min-w-0' : 'min-w-40'
        }`}
        aria-label={labelVariant === 'icon' ? 'Branch' : undefined}
        value={selectedBranchId ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          setSelectedBranch(value ? Number(value) : null);
        }}
      >
        {availableBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
