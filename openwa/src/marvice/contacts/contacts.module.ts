import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactList } from './entities/contact-list.entity';
import { Contact } from './entities/contact.entity';
import { Session } from '../../modules/session/entities/session.entity';
import { ContactModule } from '../../modules/contact/contact.module';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { ContactsOptOutHook } from './opt-out.hook';

@Module({
  imports: [TypeOrmModule.forFeature([ContactList, Contact, Session], 'data'), ContactModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsOptOutHook],
  exports: [ContactsService],
})
export class MarviceContactsModule {}
