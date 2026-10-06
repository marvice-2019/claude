import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireRole } from '../../modules/auth/decorators/auth.decorators';
import { ApiKeyRole } from '../../modules/auth/entities/api-key.entity';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, ListRecipientsQueryDto, PreviewCampaignDto } from './dto/campaigns.dto';

// Marvice Modules — Campaigns. OPERATOR for everything: a campaign sends from the linked WhatsApp
// account to customer contacts.
@ApiTags('marvice-campaigns')
@Controller('sessions/:sessionId/marvice/campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'List campaigns (newest first)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  list(@Param('sessionId') sessionId: string) {
    return this.campaigns.list(sessionId);
  }

  @Post('preview')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Count the audience and render the message for the first contacts' })
  preview(@Param('sessionId') sessionId: string, @Body() dto: PreviewCampaignDto) {
    return this.campaigns.preview(sessionId, dto);
  }

  @Post()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({
    summary: 'Create a campaign',
    description:
      'Snapshots the opted-in contacts of the list as recipients. Starts now (startNow), at scheduledAt, ' +
      'or stays a draft. Sending is paced and re-checks opt-outs before every chunk of 100.',
  })
  create(@Param('sessionId') sessionId: string, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(sessionId, dto);
  }

  @Get(':campaignId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Get a campaign with per-status recipient counts' })
  get(@Param('sessionId') sessionId: string, @Param('campaignId') campaignId: string) {
    return this.campaigns.get(sessionId, campaignId);
  }

  @Delete(':campaignId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign that is not sending' })
  @ApiResponse({ status: 409, description: 'The campaign is still sending' })
  remove(@Param('sessionId') sessionId: string, @Param('campaignId') campaignId: string) {
    return this.campaigns.remove(sessionId, campaignId);
  }

  @Post(':campaignId/start')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or resume a campaign' })
  @ApiResponse({ status: 409, description: 'The campaign cannot be started from its current state' })
  start(@Param('sessionId') sessionId: string, @Param('campaignId') campaignId: string) {
    return this.campaigns.start(sessionId, campaignId);
  }

  @Post(':campaignId/pause')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a campaign (unsent messages wait for resume)' })
  @ApiResponse({ status: 409, description: 'The campaign is not running' })
  pause(@Param('sessionId') sessionId: string, @Param('campaignId') campaignId: string) {
    return this.campaigns.pause(sessionId, campaignId);
  }

  @Post(':campaignId/cancel')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a campaign (unsent messages are skipped)' })
  @ApiResponse({ status: 409, description: 'The campaign has already finished' })
  cancel(@Param('sessionId') sessionId: string, @Param('campaignId') campaignId: string) {
    return this.campaigns.cancel(sessionId, campaignId);
  }

  @Get(':campaignId/recipients')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Page through a campaign’s recipients and their delivery status' })
  recipients(
    @Param('sessionId') sessionId: string,
    @Param('campaignId') campaignId: string,
    @Query() query: ListRecipientsQueryDto,
  ) {
    return this.campaigns.listRecipients(sessionId, campaignId, query);
  }
}
