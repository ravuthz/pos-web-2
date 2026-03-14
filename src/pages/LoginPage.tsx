import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { extractApiError } from '@/lib/api';

const loginBackgroundStyle = {
  backgroundImage:
    'radial-gradient(circle at top, color-mix(in oklch, var(--color-primary) 24%, transparent), transparent 35%), linear-gradient(180deg, var(--color-base-content), color-mix(in oklch, var(--color-base-content) 78%, var(--color-base-100) 22%))'
};

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setBranches = useBranchStore((state) => state.setBranches);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: ''
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const identifier = values.identifier.trim();
      return authService.login(
        identifier.includes('@')
          ? { email: identifier, password: values.password }
          : { username: identifier, password: values.password }
      );
    },
    onSuccess: async (response) => {
      const payload = response.data;
      const branchOptions = payload.user.branches?.map((branch) => ({
        id: branch.id,
        name: branch.name
      })) ?? [];

      setApiError(null);
      setAuth(payload.user, payload.access_token);
      setBranches(branchOptions);
      setSelectedBranch(payload.user.primary_branch?.id ?? payload.user.branch_id ?? branchOptions[0]?.id ?? null);
      await navigate({ to: '/' });
    },
    onError: (error) => {
      setApiError(extractApiError(error));
    }
  });

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-surface-900 p-4"
      style={loginBackgroundStyle}
    >
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-surface-50 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-surface-900 p-10 text-white lg:block">
          <p className="text-xs uppercase tracking-[0.26em] text-teal-300">Web2 Workspace</p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight">
            Complete operational control for your POS team.
          </h1>
          <p className="mt-4 max-w-md text-base text-surface-300">
            Sales, products, shifts, expenses, and reporting now live in one frontend.
          </p>
          <div className="mt-10 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Live branch switching</p>
              <p className="mt-1 text-sm text-surface-300">Move between assigned branches without leaving the console.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">POS-ready workflows</p>
              <p className="mt-1 text-sm text-surface-300">Open shifts, scan products, and process sales from the same shell.</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-primary-700">Sign in</p>
          <h2 className="mt-3 text-3xl font-semibold text-surface-900">Welcome back</h2>
          <p className="mt-2 text-sm text-surface-600">
            Use your username or email and your password to continue.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
          >
            <div>
              <label className="label" htmlFor="identifier">
                Username or email
              </label>
              <input id="identifier" className="input" autoComplete="username" {...form.register('identifier')} />
              {form.formState.errors.identifier ? (
                <p className="mt-1 text-xs text-rose-600">{form.formState.errors.identifier.message}</p>
              ) : null}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="mt-1 text-xs text-rose-600">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            {apiError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {apiError}
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
