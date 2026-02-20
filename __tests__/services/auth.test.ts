import { auth } from '@/services/auth';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Mock Helpers
// ============================================================================

const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

// These aren't in the global mock — attach them dynamically (same pattern as exercises.test.ts)
const mockGetUser = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();

/** Minimal fake User object for assertions */
const fakeUser = { id: 'user-1', email: 'test@example.com' };

/** Minimal fake Session object for assertions */
const fakeSession = { access_token: 'tok', user: fakeUser };

// ============================================================================
// Setup / Teardown
// ============================================================================

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth as any).getUser = mockGetUser;
  (supabase.auth as any).resetPasswordForEmail = mockResetPasswordForEmail;
  (supabase.auth as any).updateUser = mockUpdateUser;
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ============================================================================
// register
// ============================================================================

describe('register', () => {
  it('returns user on successful signup', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: fakeUser }, error: null });

    const result = await auth.register('test@example.com', 'password123');

    expect(result).toEqual({ user: fakeUser, error: null });
  });

  it('passes emailRedirectTo option to signUp', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: fakeUser }, error: null });

    await auth.register('test@example.com', 'password123');

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: { emailRedirectTo: 'ironlift://sign-in' },
    });
  });

  it('returns error when email is empty', async () => {
    const result = await auth.register('', 'password123');

    expect(result.user).toBeNull();
    expect(result.error!.message).toBe('Email and password are required');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('returns error when password is empty', async () => {
    const result = await auth.register('test@example.com', '');

    expect(result.user).toBeNull();
    expect(result.error!.message).toBe('Email and password are required');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('returns error when password is shorter than 6 characters', async () => {
    const result = await auth.register('test@example.com', '12345');

    expect(result.user).toBeNull();
    expect(result.error!.message).toBe(
      'Password must be at least 6 characters long'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('returns error when Supabase signUp fails', async () => {
    const error = new Error('Signup failed');
    mockSignUp.mockResolvedValueOnce({ data: { user: null }, error });

    const result = await auth.register('test@example.com', 'password123');

    expect(result).toEqual({ user: null, error });
  });

  it('catches unexpected exception and wraps non-Error in Error', async () => {
    mockSignUp.mockRejectedValueOnce('string error');

    const result = await auth.register('test@example.com', 'password123');

    expect(result.user).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });

  it('catches unexpected Error exception as-is', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('crash'));

    const result = await auth.register('test@example.com', 'password123');

    expect(result.user).toBeNull();
    expect(result.error!.message).toBe('crash');
  });
});

// ============================================================================
// login
// ============================================================================

describe('login', () => {
  it('returns user on successful login', async () => {
    mockSignIn.mockResolvedValueOnce({ data: { user: fakeUser }, error: null });

    const result = await auth.login('test@example.com', 'password123');

    expect(result).toEqual({ user: fakeUser, error: null });
  });

  it('returns error when email is empty', async () => {
    const result = await auth.login('', 'password123');

    expect(result.user).toBeNull();
    expect(result.error!.message).toBe('Email and password are required');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('returns error when password is empty', async () => {
    const result = await auth.login('test@example.com', '');

    expect(result.user).toBeNull();
    expect(result.error!.message).toBe('Email and password are required');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('returns error when Supabase signIn fails', async () => {
    const error = new Error('Invalid credentials');
    mockSignIn.mockResolvedValueOnce({ data: { user: null }, error });

    const result = await auth.login('test@example.com', 'password123');

    expect(result).toEqual({ user: null, error });
  });

  it('catches unexpected exception and wraps non-Error in Error', async () => {
    mockSignIn.mockRejectedValueOnce('string error');

    const result = await auth.login('test@example.com', 'password123');

    expect(result.user).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });
});

// ============================================================================
// logout
// ============================================================================

describe('logout', () => {
  it('returns { error: null } on success', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    const result = await auth.logout();

    expect(result).toEqual({ error: null });
  });

  it('returns error when Supabase signOut fails', async () => {
    const error = new Error('Logout failed');
    mockSignOut.mockResolvedValueOnce({ error });

    const result = await auth.logout();

    expect(result).toEqual({ error });
  });

  it('catches unexpected Error exception', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('crash'));

    const result = await auth.logout();

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('crash');
  });

  it('catches unexpected non-Error exception and wraps in Error', async () => {
    mockSignOut.mockRejectedValueOnce('string error');

    const result = await auth.logout();

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });
});

// ============================================================================
// resetPassword
// ============================================================================

describe('resetPassword', () => {
  it('returns { success: true, error: null } on success', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const result = await auth.resetPassword('test@example.com');

    expect(result).toEqual({ success: true, error: null });
  });

  it('passes correct redirectTo option', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    await auth.resetPassword('test@example.com');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: 'ironlift://reset-password' }
    );
  });

  it('returns error when email is empty', async () => {
    const result = await auth.resetPassword('');

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ message: 'Email is required' }),
    });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('returns error when Supabase resetPasswordForEmail fails', async () => {
    const error = new Error('Reset failed');
    mockResetPasswordForEmail.mockResolvedValueOnce({ error });

    const result = await auth.resetPassword('test@example.com');

    expect(result).toEqual({ success: false, error });
  });

  it('catches unexpected exception and wraps in Error', async () => {
    mockResetPasswordForEmail.mockRejectedValueOnce('string error');

    const result = await auth.resetPassword('test@example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });
});

// ============================================================================
// updateUser
// ============================================================================

describe('updateUser', () => {
  it('returns { success: true, error: null } on success', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });

    const result = await auth.updateUser('newpassword123');

    expect(result).toEqual({ success: true, error: null });
  });

  it('passes password to supabase.auth.updateUser', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });

    await auth.updateUser('newpassword123');

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
  });

  it('returns error when password is empty', async () => {
    const result = await auth.updateUser('');

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ message: 'Password is required' }),
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('returns error when password is shorter than 6 characters', async () => {
    const result = await auth.updateUser('12345');

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({
        message: 'Password must be at least 6 characters',
      }),
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('returns error when Supabase updateUser fails', async () => {
    const error = new Error('Update failed');
    mockUpdateUser.mockResolvedValueOnce({ error });

    const result = await auth.updateUser('newpassword123');

    expect(result).toEqual({ success: false, error });
  });

  it('catches unexpected exception and wraps in Error', async () => {
    mockUpdateUser.mockRejectedValueOnce('string error');

    const result = await auth.updateUser('newpassword123');

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe('string error');
  });
});

