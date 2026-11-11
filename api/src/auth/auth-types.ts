import type { Member } from './users.repository.js';

// Tells @nestjs/authentication what a user is, so @CurrentUser() is typed.
declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: Member;
  }
}
