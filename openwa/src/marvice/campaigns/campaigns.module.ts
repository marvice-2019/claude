import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignRecipient } from './entities/campaign-recipient.entity';
import { ContactList } from '../contacts/entities/contact-list.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Session } from '../../modules/session/entities/session.entity';
import { MessageModule } from '../../modules/message/message.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, CampaignRecipient, ContactList, Contact, Session], 'data'),
    MessageModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class MarviceCampaignsModule {}
