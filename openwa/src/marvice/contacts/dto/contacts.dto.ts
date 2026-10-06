import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NoNulCharacter } from '../../../common/validation/no-nul-character';
import { ToStrictBoolean } from '../../../common/utils/strict-boolean';

export class CreateContactListDto {
  @ApiProperty({ example: 'Cafe regulars', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @NoNulCharacter()
  name!: string;

  @ApiPropertyOptional({ example: 'Opted in at the counter, Oct 2026', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @NoNulCharacter()
  description?: string;
}

export class ImportContactsDto {
  @ApiProperty({
    description: 'CSV text with a header row. Needs a phone column; name, tags and any extra columns are optional.',
    example: 'phone,name,tags,city\n9876543210,Rahul,vip,Pune',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000_000)
  csv!: string;

  @ApiPropertyOptional({ description: 'Added to 10-digit / leading-0 numbers', example: '91', default: '91' })
  @IsOptional()
  @Matches(/^\+?\d{1,4}$/)
  defaultCountryCode?: string;

  @ApiProperty({ description: 'Confirms every contact in the file opted in to WhatsApp messages', example: true })
  @ToStrictBoolean()
  @IsBoolean()
  @Equals(true, { message: 'consent must be true: only upload contacts who opted in' })
  consent!: boolean;

  @ApiPropertyOptional({ description: 'Check each number on WhatsApp after import (paced)', default: true })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  verify?: boolean;
}

export class ListContactsQueryDto {
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

  @ApiPropertyOptional({ description: 'Matches phone, name or tags' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['pending', 'on_whatsapp', 'not_on_whatsapp', 'check_failed', 'opted_out'] })
  @IsOptional()
  @IsIn(['pending', 'on_whatsapp', 'not_on_whatsapp', 'check_failed', 'opted_out'])
  status?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @NoNulCharacter()
  name?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tags', example: 'vip,regular' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tags?: string;

  @ApiPropertyOptional({ description: 'false = opted out (campaigns skip the contact)' })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  optedIn?: boolean;
}
