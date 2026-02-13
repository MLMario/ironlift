# Phase 2: User Setup Required

**Generated:** 2026-02-12
**Phase:** 02-authentication
**Status:** Incomplete

## Dashboard Configuration

### Supabase Authentication

Password reset deep link must be whitelisted for the reset password flow to work.

- [ ] **Add ironlift://reset-password to Redirect URLs**
  - Location: Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs
  - Add: `ironlift://reset-password`

- [ ] **Verify email confirmations are enabled**
  - Location: Supabase Dashboard -> Authentication -> Providers -> Email -> Enable email confirmations = ON

- [ ] **Verify minimum password length is 6**
  - Location: Supabase Dashboard -> Authentication -> Providers -> Email -> Minimum password length = 6

## Verification

After completing the above:
1. Check that `ironlift://reset-password` appears in the Redirect URLs list
2. Try registering a new account -- a verification email should be sent
3. Request a password reset -- the email should contain a link with `ironlift://reset-password` in the URL

---
**Once all items complete:** Mark status as "Complete"
