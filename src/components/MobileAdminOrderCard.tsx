import React, { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { Order, OrderStatus, OrderItemStatus, OrderItem } from '../types';

interface MobileAdminOrderCardProps {
  order: Order;
  totalCost: number;
  onUpdateStatus: (id: string, s: OrderStatus, d?: string) => void;
  onUpdateItemStatus: (order: Order, itemId: string, s: OrderItemStatus, d?: string, n?: string, an?: string) => void;
  onBuyItem: (order: Order, item: OrderItem) => void;
  setDateModal: (val: any) => void;
  setTempDate: (val: string) => void;
  setNoteModal: (val: any) => void;
}

export const MobileAdminOrderCard: React.FC<MobileAdminOrderCardProps> = ({ 
  order, totalCost, onUpdateStatus, onUpdateItemStatus, onBuyItem, setDateModal, setTempDate, setNoteModal
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="modern-order-card p-4 mb-4 animate-in">
      <div className="flex justify-between items-start mb-4">
        <div onClick={() => setIsExpanded(!isExpanded)} className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black text-white">#{order.order_number || order.id.slice(0, 8)}</span>
            {order.is_modified && (
              <span className="text-[8px] font-bold bg-accent-warning/20 text-accent-warning border border-accent-warning/30 px-1.5 py-0.5 rounded-full uppercase">MOD</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-wider">
            <Clock size={12} className="text-primary" />
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-white">${totalCost.toLocaleString()}</div>
          <div className="text-[8px] text-muted font-black uppercase tracking-widest">{order.items.length} ÍTEMS</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {isExpanded ? (
          <button onClick={() => setIsExpanded(false)} className="btn btn-ghost flex-1 py-2 text-[10px] gap-2">
            <ChevronUp size={14} /> OCULTAR DETALLES
          </button>
        ) : (
          <button onClick={() => setIsExpanded(true)} className="btn btn-ghost flex-1 py-2 text-[10px] gap-2">
            <ChevronDown size={14} /> VER {order.items.length} ARTÍCULOS
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 mb-4 animate-in">
          {order.items.map((item, idx) => (
            <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-xs font-bold text-white/90 leading-tight">{item.product_name}</span>
                <div className="qty-badge w-8 h-8 min-h-[32px] flex-shrink-0">
                  <span className="text-xs font-black">{item.quantity}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`item-status-badge py-1 px-3 min-h-0 text-[9px] rounded-lg item-status-${item.status}`}>
                   {item.status.toUpperCase()}
                </span>
                {item.admin_note && (
                  <div className="flex items-center gap-1 text-[9px] text-primary italic font-bold">
                    <FileText size={10} /> {item.admin_note}
                  </div>
                )}
              </div>
              
              {/* ACCIONES INDIVIDUALES (EN VISTA EXPANDIDA) */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                <button 
                  onClick={() => onUpdateItemStatus(order, item.id, 'visto')}
                  className="btn bg-blue-500/10 text-blue-400 border border-blue-500/20 py-1.5 px-3 text-[8px] font-black uppercase"
                >
                  Visto
                </button>
                <button 
                  onClick={() => {
                    setTempDate('');
                    setDateModal({
                      isOpen: true,
                      title: 'Programar Item',
                      onConfirm: (d: string) => onUpdateItemStatus(order, item.id, 'en_curso', d)
                    });
                  }}
                  className="btn bg-amber-500/10 text-amber-400 border border-amber-500/20 py-1.5 px-3 text-[8px] font-black uppercase"
                >
                  Programar
                </button>
                <button 
                  onClick={() => onBuyItem(order, item)}
                  className="btn bg-accent-success/10 text-accent-success border border-accent-success/20 py-1.5 px-3 text-[8px] font-black uppercase"
                >
                  Comprar
                </button>
                <button 
                  onClick={() => setNoteModal({ isOpen: true, order, itemId: item.id, status: item.status, title: 'Nota p/ Ítem' })}
                  className="btn bg-white/5 text-muted border border-white/10 py-1.5 px-2 text-[8px] font-black uppercase"
                >
                  Nota
                </button>
              </div>
            </div>
          ))}
          {order.notes && (
            <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 mt-2">
              <span className="text-[9px] font-black text-primary uppercase block mb-1">Nota del Colaborador:</span>
              <p className="text-[11px] italic text-white/80">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* QUICK ACTIONS FOR ADMIN */}
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {order.items.some(i => i.status === 'placed') && (
          <button 
            onClick={() => {
              // Mark all as 'visto'
              order.items.forEach(i => {
                if (i.status === 'placed') onUpdateItemStatus(order, i.id, 'visto');
              });
            }}
            className="btn bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2 px-4 text-[9px] font-black whitespace-nowrap"
          >
            MARCAR VISTO
          </button>
        )}
        {order.items.some(i => ['placed', 'visto'].includes(i.status)) && (
          <button 
            onClick={() => {
              setTempDate('');
              setDateModal({
                isOpen: true,
                title: 'ENTREGA ESTIMADA',
                onConfirm: (date: string) => {
                  order.items.forEach(i => {
                    if (['placed', 'visto'].includes(i.status)) onUpdateItemStatus(order, i.id, 'en_curso', date);
                  });
                }
              });
            }}
            className="btn bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 px-4 text-[9px] font-black whitespace-nowrap"
          >
            EN CURSO
          </button>
        )}
        {order.items.some(i => ['placed', 'visto', 'en_curso'].includes(i.status)) && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'bought')}
            className="btn btn-primary py-2 px-4 text-[9px] font-black whitespace-nowrap"
          >
            COMPRAR TODO
          </button>
        )}
      </div>
    </div>
  );
};
