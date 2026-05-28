import Database from "better-sqlite3";
import path from "path";

const registrationDbPath =
  process.env.REGISTRATION_DB_PATH ||
  process.env.DB_PATH ||
  path.join(process.cwd(), "affiliates.db");

const registrationDb = new Database(registrationDbPath);

export type RegistrationInput = {
  name: string;
  country: string;
  email: string;
  discordUserId?: string;
  discordUsername?: string;
  telegramUsername?: string;
  source?: string;
};

export type PendingRegistration = {
  id: number;
  name: string;
  country: string | null;
  email: string;
  discord_user_id: string | null;
  discord_username: string | null;
  telegram_username: string | null;
  source: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type VerifiedAffiliate = {
  user_id: string;
  name: string | null;
  country: string | null;
  email: string | null;
  discord_user_id: string | null;
  telegram_links_sent: string | null;
  registration_date: string | null;
  verified_at: string | null;
};

export type ManualVerificationInput = {
  pendingId: number;
  tradeNationUserId: string;
  tradeNationName?: string;
  tradeNationCountry?: string;
  tradeNationRegistrationDate?: string;
};

type ExistingRegistration = {
  kind: "verified" | "pending";
  field: "email" | "discord" | "telegram" | "name";
  status?: string;
};

type RegistrationResult =
  | {
      ok: true;
      id: number | bigint;
      message: string;
    }
  | {
      ok: false;
      code: "already_verified" | "already_pending";
      message: string;
    };

type AdminMutationResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code:
        | "duplicate_tn_user_id"
        | "invalid_status"
        | "missing_tn_user_id"
        | "not_found"
        | "not_pending";
      message: string;
    };

