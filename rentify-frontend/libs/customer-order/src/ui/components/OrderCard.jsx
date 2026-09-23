import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { Package, CreditCard, Calendar, ArrowRight } from 'lucide-react';


const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success border-success/20';
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'processing':
      return 'bg-info/10 text-info border-info/20';
    case 'canceled':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
};

const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-success/10 text-success border-success/20';
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'failed':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
};

export const OrderCard = ({ order }) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
      onClick={() => navigate(`/order/${order.id}`)}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-foreground">Order #{order.orderNumber}</h3>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {order.createdDate}
            </div>
          </div>
          
          <Badge className={`${getStatusColor(order.status)} border capitalize font-medium`}>
            {order.status}
          </Badge>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-xl font-bold text-foreground">${order.totalAmount}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{order.paymentMethod}</span>
              <Badge className={`${getPaymentStatusColor(order.paymentStatus)} text-xs capitalize`}>
                {order.paymentStatus}
              </Badge>
            </div>
          </div>

          {/* Items Preview */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {order.items.slice(0, 4).map((item, index) => (
                <div key={item.id} className="relative">
                  <Avatar className="w-12 h-12 border-2 border-background shadow-md">
                    <AvatarImage src={item.image} alt={item.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {item.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {item.quantity > 1 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                      {item.quantity}
                    </div>
                  )}
                </div>
              ))}
              
              {order.items.length > 4 && (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-background shadow-md">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{order.items.length - 4}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Click to view details</span>
            <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all duration-300">
              <span>View Order</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;