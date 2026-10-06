import { Module } from '@nestjs/common';
import { MarviceContactsModule } from './contacts/contacts.module';
import { MarviceCampaignsModule } from './campaigns/campaigns.module';

/**
 * Marvice Modules — Marvice Media's additions to OpenWA. Everything lives under src/marvice/ so
 * upstream merges only touch three one-line hooks: this import in app.module.ts and the entity /
 * migration globs in app.module.ts and database/data-source.ts.
 */
@Module({
  imports: [MarviceContactsModule, MarviceCampaignsModule],
})
export class MarviceModule {}
