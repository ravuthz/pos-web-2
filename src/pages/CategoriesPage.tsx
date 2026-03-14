import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/PageHeader';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { categoryService } from '@/services/category';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import type { Category } from '@/types/api';

interface CategoryFormState {
  name: string;
  code: string;
  description: string;
  parent_id: string;
}

const emptyForm: CategoryFormState = {
  name: '',
  code: '',
  description: '',
  parent_id: ''
};

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const deferredSearch = useDeferredValue(search);
  const crudTabs = useCrudTabs<CategoryFormState, Category>({
    createEmptyForm: () => ({ ...emptyForm }),
    getEditForm: (category) => ({
      name: category.name ?? '',
      code: category.code ?? '',
      description: category.description ?? '',
      parent_id: category.parent_id ? String(category.parent_id) : ''
    })
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', deferredSearch, page, pageSize],
    queryFn: () =>
      categoryService.getAll({
        page,
        per_page: pageSize,
        search: deferredSearch || undefined
      }),
    placeholderData: (previousData) => previousData
  });

  const saveMutation = useMutation({
    mutationFn: async (tab: CrudEditorTab<CategoryFormState>) => {
      const payload = tab.form;
      const data = {
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        parent_id: payload.parent_id ? Number(payload.parent_id) : undefined
      };

      if (tab.type === 'edit' && tab.entityId) {
        return categoryService.update(tab.entityId, data);
      }

      if (!selectedBranchId) {
        throw new Error('Select a branch before creating a category.');
      }

      return categoryService.create({
        ...data,
        branch_id: selectedBranchId,
        code: payload.code.trim() || undefined
      });
    },
    onSuccess: async (_data, tab) => {
      toast.success(tab.type === 'edit' ? 'Category updated.' : 'Category created.');
      crudTabs.closeTab(tab.id);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: async () => {
      toast.success('Category deleted.');
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    }
  });

  const categories = (categoriesQuery.data?.data ?? []) as Category[];
  const categoriesMeta = getPaginationMeta(categoriesQuery.data?.meta);
  const isCategoriesInitialLoad = categoriesQuery.isLoading && !categoriesQuery.data;
  const activeEditorTab = crudTabs.activeEditorTab;
  const tabItems = [
    { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Categories' },
    ...crudTabs.tabs.map((tab) => ({ id: tab.id, type: tab.type, title: tab.title }))
  ];

  const parentOptions = useMemo(
    () => categories.filter((category) => category.id !== activeEditorTab?.entityId),
    [categories, activeEditorTab?.entityId]
  );

  if (isCategoriesInitialLoad) {
    return <LoadingState label="Loading categories..." />;
  }

  if (categoriesQuery.isError && !categoriesQuery.data) {
    return <ErrorState message={categoriesQuery.error.message} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Organize catalog structure and manage category hierarchy."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => crudTabs.openCreateTab()}>
            <Plus className="h-4 w-4" />
            New category
          </button>
        }
      />

      <CrudTabs
        activeTabId={crudTabs.activeTabId}
        tabs={tabItems}
        onSelectTab={crudTabs.setActiveTabId}
        onCloseTab={crudTabs.closeTab}
      >
        {activeEditorTab ? (
          <section className="card space-y-4">
          <div className="card-header mb-0">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">
                {activeEditorTab.type === 'edit' ? 'Edit category' : 'Create category'}
              </h2>
              <p className="text-sm text-surface-500">
                {activeEditorTab.type === 'edit'
                  ? 'Update category name, parent, and description.'
                  : 'Create a new product category for the selected branch.'}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeEditorTab.type === 'create' && !selectedBranchId ? (
            <EmptyState
              title="Branch required"
              message="Pick a branch from the header before creating a category."
            />
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate(activeEditorTab);
              }}
            >
              <div>
                <label className="label" htmlFor="category-name">
                  Name
                </label>
                <input
                id="category-name"
                className="input"
                value={activeEditorTab.form.name}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>

              <div>
                <label className="label" htmlFor="category-code">
                  Code
                </label>
                <input
                id="category-code"
                className="input"
                value={activeEditorTab.form.code}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, code: event.target.value }))
                }
                disabled={activeEditorTab.type === 'edit'}
                placeholder={activeEditorTab.type === 'edit' ? 'Code is fixed after creation' : 'Optional code'}
              />
            </div>

              <div>
                <label className="label" htmlFor="category-parent">
                  Parent category
                </label>
                <select
                id="category-parent"
                className="input"
                value={activeEditorTab.form.parent_id}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, parent_id: event.target.value }))
                }
              >
                  <option value="">Top level</option>
                  {parentOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="category-description">
                  Description
                </label>
                <textarea
                id="category-description"
                className="input min-h-28"
                value={activeEditorTab.form.description}
                onChange={(event) =>
                  crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? 'Saving...'
                  : activeEditorTab.type === 'edit'
                      ? 'Update category'
                      : 'Create category'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
                Cancel
              </button>
            </div>
          </form>
          )}
        </section>
        ) : (
          <div className="card">
        <input
          className="input"
          placeholder="Search categories"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-200">
          <DataTable
            data={categories}
            keyExtractor={(category) => category.id}
            emptyMessage="No categories matched the current search."
            isUpdating={categoriesQuery.isFetching}
            updateLabel="Refreshing categories..."
            pagination={{
              page,
              pageSize,
              totalItems: categoriesMeta.totalItems,
              totalPages: categoriesMeta.totalPages,
              pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
              onPageChange: setPage,
              onPageSizeChange: (nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }
            }}
            columns={[
              {
                header: 'Category',
                cell: (category) => (
                  <div>
                    <p className="font-medium text-surface-900">{category.name}</p>
                    <p className="text-xs text-surface-500">{category.code ?? 'No code'}</p>
                  </div>
                )
              },
              {
                header: 'Parent',
                cell: (category) => {
                  const parent = categories.find((item) => item.id === category.parent_id);
                  return parent?.name ?? 'Top level';
                }
              },
              {
                header: 'Description',
                cell: (category) => category.description ?? '-'
              },
              {
                header: 'Actions',
                cell: (category) => (
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-secondary btn-icon" onClick={() => crudTabs.openEditTab(category)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => {
                        if (window.confirm(`Delete category "${category.name}"?`)) {
                          deleteMutation.mutate(category.id);
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
