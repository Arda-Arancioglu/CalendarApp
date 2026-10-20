import { isValid, startOfToday } from 'date-fns';
import { z } from 'zod';
import { fromApiDate, fromInputDateTime } from './date';

/**
 * Zod schemas that mirror the server's validation rules, so users get instant
 * feedback. The server still validates everything; its messages are shown too.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 32;

export const CATEGORY_NAME_MAX = 50;
export const HEX_COLOR_REGEX = /^#[A-Fa-f0-9]{6}$/;

export const EVENT_TITLE_MAX = 100;
export const EVENT_DESCRIPTION_MAX = 255;

export const SQUAD_NAME_MAX = 100;
export const SQUAD_DESCRIPTION_MAX = 255;
export const INVITE_CODE_LENGTH = 8;

/**
 * Password rules, also used to render the live checklist on the register page.
 * ASSUMPTION: "special character" = anything that is not a letter, digit or space.
 * If the server uses a narrower set, its 400 message will still be shown.
 */
export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `${PASSWORD_MIN}–${PASSWORD_MAX} characters`,
    test: (value: string) => value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX,
  },
  { id: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'digit', label: 'One number', test: (value: string) => /\d/.test(value) },
  {
    id: 'special',
    label: 'One special character',
    test: (value: string) => /[^A-Za-z0-9\s]/.test(value),
  },
] as const;

const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`);

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
  .regex(/[A-Z]/, 'Password needs at least one uppercase letter')
  .regex(/[a-z]/, 'Password needs at least one lowercase letter')
  .regex(/\d/, 'Password needs at least one number')
  .regex(/[^A-Za-z0-9\s]/, 'Password needs at least one special character');

const birthDateSchema = z
  .string()
  .min(1, 'Birth date is required')
  .refine((value) => {
    const date = fromApiDate(value);
    return isValid(date) && date < startOfToday();
  }, 'Birth date must be in the past');

/**
 * Login only checks that the fields are filled in. The full password rules are
 * not repeated here: if they ever change on the server, existing users with
 * older passwords should still be able to log in.
 */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

/** `confirmPassword` is client-only and never sent to the server. */
export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    birthDate: birthDateSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

// ---- Category schema ----

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(CATEGORY_NAME_MAX, `Category name must be at most ${CATEGORY_NAME_MAX} characters`),
  color: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX, 'Color must be a 6-digit hex code like #6366F1'),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

// ---- Event schema ----

export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(EVENT_TITLE_MAX, `Title must be at most ${EVENT_TITLE_MAX} characters`),
    description: z
      .string()
      .max(
        EVENT_DESCRIPTION_MAX,
        `Description must be at most ${EVENT_DESCRIPTION_MAX} characters`,
      ),
    startTime: z
      .string()
      .min(1, 'Start time is required')
      .refine((val) => isValid(fromInputDateTime(val)), 'Enter a valid start date and time'),
    endTime: z
      .string()
      .min(1, 'End time is required')
      .refine((val) => isValid(fromInputDateTime(val)), 'Enter a valid end date and time'),
    isFlexible: z.boolean(),
    isPrivate: z.boolean(),
    categoryIds: z.array(z.number()),
  })
  .refine(
    (values) => {
      const start = fromInputDateTime(values.startTime);
      const end = fromInputDateTime(values.endTime);
      return isValid(start) && isValid(end) && end.getTime() > start.getTime();
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    },
  );
export type EventFormValues = z.infer<typeof eventSchema>;

// ---- Squad schemas ----

export const createSquadSchema = z.object({
  squadName: z
    .string()
    .trim()
    .min(1, 'Squad name is required')
    .max(SQUAD_NAME_MAX, `Squad name must be at most ${SQUAD_NAME_MAX} characters`),
  squadDescription: z
    .string()
    .max(
      SQUAD_DESCRIPTION_MAX,
      `Description must be at most ${SQUAD_DESCRIPTION_MAX} characters`,
    ),
});
export type CreateSquadFormValues = z.infer<typeof createSquadSchema>;

export const joinSquadSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(1, 'Invite code is required')
    .length(INVITE_CODE_LENGTH, `Invite code must be ${INVITE_CODE_LENGTH} characters`),
});
export type JoinSquadFormValues = z.infer<typeof joinSquadSchema>;
