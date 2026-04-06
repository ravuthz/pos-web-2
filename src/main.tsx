import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { toast, Toaster } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import { router } from '@/router';
import { initializeTheme } from '@/lib/theme';
import '@/index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
            retry: 1
        }
    }
});

initializeTheme();

let pwaUpdateToastId: string | number | undefined;

const updateServiceWorker = registerSW({
    onNeedRefresh() {
        if (pwaUpdateToastId !== undefined) {
            return;
        }

        pwaUpdateToastId = toast('A new version is available.', {
            duration: Infinity,
            description: 'Refresh to load the latest frontend build.',
            action: {
                label: 'Update',
                onClick: () => {
                    if (pwaUpdateToastId !== undefined) {
                        toast.dismiss(pwaUpdateToastId);
                        pwaUpdateToastId = undefined;
                    }

                    void updateServiceWorker(true);
                }
            },
            cancel: {
                label: 'Later',
                onClick: () => {
                    if (pwaUpdateToastId !== undefined) {
                        toast.dismiss(pwaUpdateToastId);
                        pwaUpdateToastId = undefined;
                    }
                }
            },
            onDismiss: () => {
                pwaUpdateToastId = undefined;
            },
            onAutoClose: () => {
                pwaUpdateToastId = undefined;
            }
        });
    },
    onOfflineReady() {
        toast.success('App is ready for offline use.');
    }
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster position="top-center" richColors />
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </QueryClientProvider>
    </StrictMode>
);
