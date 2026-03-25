import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { DefaultValues, FieldValues, UseFormProps, UseFormReturn } from "react-hook-form";
import type { z } from "zod";

interface ZodFormOptions<TValues extends FieldValues>
  extends Omit<UseFormProps<TValues>, "resolver" | "defaultValues"> {
  defaultValues?: DefaultValues<TValues>;
  schema: z.ZodType<TValues>;
}

type FormResolver<TValues extends FieldValues> = NonNullable<UseFormProps<TValues>["resolver"]>;

export function useZodForm<TValues extends FieldValues>(
  options: ZodFormOptions<TValues>
): UseFormReturn<TValues> {
  return useForm<TValues>({
    ...options,
    resolver: zodResolver(options.schema as never) as FormResolver<TValues>
  });
}