// ============================================================================
// getCurrentUser
// ============================================================================

describe('getCurrentUser', () => {
  it('returns user on success', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: fakeUser }, error: null });

    const result = await auth.getCurrentUser();

    expect(result).toEqual(fakeUser);
  });

  it('returns null when Supabase getUser returns error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Auth error'),
    });

    const result = await auth.getCurrentUser();

    expect(result).toBeNull();
  });

  it('returns null on unexpected exception', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('crash'));

    const result = await auth.getCurrentUser();

    expect(result).toBeNull();
  });
});

// ============================================================================
// getSession
// ============================================================================

describe('getSession', () => {
  it('returns session on success', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: fakeSession },
      error: null,
    });

    const result = await auth.getSession();

    expect(result).toEqual(fakeSession);
  });

  it('returns null when Supabase getSession returns error', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Session error'),
    });

    const result = await auth.getSession();

    expect(result).toBeNull();
  });

  it('returns null on unexpected exception', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('crash'));

    const result = await auth.getSession();

    expect(result).toBeNull();
  });
});

// ============================================================================
// onAuthStateChange
// ============================================================================

describe('onAuthStateChange', () => {
  it('returns subscription object on success', () => {
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const callback = jest.fn();
    const subscription = auth.onAuthStateChange(callback);

    expect(subscription).toEqual({ unsubscribe: mockUnsubscribe });
  });

  it('forwards auth events to the provided callback', () => {
    let capturedHandler: Function;
    mockOnAuthStateChange.mockImplementationOnce((handler: Function) => {
      capturedHandler = handler;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    const callback = jest.fn();
    auth.onAuthStateChange(callback);

    // Simulate auth event
    capturedHandler!('SIGNED_IN', fakeSession);

    expect(callback).toHaveBeenCalledWith('SIGNED_IN', fakeSession);
  });

  it('returns null when callback is not a function', () => {
    const result = auth.onAuthStateChange('not a function' as any);

    expect(result).toBeNull();
  });

  it('returns null on unexpected exception', () => {
    mockOnAuthStateChange.mockImplementationOnce(() => {
      throw new Error('crash');
    });

    const callback = jest.fn();
    const result = auth.onAuthStateChange(callback);

    expect(result).toBeNull();
  });
});