export function initRegistrationDB() {
  registrationDb.exec(`
    CREATE TABLE IF NOT EXISTS pending_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT,
      email TEXT NOT NULL,
      discord_user_id TEXT,
      source TEXT DEFAULT 'website',
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS affiliates (
      user_id TEXT PRIMARY KEY,
      name TEXT,
      country TEXT,
      email TEXT,
      discord_user_id TEXT,
      telegram_links_sent TEXT,
      registration_date TEXT,
      verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  addColumnIfMissing("pending_requests", "discord_username", "TEXT");
  addColumnIfMissing("pending_requests", "telegram_username", "TEXT");
  addColumnIfMissing("pending_requests", "updated_at", "TIMESTAMP");
  addColumnIfMissing("affiliates", "discord_user_id", "TEXT");
  addColumnIfMissing("affiliates", "telegram_links_sent", "TEXT");
}

export function createPendingRegistration(
  input: RegistrationInput
): RegistrationResult {
  initRegistrationDB();

  const email = input.email.trim().toLowerCase();
  const existing = shouldBypassDuplicateChecks(input)
    ? null
    : findExistingRegistration(input);

  if (existing?.kind === "verified") {
    return {
      ok: false,
      code: "already_verified",
      message: getDuplicateMessage(existing),
    };
  }

  if (existing?.kind === "pending") {
    return {
      ok: false,
      code: "already_pending",
      message: getDuplicateMessage(existing),
    };
  }

  const result = registrationDb
    .prepare(
      `INSERT INTO pending_requests (
        name,
        country,
        email,
        discord_user_id,
        discord_username,
        telegram_username,
        source,
        status,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
    )
    .run(
      input.name.trim(),
      input.country.trim(),
      email,
      input.discordUserId?.trim() || null,
      input.discordUsername?.trim() || null,
      input.telegramUsername?.trim() || null,
      input.source || "website"
    );

  return {
    ok: true,
    id: result.lastInsertRowid,
    message: "Verifiseringen er sendt inn.",
  };
}

export function listAdminRegistrations() {
  initRegistrationDB();

  const pending = registrationDb
    .prepare(
      `SELECT
        id,
        name,
        country,
        email,
        discord_user_id,
        discord_username,
        telegram_username,
        source,
        status,
        created_at,
        updated_at
      FROM pending_requests
      ORDER BY
        CASE status
          WHEN 'pending' THEN 0
          WHEN 'rejected' THEN 1
          ELSE 2
        END,
        datetime(created_at) DESC
      LIMIT 250`
    )
    .all() as PendingRegistration[];

  const verified = registrationDb
    .prepare(
      `SELECT
        user_id,
        name,
        country,
        email,
        discord_user_id,
        telegram_links_sent,
        registration_date,
        verified_at
      FROM affiliates
      ORDER BY datetime(verified_at) DESC
      LIMIT 100`
    )
    .all() as VerifiedAffiliate[];

  const stats = {
    pending: pending.filter((item) => item.status === "pending").length,
    rejected: pending.filter((item) => item.status === "rejected").length,
    other: pending.filter(
      (item) => item.status !== "pending" && item.status !== "rejected"
    ).length,
    verified: verified.length,
  };

  return { pending, verified, stats };
}

export function updatePendingRegistrationStatus(
  id: number,
  status: string
): AdminMutationResult {
  initRegistrationDB();

  const allowedStatuses = new Set(["pending", "rejected"]);
  if (!allowedStatuses.has(status)) {
    return {
      ok: false,
      code: "invalid_status",
      message: "Status kan bare settes til pending eller rejected her.",
    };
  }

  const result = registrationDb
    .prepare(
      `UPDATE pending_requests
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    )
    .run(status, id);

  if (result.changes === 0) {
    return {
      ok: false,
      code: "not_found",
      message: "Fant ikke verifiseringsforespørselen.",
    };
  }

  return {
    ok: true,
    message: "Status er oppdatert.",
  };
}

export function manuallyVerifyPendingRegistration(
  input: ManualVerificationInput
): AdminMutationResult {
  initRegistrationDB();

  const tradeNationUserId = input.tradeNationUserId.trim();
  if (!tradeNationUserId) {
    return {
      ok: false,
      code: "missing_tn_user_id",
      message: "Trade Nation User ID mangler.",
    };
  }

  const existingAffiliate = registrationDb
    .prepare("SELECT 1 FROM affiliates WHERE user_id = ? LIMIT 1")
    .get(tradeNationUserId);

  if (existingAffiliate) {
    return {
      ok: false,
      code: "duplicate_tn_user_id",
      message: "Denne Trade Nation User ID-en er allerede verifisert.",
    };
  }

  const pending = registrationDb
    .prepare("SELECT * FROM pending_requests WHERE id = ? LIMIT 1")
    .get(input.pendingId) as PendingRegistration | undefined;

  if (!pending) {
    return {
      ok: false,
      code: "not_found",
      message: "Fant ikke verifiseringsforespørselen.",
    };
  }

  if (pending.status !== "pending") {
    return {
      ok: false,
      code: "not_pending",
      message: "Denne forespørselen er ikke pending.",
    };
  }

  const verifiedName = input.tradeNationName?.trim() || pending.name;
  const verifiedCountry = input.tradeNationCountry?.trim() || pending.country;
  const registrationDate =
    input.tradeNationRegistrationDate?.trim() ||
    pending.created_at ||
    new Date().toISOString();

  const transaction = registrationDb.transaction(() => {
    registrationDb
      .prepare(
        `INSERT INTO affiliates (
          user_id,
          name,
          country,
          email,
          discord_user_id,
          registration_date,
          verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .run(
        tradeNationUserId,
        verifiedName,
        verifiedCountry,
        pending.email,
        pending.discord_user_id,
        registrationDate
      );

    registrationDb
      .prepare(
        `UPDATE pending_requests
        SET status = 'verified', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      )
      .run(input.pendingId);
  });

  transaction();

  return {
    ok: true,
    message: "Brukeren er manuelt verifisert.",
  };
}

function findExistingRegistration(
  input: RegistrationInput
): ExistingRegistration | null {
  const email = input.email.trim().toLowerCase();
  const discordUserId = normalizeIdentity(input.discordUserId);
  const discordUsername = normalizeIdentity(input.discordUsername);
  const telegramUsername = normalizeIdentity(input.telegramUsername);
  const name = normalizeName(input.name);
  const country = normalizeName(input.country);

  const verifiedByEmail = registrationDb
    .prepare("SELECT 1 FROM affiliates WHERE LOWER(email) = ? LIMIT 1")
    .get(email);

  if (verifiedByEmail) {
    return { kind: "verified", field: "email" };
  }

  const pendingByEmail = registrationDb
    .prepare(
      "SELECT status FROM pending_requests WHERE LOWER(email) = ? AND status = 'pending' ORDER BY id DESC LIMIT 1"
    )
    .get(email) as { status: string } | undefined;

  if (pendingByEmail) {
    return { kind: "pending", field: "email", status: pendingByEmail.status };
  }

  if (discordUserId) {
    const verifiedByDiscordId = registrationDb
      .prepare(
        "SELECT 1 FROM affiliates WHERE discord_user_id IS NOT NULL AND discord_user_id = ? LIMIT 1"
      )
      .get(discordUserId);

    if (verifiedByDiscordId) {
      return { kind: "verified", field: "discord" };
    }

    const pendingByDiscordId = registrationDb
      .prepare(
        "SELECT status FROM pending_requests WHERE discord_user_id IS NOT NULL AND discord_user_id = ? AND status = 'pending' LIMIT 1"
      )
      .get(discordUserId) as { status: string } | undefined;

    if (pendingByDiscordId) {
      return {
        kind: "pending",
        field: "discord",
        status: pendingByDiscordId.status,
      };
    }
  }

  const pendingRows = registrationDb
    .prepare(
      `SELECT
        name,
        country,
        discord_username,
        telegram_username,
        status
      FROM pending_requests
      WHERE status = 'pending'`
    )
    .all() as Array<{
    name: string | null;
    country: string | null;
    discord_username: string | null;
    telegram_username: string | null;
    status: string;
  }>;

  for (const row of pendingRows) {
    if (
      discordUsername &&
      normalizeIdentity(row.discord_username) === discordUsername
    ) {
      return { kind: "pending", field: "discord", status: row.status };
    }

    if (
      telegramUsername &&
      normalizeIdentity(row.telegram_username) === telegramUsername
    ) {
      return { kind: "pending", field: "telegram", status: row.status };
    }

    if (normalizeName(row.name) === name && normalizeName(row.country) === country) {
      return { kind: "pending", field: "name", status: row.status };
    }
  }

  const verifiedRows = registrationDb
    .prepare(
      `SELECT
        name,
        country
      FROM affiliates`
    )
    .all() as Array<{ name: string | null; country: string | null }>;

  for (const row of verifiedRows) {
    if (normalizeName(row.name) === name && normalizeName(row.country) === country) {
      return { kind: "verified", field: "name" };
    }
  }

  return null;
}

function shouldBypassDuplicateChecks(input: RegistrationInput) {
  if (process.env.ALLOW_TEST_DUPLICATES !== "true") {
    return false;
  }

  const testName = normalizeName(process.env.TEST_DUPLICATE_NAME || "Oscar Gjerde");
  return normalizeName(input.name) === testName;
}

function normalizeIdentity(value?: string | null) {
  return (value || "").trim().replace(/^@/, "").toLowerCase();
}

function normalizeName(value?: string | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function getDuplicateMessage(existing: ExistingRegistration) {
  const statusText =
    existing.kind === "verified" ? "allerede verifisert" : "allerede i køen";

  if (existing.field === "email") {
    return `Denne e-posten er ${statusText}.`;
  }

  if (existing.field === "discord") {
    return `Denne Discord-brukeren er ${statusText}.`;
  }

  if (existing.field === "telegram") {
    return `Denne Telegram-brukeren er ${statusText}.`;
  }

  return `Dette navnet og landet er ${statusText}. Bruk samme informasjon som hos Trade Nation.`;
}

function addColumnIfMissing(table: string, column: string, type: string) {
  const columns = registrationDb
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((item) => item.name === column)) {
    registrationDb.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  }
}

export default registrationDb;
