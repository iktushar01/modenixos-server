import type { Role } from "../lib/prisma-exports";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        role: Role;
        email: string;
      } | null;
      storeId?: string;
      storeRole?: "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
      storefrontCustomerId?: string;
      storefrontCustomerStoreId?: string;
    }
  }
}
