import { createServerFn } from "@tanstack/react-start";
import type { QuotaView } from "./quota";

export const getCartoonQuota = createServerFn({ method: "GET" }).handler(
  async (): Promise<QuotaView> => {
    const { peekQuota } = await import("./rate-limit.server");
    return peekQuota();
  },
);
