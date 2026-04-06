import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Minus,
    Plus,
    ScanLine,
    Search,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { extractApiError } from '@/lib/api';
import { formatCurrency, resolveAssetUrl } from '@/lib/utils';
import { saleService } from '@/services/sale';
import { shiftService } from '@/services/shift';
import { useBranchStore } from '@/store/branch';
import type { Category, Product, StoreSalePayload } from '@/types/api';

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'khqr';

interface MobileProduct {
    id: number;
    name: string;
    code?: string;
    barcode?: string;
    image_url?: string;
    category?: {
        id: number;
        name: string;
    } | null;
    selling_price: number;
    quantity_on_hand?: number;
}

interface CartItem {
    product_id: number;
    name: string;
    code?: string;
    quantity: number;
    unit_price: number;
    max_stock: number;
}

interface BarcodeDetectionResult {
    rawValue?: string;
}

interface BarcodeDetectorInstance {
    detect(source: ImageBitmapSource): Promise<BarcodeDetectionResult[]>;
}

interface BarcodeDetectorConstructor {
    new(options?: { formats?: string[] }): BarcodeDetectorInstance;
    getSupportedFormats?: () => Promise<string[]>;
}

const CAMERA_SCAN_FORMATS = ['code_128', 'code_39', 'code_93', 'codabar', 'ean_13', 'ean_8', 'itf', 'upc_a', 'upc_e'];

function makeIdempotencyKey() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeProduct(
    product: Product & {
        quantity_on_hand?: number;
        category?: Category | null;
        stock?: { quantity_on_hand?: number } | null;
    }
): MobileProduct {
    return {
        id: product.id,
        name: product.name,
        code: product.code,
        barcode: product.barcode,
        image_url: product.image_url ?? resolveAssetUrl(product.image),
        category: product.category
            ? {
                id: product.category.id,
                name: product.category.name
            }
            : null,
        selling_price: Number(product.selling_price ?? 0),
        quantity_on_hand: Number(product.quantity_on_hand ?? product.stock?.quantity_on_hand ?? 0)
    };
}

