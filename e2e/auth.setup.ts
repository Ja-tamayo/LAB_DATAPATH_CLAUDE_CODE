import { test as setup, expect } from '@playwright/test'
import path from 'path'

export const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')

/**
 * Authenticates once via the login UI and persists the session as storageState.
 * All tests in the `chromium` project reuse this file — no re-login per test.
 *
 * Required env vars (add to .env.local):
 *   TEST_EMAIL=...
 *   TEST_PASSWORD=...
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'TEST_EMAIL and TEST_PASSWORD must be set in .env.local to run E2E tests',
    )
  }

  await page.goto('/login')

  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  // Wait for redirect to confirm auth succeeded
  await expect(page).toHaveURL('/dashboard', { timeout: 15_000 })

  // Persist cookies / localStorage so dependent projects skip login
  await page.context().storageState({ path: AUTH_FILE })
})
