import { test, expect } from '@playwright/test';

test.describe('Auth', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Iniciar Sesión')).toBeVisible();
    await expect(page.getByText('Gestor de Préstamos')).toBeVisible();
  });

  test('switches to register mode', async ({ page }) => {
    await page.goto('/auth');
    await page.getByText('Registrarse').click();
    await expect(page.getByText('Crear Cuenta')).toBeVisible();
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('#email', 'invalid@test.com');
    await page.fill('#password', 'wrong');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Loans', () => {
  test('redirects unauthenticated user to auth', async ({ page }) => {
    await page.goto('/loans');
    await expect(page).toHaveURL('/auth');
  });
});
