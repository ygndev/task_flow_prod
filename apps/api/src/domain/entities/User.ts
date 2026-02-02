import { BaseEntity } from './BaseEntity';
import { Role } from '../enums/Role';

export class User extends BaseEntity {
  readonly email: string;
  readonly displayName: string;
  readonly role: Role;
  readonly streakCount?: number;

  constructor(
    id: string,
    email: string,
    displayName: string,
    role: Role,
    createdAt?: Date,
    updatedAt?: Date,
    streakCount?: number
  ) {
    super(id, createdAt, updatedAt);
    this.email = email;
    this.displayName = displayName;
    this.role = role;
    this.streakCount = streakCount;
  }
}
