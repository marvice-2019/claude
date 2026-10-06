import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { NoNulCharacter } from '../../../common/validation/no-nul-character';
import { ToStrictBoolean } from '../../../common/utils/strict-boolean';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Diwali offer', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @NoNulCharacter()
  name!: string;

  @ApiProperty({ description: 'Contact list to send to' })
  @IsString()
  @IsNotEmpty()
  listId!: string;

  @ApiPropertyOptional({
    description:
      'Message body (the caption for image / video / document). {{name}}, {{first_name}}, {{phone}} and any ' +
      'imported column ({{requirement}}) are filled per contact. Required unless mediaType is audio: a voice ' +
      'note carries no text.',
    example: 'Hi {{first_name}}, your {{requirement}} is confirmed. Reply STOP to opt out.',
    maxLength: 4096,
  })
  @ValidateIf((o: CreateCampaignDto) => o.mediaType !== 'audio')
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  @NoNulCharacter()
  message!: string;

  @ApiPropertyOptional({
    description: 'Public https URL of the image, video, voice note (audio) or document. Required with mediaType.',
  })
  @ValidateIf((o: CreateCampaignDto) => !!o.mediaType)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2000)
  mediaUrl?: string;

  @ApiPropertyOptional({ enum: ['image', 'video', 'audio', 'document'], description: 'Omit for a text message' })
  @IsOptional()
  @IsIn(['image', 'video', 'audio', 'document'])
  mediaType?: 'image' | 'video' | 'audio' | 'document';

  @ApiPropertyOptional({ description: 'Base gap between messages in ms (jitter of 0–2 s is added)', default: 8000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3000)
  @Max(60000)
  delayMs?: number;

  @ApiPropertyOptional({ description: 'ISO time to start; omit to keep as draft until started' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Only contacts verified on WhatsApp (default: everyone not known to be off WhatsApp)',
  })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  onlyVerified?: boolean;

  @ApiPropertyOptional({ description: 'Only contacts carrying this tag' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;

  @ApiPropertyOptional({ description: 'Start sending immediately', default: false })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  startNow?: boolean;
}

export class PreviewCampaignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  listId!: string;

  @ApiProperty({ maxLength: 4096 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  onlyVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;
}

export class ListRecipientsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ enum: ['pending', 'queued', 'sent', 'failed', 'skipped'] })
  @IsOptional()
  @IsIn(['pending', 'queued', 'sent', 'failed', 'skipped'])
  status?: string;
}
