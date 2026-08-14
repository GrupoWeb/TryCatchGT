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

  describe('setRead', () => {
    it('marca un correo como leído (por defecto)', async () => {
      const messages: any = { setInboundRead: vi.fn(async () => true) };
      const controller = new CrmInboxController(messages);
      const res = stubRes();
      await controller.setRead({ params: { id: '5' }, body: {} } as any, res);
      expect(messages.setInboundRead).toHaveBeenCalledWith(5, true);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data).toEqual({ id: 5, read: true });
    });

    it('marca como no leído cuando read=false', async () => {
      const messages: any = { setInboundRead: vi.fn(async () => true) };
      const controller = new CrmInboxController(messages);
      const res = stubRes();
      await controller.setRead({ params: { id: '5' }, body: { read: false } } as any, res);
      expect(messages.setInboundRead).toHaveBeenCalledWith(5, false);
    });

    it('responde 400 con id no válido', async () => {
      const messages: any = { setInboundRead: vi.fn() };
      const controller = new CrmInboxController(messages);
      const res = stubRes();
      await controller.setRead({ params: { id: 'abc' }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(messages.setInboundRead).not.toHaveBeenCalled();
    });

    it('responde 404 si el correo no existe', async () => {
      const messages: any = { setInboundRead: vi.fn(async () => false) };
      const controller = new CrmInboxController(messages);
      const res = stubRes();
      await controller.setRead({ params: { id: '9' }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('refreshBody', () => {
    it('devuelve el cuerpo recuperado (updated -> complete true)', async () => {
      const refresh: any = { execute: vi.fn(async () => ({ outcome: 'updated', bodyHtml: '<p>completo</p>' })) };
      const controller = new CrmInboxController({} as any, refresh);
      const res = stubRes();
      await controller.refreshBody({ params: { id: '3' } } as any, res);
      expect(refresh.execute).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0].data;
      expect(data).toEqual({ id: 3, outcome: 'updated', bodyHtml: '<p>completo</p>', complete: true });
    });

    it('marca complete=false cuando la descarga falla', async () => {
      const refresh: any = { execute: vi.fn(async () => ({ outcome: 'failed', bodyHtml: 'recorte' })) };
      const controller = new CrmInboxController({} as any, refresh);
      const res = stubRes();
      await controller.refreshBody({ params: { id: '3' } } as any, res);
      expect(res.json.mock.calls[0][0].data.complete).toBe(false);
    });

    it('responde 404 si el correo no existe', async () => {
      const refresh: any = { execute: vi.fn(async () => ({ outcome: 'not_found', bodyHtml: null })) };
      const controller = new CrmInboxController({} as any, refresh);
      const res = stubRes();
      await controller.refreshBody({ params: { id: '9' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responde 400 con id no válido', async () => {
      const refresh: any = { execute: vi.fn() };
      const controller = new CrmInboxController({} as any, refresh);
      const res = stubRes();
      await controller.refreshBody({ params: { id: 'x' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(refresh.execute).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('envía el correo a la papelera (baja lógica)', async () => {
      const messages: any = { softDeleteInbound: vi.fn(async () => true) };
      const controller = new CrmInboxController(messages);
      const res = stubRes();
      await controller.remove({ params: { id: '7' } } as any, res);
      expect(messages.softDeleteInbound).toHaveBeenCalledWith(7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data).toEqual({ id: 7 });
    });

    it('responde 400 con id no válido', async () => {
      const messages: any = { softDeleteInbound: vi.fn() };
      const controller = new CrmInboxController(messages);
      const res = stubRes();
      await controller.remove({ params: { id: '0' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(messages.softDeleteInbound).not.toHaveBeenCalled();
    });

    it('responde 404 si el correo no existe', async () => {
      const messages: any = { softDeleteInbound: vi.fn(async () => false) };
      const controller = new CrmInboxController(messages);
      const res = stubRes();
      await controller.remove({ params: { id: '9' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
