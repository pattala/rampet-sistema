import React from 'react';
import { Plus, Package, Truck, CheckCircle, ClipboardList, ShoppingBag } from 'lucide-react';
import type { OrderStatus, UserRole, Order } from '../types';

interface MobileBottomNavProps {
  activeTab: OrderStatus | 'stats' | 'totales';
  setActiveTab: (tab: any) => void;
  role: UserRole;
  orders: Order[];
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab, role, orders }) => {
  const tabs = role === 'employee' 
    ? [
        { id: 'pending', label: 'Nuevo', icon: <Plus size={20} /> },
        { id: 'placed', label: 'Mis Pedidos', icon: <Package size={20} /> },
        { id: 'arriving', label: 'Entrega', icon: <Truck size={20} /> },
        { id: 'received', label: 'Historial', icon: <CheckCircle size={20} /> }
      ]
    : [
        { id: 'pending', label: 'Pedidos', icon: <Plus size={20} /> },
        { id: 'totales', label: 'Totales', icon: <ClipboardList size={20} /> },
        { id: 'bought', label: 'Compras', icon: <ShoppingBag size={20} /> },
        { id: 'arriving', label: 'Entrega', icon: <Truck size={20} /> },
        { id: 'received', label: 'Historial', icon: <CheckCircle size={20} /> }
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-card backdrop-blur-xl border-t border-glass-border z-50 px-2 pb-safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          // Notification dot logic (simplified for mobile nav)
          let hasNotification = false;
          if (role === 'admin' && tab.id === 'pending') {
            hasNotification = orders.some(o => o.items.some(i => i.status === 'placed'));
          } else if (role === 'employee') {
            if (tab.id === 'arriving') hasNotification = orders.some(o => o.items.some(i => i.status === 'bought'));
            if (tab.id === 'placed') hasNotification = orders.some(o => o.items.some(i => ['visto', 'en_curso', 'anulado'].includes(i.status)));
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all ${
                isActive ? 'text-primary' : 'text-muted'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {hasNotification && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-bg-dark animate-pulse-fast"></div>
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
