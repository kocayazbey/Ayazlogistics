import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const generateOpenApiTypes = () => {
  try {
    // Generate TypeScript types from OpenAPI spec
    execSync('npx openapi-typescript http://localhost:3000/api-json -o src/types/api.ts', {
      stdio: 'inherit'
    });
    
    console.log('✅ OpenAPI TypeScript types generated successfully');
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI types:', error);
    process.exit(1);
  }
};

generateOpenApiTypes();
