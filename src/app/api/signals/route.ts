import { NextResponse } from "next/server";
import db, { initDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACCOUNT_RISK_USD = 1000;

type SignalRow = {
  id?: number;
  symbol: string;
  type: string;
  status: string;
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  tp4: number | null;
  pips: number | null;
  tp_level: number | null;
  timestamp?: string | null;
  open_time: string | null;
  channel_id: number | null;
  channel_name: string | null;
  risk_pips: number | null;
  reward_pips: number | null;
  rr_ratio: number | null;
  profit: number | null;
  fingerprint: string | null;
};

export async function GET() {
  try {
    initDB();

    const signals = (db
      .prepare(
        `SELECT
          id,
          symbol,
          type,
          status,
          entry,
          sl,
          tp1,
          tp2,
          tp3,
          tp4,
          pips,
          tp_level,
          timestamp,
          open_time,
          channel_id,
          channel_name,
          risk_pips,
          reward_pips,
          rr_ratio,
          profit,
          fingerprint
        FROM signals
        ORDER BY COALESCE(open_time, timestamp) DESC
        LIMIT 500`
      )
      .all() as SignalRow[]).map(enrichSignalMetrics);

    return NextResponse.json(signals);
  } catch (error) {
    console.error("Failed to load signals", error);
    return NextResponse.json(
      { error: "Failed to load signals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    initDB();
    const body = await request.json();

    // Check if the request is a database reset
    if (body && body.action === "reset") {
      db.prepare("DELETE FROM signals").run();
      console.log("Website signals database cleared successfully.");
      return NextResponse.json({ message: "Database cleared successfully" });
    }

    // Extract signal fields
    const symbol = body.symbol;
    const type = body.type || "LONG";
    const status = body.status || "OPEN";
    const entry = typeof body.entry === "number" ? body.entry : null;
    const sl = typeof body.sl === "number" ? body.sl : null;
    const tp1 = typeof body.tp1 === "number" ? body.tp1 : null;
    const tp2 = typeof body.tp2 === "number" ? body.tp2 : null;
    const tp3 = typeof body.tp3 === "number" ? body.tp3 : null;
    const tp4 = typeof body.tp4 === "number" ? body.tp4 : null;
    const pips = typeof body.pips === "number" ? body.pips : null;
    const tp_level = typeof body.tp_level === "number" ? body.tp_level : null;
    const open_time = body.open_time || null;
    const channel_id = typeof body.channel_id === "number" ? body.channel_id : null;
    const channel_name = body.channel_name || null;
    const risk_pips = typeof body.risk_pips === "number" ? body.risk_pips : null;
    const reward_pips = typeof body.reward_pips === "number" ? body.reward_pips : null;
    const rr_ratio = typeof body.rr_ratio === "number" ? body.rr_ratio : null;
    const profit = typeof body.profit === "number" ? body.profit : null;
    const fingerprint = body.fingerprint || null;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Check if the signal already exists. Fingerprints are scoped by channel to
    // avoid overwriting same-symbol signals from different Fence channels.
    let existing: any = null;
    if (fingerprint && channel_id !== null) {
      existing = db.prepare("SELECT * FROM signals WHERE fingerprint = ? AND channel_id = ?").get(fingerprint, channel_id);
    }
    if (!existing && fingerprint && channel_id === null) {
      existing = db.prepare("SELECT * FROM signals WHERE fingerprint = ? AND channel_id IS NULL").get(fingerprint);
    }
    if (!existing && symbol && channel_id && open_time) {
      existing = db.prepare(
        "SELECT * FROM signals WHERE symbol = ? AND channel_id = ? AND open_time = ?"
      ).get(symbol, channel_id, open_time);
    }

    if (existing) {
      const merged = mergeSignalRows(existing, {
        symbol,
        type,
        status,
        entry,
        sl,
        tp1,
        tp2,
        tp3,
        tp4,
        pips,
        tp_level,
        open_time,
        channel_id,
        channel_name,
        risk_pips,
        reward_pips,
        rr_ratio,
        profit,
        fingerprint,
      });

      // Update existing signal
      db.prepare(`
        UPDATE signals SET
          symbol = ?,
          type = ?,
          status = ?,
          entry = COALESCE(?, entry),
          sl = COALESCE(?, sl),
          tp1 = COALESCE(?, tp1),
          tp2 = COALESCE(?, tp2),
          tp3 = COALESCE(?, tp3),
          tp4 = COALESCE(?, tp4),
          pips = ?,
          tp_level = ?,
          open_time = COALESCE(?, open_time),
          channel_id = COALESCE(?, channel_id),
          channel_name = COALESCE(?, channel_name),
          risk_pips = ?,
          reward_pips = ?,
          rr_ratio = ?,
          profit = ?,
          fingerprint = COALESCE(?, fingerprint)
        WHERE id = ?
      `).run(
        merged.symbol,
        merged.type,
        merged.status,
        merged.entry,
        merged.sl,
        merged.tp1,
        merged.tp2,
        merged.tp3,
        merged.tp4,
        merged.pips,
        merged.tp_level,
        merged.open_time,
        merged.channel_id,
        merged.channel_name,
        merged.risk_pips,
        merged.reward_pips,
        merged.rr_ratio,
        merged.profit,
        merged.fingerprint,
        existing.id
      );
      return NextResponse.json({ message: "Signal updated successfully", id: existing.id });
    } else {
      const enriched = enrichSignalMetrics({
        symbol,
        type,
        status,
        entry,
        sl,
        tp1,
        tp2,
        tp3,
        tp4,
        pips,
        tp_level,
        open_time,
        channel_id,
        channel_name,
        risk_pips,
        reward_pips,
        rr_ratio,
        profit,
        fingerprint,
      });

      // Insert new signal
      const info = db.prepare(`
        INSERT INTO signals (
          symbol, type, status, entry, sl, tp1, tp2, tp3, tp4, pips, tp_level, open_time,
          channel_id, channel_name, risk_pips, reward_pips, rr_ratio, profit, fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        enriched.symbol,
        enriched.type,
        enriched.status,
        enriched.entry,
        enriched.sl,
        enriched.tp1,
        enriched.tp2,
        enriched.tp3,
        enriched.tp4,
        enriched.pips,
        enriched.tp_level,
        enriched.open_time,
        enriched.channel_id,
        enriched.channel_name,
        enriched.risk_pips,
        enriched.reward_pips,
        enriched.rr_ratio,
        enriched.profit,
        enriched.fingerprint
      );
      return NextResponse.json({ message: "Signal created successfully", id: info.lastInsertRowid.toString() });
    }
  } catch (error) {
    console.error("Failed to process signal POST", error);
    return NextResponse.json({ error: "Failed to process signal" }, { status: 500 });
  }
}

function mergeSignalRows(existing: SignalRow, incoming: SignalRow): SignalRow {
  const previousTpLevel = clampTpLevel(existing.tp_level);
  const incomingTpLevel = incoming.tp_level === null ? previousTpLevel : clampTpLevel(incoming.tp_level);

  return enrichSignalMetrics({
    ...existing,
    ...incoming,
    entry: incoming.entry ?? existing.entry,
    sl: incoming.sl ?? existing.sl,
    tp1: incoming.tp1 ?? existing.tp1,
    tp2: incoming.tp2 ?? existing.tp2,
    tp3: incoming.tp3 ?? existing.tp3,
    tp4: incoming.tp4 ?? existing.tp4,
    pips: incoming.pips ?? existing.pips,
    tp_level: Math.max(previousTpLevel, incomingTpLevel),
    open_time: incoming.open_time ?? existing.open_time,
    channel_id: incoming.channel_id ?? existing.channel_id,
    channel_name: incoming.channel_name ?? existing.channel_name,
    risk_pips: incoming.risk_pips ?? existing.risk_pips,
    reward_pips: incoming.reward_pips ?? existing.reward_pips,
    rr_ratio: incoming.rr_ratio ?? existing.rr_ratio,
    profit: incoming.profit ?? existing.profit,
    fingerprint: incoming.fingerprint ?? existing.fingerprint,
  });
}

function enrichSignalMetrics(row: SignalRow) {
  const status = row.status?.toUpperCase() || "";
  const maxTpLevel = clampTpLevel(row.tp_level);
  const entry = toFiniteNumber(row.entry);
  const stopLoss = toFiniteNumber(row.sl);
  const targetPrice = getTargetPrice(row, maxTpLevel);
  const riskDistance =
    entry !== null && stopLoss !== null && Math.abs(entry - stopLoss) > 0
      ? Math.abs(entry - stopLoss)
      : null;
  const rewardDistance =
    entry !== null && targetPrice !== null
      ? Math.abs(targetPrice - entry)
      : null;
  const maxR =
    riskDistance !== null && rewardDistance !== null
      ? rewardDistance / riskDistance
      : null;

  const existingRisk = toFiniteNumber(row.risk_pips);
  const existingReward = toFiniteNumber(row.reward_pips);
  const existingR = toFiniteNumber(row.rr_ratio);
  const existingProfit = toFiniteNumber(row.profit);
  const existingPips = toFiniteNumber(row.pips);
  const pipValue = getPipValue(row.symbol, entry ?? targetPrice ?? stopLoss ?? 1);

  const derivedRewardPips =
    rewardDistance !== null && pipValue > 0 ? roundNumber(rewardDistance / pipValue, 1) : null;
  const derivedRiskPips =
    riskDistance !== null && pipValue > 0 ? roundNumber(riskDistance / pipValue, 1) : null;

  const isTpHit = status.includes("TP");
  const isSlHit = status.includes("SL");

  const rrRatio =
    isTpHit && maxR !== null
      ? Math.max(existingR ?? maxR, maxR)
      : isSlHit
        ? existingR !== null && existingR < 0
          ? existingR
          : -1
        : existingR;

  const derivedProfit = rrRatio !== null ? rrRatio * ACCOUNT_RISK_USD : null;
  const profit =
    isTpHit && derivedProfit !== null
      ? Math.max(existingProfit ?? derivedProfit, derivedProfit)
      : isSlHit
        ? existingProfit !== null && existingProfit < 0
          ? existingProfit
          : -ACCOUNT_RISK_USD
        : existingProfit ?? derivedProfit;

  const pips =
    existingPips !== null && !(isTpHit && existingPips === 0 && derivedRewardPips !== null)
      ? existingPips
      : isTpHit
        ? derivedRewardPips
        : isSlHit && derivedRiskPips !== null
          ? -derivedRiskPips
          : existingPips;

  return {
    ...row,
    pips,
    tp_level: maxTpLevel,
    risk_pips: existingRisk ?? derivedRiskPips,
    reward_pips: existingReward ?? derivedRewardPips,
    rr_ratio: rrRatio,
    profit,
    max_tp_level: maxTpLevel,
    max_rr_ratio: maxR,
    max_profit: maxR !== null ? maxR * ACCOUNT_RISK_USD : null,
  };
}

function getTargetPrice(row: SignalRow, level: number) {
  if (level < 1 || level > 4) return null;
  return toFiniteNumber(row[`tp${level}` as keyof SignalRow]);
}

function clampTpLevel(value: unknown) {
  const level = toFiniteNumber(value);
  if (level === null || level <= 0) return 0;
  return Math.min(4, Math.max(0, Math.round(level)));
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getPipValue(symbol: string | undefined, price: number) {
  const normalized = symbol?.toUpperCase() || "";
  if (normalized.includes("BTC") || normalized.includes("ETH") || normalized.includes("XAU") || price >= 100) return 1;
  if (normalized.includes("JPY")) return 0.01;
  return 0.0001;
}

function roundNumber(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

