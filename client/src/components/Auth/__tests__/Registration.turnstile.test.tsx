import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import Registration from '../Registration';
import * as authMutations from '~/data-provider/Auth/mutations';

// Mock the Turnstile component
jest.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess, onError, onExpire, siteKey, options }) => (
    <div data-testid="turnstile-widget">
      <button
        data-testid="turnstile-success"
        onClick={() => onSuccess('mock-turnstile-token')}
      >
        Complete Captcha
      </button>
      <button
        data-testid="turnstile-error"
        onClick={() => onError()}
      >
        Trigger Error
      </button>
      <button
        data-testid="turnstile-expire"
        onClick={() => onExpire()}
      >
        Expire Token
      </button>
      <div data-testid="turnstile-sitekey">{siteKey}</div>
      <div data-testid="turnstile-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

// Mock the auth mutation
jest.mock('~/data-provider/Auth/mutations', () => ({
  useRegisterUserMutation: jest.fn(),
}));

// Mock the localization hook
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Mock the theme context
jest.mock('@librechat/client', () => ({
  ThemeContext: React.createContext({ theme: 'light' }),
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Button: ({ children, disabled, onClick, ...props }) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  isDark: (theme: string) => theme === 'dark',
}));

const mockStartupConfig = {
  emailEnabled: true,
  registrationEnabled: true,
  minPasswordLength: 8,
};

const mockStartupConfigWithTurnstile = {
  ...mockStartupConfig,
  turnstile: {
    siteKey: 'test-site-key',
    options: {
      language: 'en',
      size: 'normal',
      theme: 'light',
    },
  },
};

const mockRegisterMutation = {
  mutate: jest.fn(),
  isSuccess: false,
  isError: false,
  error: null,
  data: null,
};

const TestWrapper = ({ children, startupConfig = mockStartupConfig }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <BrowserRouter>
          <div data-testid="outlet-context">
            {React.cloneElement(children, {
              startupConfig,
              startupConfigError: null,
              isFetching: false,
            })}
          </div>
        </BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
};

describe('Registration Component - Turnstile Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authMutations.useRegisterUserMutation as jest.Mock).mockReturnValue(mockRegisterMutation);
  });

  describe('when Turnstile is disabled', () => {
    it('should not render Turnstile widget', () => {
      render(
        <TestWrapper startupConfig={mockStartupConfig}>
          <Registration />
        </TestWrapper>
      );

      expect(screen.queryByTestId('turnstile-widget')).not.toBeInTheDocument();
    });

    it('should allow form submission without captcha', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper startupConfig={mockStartupConfig}>
          <Registration />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByTestId('name'), 'Test User');
      await user.type(screen.getByTestId('username'), 'testuser');
      await user.type(screen.getByTestId('email'), 'test@example.com');
      await user.type(screen.getByTestId('password'), 'password123');
      await user.type(screen.getByTestId('confirm_password'), 'password123');

      // Submit button should be enabled
      const submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).not.toBeDisabled();

      // Submit the form
      await user.click(submitButton);

      expect(mockRegisterMutation.mutate).toHaveBeenCalledWith({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirm_password: 'password123',
        token: undefined,
        turnstileToken: null, // No turnstile token when disabled
      });
    });
  });

  describe('when Turnstile is enabled', () => {
    it('should render Turnstile widget with correct props', () => {
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
      expect(screen.getByTestId('turnstile-sitekey')).toHaveTextContent('test-site-key');
      
      const options = JSON.parse(screen.getByTestId('turnstile-options').textContent || '{}');
      expect(options).toEqual({
        language: 'en',
        size: 'normal',
        theme: 'light', // Should use validTheme (light)
      });
    });

    it('should disable submit button when captcha is not completed', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByTestId('name'), 'Test User');
      await user.type(screen.getByTestId('username'), 'testuser');
      await user.type(screen.getByTestId('email'), 'test@example.com');
      await user.type(screen.getByTestId('password'), 'password123');
      await user.type(screen.getByTestId('confirm_password'), 'password123');

      // Submit button should be disabled because captcha is not completed
      const submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button after captcha completion', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByTestId('name'), 'Test User');
      await user.type(screen.getByTestId('username'), 'testuser');
      await user.type(screen.getByTestId('email'), 'test@example.com');
      await user.type(screen.getByTestId('password'), 'password123');
      await user.type(screen.getByTestId('confirm_password'), 'password123');

      // Complete the captcha
      await user.click(screen.getByTestId('turnstile-success'));

      // Submit button should now be enabled
      const submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should include turnstile token in form submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByTestId('name'), 'Test User');
      await user.type(screen.getByTestId('username'), 'testuser');
      await user.type(screen.getByTestId('email'), 'test@example.com');
      await user.type(screen.getByTestId('password'), 'password123');
      await user.type(screen.getByTestId('confirm_password'), 'password123');

      // Complete the captcha
      await user.click(screen.getByTestId('turnstile-success'));

      // Submit the form
      await user.click(screen.getByRole('button', { name: /Submit registration/i }));

      expect(mockRegisterMutation.mutate).toHaveBeenCalledWith({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirm_password: 'password123',
        token: undefined,
        turnstileToken: 'mock-turnstile-token',
      });
    });

    it('should disable submit button when captcha errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByTestId('name'), 'Test User');
      await user.type(screen.getByTestId('username'), 'testuser');
      await user.type(screen.getByTestId('email'), 'test@example.com');
      await user.type(screen.getByTestId('password'), 'password123');
      await user.type(screen.getByTestId('confirm_password'), 'password123');

      // Complete the captcha first
      await user.click(screen.getByTestId('turnstile-success'));
      
      // Verify button is enabled
      let submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).not.toBeDisabled();

      // Trigger captcha error
      await user.click(screen.getByTestId('turnstile-error'));

      // Submit button should be disabled again
      submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when captcha expires', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      // Fill out the form
      await user.type(screen.getByTestId('name'), 'Test User');
      await user.type(screen.getByTestId('username'), 'testuser');
      await user.type(screen.getByTestId('email'), 'test@example.com');
      await user.type(screen.getByTestId('password'), 'password123');
      await user.type(screen.getByTestId('confirm_password'), 'password123');

      // Complete the captcha first
      await user.click(screen.getByTestId('turnstile-success'));
      
      // Verify button is enabled
      let submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).not.toBeDisabled();

      // Trigger captcha expiration
      await user.click(screen.getByTestId('turnstile-expire'));

      // Submit button should be disabled again
      submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).toBeDisabled();
    });

    it('should still respect form validation errors even with valid captcha', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      // Fill out the form with invalid data (passwords don't match)
      await user.type(screen.getByTestId('name'), 'Test User');
      await user.type(screen.getByTestId('username'), 'testuser');
      await user.type(screen.getByTestId('email'), 'test@example.com');
      await user.type(screen.getByTestId('password'), 'password123');
      await user.type(screen.getByTestId('confirm_password'), 'different_password');

      // Complete the captcha
      await user.click(screen.getByTestId('turnstile-success'));

      // Submit button should still be disabled due to form validation errors
      const submitButton = screen.getByRole('button', { name: /Submit registration/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('theme handling', () => {
    it('should use light theme for Turnstile when app theme is light', () => {
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      const options = JSON.parse(screen.getByTestId('turnstile-options').textContent || '{}');
      expect(options.theme).toBe('light');
    });

    // Note: Testing dark theme would require mocking the ThemeContext properly
    // This is a simplified test structure
  });

  describe('error handling', () => {
    it('should display error message when registration fails', async () => {
      const mockErrorMutation = {
        ...mockRegisterMutation,
        isError: true,
        error: {
          response: {
            data: {
              message: 'Registration failed: Invalid captcha',
            },
          },
        },
      };

      (authMutations.useRegisterUserMutation as jest.Mock).mockReturnValue(mockErrorMutation);

      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/com_auth_error_create Registration failed: Invalid captcha/)).toBeInTheDocument();
      });
    });

    it('should display success message and countdown when registration succeeds', async () => {
      const mockSuccessMutation = {
        ...mockRegisterMutation,
        isSuccess: true,
      };

      (authMutations.useRegisterUserMutation as jest.Mock).mockReturnValue(mockSuccessMutation);

      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/com_auth_registration_success_generic/)).toBeInTheDocument();
        expect(screen.getByText(/com_auth_email_verification_redirecting/)).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper startupConfig={mockStartupConfigWithTurnstile}>
          <Registration />
        </TestWrapper>
      );

      expect(screen.getByRole('form', { name: /Registration form/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submit registration/i })).toBeInTheDocument();
      
      // Check input labels
      expect(screen.getByLabelText(/com_auth_full_name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/com_auth_username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/com_auth_email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/com_auth_password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/com_auth_password_confirm/i)).toBeInTheDocument();
    });
  });
});