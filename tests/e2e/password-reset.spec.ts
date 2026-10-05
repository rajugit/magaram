import { expect, test } from '@playwright/test';

test.describe('live password reset', () => {
  test('renders the reset form and safe guidance', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: 'Request a reset link' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset instructions' })).toBeVisible();
    await expect(page.getByText(/one-hour password-reset link/i)).toBeVisible();
  });

  test('delivers a generic reset response after the provider is enabled', async ({ page }) => {
    test.skip(
      process.env.PLAYWRIGHT_EMAIL_ACCEPTANCE !== '1',
      'Set PLAYWRIGHT_EMAIL_ACCEPTANCE=1 only after production mail delivery is configured.',
    );
    await page.goto('/reset-password');
    await page.getByLabel('Email address').fill('qa-reset@example.test');
    await page.getByRole('button', { name: 'Send reset instructions' }).click();
    await expect(page.getByText('If the account exists, password-reset instructions have been sent.')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/token=|reset-token|password=/i);
  });
});
