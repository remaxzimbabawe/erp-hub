import * as React from "react";
import { useForm, FieldValues, UseFormReturn, Path, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodSchema } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface FormFieldConfig<T extends FieldValues> {
  name: Path<T>;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "switch";
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
}

interface ReusableFormProps<T extends FieldValues> {
  schema: ZodSchema<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (data: T) => void | Promise<void>;
  fields: FormFieldConfig<T>[];
  submitLabel?: string;
  isLoading?: boolean;
  className?: string;
}

export function ReusableForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  fields,
  submitLabel = "Submit",
  isLoading = false,
  className,
}: ReusableFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = async (data: T) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={className}>
        <div className="space-y-4">
          {fields.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>{field.label}</FormLabel>
                  <FormControl>
                    {field.type === "textarea" ? (
                      <Textarea
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    ) : field.type === "select" ? (
                      <Select
                        onValueChange={formField.onChange}
                        defaultValue={formField.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || "Select..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "switch" ? (
                      <Switch
                        checked={formField.value}
                        onCheckedChange={formField.onChange}
                      />
                    ) : field.type === "number" ? (
                      <Input
                        type="number"
                        placeholder={field.placeholder}
                        {...formField}
                        onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                      <Input
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}

// Hook for form logic reuse
export function useReusableForm<T extends FieldValues>(
  schema: ZodSchema<T>,
  defaultValues: DefaultValues<T>
): UseFormReturn<T> {
  return useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });
}
