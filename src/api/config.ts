import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    awsRegion: process.env.AWS_REGION || 'us-west-2',
    mistralApiKey: process.env.MISTRAL_API_KEY,
    vertexProjectId: process.env.VERTEX_PROJECT_ID,
    vertexLocation: process.env.VERTEX_LOCATION || 'us-central1'
};