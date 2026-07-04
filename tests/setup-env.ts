process.env.PORT = process.env.PORT ?? "5000";
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:5000";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/starter_db";
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? "test-better-auth-secret";
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "test-access-token-secret";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? "test-refresh-token-secret";
process.env.ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? "1d";
process.env.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d";
process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN =
  process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN ?? "1d";
process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE =
  process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE ?? "1d";
process.env.EMAIL_HOST = process.env.EMAIL_HOST ?? "smtp.example.com";
process.env.EMAIL_PORT = process.env.EMAIL_PORT ?? "587";
process.env.EMAIL_SECURE = process.env.EMAIL_SECURE ?? "false";
process.env.EMAIL_USER = process.env.EMAIL_USER ?? "test@example.com";
process.env.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD ?? "test-password";
process.env.EMAIL_FROM = process.env.EMAIL_FROM ?? "Starter App <test@example.com>";
process.env.EXPIRE_OTP_TIME = process.env.EXPIRE_OTP_TIME ?? "15m";
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ?? "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "GOCSPX-test-secret";
process.env.GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:5000/api/auth/callback/google";
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "test-cloud";
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ?? "test-key";
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "test-secret";
process.env.IMGBB_API_KEY = process.env.IMGBB_API_KEY ?? "test-imgbb-key";
process.env.SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "admin@example.com";
process.env.SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "change-me";
process.env.APP_NAME = process.env.APP_NAME ?? "Starter App";
process.env.APP_UPLOAD_FOLDER = process.env.APP_UPLOAD_FOLDER ?? "starter-app";
