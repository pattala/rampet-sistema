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
              <div key={idx} className="bg-white/5 p-4 rounded-3xl border border-white/10 relative overflow-hidden group shadow-xl">
                {/* INDICADOR DE ESTADO LATERAL */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 item-status-${item.status}`}></div>
                
                <div className="flex justify-between items-start gap-2 mb-3 pl-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-white leading-tight uppercase">{item.product_name}</span>
                      <div className="qty-badge-compact flex-shrink-0">
                        {item.quantity}
                      </div>
                    </div>
                    {product?.code && (
                      <div className="flex items-center gap-1 text-[10px] text-primary/80 font-black mt-1">
                        <Barcode size={10} /> {product.code}
                      </div>
                    )}
                  </div>
                </div>

                {/* METADATOS (GRILLA 2x2) */}
                <div className="grid grid-cols-2 gap-2 mb-4 pl-2">
                   <div className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-xl">
                     <div className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1">
                       <Package size={10} /> STOCK
                     </div>
                     <div className="text-[11px] font-black text-white">{product?.stock ?? '0'}</div>
                   </div>
                   <div className="bg-amber-500/5 border border-amber-500/10 p-2 rounded-xl">
                     <div className="text-[8px] font-black text-amber-500 uppercase flex items-center gap-1">
                       <DollarSign size={10} /> COSTO
                     </div>
                     <div className="text-[11px] font-black text-white">${product?.cost ?? '0'}</div>
                   </div>
                   <div className="bg-primary/5 border border-primary/10 p-2 rounded-xl">
                     <div className="text-[8px] font-black text-primary uppercase flex items-center gap-1">
                       <DollarSign size={10} /> PVP
                     </div>
                     <div className="text-[11px] font-black text-white">${product?.price ?? '0'}</div>
                   </div>
                   <div className={`p-2 rounded-xl border flex flex-col justify-center item-status-${item.status} bg-opacity-10`}>
                     <div className="text-[8px] font-black uppercase opacity-60">ESTADO</div>
                     <div className="text-[9px] font-black uppercase">{item.status}</div>
                   </div>
                </div>

                {/* ALERTA DE DUPLICADOS (FLAMANTE AMARILLO) */}
                {duplicates.length > 0 && (
                  <div className="bg-[#fbbf24] p-2.5 rounded-xl mb-4 flex items-start gap-2 ml-2 shadow-lg animate-pulse">
                    <AlertCircle size={14} className="text-black shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-black text-black uppercase block leading-none mb-0.5">PRODUCTO REPETIDO EN:</span>
                      <span className="text-[10px] font-black text-black">
                        {duplicates.map(o => `#${o.order_number || o.id.slice(0, 4)}`).join(', ')}
                      </span>
                    </div>
                  </div>
                )}

                {item.admin_note && (
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 mb-4 flex items-start gap-2 ml-2">
                    <FileText size={12} className="text-primary shrink-0" />
                    <span className="text-[10px] italic text-white/90 leading-tight font-medium">{item.admin_note}</span>
                  </div>
                )}
                
                {/* ACCIONES INDIVIDUALES (VIVID BUTTONS) */}
                <div className="flex flex-wrap gap-2 pt-1 px-1">
                  <button 
                    onClick={() => onUpdateItemStatus(order, item.id, 'visto')}
                    className="btn btn-vivid-blue flex-1 py-2 text-[9px] font-black uppercase"
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
                    className="btn btn-vivid-amber flex-1 py-2 text-[9px] font-black uppercase"
                  >
                    Prog
                  </button>
                  <button 
                    onClick={() => onBuyItem(order, item)}
                    className="btn btn-vivid-green flex-1 py-2 text-[9px] font-black uppercase"
                  >
                    Compra
                  </button>
                  <button 
                    onClick={() => onUpdateItemStatus(order, item.id, 'anulado')}
                    className="btn btn-vivid-red flex-1 py-2 text-[9px] font-black uppercase"
                  >
                    Anular
                  </button>
                  <button 
                    onClick={() => setNoteModal({ isOpen: true, order, itemId: item.id, status: item.status, title: 'Nota Ítem' })}
                    className="btn bg-white/10 text-white border border-white/20 px-3 py-2 text-[9px] font-black uppercase rounded-lg"
                  >
                    ...
                  </button>
                </div>
              </div>
            );
          })}
          {order.notes && (
            <div className="bg-primary/10 p-4 rounded-[2rem] border border-primary/30 mt-4 mx-1">
              <span className="text-[9px] font-black text-primary uppercase block mb-1 tracking-widest flex items-center gap-1.5">
                <AlertCircle size={10} /> NOTA COLABORADOR:
              </span>
              <p className="text-[11px] italic text-white leading-relaxed font-medium">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* QUICK ACTIONS FOR ADMIN */}
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar px-1 mt-2">
        {order.items.some(i => i.status === 'placed') && (
          <button 
            onClick={() => {
              order.items.forEach(i => {
                if (i.status === 'placed') onUpdateItemStatus(order, i.id, 'visto');
              });
            }}
            className="btn btn-vivid-blue py-3.5 px-6 text-[10px] font-black whitespace-nowrap"
          >
            MARCAR VISTO
          </button>
        )}
        {order.items.some(i => ['placed', 'visto', 'en_curso'].includes(i.status)) && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'bought')}
            className="btn btn-vivid-green py-3.5 px-8 text-[11px] font-black whitespace-nowrap shadow-2xl"
          >
            COMPRAR TODO EL LOTE
          </button>
        )}
      </div>
    </div>
  );
};
