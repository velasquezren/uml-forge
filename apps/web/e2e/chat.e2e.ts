import { expect, test } from '@playwright/test';
import {
  addMember,
  apiLogin,
  createProject,
  login,
  openEditor,
  projectIdFromUrl,
  registerAndLogin,
  registerUser,
} from './helpers';

test.describe('Chat del equipo', () => {
  test('un mensaje llega en directo a otro miembro con el contador de no leidos', async ({
    page,
    request,
    browser,
  }) => {
    const owner = await registerAndLogin(page, request, 'chat');
    await createProject(page, 'Chat E2E');
    await openEditor(page, 'Chat E2E');

    const editorUrl = page.url();
    const collaborator = await registerUser(request, 'chatcolega');
    await addMember(
      request,
      await apiLogin(request, owner),
      projectIdFromUrl(editorUrl),
      collaborator.email,
    );

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    try {
      await login(secondPage, collaborator);
      await secondPage.goto(editorUrl);
      // Se espera a que su chat este conectado en tiempo real.
      await expect(secondPage.locator('[data-chat-connected="true"]')).toBeVisible();

      await page.getByRole('button', { name: 'Chat del equipo' }).click();
      await page
        .getByLabel('Mensaje para el chat del equipo')
        .fill('Hola, reviso yo la clase Pedido');
      await page.keyboard.press('Enter');
      await expect(page.getByText('Hola, reviso yo la clase Pedido')).toBeVisible();

      // Quien tiene el chat cerrado ve el aviso de mensaje sin leer.
      await expect(
        secondPage.getByRole('button', { name: 'Chat del equipo, 1 sin leer' }),
      ).toBeVisible();
      await secondPage.getByRole('button', { name: /Chat del equipo/u }).click();
      await expect(secondPage.getByText('Hola, reviso yo la clase Pedido')).toBeVisible();
    } finally {
      await secondContext.close();
    }
  });
});
