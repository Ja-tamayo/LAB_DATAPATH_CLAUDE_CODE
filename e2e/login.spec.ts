import { test, expect } from '@playwright/test'

// All tests here deal with unauthenticated state — override the project-level storageState
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login page', () => {
  test('renders login form with all required fields', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Correo electrónico')).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('shows inline error message on invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Correo electrónico').fill('wrong@example.com')
    await page.getByLabel('Contraseña').fill('wrongpassword')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Auth action redirects back to /login?error=... on failure
    await expect(page).toHaveURL(/[?&]error=/)
    await expect(page.getByText('Credenciales incorrectas')).toBeVisible()
  })

  test('redirects to /dashboard after successful login', async ({ page }) => {
    const email = process.env.TEST_EMAIL!
    const password = process.env.TEST_PASSWORD!

    await page.goto('/login')

    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 15_000 })
  })

  test('route guard: /dashboard redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL('/login')
  })
})
