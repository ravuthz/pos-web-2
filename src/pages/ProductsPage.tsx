import { useDeferredValue, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProductForm, emptyProductForm, getProductEditForm, type ProductFormState } from '@/components/products/ProductForm';
import { CrudEditorLayout } from '@/components/ui/CrudEditorLayout';
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

export function ProductsPage() {
    const queryClient = useQueryClient();
    const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const deferredSearch = useDeferredValue(search);
    const crudTabs = useCrudTabs<ProductFormState, Product>({
        createEmptyForm: () => ({ ...emptyProductForm }),
        getEditForm: getProductEditForm
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
                low_stock_alert: Number(payload.low_stock_alert || '0'),
                image: payload.image ?? undefined
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
                            <ProductForm
                                tab={activeEditorTab}
                                categories={categories}
                                vendors={vendors}
                                isSaving={saveMutation.isPending}
                                onSubmit={() => saveMutation.mutate(activeEditorTab)}
                                onCancel={() => crudTabs.closeTab(activeEditorTab.id)}
                                onChange={(updater) => crudTabs.updateTabForm(activeEditorTab.id, updater)}
                            />
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
