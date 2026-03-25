import type { OnecodesoftSmsProvider } from "@/services/onecodesoft-sms-provider";
import type { SmsRepository } from "@/repositories/sms-repository";

const CHUNK_SIZE = 50;

export async function processSmsBatchJob(
  repository: SmsRepository,
  provider: OnecodesoftSmsProvider,
  batchId: string
): Promise<void> {
  const batch = await repository.getBatchById(batchId);

  if (!batch || batch.status !== "QUEUED") {
    return;
  }

  await repository.updateBatch(batchId, { status: "SENDING" });

  let pending = await repository.listPendingRecipients(batchId);

  if (!provider.isConfigured()) {
    for (const recipient of pending) {
      await repository.updateRecipient(recipient.id, {
        errorMessage: "SMS provider not configured",
        status: "FAILED"
      });
    }

    const failed = await repository.countRecipientsByStatuses(batchId, ["FAILED"]);
    const sent = await repository.countRecipientsByStatuses(batchId, ["SENT"]);
    const skipped = await repository.countRecipientsByStatuses(batchId, ["SKIPPED_NO_PHONE"]);

    await repository.updateBatch(batchId, {
      completedAt: new Date(),
      failedCount: failed,
      providerLastResponse: null,
      sentCount: sent,
      skippedCount: skipped,
      status: "FAILED"
    });

    return;
  }

  while (pending.length > 0) {
    const chunk = pending.slice(0, CHUNK_SIZE);

    for (const recipient of chunk) {
      if (!recipient.phoneE164) {
        await repository.updateRecipient(recipient.id, {
          errorMessage: "Missing phone number",
          status: "FAILED"
        });
      }
    }

    const withPhones = chunk.filter((recipient) => Boolean(recipient.phoneE164));
    const parameters = withPhones.map((recipient) => ({
      Number: recipient.phoneE164 as string,
      Text: batch.messageBody
    }));

    if (parameters.length === 0) {
      pending = await repository.listPendingRecipients(batchId);
      continue;
    }

    try {
      const result = await provider.sendBulk(parameters);
      const ok = result.statusCode >= 200 && result.statusCode < 300;

      for (const recipient of withPhones) {
        if (ok) {
          await repository.updateRecipient(recipient.id, { status: "SENT" });
        } else {
          await repository.updateRecipient(recipient.id, {
            errorMessage: `HTTP ${String(result.statusCode)}`,
            status: "FAILED"
          });
        }
      }

      await repository.updateBatch(batchId, {
        providerLastResponse: result.responseText.slice(0, 8000)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "SMS send error";

      for (const recipient of withPhones) {
        await repository.updateRecipient(recipient.id, {
          errorMessage: message,
          status: "FAILED"
        });
      }
    }

    pending = await repository.listPendingRecipients(batchId);
  }

  const sent = await repository.countRecipientsByStatuses(batchId, ["SENT"]);
  const failed = await repository.countRecipientsByStatuses(batchId, ["FAILED"]);
  const skipped = await repository.countRecipientsByStatuses(batchId, ["SKIPPED_NO_PHONE"]);
  const hasFailed = failed > 0;
  const hasSent = sent > 0;

  await repository.updateBatch(batchId, {
    completedAt: new Date(),
    failedCount: failed,
    sentCount: sent,
    skippedCount: skipped,
    status: hasFailed && !hasSent ? "FAILED" : "COMPLETED"
  });
}
