import { expect, test } from '@playwright/test';
import { registerAndLogin } from './helpers';

test.describe('Acceso y gestion de proyectos', () => {
  test('registra, entra y ve su lista de proyectos vacia', async ({ page, request }) => {
    await registerAndLogin(page, request, 'acceso');

    await expect(page.getByText('No tienes proyectos aun')).toBeVisible();
  });

  test('crea un proyecto y aparece en la lista con su descripcion', async ({ page, request }) => {
    await registerAndLogin(page, request, 'crear');

    // La pagina vacia muestra el boton tambien en el centro: basta el primero.
    await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
    await page.getByLabel('Nombre del Proyecto').fill('Clinica E2E');
    await page.getByLabel('Descripcion (Opcional)').fill('Modelo de prueba automatica');
    await page.getByRole('button', { name: 'Crear Proyecto' }).click();

    await expect(page.getByText('Clinica E2E', { exact: true })).toBeVisible();
    await expect(page.getByText('Modelo de prueba automatica')).toBeVisible();

    // El proyecto sobrevive a una recarga: viene de la API, no del estado local.
    await page.reload();
    await expect(page.getByText('Clinica E2E', { exact: true })).toBeVisible();
  });

  test('rechaza credenciales incorrectas sin dejar entrar', async ({ page, request }) => {
    const user = await registerAndLogin(page, request, 'credenciales');

    await page.goto('/login');
    await page.getByLabel('Correo Electronico').fill(user.email);
    await page.getByLabel('Contrasena').fill('OtraClave123!');
    await page.getByRole('button', { name: 'Iniciar Sesion' }).click();

    await expect(page.getByText(/Credenciales incorrectas/u)).toBeVisible();
  });

  test('protege el editor de quien no ha iniciado sesion', async ({ page }) => {
    await page.goto('/projects/00000000-0000-4000-8000-000000000000/editor');

    await expect(page).toHaveURL(/\/login$/u);
  });
});
