import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../../context/AuthContext';
import { MobileBottomNav, UserCard } from '../AppShell';

function renderWithContext(
  ui: React.ReactNode,
  {
    initialEntries = ['/calendar'],
    user = { userId: 1, username: 'testpilot', email: 'test@example.com' },
    logout = vi.fn(),
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const authValue: AuthContextValue = {
    status: 'authenticated',
    user,
    isAuthenticated: true,
    notice: null,
    clearNotice: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout,
  };

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    ),
    logout,
  };
}

describe('AppShell Navigation & UserCard', () => {
  it('makes the UserCard signed-in area a link to /settings and calls onNavigate', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    renderWithContext(<UserCard onNavigate={onNavigate} />);

    // The user username/signed in block links to /settings
    const settingsLink = screen.getByRole('link', { name: /account settings/i });
    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(screen.getByText('testpilot')).toBeInTheDocument();
    expect(screen.getByText('Signed in')).toBeInTheDocument();

    await user.click(settingsLink);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders a collapsed UserCard avatar that links to /settings', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    renderWithContext(<UserCard collapsed={true} onNavigate={onNavigate} />);

    const avatarLink = screen.getByRole('link', { name: /account settings/i });
    expect(avatarLink).toHaveAttribute('href', '/settings');
    expect(screen.getByText('T')).toBeInTheDocument();

    await user.click(avatarLink);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders a separate logout button that calls logout()', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn();

    renderWithContext(<UserCard />, { logout: logoutMock });

    const logoutBtn = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('renders MobileBottomNav with quick navigation links for Calendar, Routines, Squads, Categories, and Settings', () => {
    renderWithContext(<MobileBottomNav />);

    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: /routines/i })).toHaveAttribute('href', '/routines');
    expect(screen.getByRole('link', { name: /squads/i })).toHaveAttribute('href', '/squads');
    expect(screen.getByRole('link', { name: /categories/i })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });
});
