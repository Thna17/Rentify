import { useCallback } from 'react';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import {
  IconCheck,
  IconX,
  IconTruck,
  IconPackage,
  IconChevronDown,
  IconEye,
} from '@tabler/icons-react';

export function QuickActionsDropdown({ order, onAction, onViewDetails }) {
  const { t } = useTranslation();

  const getAvailableActions = useCallback((order) => {
    if (!order || !order.status) return [];
    const actions = [];
    switch (order.status) {
      case 'pending':
        actions.push({ 
          value: 'confirm', 
          label: t('dashboard.order.confirm'), 
          icon: IconCheck,
          variant: 'default'
        });
        actions.push({ 
          value: 'cancel', 
          label: t('dashboard.order.cancel'), 
          icon: IconX,
          variant: 'destructive'
        });
        break;
      case 'confirmed':
        actions.push({ 
          value: 'process', 
          label: t('dashboard.order.process'), 
          icon: IconTruck,
          variant: 'default'
        });
        actions.push({ 
          value: 'cancel', 
          label: t('dashboard.order.cancel'), 
          icon: IconX,
          variant: 'destructive'
        });
        break;
      case 'processing':
        actions.push({ 
          value: 'complete', 
          label: t('dashboard.order.complete'), 
          icon: IconPackage,
          variant: 'success'
        });
        break;
      default:
        break;
    }
    return actions;
  }, [t]);

  const availableActions = getAvailableActions(order);

  const handleAction = useCallback((action, event) => {
    event?.stopPropagation();
    onAction?.(action, order);
  }, [onAction, order]);

  if (availableActions.length === 0) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground px-2 py-1">
        {t('dashboard.order.no_actions')}
      </Badge>
    );
  }

  if (availableActions.length === 1) {
    const action = availableActions[0];
    const IconComponent = action.icon;
    return (
      <Button
        variant={action.variant}
        size="sm"
        className="h-8 text-xs"
        onClick={(e) => handleAction(action.value, e)}
      >
        <IconComponent className="h-3 w-3 mr-1" />
        {action.label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <span className="text-xs">{t('dashboard.order.actions')}</span>
          <IconChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {availableActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <DropdownMenuItem
              key={action.value}
              onSelect={(e) => {
                e.preventDefault();
                handleAction(action.value, e);
              }}
              className={`flex items-center gap-2 cursor-pointer ${
                action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span>{action.label}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={(e) => {
            e.preventDefault();
            onViewDetails();
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <IconEye className="h-4 w-4" />
          {t('dashboard.order.view_details')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}