import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getChallenge, getChallengeNeighbors, getChallengeRoute } from "@lineagraph/core";
import { handle, param, sendError, strQuery } from "../http.js";

// "Thử thách nối hai người": public, read-only, no login. See core/services/challenge.ts.
export const challengeRouter = Router();

/** Today's date in Vietnam (UTC+7), as yyyy-mm-dd: the daily puzzle changes at local midnight. */
export function vietnamDate(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

const unavailable = (res: Parameters<typeof sendError>[0]) =>
  sendError(res, 404, "Chưa đủ dữ liệu quan hệ để tạo thử thách", {
    code: "CHALLENGE_UNAVAILABLE",
  });

challengeRouter.get(
  "/challenge/daily",
  handle(async (_req, res) => {
    const date = vietnamDate();
    const challenge = await getChallenge(`daily-${date}`);
    if (!challenge) return unavailable(res);
    res.json({ ...challenge, date });
  }),
);

// A different pair every call, for playing more than once a day.
challengeRouter.get(
  "/challenge/random",
  handle(async (_req, res) => {
    const challenge = await getChallenge(`random-${randomUUID()}`);
    if (!challenge) return unavailable(res);
    res.set("Cache-Control", "no-store").json(challenge);
  }),
);

challengeRouter.get(
  "/challenge/neighbors/:slug",
  handle(async (req, res) => res.json(await getChallengeNeighbors(param(req, "slug")))),
);

// The shortest route between two people: its first step is the hint, the whole of it the answer.
challengeRouter.get(
  "/challenge/route",
  handle(async (req, res) => {
    const from = strQuery(req.query.from);
    const to = strQuery(req.query.to);
    if (!from || !to) {
      sendError(res, 400, "Cần chọn điểm đi (from) và điểm đến (to)", { code: "BAD_REQUEST" });
      return;
    }
    const route = await getChallengeRoute(from, to);
    if (!route) {
      sendError(res, 404, "Hai nhân vật này chưa nối được với nhau", { code: "NO_ROUTE" });
      return;
    }
    res.json({ steps: route });
  }),
);