export function MobilePage() {
    const queryClient = useQueryClient();
    const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isScannerStarting, setIsScannerStarting] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [lookupQuery, setLookupQuery] = useState('');
    const [searchResults, setSearchResults] = useState<MobileProduct[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [paymentReceived, setPaymentReceived] = useState('0');
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanTimeoutRef = useRef<number | null>(null);
    const scannerSessionRef = useRef(0);

    const currentShiftQuery = useQuery({
        queryKey: ['mobile-current-shift', selectedBranchId],
        queryFn: () => shiftService.getCurrent(selectedBranchId ?? undefined),
        enabled: Boolean(selectedBranchId)
    });

    const openShiftMutation = useMutation({
        mutationFn: async () => {
            if (!selectedBranchId) {
                throw new Error('Select a branch before opening a shift.');
            }

            return shiftService.open({
                branch_id: selectedBranchId,
                opening_cash_float: 0,
                opening_cash_float_khr: 0
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['mobile-current-shift', selectedBranchId] });
            toast.success('Shift opened successfully.');
        },
        onError: (error) => {
            setMessage(extractApiError(error));
        }
    });

    const searchMutation = useMutation({
        mutationFn: async (query: string) => {
            if (!selectedBranchId) {
                throw new Error('Select a branch before searching.');
            }

            return saleService.searchProducts(selectedBranchId, query.trim());
        },
        onSuccess: (products: Array<Product & { quantity_on_hand?: number; stock?: { quantity_on_hand?: number } | null }>) => {
            setSearchResults(products.map((product) => normalizeProduct(product)));
            setMessage(null);
        },
        onError: (error) => {
            setSearchResults([]);
            setMessage(extractApiError(error));
        }
    });

    const barcodeMutation = useMutation({
        mutationFn: async (value: string) => {
            if (!selectedBranchId) {
                throw new Error('Select a branch before scanning.');
            }

            return saleService.searchByBarcode(value.trim(), selectedBranchId);
        },
        onSuccess: (product: Product & { quantity_on_hand?: number; stock?: { quantity_on_hand?: number } | null }) => {
            addToCart(normalizeProduct(product), { closeSearchModal: true });
            setMessage(null);
        },
        onError: (error) => {
            setMessage(extractApiError(error));
        }
    });

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            if (!selectedBranchId) {
                throw new Error('Select a branch before checkout.');
            }

            if (!currentShiftQuery.data) {
                throw new Error('Open a shift before checkout.');
            }

            if (cart.length === 0) {
                throw new Error('Add products to the cart before checkout.');
            }

            const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
            const received = Number(paymentReceived || '0');
            const payload: StoreSalePayload = {
                branch_id: selectedBranchId,
                payment_method: paymentMethod,
                payment_received: received,
                payment_received_usd: paymentMethod === 'cash' ? received : undefined,
                total_amount: subtotal,
                notes: notes || undefined,
                idempotency_key: makeIdempotencyKey(),
                products: cart.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                }))
            };

            return saleService.create(payload);
        },
        onSuccess: async (response) => {
            setCart([]);
            setPaymentMethod('cash');
            setPaymentReceived('0');
            setNotes('');
            setSearchResults([]);
            setLookupQuery('');
            toast.success(response.message || 'Sale completed successfully.');

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['sales'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            ]);
        },
        onError: (error) => {
            setMessage(extractApiError(error));
        }
    });

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueProductCount = cart.length;
    const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const receivedAmount = Number(paymentReceived || '0');
    const change = Math.max(0, receivedAmount - subtotal);
    const remaining = Math.max(0, subtotal - receivedAmount);

    function resetScannerRuntime() {
        if (scanTimeoutRef.current !== null) {
            window.clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        const video = videoRef.current;
        if (video) {
            video.pause();
            video.srcObject = null;
        }
    }

    function closeScanner(options?: { resetError?: boolean }) {
        scannerSessionRef.current += 1;
        resetScannerRuntime();
        setIsScannerOpen(false);
        setIsScannerStarting(false);

        if (options?.resetError) {
            setScannerError(null);
        }
    }

    function getScannerErrorMessage(error: unknown) {
        if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') {
                return 'Camera permission was denied. Allow camera access and try again.';
            }

            if (error.name === 'NotFoundError') {
                return 'No camera was found on this device.';
            }

            if (error.name === 'NotReadableError') {
                return 'The camera is already in use by another app or browser tab.';
            }

            if (error.name === 'OverconstrainedError') {
                return 'The requested camera is not available on this device.';
            }
        }

        if (error instanceof Error && error.message) {
            return error.message;
        }

        return 'Unable to start the camera scanner.';
    }

    function submitSearchLookup() {
        const normalizedValue = lookupQuery.trim();

        if (!normalizedValue) {
            setSearchResults([]);
            setIsSearchModalOpen(false);
            return;
        }

        closeScanner({ resetError: true });
        setMessage(null);
        setIsSearchModalOpen(true);
        searchMutation.mutate(normalizedValue);
    }

    function submitBarcodeLookup(value: string) {
        const normalizedValue = value.trim();

        if (!normalizedValue) {
            return;
        }

        closeScanner({ resetError: true });
        setLookupQuery(normalizedValue);
        barcodeMutation.mutate(normalizedValue);
    }

    async function startCameraScanner() {
        if (isScannerStarting) {
            return;
        }

        setIsSearchModalOpen(true);

        if (!navigator.mediaDevices?.getUserMedia) {
            setScannerError('Camera access is not available in this browser. Enter the barcode manually instead.');
            return;
        }

        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setScannerError('Camera scanning requires HTTPS or localhost.');
            return;
        }

        const BarcodeDetectorApi = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

        if (!BarcodeDetectorApi) {
            setScannerError('Live barcode scanning is not supported in this browser. Use Chrome or Edge, or enter the barcode manually.');
            return;
        }

        scannerSessionRef.current += 1;
        const sessionId = scannerSessionRef.current;

        resetScannerRuntime();
        setScannerError(null);
        setIsScannerOpen(true);
        setIsScannerStarting(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: {
                        ideal: 'environment'
                    }
                }
            });

            if (scannerSessionRef.current !== sessionId) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            streamRef.current = stream;

            const video = videoRef.current;
            if (!video) {
                throw new Error('Unable to attach the camera preview.');
            }

            video.srcObject = stream;
            video.muted = true;
            video.playsInline = true;
            await video.play();

            if (scannerSessionRef.current !== sessionId) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            let formats = CAMERA_SCAN_FORMATS;

            if (typeof BarcodeDetectorApi.getSupportedFormats === 'function') {
                const supportedFormats = await BarcodeDetectorApi.getSupportedFormats();
                const matchingFormats = CAMERA_SCAN_FORMATS.filter((format) => supportedFormats.includes(format));

                if (matchingFormats.length > 0) {
                    formats = matchingFormats;
                }
            }

            const detector = new BarcodeDetectorApi({ formats });
            setIsScannerStarting(false);

            const runDetection = async () => {
                if (scannerSessionRef.current !== sessionId) {
                    return;
                }

                const activeVideo = videoRef.current;

                if (!activeVideo) {
                    return;
                }

                if (activeVideo.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
                    scanTimeoutRef.current = window.setTimeout(() => {
                        void runDetection();
                    }, 200);
                    return;
                }

                try {
                    const detections = await detector.detect(activeVideo);
                    const detectedCode = detections
                        .map((detection) => detection.rawValue?.trim())
                        .find((value): value is string => Boolean(value));

                    if (detectedCode) {
                        submitBarcodeLookup(detectedCode);
                        return;
                    }
                } catch (error) {
                    setScannerError(getScannerErrorMessage(error));
                    closeScanner();
                    return;
                }

                scanTimeoutRef.current = window.setTimeout(() => {
                    void runDetection();
                }, 200);
            };

            void runDetection();
        } catch (error) {
            resetScannerRuntime();
            setIsScannerOpen(false);
            setIsScannerStarting(false);
            setScannerError(getScannerErrorMessage(error));
        }
    }

    useEffect(() => {
        if (isSearchModalOpen) {
            return;
        }

        closeScanner({ resetError: true });
    }, [isSearchModalOpen]);

    useEffect(() => {
        return () => {
            scannerSessionRef.current += 1;
            resetScannerRuntime();
        };
    }, []);

    function addToCart(product: MobileProduct, options?: { closeSearchModal?: boolean }) {
        const availableStock = product.quantity_on_hand ?? 9999;
        if (availableStock <= 0) {
            toast.error(`${product.name} is out of stock.`);
            return;
        }

        let nextCount = 0;

        setCart((current) => {
            const existing = current.find((item) => item.product_id === product.id);

            if (existing) {
                const nextQuantity = Math.min(existing.quantity + 1, existing.max_stock || existing.quantity + 1);
                nextCount = nextQuantity;

                return current.map((item) =>
                    item.product_id === product.id
                        ? {
                            ...item,
                            quantity: nextQuantity
                        }
                        : item
                );
            }

            nextCount = 1;
            return [
                ...current,
                {
                    product_id: product.id,
                    name: product.name,
                    code: product.code,
                    quantity: 1,
                    unit_price: Number(product.selling_price),
                    max_stock: Number(product.quantity_on_hand ?? 9999)
                }
            ];
        });

        toast.success(`${product.name} added to order`);
        setMessage(null);

        if (options?.closeSearchModal) {
            setIsSearchModalOpen(false);
        }

        if (availableStock <= nextCount) {
            toast.info(`${product.name} has reached the available stock.`);
        }
    }

    function updateQuantity(productId: number, nextQuantity: number) {
        setCart((current) =>
            current
                .map((item) =>
                    item.product_id === productId
                        ? {
                            ...item,
                            quantity: Math.max(0, Math.min(nextQuantity, item.max_stock || nextQuantity))
                        }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    }

    function confirmRemoveFromCart(item: CartItem) {
        const toastId = toast.warning(`Remove ${item.name} from the order?`, {
            duration: 5000,
            description: 'This item will be removed from the order summary.',
            action: {
                label: 'Remove',
                onClick: () => {
                    updateQuantity(item.product_id, 0);
                    toast.dismiss(toastId);
                    toast.success(`${item.name} removed from order.`);
                }
            },
            cancel: {
                label: 'Keep',
                onClick: () => {
                    toast.dismiss(toastId);
                }
            }
        });
    }

    if (!selectedBranchId) {
        return (
            <EmptyState
                title="Select a branch first"
                message="Use the branch selector in the navbar before using the mobile order screen."
            />
        );
    }

    if (currentShiftQuery.isLoading) {
        return <LoadingState label="Loading mobile order screen..." />;
    }

    if (currentShiftQuery.isError) {
        return <ErrorState message={currentShiftQuery.error.message} />;
    }

    return (
        <>
            <div className="space-y-4 pb-36">
                {message ? (
                    <div role="alert" className="alert border border-base-300 bg-base-100 text-sm text-base-content shadow-sm">
                        <span>{message}</span>
                    </div>
                ) : null}

                {!currentShiftQuery.data ? (
                    <section className="card border border-base-300 bg-base-100 shadow-sm">
                        <div className="card-body gap-4 p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h1 className="text-xl font-semibold text-surface-900">No active shift</h1>
                                    <p className="text-sm text-surface-500">
                                        Open a shift before taking orders from the mobile screen.
                                    </p>
                                </div>
                                <StatusBadge value="closed" />
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary w-full sm:w-auto"
                                onClick={() => openShiftMutation.mutate()}
                                disabled={openShiftMutation.isPending}
                            >
                                {openShiftMutation.isPending ? 'Opening shift...' : 'Open shift'}
                            </button>
                        </div>
                    </section>
                ) : (
                    <>
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-surface-900">Order summary</h2>
                                    <p className="text-xs text-surface-500">Review quantities and complete the order from this page.</p>
                                </div>
                                {uniqueProductCount > 0 ? (
                                    <span className="badge badge-primary badge-md">{uniqueProductCount}</span>
                                ) : null}
                            </div>

                            {cart.length === 0 ? (
                                <EmptyState
                                    title="Cart is empty"
                                    message="Use search or scan to add products to the order."
                                />
                            ) : (
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-start">
                                    <div className="space-y-3">
                                        {cart.map((item) => (
                                            <div
                                                key={item.product_id}
                                                className="card border border-base-300 bg-base-100 shadow-sm"
                                            >
                                                <div className="card-body gap-3 p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-surface-900">{item.name}</p>
                                                            <p className="text-sm text-surface-500">{item.code ?? 'No code'}</p>
                                                        </div>
                                                        <span className="font-semibold text-primary-700">
                                                            {formatCurrency(item.unit_price * item.quantity)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm btn-square"
                                                                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </button>
                                                            <span className="flex h-8 min-w-10 items-center justify-center rounded-box bg-base-200 px-3 text-sm font-semibold">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm btn-square"
                                                                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => confirmRemoveFromCart(item)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="label" htmlFor="mobile-payment-method">
                                                    Payment method
                                                </label>
                                                <select
                                                    id="mobile-payment-method"
                                                    className="select select-bordered w-full"
                                                    value={paymentMethod}
                                                    onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                                                >
                                                    <option value="cash">Cash</option>
                                                    <option value="card">Card</option>
                                                    <option value="transfer">Transfer</option>
                                                    <option value="khqr">KHQR</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="label" htmlFor="mobile-payment-received">
                                                    Payment received
                                                </label>
                                                <input
                                                    id="mobile-payment-received"
                                                    className="input input-bordered w-full"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={paymentReceived}
                                                    onChange={(event) => setPaymentReceived(event.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="label" htmlFor="mobile-order-notes">
                                                    Notes
                                                </label>
                                                <textarea
                                                    id="mobile-order-notes"
                                                    className="textarea textarea-bordered min-h-24 w-full"
                                                    placeholder="Optional notes for this sale"
                                                    value={notes}
                                                    onChange={(event) => setNotes(event.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="card border border-primary/20 bg-primary/5 shadow-sm">
                                            <div className="card-body gap-3 p-4">
                                                <div className="flex items-center justify-between text-sm text-surface-600">
                                                    <span>Items</span>
                                                    <span>{totalItems}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-surface-600">
                                                    <span>Subtotal</span>
                                                    <span>{formatCurrency(subtotal)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-surface-600">
                                                    <span>{remaining > 0 ? 'Remaining' : 'Change'}</span>
                                                    <span className={remaining > 0 ? 'font-semibold text-error' : 'font-semibold text-success'}>
                                                        {formatCurrency(remaining > 0 ? remaining : change)}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-primary mt-2 w-full"
                                                    onClick={() => checkoutMutation.mutate()}
                                                    disabled={checkoutMutation.isPending}
                                                >
                                                    {checkoutMutation.isPending
                                                        ? 'Processing...'
                                                        : `Complete order • ${formatCurrency(subtotal)}`}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 pb-4 pt-4">
                            <div className="container mx-auto">
                                <div className="w-full">
                                    <div className="card shadow-lg backdrop-blur">
                                        <div className="card-body p-3">
                                            <div className="grid grid-cols-[1fr_auto_auto] gap-3">
                                                <input
                                                    id="mobile-order-search"
                                                    className="input input-bordered w-full"
                                                    placeholder="Search product name, code, or barcode"
                                                    value={lookupQuery}
                                                    onChange={(event) => setLookupQuery(event.target.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            submitSearchLookup();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-square"
                                                    onClick={() => submitSearchLookup()}
                                                    disabled={searchMutation.isPending || lookupQuery.trim().length === 0}
                                                    title="Search products"
                                                >
                                                    <Search className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-square"
                                                    onClick={() => void startCameraScanner()}
                                                    disabled={isScannerStarting}
                                                    title="Scan barcode"
                                                >
                                                    <ScanLine className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {isSearchModalOpen ? (
                <div className="safe-top safe-bottom fixed inset-0 z-40 flex items-end justify-center bg-neutral/45 px-4 pb-4 pt-4 sm:items-center sm:p-5">
                    <div className="card flex max-h-full min-h-0 w-full max-w-3xl self-end flex-col overflow-hidden border border-base-300 bg-base-100 shadow-2xl sm:max-h-[88vh] sm:self-auto">
                        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-base-300 bg-base-100 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-surface-900">
                                    {isScannerOpen ? 'Scan product' : 'Search results'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-square"
                                onClick={() => setIsSearchModalOpen(false)}
                                title="Close search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            <div className="space-y-4 p-5">
                                {message ? (
                                    <div role="alert" className="alert alert-warning border border-warning/30 text-sm">
                                        <span>{message}</span>
                                    </div>
                                ) : null}

                                {scannerError ? (
                                    <div role="alert" className="alert alert-warning border border-warning/30 text-sm">
                                        <span>{scannerError}</span>
                                    </div>
                                ) : null}

                                {isScannerOpen ? (
                                    <div className="card border border-base-300 bg-base-100 shadow-sm">
                                        <div className="card-body gap-4 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-medium text-surface-900">Camera scanner</h3>
                                                    <p className="text-sm text-surface-500">
                                                        Point the camera at a barcode. The product will be added automatically when it is detected.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm btn-square"
                                                    onClick={() => closeScanner({ resetError: true })}
                                                    title="Close camera scanner"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="relative overflow-hidden rounded-[calc(var(--radius-box)*1.1)] border border-base-300 bg-neutral">
                                                <video
                                                    ref={videoRef}
                                                    className="aspect-video w-full object-cover"
                                                    autoPlay
                                                    muted
                                                    playsInline
                                                />
                                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                                                    <div className="h-24 w-full max-w-xs rounded-[calc(var(--radius-box)*1.1)] border-2 border-primary/80 bg-transparent" />
                                                </div>
                                                {isScannerStarting ? (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-neutral/40 px-6 text-center text-sm font-medium text-neutral-content">
                                                        Opening camera...
                                                    </div>
                                                ) : null}
                                            </div>

                                            <p className="text-sm text-surface-500">
                                                Use the rear camera for better focus. When a barcode is detected it will fill the lookup field and add the product automatically.
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                {!isScannerOpen && searchMutation.isPending ? (
                                    <LoadingState label="Searching products..." />
                                ) : searchResults.length === 0 ? (
                                    <div className="rounded-[calc(var(--radius-box)*1.1)] border border-dashed border-base-300 bg-base-100 px-4 py-8 text-center text-sm text-surface-500">
                                        {lookupQuery.trim()
                                            ? `No products found for "${lookupQuery.trim()}".`
                                            : 'Search results will appear here.'}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {searchResults.map((product) => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                className="flex w-full items-center gap-3 overflow-hidden rounded-[calc(var(--radius-box)*1.1)] border border-base-300 bg-base-100 p-3 text-left shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md"
                                                onClick={() => addToCart(product, { closeSearchModal: true })}
                                            >
                                                <div className="avatar">
                                                    <div className="h-14 w-14 rounded-[calc(var(--radius-box)*0.9)] border border-base-300 bg-base-200">
                                                        {product.image_url ? (
                                                            <img
                                                                src={product.image_url}
                                                                alt={product.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-primary/8 text-sm font-semibold text-primary/70">
                                                                {product.name.slice(0, 1).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-[0.9rem] font-medium text-surface-900">{product.name}</h3>
                                                            <p className="truncate text-sm text-surface-500">
                                                                {product.code ?? product.barcode ?? 'No code'}
                                                            </p>
                                                        </div>
                                                        <span className="shrink-0 font-semibold text-primary-700">
                                                            {formatCurrency(product.selling_price)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between gap-2">
                                                        <span className="text-[0.6rem] font-medium text-primary/80">
                                                            {product.category?.name ?? 'Uncategorized'}
                                                        </span>
                                                        <span className="badge badge-ghost badge-sm">
                                                            Stock {product.quantity_on_hand ?? 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

        </>
    );
}
