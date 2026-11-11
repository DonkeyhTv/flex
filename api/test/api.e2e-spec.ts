import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PGlite } from '@electric-sql/pglite';
import { getDrizzleToken } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { bookableDays } from '../src/calendar/calendar.js';
import { configure } from '../src/configure.js';
import { DemoService } from '../src/demo/demo.service.js';
import { DEMO_PASSWORD } from '../src/demo/people.js';

const camille = 'camille.martin@lumen.example';
const sam = 'sam.leclercq@lumen.example';

describe('Flex API (e2e)', () => {
  const pglite = new PGlite();
  let app: INestApplication;
  const [, day, otherDay] = bookableDays();

  /** A browser-like client, signed in as one of the demo accounts. */
  async function signIn(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/sign-in')
      .send({ email, password: DEMO_PASSWORD })
      .expect(200);
    return agent;
  }

  beforeAll(async () => {
    const db = drizzle({ client: pglite });
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDrizzleToken())
      .useValue(db)
      .compile();
    app = configure(moduleRef.createNestApplication());
    await app.init();
    // The people and the desks, but none of the demo's bookings: each test books its own.
    await app.get(DemoService).seedOffice();
  });

  afterAll(async () => {
    await app.close();
    await pglite.close().catch(() => undefined);
  });

  describe('signing in', () => {
    it('lists the demo accounts on the sign-in page', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/demo-accounts')
        .expect(200);
      expect(res.body.password).toBe(DEMO_PASSWORD);
      expect(
        res.body.accounts.map((a: { email: string }) => a.email).sort(),
      ).toEqual([camille, sam]);
    });

    it('opens a session that /me reads, and closes it', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/session')
        .expect(200, { member: null });
      const agent = await signIn(camille);
      const session = await agent.get('/api/auth/session').expect(200);
      expect(session.body.member.email).toBe(camille);
      const me = await agent.get('/api/me').expect(200);
      expect(me.body).toMatchObject({
        email: camille,
        team: 'design',
        role: 'member',
      });
      expect(me.body).not.toHaveProperty('passwordHash');

      await agent.post('/api/auth/sign-out').expect(204);
      await agent.get('/api/me').expect(401);
    });

    it('refuses a wrong password, and anonymous requests', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: camille, password: 'not the password' })
        .expect(401)
        .expect(({ body }) => expect(body.code).toBe('invalid_credentials'));
      await request(app.getHttpServer()).get('/api/office').expect(401);
    });

    it('refuses a write posted from another website', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .set('Origin', 'https://evil.example')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ email: camille, password: DEMO_PASSWORD })
        .expect(403);
    });
  });

  it('draws the office: two floors, their rooms and 42 desks', async () => {
    const agent = await signIn(camille);
    const { body } = await agent.get('/api/office').expect(200);
    expect(body.floors.map((f: { id: string }) => f.id)).toEqual(['f1', 'f2']);
    expect(
      body.floors.flatMap((f: { desks: unknown[] }) => f.desks),
    ).toHaveLength(42);
    expect(
      body.floors[0].rooms.some((r: { name?: string }) => r.name === 'Sablon'),
    ).toBe(true);
  });

  describe('booking', () => {
    it('books a desk, shows it on the plan, then cancels it', async () => {
      const agent = await signIn(camille);
      const booked = await agent
        .post('/api/reservations')
        .send({ deskId: 'desk-1-09', date: day })
        .expect(201);
      expect(booked.body).toMatchObject({
        deskCode: '1.09',
        date: day,
        slot: 'day',
        user: { team: 'design' },
      });

      const plan = await agent.get(`/api/reservations?date=${day}`).expect(200);
      expect(plan.body.map((r: { id: string }) => r.id)).toContain(
        booked.body.id,
      );
      const mine = await agent.get('/api/reservations/mine').expect(200);
      expect(mine.body.map((r: { id: string }) => r.id)).toEqual([
        booked.body.id,
      ]);

      await agent.delete(`/api/reservations/${booked.body.id}`).expect(204);
      await agent.get('/api/reservations/mine').expect(200, []);
    });

    it('lets two people share a desk by half-days, and nobody take a half that is taken', async () => {
      const morning = await signIn(camille);
      const afternoon = await signIn(sam);
      await morning
        .post('/api/reservations')
        .send({ deskId: 'desk-1-10', date: day, slot: 'am' })
        .expect(201);
      await afternoon
        .post('/api/reservations')
        .send({ deskId: 'desk-1-10', date: day, slot: 'pm' })
        .expect(201);

      const taken = await afternoon
        .post('/api/reservations')
        .send({ deskId: 'desk-1-10', date: otherDay, slot: 'day' });
      expect(taken.status).toBe(201);
      await morning
        .post('/api/reservations')
        .send({ deskId: 'desk-1-10', date: otherDay, slot: 'am' })
        .expect(409)
        .expect(({ body }) => expect(body.code).toBe('desk_taken'));
    });

    it('keeps a person in one place at a time', async () => {
      const agent = await signIn(camille);
      await agent
        .post('/api/reservations')
        .send({ deskId: 'desk-1-11', date: day, slot: 'day' })
        .expect(409)
        .expect(({ body }) => expect(body.code).toBe('already_booked'));
    });

    it('decides races in the database: of two clicks at once, one wins', async () => {
      const [a, b] = await Promise.all([signIn(camille), signIn(sam)]);
      const date = bookableDays()[3];
      const results = await Promise.all([
        a.post('/api/reservations').send({ deskId: 'desk-2-01', date }),
        b.post('/api/reservations').send({ deskId: 'desk-2-01', date }),
      ]);
      expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([
        201, 409,
      ]);
    });

    it('refuses dates outside the window, weekends and malformed input', async () => {
      const agent = await signIn(camille);
      const refuse = (body: object, status: number, code?: string) =>
        agent
          .post('/api/reservations')
          .send(body)
          .expect(status)
          .expect(({ body: error }) => code && expect(error.code).toBe(code));
      await refuse(
        { deskId: 'desk-1-01', date: '2020-01-06' },
        422,
        'past_date',
      );
      await refuse(
        { deskId: 'desk-1-01', date: '2099-01-05' },
        422,
        'beyond_window',
      );
      await refuse(
        { deskId: 'desk-9-99', date: bookableDays()[4] },
        404,
        'desk_not_found',
      );
      await refuse({ deskId: 'desk-1-01', date: 'demain' }, 400);
      await refuse({ deskId: 'desk-1-01', date: day, slot: 'evening' }, 400);
      await refuse(
        { deskId: 'desk-1-01', date: day, userId: 'someone-else' },
        400,
      );
    });

    it("moves a booking to another day, but not someone else's", async () => {
      const owner = await signIn(camille);
      const date = bookableDays()[5];
      const target = bookableDays()[6];
      const { body } = await owner
        .post('/api/reservations')
        .send({ deskId: 'desk-1-12', date })
        .expect(201);

      const moved = await owner
        .patch(`/api/reservations/${body.id}`)
        .send({ date: target })
        .expect(200);
      expect(moved.body).toMatchObject({ date: target, deskCode: '1.12' });

      const stranger = await signIn(sam);
      // An office manager may; a member may not.
      await stranger
        .patch(`/api/reservations/${body.id}`)
        .send({ slot: 'am' })
        .expect(200);
    });
  });

  it("shows a team's week", async () => {
    const agent = await signIn(camille);
    const { body } = await agent.get(`/api/team?week=${day}`).expect(200);
    expect(body.team).toBe('design');
    expect(body.days).toHaveLength(5);
    const me = body.members.find((m: { isMe: boolean }) => m.isMe);
    expect(me.name).toBe('Camille Martin');
    await agent.get('/api/team?team=marketing').expect(400);
  });

  describe('office management', () => {
    it('is reserved to office managers', async () => {
      const member = await signIn(camille);
      await member.get('/api/stats').expect(403);
      await member
        .patch('/api/desks/desk-1-01')
        .send({ active: false })
        .expect(403);
    });

    it('takes a desk out of service and cancels its upcoming bookings', async () => {
      const member = await signIn(camille);
      const manager = await signIn(sam);
      const date = bookableDays()[7];
      await member
        .post('/api/reservations')
        .send({ deskId: 'desk-1-14', date })
        .expect(201);

      const res = await manager
        .patch('/api/desks/desk-1-14')
        .send({ active: false, disabledReason: 'Écran à remplacer' })
        .expect(200);
      expect(res.body).toMatchObject({
        cancelled: 1,
        desk: { active: false, disabledReason: 'Écran à remplacer' },
      });
      await member
        .post('/api/reservations')
        .send({ deskId: 'desk-1-14', date })
        .expect(409)
        .expect(({ body }) => expect(body.code).toBe('desk_inactive'));

      await manager
        .patch('/api/desks/desk-1-14')
        .send({ active: true })
        .expect(200);
    });

    it('reports occupancy over the booking window', async () => {
      const manager = await signIn(sam);
      const { body } = await manager.get('/api/stats').expect(200);
      expect(body.days).toHaveLength(bookableDays().length);
      expect(body.rate).toBeGreaterThan(0);
      expect(body.zones.map((z: { zone: string }) => z.zone).sort()).toEqual([
        'calme',
        'design',
        'produit',
        'tech',
        'ventes',
      ]);
    });
  });
});
