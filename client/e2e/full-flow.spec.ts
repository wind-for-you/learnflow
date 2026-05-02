import { expect, test } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000/api';
const USER_EMAIL = 'e2e_user@test.local';
const ADMIN_EMAIL = 'e2e_admin@test.local';
const PASSWORD = 'E2E123456!';

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('邮箱地址').fill(email);
  await page.getByLabel('密码').fill(PASSWORD);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL(/\/dashboard/);
}

async function fetchToken(request: import('@playwright/test').APIRequestContext, email: string) {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.token as string;
}

test('全页面 E2E：用户登录后核心页面可访问', async ({ page }) => {
  await login(page, USER_EMAIL);

  const routes = [
    '/dashboard',
    '/goals',
    '/planner',
    '/plans',
    '/tasks',
    '/checkin',
    '/reviews',
    '/analytics',
    '/task-center',
    '/achievements',
    '/profile',
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')));
    await expect(page.locator('main')).toBeVisible();
  }

  // 非管理员访问 admin/ops 必须被路由守卫挡回 dashboard
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/ops');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('全页面 E2E：管理员可访问 Admin/Ops 页面', async ({ page }) => {
  await login(page, ADMIN_EMAIL);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '管理后台' })).toBeVisible();

  await page.goto('/ops');
  await expect(page.getByRole('heading', { name: '运维后台' })).toBeVisible();
});

test('异常回归：OAuth 关闭、停用账号拦截、Agent 失败重试', async ({ request }) => {
  // OAuth 应被关闭并返回 503
  const oauthResp = await request.get(`${API_BASE}/auth/google`);
  expect(oauthResp.status()).toBe(503);

  // 停用账号后登录应被拦截
  const adminToken = await fetchToken(request, ADMIN_EMAIL);
  const unique = Date.now();
  const suspendEmail = `e2e_suspend_${unique}@test.local`;
  const registerResp = await request.post(`${API_BASE}/auth/register`, {
    data: { email: suspendEmail, name: 'Suspend User', password: PASSWORD },
  });
  expect(registerResp.ok()).toBeTruthy();
  const suspendBody = await registerResp.json();
  const suspendUserId = suspendBody.user.id as string;

  const disableResp = await request.patch(`${API_BASE}/admin/users/${suspendUserId}/status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { isActive: false },
  });
  expect(disableResp.ok()).toBeTruthy();

  const suspendedLogin = await request.post(`${API_BASE}/auth/login`, {
    data: { email: suspendEmail, password: PASSWORD },
  });
  expect(suspendedLogin.status()).toBe(403);

  // 造一个必然失败的 Agent 任务（缺少计划输入），然后验证 retry 可用
  const userToken = await fetchToken(request, USER_EMAIL);
  const createTaskResp = await request.post(`${API_BASE}/agent-tasks`, {
    headers: { Authorization: `Bearer ${userToken}` },
    data: {
      taskType: 'PLAN_GENERATION',
      agentType: 'PLANNER',
      providerType: 'DASHSCOPE',
      input: {},
    },
  });
  expect(createTaskResp.status()).toBe(202);
  const created = await createTaskResp.json();
  const taskId = created.task.id as string;

  let taskState = 'UNINITIALIZED';
  for (let i = 0; i < 20; i += 1) {
    const taskResp = await request.get(`${API_BASE}/agent-tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const body = await taskResp.json();
    taskState = body.task.state as string;
    if (taskState === 'ERROR') break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  expect(taskState).toBe('ERROR');

  const retryResp = await request.post(`${API_BASE}/agent-tasks/${taskId}/retry`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  expect(retryResp.ok()).toBeTruthy();
  const retryBody = await retryResp.json();
  expect(retryBody.task.state).toBe('UNINITIALIZED');
});

test('Wave3 首启引导：注册后进 Dashboard 可跳过且刷新不再出现', async ({ page }) => {
  const unique = Date.now();
  const email = `e2e_onb_${unique}@test.local`;
  await page.goto('/login');
  await page.getByRole('button', { name: '没有账号？立即注册' }).click();
  await page.getByLabel('邮箱地址').fill(email);
  await page.getByLabel('用户名').fill('Onb User');
  await page.getByLabel('密码', { exact: true }).fill(PASSWORD);
  await page.getByLabel('确认密码').fill(PASSWORD);
  await page.getByRole('button', { name: '注册' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await expect(page.getByRole('dialog', { name: /首启引导/ })).toBeVisible();
  await page.getByRole('button', { name: '跳过引导' }).first().click();
  await expect(page.getByRole('dialog', { name: /首启引导/ })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: /首启引导/ })).not.toBeVisible();
});

test('信任包：注册 → 导出 JSON → 注销 → 无法再登录', async ({ request }) => {
  const unique = Date.now();
  const email = `e2e_trust_${unique}@test.local`;
  const reg = await request.post(`${API_BASE}/auth/register`, {
    data: { email, name: 'Trust User', password: PASSWORD },
  });
  expect(reg.ok()).toBeTruthy();
  const regBody = await reg.json();
  const token = regBody.token as string;

  const exportResp = await request.get(`${API_BASE}/account/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(exportResp.ok()).toBeTruthy();
  const exportJson = await exportResp.json();
  expect(exportJson.user?.email).toBe(email);
  expect(exportJson.exportVersion).toBe(1);

  const del = await request.delete(`${API_BASE}/account`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { confirm: 'DELETE_MY_ACCOUNT' },
  });
  expect(del.ok()).toBeTruthy();

  const loginAgain = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  // 软删后邮箱已 tombstone，原邮箱在库中不存在 → 常返回 401；若仍匹配到停用行则 403
  expect([401, 403]).toContain(loginAgain.status());
  const loginBody = await loginAgain.json();
  const msg = String(loginBody.message || '');
  if (loginAgain.status() === 403) {
    expect(msg).toContain('注销');
  } else {
    expect(msg).toMatch(/邮箱或密码|密码/);
  }
});
