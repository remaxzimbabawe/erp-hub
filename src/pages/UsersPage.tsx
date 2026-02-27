import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Shield, Store } from "lucide-react";
import { ConfirmModal } from "@/components/forms/ModalForm";
import {
  getUsers,
  getUserRoles,
  getUserShopAssignments,
  getUserPermissions,
  getShops,
  createUser,
  updateUser,
  deleteUser,
  setUserRole,
  assignUserToShop,
  removeUserFromShop,
  setUserPermissions,
} from "@/lib/database";
import type { User, RoleType, PermissionKey } from "@/types";
import { ROLE_LABELS, PERMISSION_GROUPS, PERMISSION_LABELS, ALL_PERMISSIONS } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = React.useState(getUsers());
  const [editUser, setEditUser] = React.useState<User | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<User | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [permUser, setPermUser] = React.useState<User | null>(null);
  
  const shops = getShops();
  const roles = getUserRoles();
  const assignments = getUserShopAssignments();

  const refresh = () => setUsers(getUsers());

  if (!hasRole('super_admin')) {
    return <div className="p-8 text-center text-muted-foreground">Access denied. Super Admin only.</div>;
  }

  const getUserRoleLabel = (userId: string) => {
    const r = roles.find(r => r.userId === userId);
    return r ? ROLE_LABELS[r.role] || r.role : "No Role";
  };

  const getUserShops = (userId: string) => {
    return assignments.filter(a => a.userId === userId).map(a => {
      const shop = shops.find(s => s._id === a.shopId);
      return shop?.name || a.shopId;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="User Management" description="Manage users, roles, and permissions">
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Add User</Button>
      </PageHeader>

      <div className="grid gap-4">
        {users.map(user => {
          const userRole = roles.find(r => r.userId === user._id);
          const userShops = getUserShops(user._id);
          return (
            <Card key={user._id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                  <Badge variant="outline">{getUserRoleLabel(user._id)}</Badge>
                  {userShops.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs"><Store className="h-3 w-3 mr-1" />{s}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPermUser(user)}>Permissions</Button>
                  <Button variant="outline" size="icon" onClick={() => setEditUser(user)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => setDeleteItem(user)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit User Dialog */}
      <UserFormDialog
        open={showCreate || !!editUser}
        user={editUser}
        onClose={() => { setShowCreate(false); setEditUser(null); }}
        onSave={() => { refresh(); setShowCreate(false); setEditUser(null); }}
        shops={shops}
      />

      {/* Permissions Dialog */}
      {permUser && (
        <PermissionsDialog
          user={permUser}
          shops={shops}
          onClose={() => { setPermUser(null); refresh(); }}
        />
      )}

      <ConfirmModal
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete User"
        description={`Delete "${deleteItem?.name}"? This cannot be undone.`}
        onConfirm={() => { deleteUser(deleteItem!._id); refresh(); setDeleteItem(null); toast({ title: "User deleted" }); }}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}

function UserFormDialog({ open, user, onClose, onSave, shops }: {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSave: () => void;
  shops: { _id: string; name: string }[];
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState(user?.name || "");
  const [email, setEmail] = React.useState(user?.email || "");
  const [password, setPassword] = React.useState(user?.password || "");
  const [isActive, setIsActive] = React.useState(user?.isActive ?? true);
  const [role, setRole] = React.useState<RoleType>(() => {
    if (user) {
      const r = getUserRoles().find(r => r.userId === user._id);
      return r?.role || 'app_user';
    }
    return 'app_user';
  });
  const [selectedShops, setSelectedShops] = React.useState<string[]>(() => {
    if (user) {
      return getUserShopAssignments().filter(a => a.userId === user._id).map(a => a.shopId);
    }
    return [];
  });

  React.useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPassword(user?.password || "");
    setIsActive(user?.isActive ?? true);
    if (user) {
      const r = getUserRoles().find(r => r.userId === user._id);
      setRole(r?.role || 'app_user');
      setSelectedShops(getUserShopAssignments().filter(a => a.userId === user._id).map(a => a.shopId));
    } else {
      setRole('app_user');
      setSelectedShops([]);
    }
  }, [user, open]);

  const handleSave = () => {
    if (!name || !email || !password) return;
    if (user) {
      updateUser(user._id, { name, email, password, isActive });
      setUserRole(user._id, role);
      // Update shop assignments
      const current = getUserShopAssignments().filter(a => a.userId === user._id).map(a => a.shopId);
      current.forEach(s => { if (!selectedShops.includes(s)) removeUserFromShop(user._id, s); });
      selectedShops.forEach(s => { if (!current.includes(s)) assignUserToShop(user._id, s); });
      toast({ title: "User updated" });
    } else {
      const newUser = createUser({ name, email, password, isActive });
      setUserRole(newUser._id, role);
      selectedShops.forEach(s => assignUserToShop(newUser._id, s));
      toast({ title: "User created" });
    }
    onSave();
  };

  const toggleShop = (shopId: string) => {
    setSelectedShops(prev => prev.includes(shopId) ? prev.filter(s => s !== shopId) : [...prev, shopId]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{user ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Active</label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(role === 'shop_manager' || role === 'app_user') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Shops</label>
              <div className="flex flex-wrap gap-2">
                {shops.map(s => (
                  <Badge key={s._id} variant={selectedShops.includes(s._id) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleShop(s._id)}>
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handleSave} className="w-full">{user ? "Update" : "Create"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({ user, shops, onClose }: {
  user: User;
  shops: { _id: string; name: string }[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const userRole = getUserRoles().find(r => r.userId === user._id);
  const userShopIds = getUserShopAssignments().filter(a => a.userId === user._id).map(a => a.shopId);
  const currentPerms = getUserPermissions(user._id);
  
  const [perms, setPerms] = React.useState<Set<string>>(() => {
    return new Set(currentPerms.map(p => `${p.permission}${p.shopId ? `_${p.shopId}` : ''}`));
  });

  const togglePerm = (key: string) => {
    setPerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = () => {
    const permList: { permission: PermissionKey; shopId?: string }[] = [];
    perms.forEach(key => {
      const parts = key.split('_');
      // Find the permission name (may contain underscores)
      for (const perm of ALL_PERMISSIONS) {
        if (key === perm) {
          permList.push({ permission: perm });
          return;
        }
        if (key.startsWith(perm + '_')) {
          const shopId = key.substring(perm.length + 1);
          permList.push({ permission: perm, shopId });
          return;
        }
      }
    });
    setUserPermissions(user._id, permList);
    toast({ title: "Permissions updated" });
    onClose();
  };

  const needsShopScope = userRole?.role === 'shop_manager' || userRole?.role === 'app_user';
  const scopeShops = needsShopScope ? userShopIds : [];

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader><DialogTitle>Permissions: {user.name}</DialogTitle></DialogHeader>
        <div className="space-y-6">
          {Object.entries(PERMISSION_GROUPS).map(([group, groupPerms]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">{group}</h4>
              <div className="space-y-2">
                {groupPerms.map(perm => {
                  if (needsShopScope && scopeShops.length > 0) {
                    return scopeShops.map(shopId => {
                      const key = `${perm}_${shopId}`;
                      const shopName = shops.find(s => s._id === shopId)?.name || shopId;
                      return (
                        <div key={key} className="flex items-center justify-between py-1">
                          <span className="text-sm">{PERMISSION_LABELS[perm]} <Badge variant="outline" className="text-xs ml-1">{shopName}</Badge></span>
                          <Switch checked={perms.has(key)} onCheckedChange={() => togglePerm(key)} />
                        </div>
                      );
                    });
                  }
                  return (
                    <div key={perm} className="flex items-center justify-between py-1">
                      <span className="text-sm">{PERMISSION_LABELS[perm]}</span>
                      <Switch checked={perms.has(perm)} onCheckedChange={() => togglePerm(perm)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <Button onClick={handleSave} className="w-full">Save Permissions</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
