import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  doublePrecision,
  integer,
  pgEnum,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  walletAddress: text("wallet_address").notNull(),
  airdrop: boolean("airdrop").notNull().default(false),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  creatorWallet: text("creator_wallet").notNull(),
  imageUrl: text("image_url"),
  ipfsLink: text("ipfs_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const admins = pgTable(
  "admins",
  {
    id: serial("id").primaryKey(),
    username: text("username"),
    email: text("email").notNull(),
    password: text("password").notNull(),
    walletAddress: text("wallet_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("admins_email_idx").on(table.email),
  })
);

export const stakingplan = pgTable("stakingplan", {
  id: serial("id").primaryKey(),
  days: doublePrecision("days"),
  apr: doublePrecision("apr"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stakingStatusEnum = pgEnum("staking_status", ["pending", "claim"]);

export const stakinglist = pgTable(
  "stakinglist",
  {
    id: serial("id").primaryKey(),
    amount: doublePrecision("amount"),
    walletAddress: text("wallet_address"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stakeId: integer("stake_id")
      .notNull()
      .references(() => stakingplan.id, { onDelete: "cascade" }),
    startDate: timestamp("start_date").defaultNow().notNull(),
    endDate: timestamp("end_date").defaultNow().notNull(),
    reward: doublePrecision("reward"),
    type: text("type"),
    status: stakingStatusEnum("status").default("pending").notNull(),
    withdraw: text("withdraw").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastClaimed: timestamp("last_claimed").defaultNow().notNull(),
  }
);

export const stakehistory = pgTable(
  "stakehistory",
  {
    id: serial("id").primaryKey(),
    amount: doublePrecision("amount"),
    walletAddress: text("wallet_address"),
    txid: text("txid").unique(),
    userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stakeId: integer("stake_id")
    .notNull()
    .references(() => stakingplan.id, { onDelete: "cascade" }),
  type: text("type"), // free string type
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const claimedrewards = pgTable(
  "claimedrewards",
  {
    id: serial("id").primaryKey(),
    walletAddress: text("wallet_address"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stakeId: integer("stake_id")
      .notNull()
      .references(() => stakingplan.id, { onDelete: "cascade" }),
    reward: doublePrecision("reward"),
    type: text("type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const gameInteractions = pgTable("game_interactions", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull(),
  ip: text("ip").notNull(),
  liked: integer("liked").default(0),  
  disliked: integer("disliked").default(0),
  played: integer("played").default(0),
}, (table) => {
  return {
    gameIpUnique: unique().on(table.gameId, table.ip), 
  };
});

export const gameStats = pgTable("game_stats", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull().unique(),
  likes: integer("likes").default(0),
  dislikes: integer("dislikes").default(0),
  playedCount: integer("played_count").default(0),
});

export const withdrawhistory = pgTable(
  "withdrawhistory",
  {
    id: serial("id").primaryKey(),
    walletAddress: text("wallet_address"),
    txId: text("txid"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stakeId: integer("stake_id")
      .notNull()
      .references(() => stakingplan.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount"),
    type: text("type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: serial("id").primaryKey(),
    gameId: text("game_id").notNull(),
    leaderboard: text("leaderboard").notNull(),
    playerId: text("player_id").notNull(),
    score: integer("score").notNull(),
    playerName: text("player_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    gameIdx: index("leaderboard_game_idx").on(table.gameId),
    boardIdx: index("leaderboard_board_idx").on(table.leaderboard),
    playerIdx: index("leaderboard_player_idx").on(table.playerId),
  })
);