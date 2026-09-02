import { expect, test } from '@playwright/test';
import { addClass, createProject, openEditor, registerAndLogin } from './helpers';

test.describe('Entregables del modelo', () => {
  test('genera el backend Spring Boot y lo descarga en ZIP', async ({ page, request }) => {
    await registerAndLogin(page, request, 'backend');
    await createProject(page, 'Backend E2E');
    await openEditor(page, 'Backend E2E');
    await addClass(page);

    await page.getByRole('button', { name: 'Generar backend' }).click();
    await page.getByLabel('Artefacto').fill('backend-e2e');
    await page.getByLabel('Paquete raiz').fill('com.umlforge.e2e');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generar y descargar' }).click();

    const file = await download;
    expect(file.suggestedFilename()).toBe('backend-e2e.zip');
    await expect(page.getByText(/Backend generado/u)).toBeVisible();
  });

  test('exporta el modelo a XMI 2.1', async ({ page, request }) => {
    await registerAndLogin(page, request, 'xmi');
    await createProject(page, 'XMI E2E');
    await openEditor(page, 'XMI E2E');
    await addClass(page);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar XMI' }).click();

    const file = await download;
    expect(file.suggestedFilename()).toBe('xmi-e2e.xmi');
  });

  test('ofrece el asistente de IA e informa del proveedor activo', async ({ page, request }) => {
    await registerAndLogin(page, request, 'asistente');
    await createProject(page, 'Asistente E2E');
    await openEditor(page, 'Asistente E2E');
    await addClass(page);

    await page.getByRole('button', { name: 'Asistente IA' }).click();

    await expect(page.getByRole('heading', { name: 'Asistente de modelado' })).toBeVisible();
    await expect(page.getByLabel('Instruccion para la IA')).toBeVisible();
    // El estado del proveedor se consulta al abrir: gemini u ollama.
    await expect(page.getByText(/gemini|ollama/u).first()).toBeVisible();
  });
});
