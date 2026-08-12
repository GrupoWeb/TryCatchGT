import { Request, Response } from 'express';
import { ListContacts } from '../../../application/use-cases/ListContacts.js';
import { CreateContact } from '../../../application/use-cases/CreateContact.js';
import { UpdateContact } from '../../../application/use-cases/UpdateContact.js';
import { ContactRepository, ContactFilters } from '../../../application/ports/output/ContactRepository.js';
import {
  Contact,
  CONTACT_STAGES,
  CONTACT_TIERS,
  ContactStage,
  ContactTier,
} from '../../../domain/entities/Contact.js';
import { DomainError } from '../../../domain/exceptions/DomainError.js';

function toView(c: Contact) {
  return {
    id: c.id,
    name: c.name,
    email: c.email.getValue(),
    phone: c.phone,
    company: c.company,
    sector: c.sector,
    location: c.location,
    website: c.website,
    source: c.source,
    tier: c.tier,
    stage: c.stage,
    notes: c.notes,
    nextActionAt: c.nextActionAt,
    archived: c.archived,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function parseFilters(q: Request['query']): ContactFilters {
  const f: ContactFilters = {};
  if (typeof q.stage === 'string' && CONTACT_STAGES.includes(q.stage as ContactStage)) {
    f.stage = q.stage as ContactStage;
  }
  if (typeof q.tier === 'string' && CONTACT_TIERS.includes(q.tier as ContactTier)) {
    f.tier = q.tier as ContactTier;
  }
  if (typeof q.sector === 'string' && q.sector.trim()) f.sector = q.sector.trim();
  if (q.hasWebsite === 'true') f.hasWebsite = true;
  if (q.hasWebsite === 'false') f.hasWebsite = false;
  if (typeof q.search === 'string' && q.search.trim()) f.search = q.search.trim();
  if (q.includeArchived === 'true') f.includeArchived = true;
  return f;
}

export class ContactAdminController {
  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly listContacts: ListContacts,
    private readonly createContact: CreateContact,
    private readonly updateContact: UpdateContact,
  ) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    const contacts = await this.listContacts.execute(parseFilters(req.query));
    res.status(200).json({ success: true, data: contacts.map(toView) });
  };

  public stats = async (_req: Request, res: Response): Promise<void> => {
    const byStage = await this.contactRepo.countByStage();
    const total = Object.values(byStage).reduce((a, b) => a + b, 0);
    res.status(200).json({ success: true, data: { total, byStage } });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const contact = await this.contactRepo.findById(Number(req.params.id));
    if (!contact) {
      res.status(404).json({ success: false, error: 'Contacto no encontrado.' });
      return;
    }
    res.status(200).json({ success: true, data: toView(contact) });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const b = req.body ?? {};
      const contact = await this.createContact.execute({
        name: b.name,
        email: b.email,
        phone: b.phone,
        company: b.company,
        sector: b.sector,
        location: b.location,
        website: b.website,
        tier: b.tier ?? null,
        notes: b.notes,
        source: 'manual',
      });
      res.status(201).json({ success: true, data: toView(contact) });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };

  public updateStage = async (req: Request, res: Response): Promise<void> => {
    const stage = req.body?.stage as ContactStage;
    if (!CONTACT_STAGES.includes(stage)) {
      res.status(400).json({ success: false, error: 'Etapa inválida.' });
      return;
    }
    const ok = await this.updateContact.changeStage(Number(req.params.id), stage);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Contacto no encontrado.' });
      return;
    }
    res.status(200).json({ success: true });
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    if (b.tier !== undefined && b.tier !== null && !CONTACT_TIERS.includes(b.tier)) {
      res.status(400).json({ success: false, error: 'Prioridad inválida.' });
      return;
    }
    const nextActionAt =
      b.nextActionAt === undefined ? undefined : b.nextActionAt ? new Date(b.nextActionAt) : null;
    const ok = await this.updateContact.patch(Number(req.params.id), {
      name: b.name,
      phone: b.phone,
      company: b.company,
      sector: b.sector,
      location: b.location,
      website: b.website,
      tier: b.tier,
      notes: b.notes,
      nextActionAt,
      archived: typeof b.archived === 'boolean' ? b.archived : undefined,
    });
    if (!ok) {
      res.status(404).json({ success: false, error: 'Contacto no encontrado o sin cambios.' });
      return;
    }
    res.status(200).json({ success: true });
  };
}
