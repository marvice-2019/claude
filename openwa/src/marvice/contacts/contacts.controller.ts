import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireRole } from '../../modules/auth/decorators/auth.decorators';
import { ApiKeyRole } from '../../modules/auth/entities/api-key.entity';
import { ContactsService } from './contacts.service';
import { CreateContactListDto, ImportContactsDto, ListContactsQueryDto, UpdateContactDto } from './dto';

// Marvice Modules — Contacts. OPERATOR for everything: importing and verifying numbers acts on the
// linked WhatsApp account, and contact lists hold customer data.
@ApiTags('marvice-contacts')
@Controller('sessions/:sessionId/marvice/contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get('lists')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'List contact lists with per-status counts' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  listLists(@Param('sessionId') sessionId: string) {
    return this.contacts.listLists(sessionId);
  }

  @Post('lists')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create a contact list' })
  @ApiResponse({ status: 409, description: 'A list with that name already exists on the session' })
  createList(@Param('sessionId') sessionId: string, @Body() dto: CreateContactListDto) {
    return this.contacts.createList(sessionId, dto);
  }

  @Delete('lists/:listId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact list and its contacts' })
  deleteList(@Param('sessionId') sessionId: string, @Param('listId') listId: string) {
    return this.contacts.deleteList(sessionId, listId);
  }

  @Post('lists/:listId/import')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Import contacts from CSV text',
    description:
      'Detects the phone / name / tags columns, normalizes numbers to international digits, removes ' +
      'duplicates and keeps other columns as campaign variables. Re-importing updates contacts in place ' +
      'and never re-opts-in someone who opted out. Verification on WhatsApp then runs in the background, paced.',
  })
  importCsv(@Param('sessionId') sessionId: string, @Param('listId') listId: string, @Body() dto: ImportContactsDto) {
    return this.contacts.importCsv(sessionId, listId, dto);
  }

  @Post('lists/:listId/verify')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Check pending / failed numbers on WhatsApp (background, paced)' })
  @ApiResponse({ status: 409, description: 'The session is not connected to WhatsApp' })
  async verify(@Param('sessionId') sessionId: string, @Param('listId') listId: string) {
    return { queued: await this.contacts.startVerification(sessionId, listId) };
  }

  @Get('lists/:listId/contacts')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Page through a list (search, status filter)' })
  listContacts(
    @Param('sessionId') sessionId: string,
    @Param('listId') listId: string,
    @Query() query: ListContactsQueryDto,
  ) {
    return this.contacts.listContacts(sessionId, listId, query);
  }

  @Patch(':contactId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Edit a contact (name, tags, opt-in)' })
  updateContact(
    @Param('sessionId') sessionId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.updateContact(sessionId, contactId, dto);
  }

  @Delete(':contactId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact' })
  deleteContact(@Param('sessionId') sessionId: string, @Param('contactId') contactId: string) {
    return this.contacts.deleteContact(sessionId, contactId);
  }
}
