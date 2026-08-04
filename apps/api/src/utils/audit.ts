/** Reads `data.id` off a success() Response without consuming it for the caller. */
export async function extractCreatedId(response: Response): Promise<string> {
  const body = (await response.clone().json()) as { data?: { id?: string } };

  return body.data?.id ?? "unknown";
}
