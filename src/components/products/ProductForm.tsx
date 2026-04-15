import { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { CRUD_EDITOR_ACTIONS_CLASS, CRUD_EDITOR_FORM_GRID_CLASS } from '@/components/ui/CrudEditorLayout';
import type { CrudEditorTab } from '@/lib/crudTabs';
import { resolveAssetUrl } from '@/lib/utils';
import type { Product, Category, Vendor } from '@/types/api';

export interface ProductFormState {
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
    image: File | null;
    current_image: string;
}

export const emptyProductForm: ProductFormState = {
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
    low_stock_alert: '0',
    image: null,
    current_image: ''
};

function normalizeExpiryDate(value?: string | null): string {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 10);
}

export function getProductEditForm(product: Product): ProductFormState {
    return {
        category_id: String(product.category_id ?? ''),
        vendor_id: product.vendor_id ? String(product.vendor_id) : product.vendors?.[0]?.id ? String(product.vendors[0].id) : '',
        name: product.name ?? '',
        code: product.code ?? '',
        barcode: product.barcode ?? '',
        description: product.description ?? '',
        cost_price: String(product.cost_price ?? 0),
        selling_price: String(product.selling_price ?? 0),
        status: product.status === 'inactive' ? 'inactive' : 'active',
        track_expiry: Boolean(product.track_expiry || product.expiry_date),
        expiry_date: normalizeExpiryDate(product.expiry_date),
        low_stock_alert: String(product.low_stock_alert ?? 0),
        image: null,
        current_image: product.image ?? product.image_url ?? ''
    };
}

interface ProductFormProps {
    tab: CrudEditorTab<ProductFormState>;
    categories: Array<Pick<Category, 'id' | 'name'>>;
    vendors: Array<Pick<Vendor, 'id' | 'name'>>;
    isSaving: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    onChange: (updater: (current: ProductFormState) => ProductFormState) => void;
}

export function ProductForm({ tab, categories, vendors, isSaving, onSubmit, onCancel, onChange }: ProductFormProps) {
    const inputClass = 'input input-bordered w-full';
    const selectClass = 'select select-bordered w-full';
    const textareaClass = 'textarea textarea-bordered min-h-28 w-full';
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(() => resolveAssetUrl(tab.form.current_image));

    useEffect(() => {
        if (tab.form.image) {
            const objectUrl = URL.createObjectURL(tab.form.image);
            setPreviewUrl(objectUrl);

            return () => {
                URL.revokeObjectURL(objectUrl);
            };
        }

        setPreviewUrl(resolveAssetUrl(tab.form.current_image));
    }, [tab.form.image, tab.form.current_image]);

    return (
        <form
            className={CRUD_EDITOR_FORM_GRID_CLASS}
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                <legend className="fieldset-legend">Product image</legend>
                <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                        <div className="avatar">
                            <div className="h-28 w-28 rounded-box border border-base-300 bg-base-100">
                                {previewUrl ? (
                                    <img src={previewUrl} alt={tab.form.name || 'Product preview'} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-center text-xs text-base-content/50">
                                        No image
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-3">
                            <label className="btn btn-outline w-full justify-start md:w-auto" htmlFor="product-image">
                                <Upload className="h-4 w-4" />
                                {tab.form.image ? 'Replace image' : 'Upload image'}
                            </label>
                            <input
                                id="product-image"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null;
                                    onChange((current) => ({ ...current, image: file }));
                                    event.target.value = '';
                                }}
                            />

                            <div className="space-y-1 text-sm text-base-content/65">
                                <p>Accepted formats: JPG, PNG, GIF, WebP. Maximum size: 5 MB.</p>
                                {tab.form.image ? <p>Selected file: {tab.form.image.name}</p> : null}
                            </div>

                            {tab.form.image ? (
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm px-0 text-error hover:bg-transparent"
                                    onClick={() => onChange((current) => ({ ...current, image: null }))}
                                >
                                    <X className="h-4 w-4" />
                                    Clear selected image
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend">Category</legend>
                <select
                    id="product-category"
                    className={selectClass}
                    value={tab.form.category_id}
                    onChange={(event) => onChange((current) => ({ ...current, category_id: event.target.value }))}
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
                    value={tab.form.vendor_id}
                    onChange={(event) => onChange((current) => ({ ...current, vendor_id: event.target.value }))}
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
                    value={tab.form.status}
                    onChange={(event) => onChange((current) => ({ ...current, status: event.target.value as ProductFormState['status'] }))}
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
                    value={tab.form.name}
                    onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
                    required
                />
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend">Code</legend>
                <input
                    id="product-code"
                    className={inputClass}
                    value={tab.form.code}
                    onChange={(event) => onChange((current) => ({ ...current, code: event.target.value }))}
                />
            </fieldset>

            <fieldset className="fieldset">
                <legend className="fieldset-legend">Barcode</legend>
                <input
                    id="product-barcode"
                    className={inputClass}
                    value={tab.form.barcode}
                    onChange={(event) => onChange((current) => ({ ...current, barcode: event.target.value }))}
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
                    value={tab.form.cost_price}
                    onChange={(event) => onChange((current) => ({ ...current, cost_price: event.target.value }))}
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
                    value={tab.form.selling_price}
                    onChange={(event) => onChange((current) => ({ ...current, selling_price: event.target.value }))}
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
                    value={tab.form.low_stock_alert}
                    onChange={(event) => onChange((current) => ({ ...current, low_stock_alert: event.target.value }))}
                />
            </fieldset>

            <label className="card border border-base-300 bg-base-200/60 xl:col-span-2">
                <div className="card-body flex-row items-center gap-4 p-4">
                    <input
                        id="product-expiry-toggle"
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={tab.form.track_expiry}
                        onChange={(event) =>
                            onChange((current) => ({
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
                    value={tab.form.expiry_date}
                    onChange={(event) => onChange((current) => ({ ...current, expiry_date: event.target.value }))}
                    disabled={!tab.form.track_expiry}
                />
            </fieldset>

            <fieldset className="fieldset md:col-span-2 xl:col-span-3">
                <legend className="fieldset-legend">Description</legend>
                <textarea
                    id="product-description"
                    className={textareaClass}
                    value={tab.form.description}
                    onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
                />
            </fieldset>

            <div className={CRUD_EDITOR_ACTIONS_CLASS}>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : tab.type === 'edit' ? 'Update product' : 'Create product'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </form>
    );
}
