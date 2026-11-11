import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  SessionCookieProvider,
  type SessionRecord,
} from '@nestjs/authentication';
import { UsersRepository, type Member } from './users.repository.js';

/** Turns the session cookie into the signed-in member. */
@Injectable()
export class SessionAuth extends SessionCookieProvider<Member> {
  constructor(
    private readonly usersRepository: UsersRepository,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  // Returning null (the member was deleted) ends the session.
  validate(session: SessionRecord) {
    return this.usersRepository.findById(session.userId);
  }
}
