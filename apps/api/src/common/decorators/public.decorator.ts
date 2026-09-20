import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/roles';

export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
