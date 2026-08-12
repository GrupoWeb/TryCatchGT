import { describe, it, expect, vi } from 'vitest';
import { CrmInboxController } from '../../src/infrastructure/http/controllers/CrmInboxController.js';

function stubRes() {
  const r: any = {};
  r.status = vi.fn(() => r);
  r.json = vi.fn(() => r);
  return r;
}

describe('CrmInboxController', () => {
  it('list devuelve los entrantes y el conteo de no leídos', async () => {
    const messages: any = {
      listInbox: vi.fn(async () => [
        { id: 1, contactId: 2, contactName: 'Ana', contactEmail: 'ana@x.com', subject: 'Re: propuesta', receivedAt: null, createdAt: new Date(), unread: true },
      ]),
      countUnreadInbound: vi.fn(async () => 1),
      markInboundRead: vi.fn(async () => 0),
    };
    const controller = new CrmInboxController(messages);
    const res = stubRes();
    await controller.list({} as any, res);
    expect(messages.listInbox).toHaveBeenCalledWith(30);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.unread).toBe(1);
    expect(payload.data.items).toHaveLength(1);
  });

  it('markSeen marca los entrantes como leídos', async () => {
    const messages: any = { markInboundRead: vi.fn(async () => 3) };
    const controller = new CrmInboxController(messages);
    const res = stubRes();
    await controller.markSeen({} as any, res);
    expect(messages.markInboundRead).toHaveBeenCalledOnce();
    expect(res.json.mock.calls[0][0].data.marked).toBe(3);
  });
});
