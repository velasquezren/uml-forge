import { expect, test } from '@playwright/test';
import { addClass, createProject, openEditor, registerAndLogin } from './helpers';

test.describe('Lienzo de modelado', () => {
  test('anade una clase y la conserva tras recargar', async ({ page, request }) => {
    await registerAndLogin(page, request, 'lienzo');
    await createProject(page, 'Lienzo E2E');
    await openEditor(page, 'Lienzo E2E');

    const className = await addClass(page);
    expect(className.length).toBeGreaterThan(0);

    // La clase esta en el documento Yjs y el servidor la persiste en binario.
    await page.reload();
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
    await expect(page.locator('.react-flow__node').first()).toContainText(className);
  });

  test('relaciona dos clases y edita la cardinalidad del extremo', async ({ page, request }) => {
    await registerAndLogin(page, request, 'cardinalidad');
    await createProject(page, 'Cardinalidad E2E');
    await openEditor(page, 'Cardinalidad E2E');

    await addClass(page);
    await page.getByRole('button', { name: 'Nueva Clase' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(2);

    // Encuadrar primero: las clases nuevas caen en posiciones dispersas y
    // pueden quedar fuera de la vista.
    await page.locator('.react-flow__controls-fitview').click();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();

    // Conectar arrastrando del borde derecho de una clase al izquierdo de la otra.
    const nodes = page.locator('.react-flow__node');
    const source = await nodes.nth(0).boundingBox();
    const target = await nodes.nth(1).boundingBox();
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();

    await page.mouse.move(source!.x + source!.width, source!.y + source!.height / 2);
    await page.mouse.down();
    await page.mouse.move(target!.x, target!.y + target!.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    // La relacion se selecciona desde el arbol: en el lienzo las clases se
    // colocan al azar y pueden taparla.
    await page.getByRole('tab', { name: 'Arbol' }).click();
    await expect(page.getByText('Relaciones (1)')).toBeVisible();
    await page.getByText(/\(association\)/u).click();

    await expect(page.getByLabel('Cardinalidad Destino')).toBeVisible();

    await page.getByRole('button', { name: '0..*', exact: true }).last().click();
    await expect(page.getByLabel('Cardinalidad Destino')).toHaveValue('0..*');

    // La cardinalidad sobrevive a la recarga: esta en el documento Yjs.
    await page.reload();
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await page.getByRole('tab', { name: 'Arbol' }).click();
    await page.getByText(/\(association\)/u).click();
    await expect(page.getByLabel('Cardinalidad Destino')).toHaveValue('0..*');
  });

  test('muestra el estado de sincronizacion en la barra inferior', async ({ page, request }) => {
    await registerAndLogin(page, request, 'sincronizacion');
    await createProject(page, 'Sincronizacion E2E');
    await openEditor(page, 'Sincronizacion E2E');

    await expect(page.getByText('Sincronizado')).toBeVisible();
    await expect(page.getByText(/1 en linea/u)).toBeVisible();
  });
});
