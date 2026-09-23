import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './Sidebar';

export function NavDocuments({ items, currentTab, onTabChange }) {
  return (
    <SidebarGroup>
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Documents
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                isActive={currentTab.path === item.path}
                onClick={() => onTabChange(item.path)}
              >
                {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                <span className="font-medium">{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
