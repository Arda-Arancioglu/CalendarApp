import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { ApiError, applyFieldErrors, defaultMessageFor, getErrorMessage } from '../utils/errors';
import { loginSchema, type LoginFormValues } from '../utils/validation';

/** On login, a 401/403 means "wrong credentials", not "session expired". */
function loginErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403) &&
    error.message === defaultMessageFor(error.status) // server sent no useful message
  ) {
    return 'Incorrect username or password.';
  }
  return getErrorMessage(error);
}

export function LoginPage() {
  const { login, notice } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values);
      // No navigate() needed: PublicOnlyRoute redirects as soon as we're authenticated.
    } catch (error) {
      const mappedToFields = applyFieldErrors(error, setError, ['username', 'password']);
      if (!mappedToFields) setFormError(loginErrorMessage(error));
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your calendar and your squads."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {notice && !formError && <Alert variant="warning">{notice}</Alert>}
        {formError && <Alert variant="error">{formError}</Alert>}

        <Input
          label="Username"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isSubmitting}
          loadingText="Logging in…"
          leftIcon={<LogIn className="h-4 w-4" aria-hidden="true" />}
        >
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
