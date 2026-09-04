export const WEEKLY_LIMIT = 3;

export type QuotaView = {
  remaining: number;
  used: number;
  limit: number;
};
