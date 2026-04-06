import { useDeferredValue, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CrudEditorLayout, CRUD_EDITOR_ACTIONS_CLASS, CRUD_EDITOR_FORM_GRID_CLASS } from '@/components/ui/CrudEditorLayout';
import { CrudTabs } from '@/components/ui/CrudTabs';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { CRUD_MAIN_TAB_ID, type CrudEditorTab, useCrudTabs } from '@/lib/crudTabs';
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS, getPaginationMeta } from '@/lib/pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { categoryService } from '@/services/category';
import { productService } from '@/services/product';
import { vendorService } from '@/services/vendor';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';
import { formatCurrency, formatNumber, resolveAssetUrl } from '@/lib/utils';
import type { Product } from '@/types/api';

interface ProductFormState {
    category_id: string;
    vendor_id: string;
    name: string;
    code: string;
    barcode: string;
    description: string;
    cost_price: string;
    selling_price: string;
    status: 'active' | 'inactive';
    track_expiry: boolean;
    expiry_date: string;
    low_stock_alert: string;
}

const emptyForm: ProductFormState = {
    category_id: '',
    vendor_id: '',
    name: '',
    code: '',
    barcode: '',
    description: '',
    cost_price: '0',
    selling_price: '0',
    status: 'active',
    track_expiry: false,
    expiry_date: '',
    low_stock_alert: '0'
};

function normalizeExpiryDate(value?: string | null): string {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 10);
}

