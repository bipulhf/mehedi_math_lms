import { Hono } from "hono";
import type { UserRole } from "@genex/shared";
import {
  conversationMessagesQuerySchema,
  createConversationSchema,
  messageConversationIdParamsSchema,
  messageParticipantsQuerySchema,
  messagesConversationQuerySchema,
  reportConversationSchema,
  sendMessageSchema
} from "@genex/shared";

import { auditLogService, messageController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";

export const messagesRoutes = new Hono<AppBindings>();

messagesRoutes.use("*", requireRole("STUDENT", "TEACHER"));

messagesRoutes.get("/participants", (context) => {
  const query = messageParticipantsQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return messageController.searchParticipants(
    context,
    query,
    authUser!.id,
    authSession!.role as UserRole
  );
});

messagesRoutes.get("/conversations", (context) => {
  const query = messagesConversationQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return messageController.listConversations(
    context,
    query,
    authUser!.id,
    authSession!.role as UserRole
  );
});

messagesRoutes.post("/conversations", async (context) => {
  const payload = createConversationSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await messageController.createConversation(
    context,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "conversation.opened",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "conversation"
  });

  return response;
});

messagesRoutes.get("/conversations/:id", (context) => {
  const params = messageConversationIdParamsSchema.parse(context.req.param());
  const query = conversationMessagesQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return messageController.getConversationMessages(
    context,
    params.id,
    query,
    authUser!.id,
    authSession!.role as UserRole
  );
});

messagesRoutes.post("/conversations/:id", async (context) => {
  const params = messageConversationIdParamsSchema.parse(context.req.param());
  const payload = sendMessageSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await messageController.sendMessage(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "message.sent",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "message",
    metadata: { conversationId: params.id }
  });

  return response;
});

// Reporting is what unlocks admin access to an otherwise private conversation,
// so it is a participant action and lives here. ADR-0004.
messagesRoutes.post("/conversations/:id/report", async (context) => {
  const params = messageConversationIdParamsSchema.parse(context.req.param());
  const payload = reportConversationSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await messageController.reportConversation(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "conversation.reported",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "conversation_report",
    metadata: { conversationId: params.id }
  });

  return response;
});

messagesRoutes.post("/conversations/:id/read", async (context) => {
  const params = messageConversationIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await messageController.markConversationRead(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "conversation.read",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "conversation"
  });

  return response;
});
