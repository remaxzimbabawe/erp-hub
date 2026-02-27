import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { ModalForm, ConfirmModal } from "@/components/forms/ModalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notificationSchema, NotificationFormData } from "@/lib/schemas";
import { getNotificationList, createNotification, deleteNotification } from "@/lib/database";
import type { NotificationList } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

function NotificationForm({ onSubmit }: { onSubmit: (data: NotificationFormData) => void }) {
  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { name: "", whatsAppPhoneNumber: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Manager Alert" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="whatsAppPhoneNumber" render={({ field }) => (
          <FormItem><FormLabel>WhatsApp Number</FormLabel><FormControl><Input placeholder="e.g., +1234567890" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full">Add Contact</Button>
      </form>
    </Form>
  );
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = React.useState<NotificationList[]>(getNotificationList());
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [deleteItem, setDeleteItem] = React.useState<NotificationList | null>(null);

  const refreshData = () => setNotifications(getNotificationList());

  const handleCreate = (data: NotificationFormData) => {
    createNotification({ name: data.name, whatsAppPhoneNumber: data.whatsAppPhoneNumber });
    refreshData();
    setIsCreateOpen(false);
    toast({ title: "Contact added" });
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteNotification(deleteItem._id);
    refreshData();
    setDeleteItem(null);
    toast({ title: "Contact removed" });
  };

  const columns = [
    { key: "name", header: "Name" },
    { key: "whatsAppPhoneNumber", header: "WhatsApp", render: (item: NotificationList) => (
      <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" />{item.whatsAppPhoneNumber}</div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Notification Contacts" description="Manage WhatsApp notification recipients">
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Contact</Button>
      </PageHeader>
      <DataView data={notifications} columns={columns} keyExtractor={(item) => item._id} searchKeys={["name"]} onDelete={(item) => setDeleteItem(item)} emptyMessage="No contacts added." />
      <ModalForm open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Add Contact"><NotificationForm onSubmit={handleCreate} /></ModalForm>
      <ConfirmModal open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)} title="Remove Contact" description={`Remove "${deleteItem?.name}"?`} onConfirm={handleDelete} confirmLabel="Remove" variant="destructive" />
    </div>
  );
}
