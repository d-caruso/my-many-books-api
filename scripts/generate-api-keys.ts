// ================================================================
// scripts/generate-api-keys.ts
// ================================================================

import { randomBytes, createHash } from 'crypto';

interface ApiKeyData {
  key: string;
  hashedKey: string;
  tier: string;
  description: string;
  createdAt: string;
  expiresAt?: string;
}

class ApiKeyGenerator {
  private static readonly KEY_LENGTH = 32;
  private static readonly PREFIX = 'mmb'; // My Many Books
  
  public static generateApiKey(tier: string = 'basic', description: string = '', expiresInDays?: number): ApiKeyData {
    // Generate random bytes
    const randomData = randomBytes(this.KEY_LENGTH);
    
    // Create the API key with prefix
    const key = `${this.PREFIX}_${randomData.toString('base64url')}`;
    
    // Hash the key for secure storage
    const hashedKey = this.hashKey(key);
    
    // Calculate expiration date if provided
    let expiresAt: string | undefined;
    if (expiresInDays) {
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + expiresInDays);
      expiresAt = expiration.toISOString();
    }
    
    return {
      key,
      hashedKey,
      tier,
      description,
      createdAt: new Date().toISOString(),
      expiresAt
    };
  }
  
  public static hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
  
  public static validateKeyFormat(key: string): boolean {
    const pattern = new RegExp(`^${this.PREFIX}_[A-Za-z0-9_-]{43}$`);
    return pattern.test(key);
  }
  
  public static extractKeyInfo(key: string): { prefix: string; data: string } | null {
    if (!this.validateKeyFormat(key)) {
      return null;
    }
    
    const parts = key.split('_');
    return {
      prefix: parts[0],
      data: parts[1]
    };
  }
  
  public static generateKeySet(count: number, tier: string = 'basic'): ApiKeyData[] {
    const keys: ApiKeyData[] = [];
    
    for (let i = 0; i < count; i++) {
      const keyData = this.generateApiKey(tier, `Generated key ${i + 1} for ${tier} tier`);
      keys.push(keyData);
    }
    
    return keys;
  }
  
  public static exportKeysAsEnv(keys: ApiKeyData[]): string {
    let envContent = '# API Keys - Add to .env file\n';
    envContent += '# Store hashed keys in production, plain keys for development\n\n';
    
    keys.forEach((keyData, index) => {
      envContent += `# ${keyData.description}\n`;
      envContent += `API_KEY_${index + 1}=${keyData.key}\n`;
      envContent += `API_KEY_${index + 1}_HASHED=${keyData.hashedKey}\n`;
      envContent += `API_KEY_${index + 1}_TIER=${keyData.tier}\n`;
      if (keyData.expiresAt) {
        envContent += `API_KEY_${index + 1}_EXPIRES=${keyData.expiresAt}\n`;
      }
      envContent += '\n';
    });
    
    return envContent;
  }
  
  public static exportKeysAsJson(keys: ApiKeyData[]): string {
    return JSON.stringify(keys, null, 2);
  }
  
  public static exportKeysAsYaml(keys: ApiKeyData[]): string {
    let yamlContent = 'apiKeys:\n';
    
    keys.forEach((keyData, index) => {
      yamlContent += `  key${index + 1}:\n`;
      yamlContent += `    key: "${keyData.key}"\n`;
      yamlContent += `    hashedKey: "${keyData.hashedKey}"\n`;
      yamlContent += `    tier: "${keyData.tier}"\n`;
      yamlContent += `    description: "${keyData.description}"\n`;
      yamlContent += `    createdAt: "${keyData.createdAt}"\n`;
      if (keyData.expiresAt) {
        yamlContent += `    expiresAt: "${keyData.expiresAt}"\n`;
      }
      yamlContent += '\n';
    });
    
    return yamlContent;
  }
}

// CLI interface
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
API Key Generator for My Many Books API

Usage: npx ts-node scripts/generate-api-keys.ts [options]

Options:
  --count <number>     Number of keys to generate (default: 1)
  --tier <string>      Key tier: basic, premium, enterprise (default: basic)
  --description <text> Description for the keys
  --expires <days>     Expiration in days (optional)
  --format <format>    Output format: json, yaml, env (default: json)
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/generate-api-keys.ts --count 5 --tier premium
  npx ts-node scripts/generate-api-keys.ts --tier enterprise --expires 365 --format env
  npx ts-node scripts/generate-api-keys.ts --description "Development keys" --format yaml
    `);
    return;
  }
  
  // Parse command line arguments
  let count = 1;
  let tier = 'basic';
  let description = '';
  let expiresInDays: number | undefined;
  let format = 'json';
  
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--count':
        count = parseInt(value, 10);
        if (isNaN(count) || count < 1) {
          console.error('Error: Count must be a positive number');
          process.exit(1);
        }
        break;
      case '--tier':
        if (!['basic', 'premium', 'enterprise'].includes(value)) {
          console.error('Error: Tier must be basic, premium, or enterprise');
          process.exit(1);
        }
        tier = value;
        break;
      case '--description':
        description = value;
        break;
      case '--expires':
        expiresInDays = parseInt(value, 10);
        if (isNaN(expiresInDays) || expiresInDays < 1) {
          console.error('Error: Expires must be a positive number of days');
          process.exit(1);
        }
        break;
      case '--format':
        if (!['json', 'yaml', 'env'].includes(value)) {
          console.error('Error: Format must be json, yaml, or env');
          process.exit(1);
        }
        format = value;
        break;
    }
  }
  
  // Generate keys
  console.log(`Generating ${count} API key(s) for ${tier} tier...`);
  
  const keys: ApiKeyData[] = [];
  for (let i = 0; i < count; i++) {
    const keyDescription = description || `${tier} tier API key ${i + 1}`;
    const keyData = ApiKeyGenerator.generateApiKey(tier, keyDescription, expiresInDays);
    keys.push(keyData);
  }
  
  // Output in requested format
  console.log('\n' + '='.repeat(60));
  console.log(`Generated ${count} API key(s)`);
  console.log('='.repeat(60));
  
  switch (format) {
    case 'json':
      console.log(ApiKeyGenerator.exportKeysAsJson(keys));
      break;
    case 'yaml':
      console.log(ApiKeyGenerator.exportKeysAsYaml(keys));
      break;
    case 'env':
      console.log(ApiKeyGenerator.exportKeysAsEnv(keys));
      break;
  }
  
  console.log('='.repeat(60));
  console.log('⚠️  SECURITY NOTICE:');
  console.log('- Store API keys securely');
  console.log('- Use hashed keys in production databases');
  console.log('- Never commit keys to version control');
  console.log('- Implement key rotation policies');
  console.log('='.repeat(60));
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

export { ApiKeyGenerator, ApiKeyData };