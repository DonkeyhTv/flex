import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Authenticate,
  CurrentUser,
  PasswordHasher,
  Public,
  SignInService,
} from '@nestjs/authentication';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { DEMO_PASSWORD } from '../demo/people.js';
import { UsersRepository, type Member } from './users.repository.js';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});
type SignInDto = z.infer<typeof signInSchema>;

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly signInService: SignInService,
  ) {}

  /** The accounts the sign-in page offers, with their shared password. */
  @Public()
  @Get('auth/demo-accounts')
  async demoAccounts() {
    const accounts = await this.usersRepository.demoAccounts();
    return { password: DEMO_PASSWORD, accounts };
  }

  @Public()
  // Ten tries a minute per address: enough for typos, too few for guessing.
  @Throttle({
    default: {
      limit: () => Number(process.env.SIGN_IN_LIMIT ?? 10),
      ttl: 60_000,
    },
  })
  @Post('auth/sign-in')
  @HttpCode(200)
  async signIn(
    @Body({ schema: signInSchema }) body: SignInDto,
  ): Promise<Member> {
    const found = await this.usersRepository.findCredentials(body.email);
    // With no account, verify() checks a dummy hash: the answer and its timing
    // don't reveal which addresses have an account.
    const valid = await this.passwordHasher.verify(
      body.password,
      found?.passwordHash,
    );
    if (!valid || !found?.passwordHash) {
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }
    if (this.passwordHasher.needsRehash(found.passwordHash)) {
      await this.usersRepository.updatePasswordHash(
        found.member.id,
        await this.passwordHasher.hash(body.password),
      );
    }
    await this.signInService.signIn(found.member.id, { method: 'password' });
    return found.member;
  }

  @Public()
  @Post('auth/sign-out')
  @HttpCode(204)
  async signOut(): Promise<void> {
    await this.signInService.signOut();
  }

  /** Who is signed in, or null: answers 200 either way, so the sign-in page logs no error. */
  @Authenticate({ optional: true })
  @Get('auth/session')
  session(@CurrentUser() member: Member | null): { member: Member | null } {
    return { member };
  }

  @Get('me')
  me(@CurrentUser() member: Member): Member {
    return member;
  }
}
