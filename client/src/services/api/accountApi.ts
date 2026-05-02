import { api } from './http';

const DELETE_CONFIRM = 'DELETE_MY_ACCOUNT';

function parseFilenameFromDisposition(header: string | undefined): string | null {
  if (!header) return null;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(header);
  const raw = m?.[1] || m?.[2];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export const accountApi = {
  downloadExport: async (): Promise<void> => {
    const res = await api.get('/account/export', { responseType: 'blob' });
    const blob = res.data as Blob;
    const dispo = res.headers['content-disposition'] as string | undefined;
    const name = parseFilenameFromDisposition(dispo) || 'learnflow-export.json';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  deleteAccount: async (confirm: string): Promise<{ message: string }> => {
    const res = await api.delete('/account', { data: { confirm } });
    return { message: (res.data as { message?: string }).message || '账号已注销' };
  },

  /** 供 E2E / 调试：与前端删除确认文案一致 */
  DELETE_CONFIRM,
};
