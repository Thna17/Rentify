import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Mail,
  Trash2,
  Users,
  Filter,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { useAuth, useTranslation } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import {
  useGetStaffListQuery,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useResendStaffOtpMutation,
  useCreateStaffMutation,
} from '@rentify/apis';
import StaffInviteForm from './components/StaffInviteForm';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Badge } from '@rentify/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { DataTable, StatusPill } from '../../components/data-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rentify/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@rentify/shared/ui/tooltip';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  role?: string;
  permissions: string[];
  isActive: boolean;
}

interface PermissionsLabels {
  [key: string]: string;
}

const permissionsLabels: PermissionsLabels = {
  manage_products: 'Products',
  manage_orders: 'Orders',
  manage_invoices: 'Invoices',
  manage_pos: 'POS',
  manage_analytics: 'Analytics',
  manage_settings: 'Settings',
  manage_staff: 'Staff',
};

const StaffSetting: React.FC = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  
    const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  const userId = websiteData.userId;

  const {
    data: staffList = [],
    isLoading,
    isError,
    refetch,
  } = useGetStaffListQuery({ websiteId }, { refetchOnMountOrArgChange: true });
  
  const [createStaff] = useCreateStaffMutation();
  const [updateStaff] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  const [resendOtp] = useResendStaffOtpMutation();

  const handleOpenDialog = (staff: StaffMember | null = null): void => {
    setCurrentStaff(staff);
    setOpenDialog(true);
  };

  const handleCloseDialog = (): void => {
    setOpenDialog(false);
    setCurrentStaff(null);
  };

  const handleDelete = async (staffId: string): Promise<void> => {
    setDeletingId(staffId);
    try {
      await deleteStaff(staffId).unwrap();
      toast.success(t('dashboard.settings.staff_deleted'));
    } catch (err: any) {
      toast.error(err.data?.error || t('dashboard.settings.staff_delete_failed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleResendInvite = async (email: string): Promise<void> => {
    setResendingEmail(email);
    try {
      await resendOtp({ email }).unwrap();
      toast.success(t('dashboard.settings.invitation_resent'));
    } catch (err: any) {
      toast.error(err.data?.error || t('dashboard.settings.invitation_resend_failed'));
    } finally {
      setResendingEmail(null);
    }
  };

  const [entitlements, setEntitlements] = useState<any>(null);

  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/mine/entitlements`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.data) setEntitlements(res.data);
      })
      .catch((err) => {
        console.warn('Failed to load store entitlements', err);
      });
  }, []);

  const isGracePeriod = entitlements?.isGracePeriod;
  const isSuspended = entitlements?.isSuspended;
  const staffLimit = entitlements?.capabilities?.staffLimit ?? 5;
  const currentStaffCount = staffList?.length || 0;
  const isStaffLimitReached = currentStaffCount >= staffLimit;
  const canAddStaff = entitlements ? entitlements.mutationsAllowed && !isStaffLimitReached : true;

  const disabledReason = !canAddStaff
    ? isGracePeriod
      ? 'Staff invitations are locked during your subscription grace period.'
      : isSuspended
      ? 'Staff invitations are locked because the store subscription is suspended.'
      : isStaffLimitReached
      ? `Staff limit of ${staffLimit} reached for the ${entitlements?.displayName || 'current'} plan. Upgrade to invite more team members.`
      : 'Staff invitations are unavailable.'
    : null;

  const filteredStaff = staffList.filter((staff: StaffMember) => {
    const matchesSearch =
      staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && staff.isActive) ||
      (statusFilter === 'inactive' && !staff.isActive);

    return matchesSearch && matchesStatus;
  });

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const staffColumns = [
    {
      id: 'member',
      accessorFn: (staff: StaffMember) => staff.name || '',
      header: t('merchant.p.staffMember'),
      meta: { sortable: true, mobile: 'primary' },
      cell: ({ row }: any) => {
        const staff: StaffMember = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border">
              <AvatarImage src={staff.avatar} alt="" />
              <AvatarFallback className="bg-primary/10 font-medium text-primary">
                {getInitials(staff.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{staff.name}</p>
              <p className="truncate text-xs text-muted-foreground">{staff.role || t('merchant.table.staff.role')}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'contact',
      accessorFn: (staff: StaffMember) => staff.email || '',
      header: t('merchant.p.contact'),
      meta: { mobileHideLabel: true, mobileCell: (staff: StaffMember) => staff.email || staff.phoneNumber || null },
      cell: ({ row }: any) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{row.original.email}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.phoneNumber || t('merchant.table.staff.noPhone')}
          </p>
        </div>
      ),
    },
    {
      id: 'permissions',
      header: t('merchant.p.permissions'),
      meta: { mobile: 'badge' },
      enableSorting: false,
      cell: ({ row }: any) => {
        const staff: StaffMember = row.original;
        return (
          <div className="flex max-w-xs flex-wrap gap-1">
            {staff.permissions?.slice(0, 3).map((permission: string) => (
              <Badge key={permission} variant="info" className="rounded-full text-xs">
                {permissionsLabels[permission] || permission}
              </Badge>
            ))}
            {staff.permissions?.length > 3 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help rounded-full text-xs" tabIndex={0}>
                    +{staff.permissions.length - 3}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="min-w-[120px] space-y-1">
                    {staff.permissions.slice(3).map((p: string) => (
                      <div key={p} className="text-xs">{permissionsLabels[p] || p}</div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      accessorFn: (staff: StaffMember) => (staff.isActive ? 1 : 0),
      header: t('merchant.p.status'),
      meta: { sortable: true, mobile: 'badge' },
      cell: ({ row }: any) => (
        row.original.isActive
          ? <StatusPill tone="success">{t('merchant.p.active')}</StatusPill>
          : <StatusPill tone="danger">{t('merchant.p.inactive')}</StatusPill>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('merchant.p.actions')}</span>,
      meta: { label: t('merchant.p.actions'), align: 'right' },
      enableSorting: false,
      cell: ({ row }: any) => {
        const staff: StaffMember = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:h-9 md:w-9" aria-label={t('merchant.table.staff.actionsFor', { name: staff.name })}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleOpenDialog(staff)}
                className="flex min-h-11 cursor-pointer items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                {t('merchant.p.editStaff')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleResendInvite(staff.email)}
                disabled={resendingEmail === staff.email}
                className="flex min-h-11 cursor-pointer items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {resendingEmail === staff.email ? t('merchant.table.staff.sending') : t('merchant.table.staff.resendInvite')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(staff.id)}
                disabled={deletingId === staff.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === staff.id ? t('merchant.table.staff.deleting') : t('merchant.table.staff.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <SettingsLayout
      title={t('merchant.settings.sections.staff.title')}
      description={t('merchant.settings.sections.staff.body')}
      icon={<Users className="h-5 w-5" />}
    >
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">{t('merchant.p.teamMembers')}</CardTitle>
              <CardDescription>
                {t('merchant.p.inviteAndManageStaff')}
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                if (!canAddStaff) {
                  toast.error(disabledReason || 'Action locked');
                  return;
                }
                handleOpenDialog();
              }}
              disabled={!canAddStaff}
              title={disabledReason || undefined}
              className={`gap-2 shadow-sm ${!canAddStaff ? 'opacity-60 cursor-not-allowed bg-slate-400' : ''}`}
            >
              <Plus className="h-4 w-4" />
              {t('merchant.p.addStaffMember')}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {disabledReason && !isGracePeriod && !isSuspended && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <span>{disabledReason}</span>
              </div>
              <Button asChild size="sm" variant="outline" className="border-amber-400 bg-white hover:bg-amber-100 text-amber-900">
                <a href="/settings/billing">{t('merchant.p.upgradePlan')}</a>
              </Button>
            </div>
          )}
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t('merchant.p.searchStaffMembers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('merchant.p.allStatus')}</SelectItem>
                <SelectItem value="active">{t('merchant.p.active')}</SelectItem>
                <SelectItem value="inactive">{t('merchant.p.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Staff Table */}
          <DataTable
            ariaLabel={t('merchant.p.teamMembers')}
            columns={staffColumns}
            data={filteredStaff}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            mobileInset="pl-12"
            empty={{
              icon: Users,
              title: t('merchant.p.noStaffMembersFound'),
              body: searchTerm ? t('merchant.table.staff.emptySearch') : t('merchant.table.staff.emptyInvite'),
              action: !searchTerm && (
                <Button onClick={() => handleOpenDialog()} className="h-11 gap-2" disabled={!canAddStaff}>
                  <Plus className="h-4 w-4" />
                  {t('merchant.p.addStaffMember')}
                </Button>
              ),
            }}
          />

          {/* Add/Edit Staff Dialog */}
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {currentStaff ? 'Edit Staff Member' : 'Invite New Staff'}
                </DialogTitle>
              </DialogHeader>
              <StaffInviteForm 
                onSuccess={handleCloseDialog}
                merchantId={userId || ''}
                initialData={currentStaff || undefined}
                isEditing={!!currentStaff}
                onError={(msg: string) => toast.error(msg)}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};

export default StaffSetting;