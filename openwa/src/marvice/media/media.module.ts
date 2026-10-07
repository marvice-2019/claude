import { Module } from '@nestjs/common';
import { MarviceMediaController } from './media.controller';

@Module({ controllers: [MarviceMediaController] })
export class MarviceMediaModule {}
