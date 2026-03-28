const db = require("../db/knex");

const VALID_ROLES = new Set(["cadet", "suo", "ano", "alumni"]);
const VALID_ROOM_TYPES = new Set(["direct", "group"]);
const VALID_MESSAGE_TYPES = new Set(["text", "image", "file", "system"]);
const MAX_MESSAGE_LENGTH = 4000;

const VALID_FILTERS = new Set(["all", "unread", "groups", "cadets", "suo", "alumni", "ano"]);

const DIRECT_ALLOWED_PAIRS = new Set([
  "cadet:cadet",
  "cadet:suo",
  "suo:cadet",
  "cadet:ano",
  "ano:cadet",
  "suo:ano",
  "ano:suo",
  "alumni:cadet",
  "cadet:alumni",
  "alumni:suo",
  "suo:alumni",
  "alumni:ano",
  "ano:alumni",
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function buildDisplayName(user) {
  return user.full_name || user.username || user.email || `User ${user.user_id}`;
}

function resolveChatRoleFromRow(row) {
  const systemRole = String(row.role || "").toUpperCase();
  if (systemRole === "ANO") return "ano";
  if (systemRole === "ALUMNI") return "alumni";
  if (systemRole === "CADET") {
    const rank = String(row.rank_name || "").trim().toLowerCase();
    return rank === "senior under officer" ? "suo" : "cadet";
  }
  return null;
}

function roleToCategory(role) {
  if (role === "cadet") return "Cadets";
  if (role === "suo") return "SUO";
  if (role === "ano") return "ANO";
  if (role === "alumni") return "Alumni";
  return "All";
}

function normalizeFilter(filterValue) {
  const normalized = String(filterValue || "all").trim().toLowerCase();
  return VALID_FILTERS.has(normalized) ? normalized : "all";
}

function applyFilter(entries, filterValue) {
  const filter = normalizeFilter(filterValue);
  if (filter === "all") return entries;
  if (filter === "unread") return entries.filter((entry) => Number(entry.unread_count || 0) > 0);
  if (filter === "groups") return entries.filter((entry) => String(entry.room_type || "") === "group");
  if (filter === "cadets") return entries.filter((entry) => String(entry.role_category || "") === "Cadets");
  if (filter === "suo") return entries.filter((entry) => String(entry.role_category || "") === "SUO");
  if (filter === "alumni") return entries.filter((entry) => String(entry.role_category || "") === "Alumni");
  if (filter === "ano") return entries.filter((entry) => String(entry.role_category || "") === "ANO");
  return entries;
}

function isDirectPairAllowed(roleA, roleB) {
  if (roleA === roleB) return true;
  return DIRECT_ALLOWED_PAIRS.has(`${roleA}:${roleB}`);
}

function buildDirectKey(userA, userB) {
  const first = Math.min(Number(userA), Number(userB));
  const second = Math.max(Number(userA), Number(userB));
  return `${first}_${second}`;
}

function createError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isUniqueViolation(error) {
  return error && (error.code === "23505" || String(error.message || "").includes("duplicate key"));
}

function isUndefinedColumnError(error) {
  return Boolean(error && (error.code === "42703" || String(error.message || "").toLowerCase().includes("does not exist")));
}

let hasDirectKeyColumnPromise = null;
async function hasDirectKeyColumn() {
  if (!hasDirectKeyColumnPromise) {
    hasDirectKeyColumnPromise = db.schema.hasColumn("chat_rooms", "direct_key")
      .catch(() => false);
  }
  return hasDirectKeyColumnPromise;
}

async function resolveUsersRoleMap(userIds, trx = db) {
  const ids = [...new Set(userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) return new Map();

  const rows = await trx("users as u")
    .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
    .leftJoin("cadet_ranks as cr", "cr.id", "cp.rank_id")
    .whereIn("u.user_id", ids)
    .select("u.user_id", "u.role", "cr.rank_name");

  const roleMap = new Map();
  for (const row of rows) {
    const chatRole = resolveChatRoleFromRow(row);
    if (chatRole) {
      roleMap.set(Number(row.user_id), chatRole);
    }
  }

  return roleMap;
}

async function getUserContext(userId) {
  const row = await db("users as u")
    .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
    .leftJoin("cadet_ranks as cr", "cr.id", "cp.rank_id")
    .where("u.user_id", userId)
    .select("u.user_id", "u.college_id", "u.role", "cr.rank_name")
    .first();

  if (!row) throw createError("User not found.", 404);

  const chatRole = resolveChatRoleFromRow(row);
  if (!chatRole) throw createError("Unsupported user role.", 400);

  return {
    user_id: Number(row.user_id),
    college_id: row.college_id || null,
    chat_role: chatRole,
  };
}

async function getCollegeContacts({ currentUserId, collegeId, currentRole, onlineUsers = new Set() }) {
  const baseQuery = db("users as u")
    .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
    .leftJoin("cadet_ranks as cr", "cr.id", "cp.rank_id")
    .whereNot("u.user_id", currentUserId)
    .select("u.user_id", "u.username", "u.email", "u.role", "cp.full_name", "cr.rank_name");

  if (collegeId) {
    baseQuery.andWhere("u.college_id", collegeId);
  }

  const rows = await baseQuery;

  const contacts = [];
  for (const row of rows) {
    const role = resolveChatRoleFromRow(row);
    if (!role) continue;

    contacts.push({
      entry_id: `contact:${Number(row.user_id)}`,
      item_type: "contact",
      room_id: null,
      room_name: buildDisplayName(row),
      room_type: "direct",
      peer_user_id: Number(row.user_id),
      peer_role: role,
      role_category: roleToCategory(role),
      participants: [
        {
          user_id: Number(row.user_id),
          role,
          name: buildDisplayName(row),
          online: onlineUsers.has(Number(row.user_id)),
        },
      ],
      unread_count: 0,
      online: onlineUsers.has(Number(row.user_id)),
      last_message: null,
      last_message_at: null,
      can_start_chat: isDirectPairAllowed(currentRole, role),
    });
  }

  return contacts;
}

async function getCollegeUsers({ userId, filter = "all", onlineUsers = new Set() }) {
  const context = await getUserContext(userId);
  const contacts = await getCollegeContacts({
    currentUserId: userId,
    collegeId: context.college_id,
    currentRole: context.chat_role,
    onlineUsers,
  });

  return applyFilter(contacts, filter);
}

async function getRoomById(roomId, trx = db) {
  return trx("chat_rooms")
    .where("room_id", roomId)
    .whereNull("deleted_at")
    .first();
}

async function assertRoomAccess(roomId, userId, trx = db) {
  const room = await trx("chat_rooms")
    .where("room_id", roomId)
    .whereNull("deleted_at")
    .where({ is_archived: false })
    .first();

  if (!room) throw createError("Room not found.", 404);

  const participant = await trx("chat_participants")
    .where({ room_id: roomId, user_id: userId })
    .whereNull("deleted_at")
    .first();

  if (!participant) throw createError("You are not a participant in this room.", 403);

  return { room, participant };
}

async function getRoomParticipants(roomId, trx = db) {
  return trx("chat_participants as p")
    .join("users as u", "u.user_id", "p.user_id")
    .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
    .where("p.room_id", roomId)
    .whereNull("p.deleted_at")
    .select("p.user_id", "p.participant_role", "p.is_admin", "u.username", "u.email", "cp.full_name");
}

async function findDirectRoomByKey(directKey, trx = db) {
  if (!(await hasDirectKeyColumn())) {
    return null;
  }

  try {
    return await trx("chat_rooms")
      .where({ room_type: "direct", direct_key: directKey })
      .whereNull("deleted_at")
      .first();
  } catch (error) {
    if (isUndefinedColumnError(error)) {
      return null;
    }
    throw error;
  }
}

async function findExistingDirectRoomByParticipants(userA, userB, trx = db) {
  const rows = await trx("chat_rooms as r")
    .join("chat_participants as p", "p.room_id", "r.room_id")
    .where("r.room_type", "direct")
    .whereNull("r.deleted_at")
    .whereNull("p.deleted_at")
    .whereIn("p.user_id", [userA, userB])
    .groupBy("r.room_id")
    .havingRaw("COUNT(DISTINCT p.user_id) = 2")
    .havingRaw("COUNT(*) = 2")
    .select("r.room_id")
    .limit(1);

  if (!rows[0]) return null;
  return trx("chat_rooms")
    .where("room_id", rows[0].room_id)
    .whereNull("deleted_at")
    .first();
}

async function createRoom({ creatorUserId, creatorRole, roomType = "direct", roomName, participantUserIds = [], trx = null }) {
  if (!VALID_ROLES.has(creatorRole)) throw createError("Invalid creator role.", 400);
  if (!VALID_ROOM_TYPES.has(roomType)) throw createError("Invalid room type.", 400);

  const mergedParticipants = [...new Set([creatorUserId, ...participantUserIds].map(Number).filter((id) => Number.isInteger(id) && id > 0))];

  if (roomType === "direct" && mergedParticipants.length !== 2) {
    throw createError("Direct room must contain exactly 2 participants.", 400);
  }

  if (roomType === "group" && mergedParticipants.length < 2) {
    throw createError("Group room must contain at least 2 participants.", 400);
  }

  const executor = trx || db;
  const roleMap = await resolveUsersRoleMap(mergedParticipants, executor);
  if (roleMap.size !== mergedParticipants.length) throw createError("One or more participants do not exist.", 404);

  if (roleMap.get(Number(creatorUserId)) !== creatorRole) {
    throw createError("Creator role does not match authenticated user role.", 403);
  }

  let directKey = null;
  if (roomType === "direct") {
    const [userA, userB] = mergedParticipants;
    const roleA = roleMap.get(userA);
    const roleB = roleMap.get(userB);

    if (!isDirectPairAllowed(roleA, roleB)) {
      throw createError(`Direct chat not allowed between ${roleA} and ${roleB}.`, 403);
    }

    directKey = buildDirectKey(userA, userB);
    const existing = await findDirectRoomByKey(directKey, executor) || await findExistingDirectRoomByParticipants(userA, userB, executor);
    if (existing) {
      const participants = await getRoomParticipants(existing.room_id, executor);
      return { room: existing, participants, reused: true };
    }
  }

  const createRoomInTransaction = async (txn) => {
    const supportsDirectKey = await hasDirectKeyColumn();
    const insertPayload = {
      room_name: roomType === "group" ? normalizeText(roomName) || "Untitled Group" : null,
      room_type: roomType,
      created_by_user_id: creatorUserId,
      created_by_role: creatorRole,
    };

    if (supportsDirectKey) {
      insertPayload.direct_key = directKey;
    }

    const [room] = await txn("chat_rooms")
      .insert(insertPayload)
      .returning("*");

    const participantRows = mergedParticipants.map((userId) => ({
      room_id: room.room_id,
      user_id: userId,
      participant_role: roleMap.get(userId),
      is_admin: userId === creatorUserId,
    }));

    await txn("chat_participants").insert(participantRows);
    const participants = await getRoomParticipants(room.room_id, txn);

    return { room, participants, reused: false };
  };

  try {
    if (trx) {
      return await createRoomInTransaction(trx);
    }

    return await db.transaction(createRoomInTransaction);
  } catch (error) {
    if (roomType === "direct" && isUndefinedColumnError(error)) {
      throw createError("Chat schema out of date. Run latest migrations.", 500);
    }

    if (roomType === "direct" && isUniqueViolation(error)) {
      const [userA, userB] = mergedParticipants;
      const existing = await findDirectRoomByKey(directKey, executor) || await findExistingDirectRoomByParticipants(userA, userB, executor);
      if (existing) {
        const participants = await getRoomParticipants(existing.room_id, executor);
        return { room: existing, participants, reused: true };
      }
    }
    throw error;
  }
}

async function getChatList({ userId, onlineUsers = new Set(), filter = "all" }) {
  const context = await getUserContext(userId);

  const rooms = await db("chat_participants as me")
    .join("chat_rooms as r", "r.room_id", "me.room_id")
    .leftJoin("messages as lm", "lm.message_id", "r.last_message_id")
    .where("me.user_id", userId)
    .whereNull("me.deleted_at")
    .whereNull("r.deleted_at")
    .where({ "r.is_archived": false })
    .select(
      "r.room_id",
      "r.room_name",
      "r.room_type",
      "r.last_message_at",
      "lm.message_id as last_message_id",
      "lm.body as last_message_body",
      "lm.sender_user_id as last_message_sender_user_id",
      "lm.sender_role as last_message_sender_role",
      "lm.created_at as last_message_created_at"
    )
    .orderBy([{ column: "r.last_message_at", order: "desc", nulls: "last" }, { column: "r.room_id", order: "desc" }]);

  const roomIds = rooms.map((row) => row.room_id);

  const participants = roomIds.length === 0
    ? []
    : await db("chat_participants as p")
      .join("users as u", "u.user_id", "p.user_id")
      .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
      .whereIn("p.room_id", roomIds)
      .whereNull("p.deleted_at")
      .select("p.room_id", "p.user_id", "p.participant_role", "u.username", "u.email", "cp.full_name");

  const unreadRows = roomIds.length === 0
    ? []
    : await db("messages as m")
      .join("chat_rooms as r", "r.room_id", "m.room_id")
      .whereIn("m.room_id", roomIds)
      .whereNull("m.deleted_at")
      .whereNull("r.deleted_at")
      .where({ "r.is_archived": false })
      .whereNot("m.sender_user_id", userId)
      .whereNotExists(function notRead() {
        this.select(db.raw("1"))
          .from("message_read_status as rs")
          .whereRaw("rs.message_id = m.message_id")
          .andWhere("rs.user_id", userId)
          .whereNull("rs.deleted_at");
      })
      .groupBy("m.room_id")
      .select("m.room_id")
      .count({ unread_count: "m.message_id" });

  const unreadMap = new Map(unreadRows.map((row) => [Number(row.room_id), Number(row.unread_count)]));

  const participantsByRoom = new Map();
  for (const row of participants) {
    if (!participantsByRoom.has(row.room_id)) participantsByRoom.set(row.room_id, []);

    participantsByRoom.get(row.room_id).push({
      user_id: Number(row.user_id),
      role: row.participant_role,
      name: buildDisplayName(row),
      online: onlineUsers.has(Number(row.user_id)),
    });
  }

  const directPeerIds = new Set();
  const roomItems = rooms.map((room) => {
    const roomParticipants = participantsByRoom.get(room.room_id) || [];
    const others = roomParticipants.filter((p) => Number(p.user_id) !== Number(userId));

    if (room.room_type === "direct" && others[0]) directPeerIds.add(Number(others[0].user_id));

    const peer = others[0] || null;
    const roomName = room.room_type === "group"
      ? (room.room_name || "Untitled Group")
      : (peer?.name || room.room_name || "Direct Chat");

    const roleCategory = room.room_type === "group" ? "Groups" : roleToCategory(peer?.role);

    return {
      entry_id: `room:${Number(room.room_id)}`,
      item_type: "room",
      room_id: Number(room.room_id),
      room_name: roomName,
      room_type: room.room_type,
      role_category: roleCategory,
      peer_user_id: peer ? Number(peer.user_id) : null,
      peer_role: peer?.role || null,
      participants: roomParticipants,
      unread_count: unreadMap.get(Number(room.room_id)) || 0,
      online: others.some((p) => p.online),
      last_message: room.last_message_id
        ? {
            message_id: Number(room.last_message_id),
            body: room.last_message_body,
            sender_user_id: room.last_message_sender_user_id,
            sender_role: room.last_message_sender_role,
            created_at: room.last_message_created_at,
          }
        : null,
      last_message_at: room.last_message_at,
      can_start_chat: true,
    };
  });

  const contacts = await getCollegeContacts({
    currentUserId: userId,
    collegeId: context.college_id,
    currentRole: context.chat_role,
    onlineUsers,
  });

  const contactItems = contacts.filter((c) => !directPeerIds.has(Number(c.peer_user_id)));

  const combined = [...roomItems, ...contactItems].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return String(a.room_name || "").localeCompare(String(b.room_name || ""));
  });

  return applyFilter(combined, filter);
}

async function getRoomMessages({ roomId, userId, limit = 50, beforeMessageId = null }) {
  await assertRoomAccess(roomId, userId);

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const query = db("messages as m")
    .leftJoin("users as u", "u.user_id", "m.sender_user_id")
    .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
    .where("m.room_id", roomId)
    .whereNull("m.deleted_at")
    .select(
      "m.message_id",
      "m.room_id",
      "m.sender_user_id",
      "m.sender_role",
      "m.message_type",
      "m.body",
      "m.metadata",
      "m.is_edited",
      "m.edited_at",
      "m.created_at",
      "u.username",
      "u.email",
      "cp.full_name"
    )
    .orderBy("m.message_id", "desc")
    .limit(safeLimit + 1);

  const beforeId = Number(beforeMessageId);
  if (Number.isInteger(beforeId) && beforeId > 0) query.andWhere("m.message_id", "<", beforeId);

  const rows = await query;
  const hasMore = rows.length > safeLimit;
  const sliced = hasMore ? rows.slice(0, safeLimit) : rows;
  const messages = sliced.reverse().map((row) => ({
    message_id: Number(row.message_id),
    room_id: Number(row.room_id),
    sender_user_id: row.sender_user_id,
    sender_role: row.sender_role,
    sender_name: buildDisplayName(row),
    message_type: row.message_type,
    body: row.body,
    metadata: row.metadata,
    is_edited: row.is_edited,
    edited_at: row.edited_at,
    created_at: row.created_at,
  }));

  return {
    messages,
    pagination: {
      limit: safeLimit,
      has_more: hasMore,
      next_before_message_id: hasMore ? Number(sliced[sliced.length - 1].message_id) : null,
    },
  };
}

async function sendMessage({ roomId, senderUserId, senderRole, body, messageType = "text", metadata = null, trx = null }) {
  const text = normalizeText(body);
  if (!text) throw createError("Message body is required.", 400);
  if (text.length > MAX_MESSAGE_LENGTH) throw createError(`Message exceeds ${MAX_MESSAGE_LENGTH} characters.`, 400);
  if (!VALID_MESSAGE_TYPES.has(messageType)) throw createError("Invalid message type.", 400);

  const executor = trx || db;
  const { participant } = await assertRoomAccess(roomId, senderUserId, executor);
  if (participant.participant_role !== senderRole) {
    throw createError("Sender role does not match room participant role.", 403);
  }

  const sendMessageInTransaction = async (txn) => {
    const [message] = await txn("messages")
      .insert({
        room_id: roomId,
        sender_user_id: senderUserId,
        sender_role: senderRole,
        message_type: messageType,
        body: text,
        metadata,
      })
      .returning("*");

    await txn("chat_rooms")
      .where("room_id", roomId)
      .whereNull("deleted_at")
      .where({ is_archived: false })
      .update({
        last_message_id: message.message_id,
        last_message_at: message.created_at,
      });

    await txn("message_read_status")
      .insert({
        message_id: message.message_id,
        user_id: senderUserId,
        read_at: txn.fn.now(),
      })
      .onConflict(["message_id", "user_id"])
      .merge({
        read_at: txn.fn.now(),
        deleted_at: null,
      });

    await txn("chat_participants")
      .where({ room_id: roomId, user_id: senderUserId })
      .whereNull("deleted_at")
      .update({
        last_read_at: txn.fn.now(),
        last_read_message_id: message.message_id,
      });

    const enriched = await txn("messages as m")
      .leftJoin("users as u", "u.user_id", "m.sender_user_id")
      .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
      .where("m.message_id", message.message_id)
      .select(
        "m.message_id",
        "m.room_id",
        "m.sender_user_id",
        "m.sender_role",
        "m.message_type",
        "m.body",
        "m.metadata",
        "m.is_edited",
        "m.edited_at",
        "m.created_at",
        "u.username",
        "u.email",
        "cp.full_name"
      )
      .first();

    return {
      message_id: Number(enriched.message_id),
      room_id: Number(enriched.room_id),
      sender_user_id: enriched.sender_user_id,
      sender_role: enriched.sender_role,
      sender_name: buildDisplayName(enriched),
      message_type: enriched.message_type,
      body: enriched.body,
      metadata: enriched.metadata,
      is_edited: enriched.is_edited,
      edited_at: enriched.edited_at,
      created_at: enriched.created_at,
    };
  };

  if (trx) {
    return sendMessageInTransaction(trx);
  }

  return db.transaction(sendMessageInTransaction);
}

async function markRoomAsRead({ roomId, userId, upToMessageId = null }) {
  await assertRoomAccess(roomId, userId);

  const query = db("messages as m")
    .where("m.room_id", roomId)
    .whereNull("m.deleted_at")
    .whereNot("m.sender_user_id", userId)
    .whereNotExists(function notRead() {
      this.select(db.raw("1"))
        .from("message_read_status as rs")
        .whereRaw("rs.message_id = m.message_id")
        .andWhere("rs.user_id", userId)
        .whereNull("rs.deleted_at");
    })
    .select("m.message_id")
    .orderBy("m.message_id", "asc");

  const upToId = Number(upToMessageId);
  if (Number.isInteger(upToId) && upToId > 0) query.andWhere("m.message_id", "<=", upToId);

  const unreadMessages = await query;
  if (unreadMessages.length === 0) {
    return { marked_count: 0, last_read_message_id: null };
  }

  const now = new Date();
  const rows = unreadMessages.map((row) => ({
    message_id: row.message_id,
    user_id: userId,
    read_at: now,
    created_at: now,
    updated_at: now,
  }));

  await db("message_read_status")
    .insert(rows)
    .onConflict(["message_id", "user_id"])
    .merge({
      read_at: now,
      updated_at: now,
      deleted_at: null,
    });

  const lastReadMessageId = Number(unreadMessages[unreadMessages.length - 1].message_id);

  await db("chat_participants")
    .where({ room_id: roomId, user_id: userId })
    .whereNull("deleted_at")
    .update({
      last_read_at: now,
      last_read_message_id: lastReadMessageId,
    });

  return {
    marked_count: unreadMessages.length,
    last_read_message_id: lastReadMessageId,
  };
}

async function softDeleteMessage({ messageId, requesterUserId }) {
  const message = await db("messages")
    .where("message_id", messageId)
    .whereNull("deleted_at")
    .first();

  if (!message) throw createError("Message not found.", 404);

  const { participant } = await assertRoomAccess(message.room_id, requesterUserId);
  const canDelete = Number(message.sender_user_id) === Number(requesterUserId) || Boolean(participant.is_admin);
  if (!canDelete) throw createError("You are not allowed to delete this message.", 403);

  await db.transaction(async (trx) => {
    await trx("messages")
      .where("message_id", messageId)
      .update({ deleted_at: trx.fn.now() });

    const room = await trx("chat_rooms")
      .where("room_id", message.room_id)
      .whereNull("deleted_at")
      .first();

    if (room && Number(room.last_message_id) === Number(messageId)) {
      const latest = await trx("messages")
        .where("room_id", message.room_id)
        .whereNull("deleted_at")
        .orderBy("message_id", "desc")
        .first();

      await trx("chat_rooms")
        .where("room_id", message.room_id)
        .update({
          last_message_id: latest ? latest.message_id : null,
          last_message_at: latest ? latest.created_at : null,
        });
    }
  });

  return { message_id: Number(messageId), room_id: Number(message.room_id), deleted: true };
}

module.exports = {
  VALID_ROLES,
  VALID_ROOM_TYPES,
  VALID_MESSAGE_TYPES,
  resolveUsersRoleMap,
  assertRoomAccess,
  createRoom,
  getChatList,
  getCollegeUsers,
  getRoomMessages,
  sendMessage,
  markRoomAsRead,
  softDeleteMessage,
  getRoomById,
};
