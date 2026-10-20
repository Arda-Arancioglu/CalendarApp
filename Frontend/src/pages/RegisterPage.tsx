import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subDays } from 'date-fns';
import { Check, Circle, UserPlus } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { applyFieldErrors, getErrorMessage } from '../utils/errors';
import { toApiDate } from '../utils/date';
import { PASSWORD_RULES, registerSchema, type RegisterFormValues } from '../utils/validation';
import { cn } from '../utils/cn';

/** Live checklist under the password field. */
function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn('flex items-center gap-1.5 transition-colors', passed ? 'text-emerald-300' : 'text-zinc-500')}
          >
            {passed ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Circle className="h-3 w-3" aria-hidden="true" />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{passed ? ' (done)' : ' (missing)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '', birthDate: '' },
  });

  // useWatch re-renders only this component when the password changes.
  const password = useWatch({ control, name: 'password' });
  // The latest selectable birth date is yesterday ("must be in the past").
  const [maxBirthDate] = useState(() => toApiDate(subDays(new Date(), 1)));

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      // confirmPassword is only for the form; the API doesn't know about it.
      await registerAccount({
        username: values.username,
        password: values.password,
        birthDate: values.birthDate,
      });
    } catch (error) {
      // e.g. 409 "Username already taken" or a 400 with field errors
      const mappedToFields = applyFieldErrors(error, setError, ['username', 'password', 'birthDate']);
      if (!mappedToFields) setFormError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}

        <Input
          label="Username"
          autoComplete="username"
          autoFocus
          helperText="3–20 characters"
          error={errors.username?.message}
          {...register('username')}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          helperText={<PasswordChecklist password={password} />}
          {...register('password')}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Input
          label="Birth date"
          type="date"
          max={maxBirthDate}
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isSubmitting}
          loadingText="Creating account…"
          leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
