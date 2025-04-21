interface ServerConfig {
  port: number;
  maxRequestSize: string;
  cors: {
    origin: string;
    methods: string[];
    allowedHeaders: string[];
  };
  security: {
    enableCSP: boolean;
    enableCOEP: boolean;
  };
  api: {
    basePath: string;
    version: string;
  };
  docs: {
    enabled: boolean;
    path: string;
  };
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key']
  },
  security: {
    enableCSP: !isDevelopment,
    enableCOEP: !isDevelopment
  },
  api: {
    basePath: '/api',
    version: 'v1'
  },
  docs: {
    enabled: isDevelopment && !isTest,
    path: '/api-docs'
  }
};

// Required environment variables
export const requiredEnvVars = [
  'NODE_ENV',
  'OPENAI_API_KEY'
];

// Environment info
export const envInfo = {
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  isDevelopment,
  isTest,
  isProduction: process.env.NODE_ENV === 'production'
};

// Service configuration
export const serviceConfig = {
  name: 'roocode-api',
  errorReporting: {
    includeStack: isDevelopment
  },
  logging: {
    enabled: !isTest,
    format: isDevelopment ? 'dev' : 'combined'
  }
};