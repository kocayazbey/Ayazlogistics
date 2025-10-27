import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FieldLevelEncryptionService } from '../services/field-level-encryption.service';

@ApiTags('Field-Level Encryption')
@Controller('field-encryption')
export class FieldLevelEncryptionController {
  constructor(private readonly fieldLevelEncryptionService: FieldLevelEncryptionService) {}

  @Post('encrypt-field')
  @ApiOperation({ summary: 'Encrypt a single field' })
  @ApiResponse({ status: 200, description: 'Field encrypted successfully' })
  async encryptField(@Body() body: { value: string; fieldName: string }) {
    const encrypted = await this.fieldLevelEncryptionService.encryptField(body.value, body.fieldName);
    return { encrypted };
  }

  @Post('decrypt-field')
  @ApiOperation({ summary: 'Decrypt a single field' })
  @ApiResponse({ status: 200, description: 'Field decrypted successfully' })
  async decryptField(@Body() body: { encryptedValue: string; fieldName: string }) {
    const decrypted = await this.fieldLevelEncryptionService.decryptField(body.encryptedValue, body.fieldName);
    return { decrypted };
  }

  @Post('encrypt-object')
  @ApiOperation({ summary: 'Encrypt multiple fields in an object' })
  @ApiResponse({ status: 200, description: 'Object encrypted successfully' })
  async encryptObject(@Body() body: { obj: any; fieldsToEncrypt: string[] }) {
    const encrypted = await this.fieldLevelEncryptionService.encryptObject(body.obj, body.fieldsToEncrypt);
    return { encrypted };
  }

  @Post('decrypt-object')
  @ApiOperation({ summary: 'Decrypt multiple fields in an object' })
  @ApiResponse({ status: 200, description: 'Object decrypted successfully' })
  async decryptObject(@Body() body: { obj: any; fieldsToDecrypt: string[] }) {
    const decrypted = await this.fieldLevelEncryptionService.decryptObject(body.obj, body.fieldsToDecrypt);
    return { decrypted };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test field-level encryption' })
  @ApiResponse({ status: 200, description: 'Encryption test completed' })
  async testEncryption() {
    return await this.fieldLevelEncryptionService.testEncryption();
  }

  @Get('encrypted-fields')
  @ApiOperation({ summary: 'Get all encrypted fields' })
  @ApiResponse({ status: 200, description: 'Encrypted fields retrieved successfully' })
  getEncryptedFields() {
    return Array.from(this.fieldLevelEncryptionService.getEncryptedFields().entries()).map(([field, encrypted]) => ({
      field,
      encrypted
    }));
  }
}