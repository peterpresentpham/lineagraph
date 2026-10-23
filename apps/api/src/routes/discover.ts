import { Router } from "express";
import { ServiceError, getReadNext, getToday } from "@lineagraph/core";
import { handle, intQuery, param } from "../http.js";
import { vietnamDate } from "./challenge.js";

// "Đọc tiếp" and "Hôm nay trong lịch sử": public, read-only. See core/services/discover.ts.
export const discoverRouter = Router();

discoverRouter.get(
  "/nodes/:slug/read-next",
  handle(async (req, res) => res.json(await getReadNext(param(req, "slug")))),
);

// Entries for a day of the year (`?month=3&day=15`); today's date in Vietnam when left out.
discoverRouter.get(
  "/today",
  handle(async (req, res) => {
    const [, todayMonth, todayDay] = vietnamDate().split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const month = intQuery(req.query.month, "month") ?? todayMonth;
    const day = intQuery(req.query.day, "day") ?? todayDay;
    // 29 February is valid in some years; the day-of-month check is deliberately the loose one.
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new ServiceError(400, "Ngày hoặc tháng không hợp lệ");
    }
    res.json({ month, day, entries: await getToday(month, day) });
  }),
);
