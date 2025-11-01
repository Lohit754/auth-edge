import { createApp } from './app';
import { env } from './config/env';

async function bootstrap() {
  try {
    console.log('🚀 Starting SentinelAuth...');

    const { app } = await createApp();

    const port = parseInt(env.PORT, 10);

    app.listen(port, () => {
      console.log('');
      console.log('✅ Server is running!');
      console.log('');
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`📍 Port: ${port}`);
      console.log(`📍 Health: http://localhost:${port}/health`);
      console.log(`📍 GraphQL: http://localhost:${port}/graphql`);
      console.log('');
      console.log('REST Endpoints:');
      console.log(`  POST http://localhost:${port}/auth/register`);
      console.log(`  POST http://localhost:${port}/auth/login`);
      console.log(`  POST http://localhost:${port}/auth/refresh`);
      console.log(`  POST http://localhost:${port}/auth/logout`);
      console.log(`  GET  http://localhost:${port}/me`);
      console.log(`  GET  http://localhost:${port}/users`);
      console.log(`  GET  http://localhost:${port}/admin/secret`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

