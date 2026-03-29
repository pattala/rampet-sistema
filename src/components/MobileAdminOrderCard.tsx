import React, { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, FileText, Barcode, Package, DollarSign, AlertCircle } from 'lucide-react';
import type { Order, OrderStatus, OrderItemStatus, OrderItem, Product } from '../types';

interface MobileAdminOrderCardProps {
  order: Order;
  totalCost: number;
  products: Product[];
  allOrders: Order[];
  onUpdateStatus: (id: string, s: OrderStatus, d?: string) => void;
  onUpdateItemStatus: (order: Order, itemId: string, s: OrderItemStatus, d?: string, n?: string, an?: string) => void;
  onBuyItem: (order: Order, item: OrderItem) => void;
  setDateModal: (val: any) => void;
  setTempDate: (val: string) => void;
  setNoteModal: (val: any) => void;
}

export const MobileAdminOrderCard: React.FC<MobileAdminOrderCardProps> = ({ 
  order, totalCost, products, allOrders, onUpdateStatus, onUpdateItemStatus, onBuyItem, setDateModal, setTempDate, setNoteModal
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="modern-order-card p-4 mb-6 animate-in hover:border-primary/30 transition-all border border-white/5 shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <div onClick={() => setIsExpanded(!isExpanded)} className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black text-white tracking-tighter">ORDEN #{order.order_number || order.id.slice(0, 8)}</span>
            {order.is_modified && (
              <span className="text-[7px] font-black bg-accent-warning/20 text-accent-warning border border-accent-warning/30 px-1.5 py-0.5 rounded-sm uppercase">MOD</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted font-black uppercase tracking-widest">
            <Clock size={12} className="text-primary" />
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-white leading-none">${totalCost.toLocaleString()}</div>
          <div className="text-[8px] text-primary font-black uppercase tracking-widest mt-1">{order.items.length} ÍTEMS TOTAL</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setIsExpanded(!isExpanded)} className="btn bg-white/5 border border-white/10 flex-1 py-1.5 text-[9px] gap-2 font-black uppercase">
          {isExpanded ? <><ChevronUp size={12} /> OCULTAR DETALLES</> : <><ChevronDown size={12} /> VER ARTÍCULOS</>}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 mb-4 animate-in">
          {order.items.map((item, idx) => {
            const product = products.find(p => p.id === item.product_id);
            const duplicates = allOrders.filter(o => 
              o.id !== order.id && 
              o.items.some(i => i.product_id === item.product_id && ['placed', 'visto', 'en_curso'].includes(i.status))
            );

            return (
              <div key={idx} className="bg-white/5 p-3 rounded-2xl border border-white/5 relative overflow-hidden group">
                {/* INDICADOR DE ESTADO LATERAL */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 item-status-${item.status}`}></div>
                
                <div className="flex justify-between items-start gap-4 mb-2 pl-2">
                  <div className="flex-1">
                    <span className="text-xs font-black text-white leading-tight block mb-1">{item.product_name}</span>
                    {product?.code && (
                      <div className="flex items-center gap-1 text-[9px] text-muted font-bold">
                        <Barcode size={10} /> REF: {product.code}
                      </div>
                    )}
                  </div>
                  <div className="qty-badge w-8 h-8 flex-shrink-0">
                    <span className="text-xs font-black">{item.quantity}</span>
                  </div>
                </div>

                {/* METADATOS (EQUIVALENTE A PC) */}
                <div className="grid grid-cols-2 gap-2 mb-3 pl-2">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                     <Package size={10} /> STOCK: {product?.stock ?? 'N/A'}
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                     <DollarSign size={10} /> COSTO: ${product?.cost ?? '0'}
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                     <DollarSign size={10} /> PVP: ${product?.price ?? '0'}
                   </div>
                   <div className={`item-status-badge py-1 px-2 min-h-0 text-[8px] rounded-md item-status-${item.status} font-black uppercase inline-block`}>
                      {item.status}
                   </div>
                </div>

                {/* ALERTA DE DUPLICADOS */}
                {duplicates.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl mb-3 flex items-start gap-2 ml-2">
                    <AlertCircle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[9px] font-bold text-amber-200 uppercase tracking-tighter">
                      También solicitado en: {duplicates.map(o => `#${o.order_number || o.id.slice(0, 4)}`).join(', ')}
                    </span>
                  </div>
                )}

                {item.admin_note && (
                  <div className="flex items-center gap-1.5 text-[9px] text-primary italic font-bold mb-3 pl-2">
                    <FileText size={10} /> {item.admin_note}
                  </div>
                )}
                
                {/* ACCIONES INDIVIDUALES */}
                <div className="flex gap-2 pt-3 border-t border-white/5 px-1">
                  <button 
                    onClick={() => onUpdateItemStatus(order, item.id, 'visto')}
                    className="btn bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-1 py-1.5 text-[8px] font-black uppercase"
                  >
                    Visto
                  </button>
                  <button 
                    onClick={() => {
                      setTempDate('');
                      setDateModal({
                        isOpen: true,
                        title: 'Programar Ítem',
                        onConfirm: (d: string) => onUpdateItemStatus(order, item.id, 'en_curso', d)
                      });
                    }}
                    className="btn bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-1 py-1.5 text-[8px] font-black uppercase"
                  >
                    Prog
                  </button>
                  <button 
                    onClick={() => onBuyItem(order, item)}
                    className="btn bg-accent-success/10 text-accent-success border border-accent-success/20 flex-1 py-1.5 text-[8px] font-black uppercase shadow-lg shadow-accent-success/10"
                  >
                    Compra
                  </button>
                  <button 
                    onClick={() => setNoteModal({ isOpen: true, order, itemId: item.id, status: item.status, title: 'Nota Ítem' })}
                    className="btn bg-white/5 text-muted border border-white/10 flex-1 py-1.5 text-[8px] font-black uppercase"
                  >
                    Nota
                  </button>
                </div>
              </div>
            );
          })}
          {order.notes && (
            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20 mt-2 mx-1">
              <span className="text-[8px] font-black text-primary uppercase block mb-1 tracking-widest">Nota Colaborador:</span>
              <p className="text-[10px] italic text-white/80 leading-relaxed">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* QUICK ACTIONS FOR ADMIN */}
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar px-1">
        {order.items.some(i => i.status === 'placed') && (
          <button 
            onClick={() => {
              order.items.forEach(i => {
                if (i.status === 'placed') onUpdateItemStatus(order, i.id, 'visto');
              });
            }}
            className="btn bg-blue-600/20 text-blue-400 border border-blue-600/30 py-3 px-6 text-[10px] font-black whitespace-nowrap shadow-xl"
          >
            MARCAR VISTO
          </button>
        )}
        {order.items.some(i => ['placed', 'visto', 'en_curso'].includes(i.status)) && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'bought')}
            className="btn btn-primary py-3 px-8 text-[10px] font-black whitespace-nowrap shadow-2xl scale-105"
          >
            COMPRAR TODO EL LOTE
          </button>
        )}
      </div>
    </div>
  );
};
