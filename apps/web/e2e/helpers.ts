import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Contrasena que cumple la politica del registro. */
const PASSWORD = 'Password123!';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/** Usuario nuevo en cada prueba: asi ninguna depende del estado de otra. */
export function buildUser(prefix: string): TestUser {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    email: `${prefix}-${unique}@e2e.umlforge.dev`,
    password: PASSWORD,
    name: `Prueba ${prefix}`,
  };
}

/** Registra por API y entra por la interfaz, que es lo que se quiere ejercitar. */
export async function registerAndLogin(
  page: Page,
  request: APIRequestContext,
  prefix: string,
): Promise<TestUser> {
  const user = buildUser(prefix);

  const response = await request.post('/api/auth/register', {
    data: { email: user.email, password: user.password, name: user.name },
  });
  expect(response.ok(), 'el registro por API deberia funcionar').toBe(true);

  await page.goto('/login');
  await page.getByLabel('Correo Electronico').fill(user.email);
  await page.getByLabel('Contrasena').fill(user.password);
  await page.getByRole('button', { name: 'Iniciar Sesion' }).click();

  await expect(page).toHaveURL(/\/projects$/u);
  return user;
}

/** Registra un usuario solo por API, sin pasar por la interfaz. */
export async function registerUser(request: APIRequestContext, prefix: string): Promise<TestUser> {
  const user = buildUser(prefix);
  const response = await request.post('/api/auth/register', {
    data: { email: user.email, password: user.password, name: user.name },
  });
  expect(response.ok(), 'el registro por API deberia funcionar').toBe(true);
  return user;
}

/** Token de acceso para hablar con la API en nombre de un usuario. */
export async function apiLogin(request: APIRequestContext, user: TestUser): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

/** Invita a un usuario al proyecto con el rol indicado. */
export async function addMember(
  request: APIRequestContext,
  token: string,
  projectId: string,
  email: string,
  role: 'EDITOR' | 'VIEWER' = 'EDITOR',
): Promise<void> {
  const response = await request.post(`/api/projects/${projectId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { email, role },
  });
  expect(response.ok(), 'la invitacion al proyecto deberia funcionar').toBe(true);
}

/** Identificador del proyecto que se esta editando, leido de la direccion. */
export function projectIdFromUrl(url: string): string {
  const match = /\/projects\/([^/]+)\/editor/u.exec(url);
  expect(match, 'la direccion deberia ser la del editor').not.toBeNull();
  return match?.[1] ?? '';
}

/** Entra por la interfaz con un usuario ya registrado. */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo Electronico').fill(user.email);
  await page.getByLabel('Contrasena').fill(user.password);
  await page.getByRole('button', { name: 'Iniciar Sesion' }).click();
  await expect(page).toHaveURL(/\/projects$/u);
}

/** Crea un proyecto desde la interfaz y devuelve su nombre. */
export async function createProject(page: Page, name: string): Promise<string> {
  // La pagina vacia muestra el boton tambien en el centro: basta el primero.
  await page.getByRole('button', { name: 'Nuevo Proyecto' }).first().click();
  await page.getByLabel('Nombre del Proyecto').fill(name);
  await page.getByRole('button', { name: 'Crear Proyecto' }).click();

  await expect(page.getByText(name, { exact: true })).toBeVisible();
  return name;
}

/** Abre el editor del proyecto indicado y espera al lienzo. */
export async function openEditor(page: Page, projectName: string): Promise<void> {
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(projectName, { exact: true }) });
  await card.getByRole('link', { name: 'Abrir Editor' }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+\/editor$/u);
  await expect(page.getByRole('button', { name: 'Nueva Clase' })).toBeVisible();
}

/** Anade una clase desde la paleta y espera a verla en el lienzo. */
export async function addClass(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Nueva Clase' }).click();

  const node = page.locator('.react-flow__node').first();
  await expect(node).toBeVisible();
  return (await node.innerText()).split('\n')[0] ?? '';
}
