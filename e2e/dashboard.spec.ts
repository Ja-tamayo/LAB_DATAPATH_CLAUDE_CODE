import { test, expect } from '@playwright/test'

// These tests run authenticated (storageState set at the project level in playwright.config.ts)

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  // ─── Layout ────────────────────────────────────────────────────────────────

  test('renders the three kanban columns', async ({ page }) => {
    await expect(page.getByText('Por hacer')).toBeVisible()
    await expect(page.getByText('En progreso')).toBeVisible()
    await expect(page.getByText('Terminado')).toBeVisible()
  })

  test('shows the authenticated user email in the header', async ({ page }) => {
    const email = process.env.TEST_EMAIL!
    await expect(page.getByText(email)).toBeVisible()
  })

  test('shows Nueva Tarea button in the header', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Nueva Tarea' })).toBeVisible()
  })

  test('shows the AI assistant panel', async ({ page }) => {
    await expect(page.getByText('Asistente AI')).toBeVisible()
  })

  // ─── New task dialog ───────────────────────────────────────────────────────

  test('opens new task dialog when clicking Nueva Tarea', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva Tarea' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nueva tarea' })).toBeVisible()
  })

  test('closes dialog when task is created successfully', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva Tarea' }).click()

    await page.getByPlaceholder('Escribe el título de la tarea...').fill('E2E test task')
    await page.getByRole('button', { name: 'Crear tarea' }).click()

    // Dialog should close after successful creation
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })
  })

  test('shows validation error when submitting empty title', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva Tarea' }).click()

    // Leave title empty and submit
    await page.getByRole('button', { name: 'Crear tarea' }).click()

    await expect(page.getByText('El título es requerido')).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('new task appears in Por hacer column after creation', async ({ page }) => {
    const taskTitle = `E2E task ${Date.now()}`

    await page.getByRole('button', { name: 'Nueva Tarea' }).click()
    await page.getByPlaceholder('Escribe el título de la tarea...').fill(taskTitle)
    await page.getByRole('button', { name: 'Crear tarea' }).click()

    // Dialog closes = Server Action returned { error: null }
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })

    // Fresh navigation forces Next.js to re-run the Server Component with latest DB data
    await page.goto('/dashboard')
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 15_000 })
  })

})

// Isolated from the block above — this test calls signOut() which revokes the
// shared refresh token. Running it in a separate describe prevents it from
// interfering with any other test via the shared storageState.
test.describe('Dashboard – auth guard', () => {
  test('logout redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Salir' }).click()

    await expect(page).toHaveURL('/login')
  })
})
