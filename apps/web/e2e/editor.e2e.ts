import { expect, test } from '@playwright/test';
import { CLASE_DESTINO_ID, CLASE_ORIGEN_ID, DOS_CLASES_XMI } from './fixtures';
import {
  addClass,
  connectNodes,
  createProject,
  importXmiModel,
  nodeById,
  openEditor,
  registerAndLogin,
} from './helpers';

test.describe('Lienzo de modelado', () => {
  test('anade una clase y la conserva tras recargar', async ({ page, request }) => {
    await registerAndLogin(page, request, 'lienzo');
    await createProject(page, 'Lienzo E2E');
    await openEditor(page, 'Lienzo E2E');

    const classId = await addClass(page);
    const className = await nodeById(page, classId).innerText();
    expect(className.length).toBeGreaterThan(0);

    // La clase esta en el documento Yjs y el servidor la persiste en binario.
    await page.reload();
    await expect(page.locator('.react-flow__node')).toHaveCount(1);
    await expect(page.locator('.react-flow__node').first()).toContainText(
      className.split('\n')[0] ?? '',
    );
  });

  test('relaciona dos clases y edita la cardinalidad del extremo', async ({ page, request }) => {
    await registerAndLogin(page, request, 'cardinalidad');
    await createProject(page, 'Cardinalidad E2E');
    await openEditor(page, 'Cardinalidad E2E');

    // Se parte de un modelo importado: dos clases en posiciones conocidas.
    await importXmiModel(page, DOS_CLASES_XMI);
    await expect(page.locator('.react-flow__node')).toHaveCount(2);

    await page.locator('.react-flow__controls-fitview').click();
    const source = nodeById(page, CLASE_ORIGEN_ID);
    const target = nodeById(page, CLASE_DESTINO_ID);
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    await connectNodes(page, source, target);
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    // La relacion se selecciona desde el arbol: en el lienzo las aristas son
    // finas y cualquier clase puede taparlas.
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
