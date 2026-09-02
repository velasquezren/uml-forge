import { expect, test } from '@playwright/test';
import {
  addClass,
  addMember,
  apiLogin,
  createProject,
  login,
  openEditor,
  projectIdFromUrl,
  registerAndLogin,
  registerUser,
} from './helpers';

test.describe('Colaboracion en tiempo real', () => {
  test('dos usuarios editan el mismo modelo y se ven conectados', async ({
    page,
    request,
    browser,
  }) => {
    const owner = await registerAndLogin(page, request, 'duenno');
    await createProject(page, 'Colaboracion E2E');
    await openEditor(page, 'Colaboracion E2E');
    await addClass(page);

    const editorUrl = page.url();
    const projectId = projectIdFromUrl(editorUrl);

    // Se invita a un segundo usuario como editor del mismo proyecto.
    const collaborator = await registerUser(request, 'colaborador');
    await addMember(request, await apiLogin(request, owner), projectId, collaborator.email);

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();

    try {
      await login(secondPage, collaborator);
      await secondPage.goto(editorUrl);

      // Lo que hay en el documento Yjs llega a quien acaba de entrar.
      await expect(secondPage.locator('.react-flow__node')).toHaveCount(1);
      await expect(page.getByText(/2 en linea/u)).toBeVisible();
      await expect(secondPage.getByText(/2 en linea/u)).toBeVisible();

      // Lo que crea uno aparece en el otro sin recargar.
      await secondPage.getByRole('button', { name: 'Nueva Clase' }).click();
      await expect(secondPage.locator('.react-flow__node')).toHaveCount(2);
      await expect(page.locator('.react-flow__node')).toHaveCount(2);

      await page.getByRole('button', { name: 'Nueva Clase' }).click();
      await expect(secondPage.locator('.react-flow__node')).toHaveCount(3);
    } finally {
      await secondContext.close();
    }
  });
});
