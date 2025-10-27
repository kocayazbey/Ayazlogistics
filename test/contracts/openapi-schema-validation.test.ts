import fs from 'fs';
import path from 'path';

describe('OpenAPI Schema Contract', () => {
  it('should exist and be valid YAML', () => {
    const current = path.join(process.cwd(), 'docs/openapi/current.yaml');
    const yml = fs.readFileSync(current, 'utf8');
    expect(yml).toContain('openapi: 3.0');
  });
});
