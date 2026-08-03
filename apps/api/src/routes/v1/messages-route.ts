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

import { messageController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

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

  return messageController.createConversation(
    context,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
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

  return messageController.sendMessage(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

// Reporting is what unlocks admin access to an otherwise private conversation,
// so it is a participant action and lives here. ADR-0004.
messagesRoutes.post("/conversations/:id/report", async (context) => {
  const params = messageConversationIdParamsSchema.parse(context.req.param());
  const payload = reportConversationSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return messageController.reportConversation(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

messagesRoutes.post("/conversations/:id/read", (context) => {
  const params = messageConversationIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return messageController.markConversationRead(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});
