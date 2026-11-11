import type { Role, Team } from '../database/schema.js';

export interface Person {
  name: string;
  email: string;
  team: Team;
  role: Role;
  demo?: boolean;
}

/** Shared by every demo account. The sign-in page shows it. */
export const DEMO_PASSWORD = 'flex-demo-2026';

const person = (
  name: string,
  team: Team,
  extra: Partial<Person> = {},
): Person => ({
  name,
  team,
  role: 'member',
  email: `${name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')}@lumen.example`,
  ...extra,
});

/** The staff of Lumen, the fictional agency of the demo. */
export const PEOPLE: Person[] = [
  person('Camille Martin', 'design', { demo: true }),
  person('Sam Leclercq', 'ops', { role: 'admin', demo: true }),
  person('Emma Claes', 'design'),
  person('Louise Dubois', 'design'),
  person('Arthur Maes', 'design'),
  person('Mila Leroy', 'design'),
  person('Lucas Janssens', 'produit'),
  person('Olivia Jacobs', 'produit'),
  person('Jules Mertens', 'produit'),
  person('Lina Willems', 'produit'),
  person('Victor Goossens', 'produit'),
  person('Chloé Dupont', 'produit'),
  person('Noah Peeters', 'tech'),
  person('Alice Wouters', 'tech'),
  person('Adam Lambert', 'tech'),
  person('Hugo Hermans', 'tech'),
  person('Elise Vermeulen', 'tech'),
  person('Thomas De Smet', 'tech'),
  person('Sarah Lemaire', 'tech'),
  person('Matteo Rossi', 'tech'),
  person('Inès Benali', 'tech'),
  person('Lars Van Damme', 'tech'),
  person('Zoé Renard', 'ventes'),
  person('Maxime Collin', 'ventes'),
  person('Fien De Backer', 'ventes'),
  person('Nathan Simon', 'ventes'),
  person('Amira Haddad', 'ventes'),
  person('Pieter Wauters', 'ventes'),
  person('Juliette Lefèvre', 'ops'),
];
