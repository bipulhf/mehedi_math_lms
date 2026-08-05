import type { MiddlewareHandler } from "hono";

import { hasExplicitAuditEntry, runWithAuditTrailScope } from "@/lib/audit-trail-context";
import { auditLogService } from "@/lib/container";
import type { AppBindings } from "@/types/app-bindings";

const mutatingMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

/**
 * Renewing a marking claim is a heartbeat the browser sends every forty-five
 * seconds while a teacher has an answer open. It is not an action anybody took,
 * and logging it would bury the ones that were.
 */
const heartbeatRoutes = new Set(["PATCH /scripts/answers/:id/claim"]);

/**
 * Matched by suffix: Hono reports the route path with whatever prefix the
 * router was mounted under, and the mount point is not part of what makes a
 * request a heartbeat.
 */
function isHeartbeat(method: string, routePath: string): boolean {
  return [...heartbeatRoutes].some((route) => {
    const [heartbeatMethod, heartbeatPath] = route.split(" ");

    return method === heartbeatMethod && routePath.endsWith(heartbeatPath ?? "");
  });
}

/**
 * The floor under the audit trail: every state-changing request by a signed-in
 * user leaves a record of who made it and when.
 *
 * Routes that describe their own action still do — those entries are better,
 * because they name the thing that happened rather than the endpoint that was
 * called. This only writes when the route wrote nothing, so a feature added
 * next year is audited whether or not its author remembered to.
 *
 * Failed requests are not logged: nothing changed, and a log full of rejected
 * attempts makes the successful ones harder to find. Authentication failures
 * are the request logger's business, not the audit trail's.
 */
export const auditTrailMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  await runWithAuditTrailScope(async () => {
    await next();

    const method = context.req.method.toUpperCase();
    const actor = context.get("authUser");

    if (!mutatingMethods.has(method) || !actor) {
      return;
    }

    const routePath = context.req.routePath;

    if (hasExplicitAuditEntry() || isHeartbeat(method, routePath)) {
      return;
    }

    if (context.res.status >= 400) {
      return;
    }

    const params = context.req.param() as Record<string, string | undefined>;

    auditLogService.log({
      // Named after the endpoint because that is genuinely all this knows. A
      // route that wants a domain name for what it did should log it itself.
      action: `request.${method.toLowerCase()}`,
      actorId: actor.id,
      entityId: params.id ?? params.testId ?? params.courseId ?? routePath,
      entityType: "http_request",
      metadata: { method, path: context.req.path, routePath, status: context.res.status }
    });
  });
};
