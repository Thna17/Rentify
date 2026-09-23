import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { Separator } from '@rentify/shared/ui/separator';
import { Badge } from '@rentify/shared/ui/badge';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { ScrollArea } from '@rentify/shared/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@rentify/shared/ui/tabs';
import {
  User,
  Settings,
  ShoppingBag,
  Heart,
  LogOut,
  LogIn,
  LayoutDashboard,
  ChevronRight,
  Star,
  Users,
  Package,
  BarChart3,
  CreditCard,
  MapPin,
  Calendar,
  MessageCircle,
  HelpCircle,
  Sparkles,
  Crown,
  UserPlus,
  Store,
  ClipboardList,
  TerminalSquare,
  Bell,
  Shield,
  Globe,
  TrendingUp,
  Zap,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Home,
  Smartphone,
  Tag,
  Truck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@rentify/storefront';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { DASHBOARD_URL } from '@rentify/shared/config/urls';

export const Profile = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { profile, handleLogout } = useAuth();
  const { t } = useTranslation();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = profile?.role === 'admin';
  const isMerchant = profile?.role === 'merchant' || profile?.role === 'user';
  const isCustomer = profile?.role === 'customer' ;

  // Enhanced menu items with unified styling
  const menuSections = {
    customer: [
      {
        icon: ShoppingBag,
        label: t('profile.menu.my_orders'),
        href: '/orders',
        description: t('profile.menu.my_orders_desc'),
        badge: '3',
        color: 'text-success',
        bgColor: 'bg-success/10',
        gradient: 'from-success/5 to-success/10',
      },
      {
        icon: Heart,
        label: t('profile.menu.wishlist'),
        href: '/wishlist',
        description: t('profile.menu.wishlist_desc'),
        badge: '12',
        color: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        gradient: 'from-pink-500/5 to-pink-500/10',
      },
      {
        icon: CreditCard,
        label: t('profile.menu.payment_methods'),
        href: '/payment-methods',
        description: t('profile.menu.payment_methods_desc'),
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        gradient: 'from-blue-500/5 to-blue-500/10',
      },
      {
        icon: MapPin,
        label: t('profile.menu.addresses'),
        href: '/addresses',
        description: t('profile.menu.addresses_desc'),
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        gradient: 'from-green-500/5 to-green-500/10',
      },
    ],
    merchant: [
      {
        icon: LayoutDashboard,
        label: t('profile.menu.dashboard'),
        href: `${DASHBOARD_URL}/overview`,
        description: t('profile.menu.dashboard_desc'),
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        gradient: 'from-primary/5 to-primary/10',
      },
      {
        icon: Package,
        label: t('profile.menu.products'),
        href: `${DASHBOARD_URL}/products`,
        description: t('profile.menu.products_desc'),
        badge: '24',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        gradient: 'from-emerald-500/5 to-emerald-500/10',
      },
      {
        icon: ClipboardList,
        label: t('profile.menu.orders'),
        href: `${DASHBOARD_URL}/orders`,
        description: t('profile.menu.orders_desc'),
        badge: '8',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        gradient: 'from-orange-500/5 to-orange-500/10',
      },
      {
        icon: Store,
        label: t('profile.menu.store_management'),
        href: `${DASHBOARD_URL}/store`,
        description: t('profile.menu.store_management_desc'),
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        gradient: 'from-purple-500/5 to-purple-500/10',
      },
      {
        icon: TerminalSquare,
        label: t('profile.menu.pos_interface'),
        href: `${DASHBOARD_URL}/pos`,
        description: t('profile.menu.pos_interface_desc'),
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        gradient: 'from-blue-500/5 to-blue-500/10',
      },
      {
        icon: TrendingUp,
        label: t('profile.menu.analytics'),
        href: `${DASHBOARD_URL}/analytics`,
        description: t('profile.menu.analytics_desc'),
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        gradient: 'from-amber-500/5 to-amber-500/10',
      },
    ],
    admin: [
      {
        icon: LayoutDashboard,
        label: t('profile.menu.dashboard'),
        href: '/admin/dashboard',
        description: t('profile.menu.dashboard_desc'),
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        gradient: 'from-primary/5 to-primary/10',
      },
      {
        icon: Users,
        label: t('profile.menu.user_management'),
        href: '/admin/users',
        description: t('profile.menu.user_management_desc'),
        badge: '42',
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-500/10',
        gradient: 'from-indigo-500/5 to-indigo-500/10',
      },
      {
        icon: Store,
        label: t('profile.menu.merchant_management'),
        href: '/admin/merchants',
        description: t('profile.menu.merchant_management_desc'),
        badge: '15',
        color: 'text-teal-500',
        bgColor: 'bg-teal-500/10',
        gradient: 'from-teal-500/5 to-teal-500/10',
      },
      {
        icon: Shield,
        label: t('profile.menu.system_settings'),
        href: '/admin/settings',
        description: t('profile.menu.system_settings_desc'),
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        gradient: 'from-gray-500/5 to-gray-500/10',
      },
      {
        icon: BarChart3,
        label: t('profile.menu.platform_analytics'),
        href: '/admin/analytics',
        description: t('profile.menu.platform_analytics_desc'),
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        gradient: 'from-purple-500/5 to-purple-500/10',
      },
    ],
  };

  // Quick stats for merchant dashboard
  const merchantStats = [
    { label: 'Today Sales', value: '$1,245', icon: DollarSign, change: '+12%', color: 'text-success' },
    { label: 'Pending Orders', value: '8', icon: Clock, change: '-2', color: 'text-warning' },
    { label: 'Total Products', value: '24', icon: Package, change: '+4', color: 'text-primary' },
    { label: 'Store Visits', value: '342', icon: TrendingUp, change: '+18%', color: 'text-blue-500' },
  ];

  // Recent activity
  const recentActivity = [
    { time: '2 min ago', action: 'New order #ORD-7890', user: 'Sophal Chan', status: 'pending' },
    { time: '1 hour ago', action: 'Product "Khmer Silk Scarf" updated', user: 'You', status: 'completed' },
    { time: '3 hours ago', action: 'Payment received', user: 'Vireak Bun', status: 'success' },
    { time: 'Yesterday', action: 'New customer registered', user: 'Srey Mom', status: 'new' },
  ];

  // Quick actions based on role
  const quickActions = {
    merchant: [
      { label: 'Add Product', icon: Package, href: `${DASHBOARD_URL}/products`, variant: 'primary' },
      { label: 'View Orders', icon: ShoppingBag, href: `${DASHBOARD_URL}/orders`, variant: 'outline' },
      { label: 'Store Settings', icon: Settings, href: `${DASHBOARD_URL}/store`, variant: 'outline' },
      { label: 'Quick POS', icon: Smartphone, href: `${DASHBOARD_URL}/pos`, variant: 'secondary' },
    ],
    customer: [
      { label: 'Browse Products', icon: ShoppingBag, href: '/products', variant: 'primary' },
      { label: 'Track Order', icon: Truck, href: '/orders/track', variant: 'outline' },
      { label: 'Support', icon: MessageCircle, href: '/support', variant: 'outline' },
    ],
    admin: [
      { label: 'System Health', icon: Shield, href: '/admin/system', variant: 'primary' },
      { label: 'User Reports', icon: FileText, href: '/admin/reports', variant: 'outline' },
      { label: 'Platform Settings', icon: Settings, href: '/admin/settings', variant: 'outline' },
    ],
  };

  const getCurrentMenu = () => {
    if (!profile) return [];
    if (isAdmin) return menuSections.admin;
    if (isMerchant) return menuSections.merchant;
    return menuSections.customer;
  };

  const getCurrentQuickActions = () => {
    if (!profile) return [];
    if (isAdmin) return quickActions.admin;
    if (isMerchant) return quickActions.merchant;
    return quickActions.customer;
  };

  const renderProfileHeader = () => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-background p-6 md:p-8">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
      
      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={profile?.profileImage} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
              {profile?.name ? getInitials(profile.name) : <User className="h-10 w-10" />}
            </AvatarFallback>
          </Avatar>
          
          {profile && (
            <div className="absolute bottom-2 right-2 w-6 h-6 bg-success rounded-full border-2 border-background flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          )}
          
          {(isAdmin || isMerchant) && (
            <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full border-2 border-background shadow-lg flex items-center justify-center">
              {isAdmin ? (
                <Crown className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Store className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {profile?.name || t('profile.guest_welcome')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {profile?.email || t('profile.sign_in_prompt')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {profile?.role && (
       <Badge variant="subtle">
  <Star className="w-3.5 h-3.5 text-primary" />
  {isAdmin
    ? t("profile.roles.admin")
    : isMerchant
    ? t("profile.roles.merchant")
    : t("profile.roles.customer")}
</Badge>
            )}
            
            {isMerchant && (
              <>
                <Badge variant="outline" className="px-3 py-1.5">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-success" />
                  Verified Seller
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  4.8 Rating
                </Badge>
              </>
            )}
          </div>
        </div>

        {profile && (
          <div className="flex gap-3">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {merchantStats.map((stat, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className={`text-xs font-medium ${stat.color} mt-1`}>{stat.change}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.color.replace('text-', 'bg-')}/10`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMenuItems = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {getCurrentMenu().map((item, index) => {
        const isExternal = item.href.startsWith('http');
        const cardContent = (
          <Card className="border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`relative p-3 rounded-xl bg-gradient-to-br ${item.gradient} group-hover:scale-110 transition-transform duration-300`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
                    <item.icon className={`h-5 w-5 relative z-10 ${item.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.badge && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

        return isExternal ? (
          <a key={index} href={item.href} className="block no-underline">
            {cardContent}
          </a>
        ) : (
          <Link key={index} to={item.href} className="block no-underline">
            {cardContent}
          </Link>
        );
      })}
    </div>
  );

  const renderQuickActions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <Zap className="h-5 w-5 text-amber-500" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {getCurrentQuickActions().map((action, index) => {
          const isExternal = action.href.startsWith('http');
          const actionContent = (
            <>
              <action.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </>
          );
          return (
            <Button
              key={index}
              variant={action.variant as any}
              className="h-auto py-3 px-4 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              asChild
            >
              {isExternal ? (
                <a href={action.href}>
                  {actionContent}
                </a>
              ) : (
                <Link to={action.href}>
                  {actionContent}
                </Link>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderRecentActivity = () => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                <p className="text-xs text-muted-foreground">by {activity.user} • {activity.time}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {activity.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderGuestContent = () => (
    <div className="space-y-6">
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Join Our Community
          </h3>
          <p className="text-muted-foreground mb-6">
            Sign in to manage your orders, save products, and get personalized recommendations
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" asChild>
              <Link to="/signin">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <Link to="/signup">
                <UserPlus className="h-4 w-4" />
                Create Account
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <ShoppingBag className="h-8 w-8 text-primary mb-3" />
            <h4 className="font-semibold text-foreground mb-2">Browse Products</h4>
            <p className="text-sm text-muted-foreground">Discover amazing local products from Cambodian SMEs</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gradient-to-br from-success/5 to-success/10">
          <CardContent className="p-6">
            <Store className="h-8 w-8 text-success mb-3" />
            <h4 className="font-semibold text-foreground mb-2">Shop Local</h4>
            <p className="text-sm text-muted-foreground">Support Cambodian businesses and communities</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-6">
            <Sparkles className="h-8 w-8 text-amber-500 mb-3" />
            <h4 className="font-semibold text-foreground mb-2">Easy Shopping</h4>
            <p className="text-sm text-muted-foreground">Simple, secure, and fast checkout experience</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <ScrollArea className="h-screen">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          {/* Profile Header */}
          {renderProfileHeader()}

          {/* Tabs Navigation */}
          {profile && (
            <div className="mt-8">
              <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start border-b border-border/50 bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                  >
                    Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-6">
                  {/* Stats Dashboard for Merchants */}
                  {isMerchant && renderStats()}

                  {/* Quick Actions */}
                  {renderQuickActions()}

                  {/* Menu Items Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground">Management</h2>
                      <span className="text-sm text-muted-foreground">
                        {getCurrentMenu().length} sections
                      </span>
                    </div>
                    {renderMenuItems()}
                  </div>

                  {/* Recent Activity */}
                  {isMerchant && renderRecentActivity()}
                </TabsContent>

                <TabsContent value="activity" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">All Activity</h3>
                      {/* Activity timeline component would go here */}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
                      {/* Settings form would go here */}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Guest Content */}
          {!profile && (
            <div className="mt-8">
              {renderGuestContent()}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-border/50">
            {profile ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Last login: Today at 14:30 • Session active
                </div>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive hover:border-destructive/30"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>Available in Cambodia • English</span>
                </div>
              </div>
            )}
          </div>

          {/* App Version */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <Shield className="h-3 w-3" />
              <span>Secure • Version 2.4.1 • © 2024 HelpCambodianSME</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Profile;
