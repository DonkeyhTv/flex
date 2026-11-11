import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { asc, desc, eq } from 'drizzle-orm';
import type { Database } from '../database/database.js';
import { users, type Role, type Team } from '../database/schema.js';

/** What the API says about a person: never the password hash. */
export interface Member {
  id: string;
  email: string;
  name: string;
  team: Team;
  role: Role;
}

const memberColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  team: users.team,
  role: users.role,
};

@Injectable()
export class UsersRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async findById(id: string): Promise<Member | null> {
    const [member] = await this.db
      .select(memberColumns)
      .from(users)
      .where(eq(users.id, id));
    return member ?? null;
  }

  /** For password sign-in only. */
  async findCredentials(
    email: string,
  ): Promise<{ member: Member; passwordHash: string | null } | null> {
    const [row] = await this.db
      .select({ ...memberColumns, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    if (!row) {
      return null;
    }
    const { passwordHash, ...member } = row;
    return { member, passwordHash };
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  demoAccounts(): Promise<Member[]> {
    return this.db
      .select(memberColumns)
      .from(users)
      .where(eq(users.demo, true))
      .orderBy(desc(users.role));
  }

  team(team: Team): Promise<Member[]> {
    return this.db
      .select(memberColumns)
      .from(users)
      .where(eq(users.team, team))
      .orderBy(asc(users.name));
  }
}
