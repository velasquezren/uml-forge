import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { ProjectRole } from '@prisma/client';
import { PROJECT_ROLES_KEY } from '../constants/roles';

export const RequireProjectRoles = (...roles: ProjectRole[]): CustomDecorator<string> =>
  SetMetadata(PROJECT_ROLES_KEY, roles);