export function ProductsPage() {
    const queryClient = useQueryClient();
    const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const deferredSearch = useDeferredValue(search);
    const crudTabs = useCrudTabs<ProductFormState, Product>({
        createEmptyForm: () => ({ ...emptyForm }),
        getEditForm: (product) => ({
            category_id: String(product.category_id ?? ''),
            vendor_id: product.vendor_id ? String(product.vendor_id) : '',
            name: product.name ?? '',
            code: product.code ?? '',
            barcode: product.barcode ?? '',
            description: product.description ?? '',
            cost_price: String(product.cost_price ?? 0),
            selling_price: String(product.selling_price ?? 0),
            status: product.status === 'inactive' ? 'inactive' : 'active',
            track_expiry: Boolean(product.track_expiry || product.expiry_date),
            expiry_date: normalizeExpiryDate(product.expiry_date),
            low_stock_alert: String(product.low_stock_alert ?? 0)
        })
    });

    const productsQuery = useQuery({
        queryKey: ['products', selectedBranchId, deferredSearch, lowStockOnly, page, pageSize],
        queryFn: () =>
            productService.getAll({
                branch_id: selectedBranchId ?? undefined,
                page,
                per_page: pageSize,
                search: deferredSearch || undefined,
                low_stock: lowStockOnly || undefined
            }),
        placeholderData: (previousData) => previousData
    });

    const categoriesQuery = useQuery({
        queryKey: ['product-form-categories'],
        queryFn: () => categoryService.getAll({ per_page: 200 })
    });

    const vendorsQuery = useQuery({
        queryKey: ['product-form-vendors'],
        queryFn: () => vendorService.getAll({ per_page: 200 })
    });

    const saveMutation = useMutation({
        mutationFn: async (tab: CrudEditorTab<ProductFormState>) => {
            const payload = tab.form;
            const data = {
                branch_id: selectedBranchId ?? undefined,
                category_id: Number(payload.category_id),
                vendor_id: payload.vendor_id ? Number(payload.vendor_id) : undefined,
                name: payload.name.trim(),
                code: payload.code.trim() || undefined,
                barcode: payload.barcode.trim() || undefined,
                description: payload.description.trim() || undefined,
                cost_price: Number(payload.cost_price),
                selling_price: Number(payload.selling_price),
                status: payload.status,
                track_expiry: payload.track_expiry,
                expiry_date: payload.track_expiry && payload.expiry_date ? payload.expiry_date : undefined,
                low_stock_alert: Number(payload.low_stock_alert || '0')
            };

            if (tab.type === 'edit' && tab.entityId) {
                return productService.update(tab.entityId, data);
            }

            if (!selectedBranchId) {
                throw new Error('Select a branch before creating a product.');
            }

            return productService.create(data);
        },
        onSuccess: async (_data, tab) => {
            toast.success(tab.type === 'edit' ? 'Product updated.' : 'Product created.');
            crudTabs.closeTab(tab.id);
            await queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            toast.error(extractApiError(error));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => productService.delete(id),
        onSuccess: async () => {
            toast.success('Product deleted.');
            await queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            toast.error(extractApiError(error));
        }
    });

    const products = (productsQuery.data?.data ?? []) as Product[];
    const categories = categoriesQuery.data?.data ?? [];
    const vendors = vendorsQuery.data?.data ?? [];
    const productsMeta = getPaginationMeta(productsQuery.data?.meta);
    const isProductsInitialLoad = productsQuery.isLoading && !productsQuery.data;
    const isProductReferencesInitialLoad =
        (categoriesQuery.isLoading && !categoriesQuery.data) || (vendorsQuery.isLoading && !vendorsQuery.data);
    const activeEditorTab = crudTabs.activeEditorTab;
    const inputClass = 'input input-bordered w-full';
    const selectClass = 'select select-bordered w-full';
    const textareaClass = 'textarea textarea-bordered min-h-28 w-full';
    const tabItems = [
        { id: CRUD_MAIN_TAB_ID, type: 'main' as const, title: 'Products' },
        ...crudTabs.tabs.map((tab) => ({ id: tab.id, type: tab.type, title: tab.title }))
    ];

    useEffect(() => {
        setPage(1);
    }, [selectedBranchId]);

    if (isProductsInitialLoad || isProductReferencesInitialLoad) {
        return <LoadingState label="Loading products..." />;
    }

    if (productsQuery.isError && !productsQuery.data) {
        return <ErrorState message={productsQuery.error.message} />;
    }

    if (categoriesQuery.isError && !categoriesQuery.data) {
        return <ErrorState message={categoriesQuery.error.message} />;
    }

    if (vendorsQuery.isError && !vendorsQuery.data) {
        return <ErrorState message={vendorsQuery.error.message} />;
    }

    return (
        <div className="space-y-6">
            <CrudTabs
                activeTabId={crudTabs.activeTabId}
                tabs={tabItems}
                onSelectTab={crudTabs.setActiveTabId}
                onCloseTab={crudTabs.closeTab}
                onCreateTab={crudTabs.openCreateTab}
            >
                {activeEditorTab ? (
                    <CrudEditorLayout
                        title={activeEditorTab.type === 'edit' ? 'Edit product' : 'Create product'}
                        description={
                            activeEditorTab.type === 'edit'
                                ? 'Update pricing, status, and stock rules.'
                                : 'Create a product for the selected branch inventory.'
                        }
                        onClose={() => crudTabs.closeTab(activeEditorTab.id)}
                    >
                        {activeEditorTab.type === 'create' && !selectedBranchId ? (
                            <EmptyState
                                title="Branch required"
                                message="Pick a branch from the header before creating a product."
                            />
                        ) : (
                            <form
                                className={CRUD_EDITOR_FORM_GRID_CLASS}
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    saveMutation.mutate(activeEditorTab);
                                }}
                            >
                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Category</legend>
                                    <select
                                        id="product-category"
                                        className={selectClass}
                                        value={activeEditorTab.form.category_id}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, category_id: event.target.value }))
                                        }
                                        required
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </fieldset>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Vendor</legend>
                                    <select
                                        id="product-vendor"
                                        className={selectClass}
                                        value={activeEditorTab.form.vendor_id}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, vendor_id: event.target.value }))
                                        }
                                    >
                                        <option value="">No vendor</option>
                                        {vendors.map((vendor) => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.name}
                                            </option>
                                        ))}
                                    </select>
                                </fieldset>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Status</legend>
                                    <select
                                        id="product-status"
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

                                <fieldset className="fieldset xl:col-span-2">
                                    <legend className="fieldset-legend">Product name</legend>
                                    <input
                                        id="product-name"
                                        className={inputClass}
                                        value={activeEditorTab.form.name}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, name: event.target.value }))
                                        }
                                        required
                                    />
                                </fieldset>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Code</legend>
                                    <input
                                        id="product-code"
                                        className={inputClass}
                                        value={activeEditorTab.form.code}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, code: event.target.value }))
                                        }
                                    />
                                </fieldset>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Barcode</legend>
                                    <input
                                        id="product-barcode"
                                        className={inputClass}
                                        value={activeEditorTab.form.barcode}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, barcode: event.target.value }))
                                        }
                                    />
                                </fieldset>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Cost price</legend>
                                    <input
                                        id="product-cost"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={inputClass}
                                        value={activeEditorTab.form.cost_price}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, cost_price: event.target.value }))
                                        }
                                        required
                                    />
                                </fieldset>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Selling price</legend>
                                    <input
                                        id="product-selling"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={inputClass}
                                        value={activeEditorTab.form.selling_price}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, selling_price: event.target.value }))
                                        }
                                        required
                                    />
                                </fieldset>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Low stock alert</legend>
                                    <input
                                        id="product-low-stock"
                                        type="number"
                                        min="0"
                                        className={inputClass}
                                        value={activeEditorTab.form.low_stock_alert}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, low_stock_alert: event.target.value }))
                                        }
                                    />
                                </fieldset>

                                <label className="card border border-base-300 bg-base-200/60 xl:col-span-2">
                                    <div className="card-body flex-row items-center gap-4 p-4">
                                        <input
                                            id="product-expiry-toggle"
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            checked={activeEditorTab.form.track_expiry}
                                            onChange={(event) =>
                                                crudTabs.updateTabForm(activeEditorTab.id, (current) => ({
                                                    ...current,
                                                    track_expiry: event.target.checked,
                                                    expiry_date: event.target.checked ? current.expiry_date : ''
                                                }))
                                            }
                                        />
                                        <div>
                                            <p className="font-medium text-base-content">Track expiry</p>
                                            <p className="text-sm text-base-content/60">Enable expiry-date tracking for perishable stock.</p>
                                        </div>
                                    </div>
                                </label>

                                <fieldset className="fieldset">
                                    <legend className="fieldset-legend">Expiry date</legend>
                                    <input
                                        id="product-expiry-date"
                                        type="date"
                                        className={inputClass}
                                        value={activeEditorTab.form.expiry_date}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, expiry_date: event.target.value }))
                                        }
                                        disabled={!activeEditorTab.form.track_expiry}
                                    />
                                </fieldset>

                                <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                                    <legend className="fieldset-legend">Description</legend>
                                    <textarea
                                        id="product-description"
                                        className={textareaClass}
                                        value={activeEditorTab.form.description}
                                        onChange={(event) =>
                                            crudTabs.updateTabForm(activeEditorTab.id, (current) => ({ ...current, description: event.target.value }))
                                        }
                                    />
                                </fieldset>

                                <div className={CRUD_EDITOR_ACTIONS_CLASS}>
                                    <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                                        {saveMutation.isPending
                                            ? 'Saving...'
                                            : activeEditorTab.type === 'edit'
                                                ? 'Update product'
                                                : 'Create product'}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => crudTabs.closeTab(activeEditorTab.id)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </CrudEditorLayout>
                ) : (
                    <div className="space-y-4">
                        <div className="card border border-base-300 bg-base-100 shadow-sm">
                            <div className="card-body gap-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                    <label className="input input-bordered flex w-full items-center gap-2 lg:flex-1">
                                        <Search className="h-4 w-4 opacity-60" />
                                        <input
                                            className="grow bg-transparent outline-none"
                                            placeholder="Search by name, code, or barcode"
                                            value={search}
                                            onChange={(event) => {
                                                setSearch(event.target.value);
                                                setPage(1);
                                            }}
                                        />
                                    </label>
                                    <label className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/60 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            checked={lowStockOnly}
                                            onChange={(event) => {
                                                setLowStockOnly(event.target.checked);
                                                setPage(1);
                                            }}
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-base-content">Low stock only</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="card border border-base-300 bg-base-100 shadow-sm">
                            <div className="card-body p-0">
                                <DataTable
                                    data={products}
                                    keyExtractor={(product) => product.id}
                                    emptyMessage="No products matched the current filters."
                                    isUpdating={productsQuery.isFetching}
                                    updateLabel="Refreshing products..."
                                    pagination={{
                                        page,
                                        pageSize,
                                        totalItems: productsMeta.totalItems,
                                        totalPages: productsMeta.totalPages,
                                        pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
                                        onPageChange: setPage,
                                        onPageSizeChange: (nextPageSize) => {
                                            setPageSize(nextPageSize);
                                            setPage(1);
                                        }
                                    }}
                                    columns={[
                                        {
                                            header: 'Image',
                                            cell: (product) => {
                                                const imageUrl = resolveAssetUrl(product.image ?? product.image_url);

                                                return imageUrl ? (
                                                    <div className="avatar">
                                                        <div className="h-12 w-12 rounded-box">
                                                            <img
                                                                src={imageUrl}
                                                                alt={product.name}
                                                                className="h-12 w-12 object-cover"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="avatar placeholder">
                                                        <div className="h-12 w-12 rounded-box bg-base-200 text-[11px] font-medium text-base-content/50">
                                                            <span>N/A</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        },
                                        {
                                            header: 'Product',
                                            cell: (product) => (
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-base-content">{product.name}</p>
                                                    <p className="text-xs text-base-content/55">{product.description || 'No description'}</p>
                                                </div>
                                            )
                                        },
                                        {
                                            header: 'Code',
                                            cell: (product) => (
                                                <span className="badge badge-ghost font-mono">{product.code ?? '-'}</span>
                                            )
                                        },
                                        {
                                            header: 'Barcode',
                                            cell: (product) => (
                                                <span className="badge badge-ghost font-mono">{product.barcode ?? '-'}</span>
                                            )
                                        },
                                        {
                                            header: 'Category',
                                            cell: (product) => {
                                                const categoryName = product.category?.name ?? 'Uncategorized';

                                                return (
                                                    <span
                                                        className="badge badge-outline inline-flex max-w-[140px] truncate whitespace-nowrap align-middle"
                                                        title={categoryName}
                                                    >
                                                        {categoryName}
                                                    </span>
                                                );
                                            }
                                        },
                                        {
                                            header: 'Price',
                                            cell: (product) => <span className="font-semibold">{formatCurrency(Number(product.selling_price ?? 0))}</span>
                                        },
                                        {
                                            header: 'Stock',
                                            cell: (product) => <span className="badge badge-neutral">{formatNumber(product.stock?.quantity_on_hand ?? 0)}</span>
                                        },
                                        {
                                            header: 'Status',
                                            cell: (product) => (
                                                <StatusBadge value={product.status ?? (product.is_active ? 'active' : 'inactive')} />
                                            )
                                        },
                                        {
                                            header: 'Actions',
                                            cell: (product) => (
                                                <div className="flex items-center gap-2">
                                                    <button type="button" className="btn btn-secondary btn-sm btn-square" title="Edit" onClick={() => crudTabs.openEditTab(product)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-error btn-sm btn-square"
                                                        title="Delete"
                                                        onClick={() => {
                                                            if (window.confirm(`Delete product "${product.name}"?`)) {
                                                                deleteMutation.mutate(product.id);
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
                )}
            </CrudTabs>
        </div>
    );
}
