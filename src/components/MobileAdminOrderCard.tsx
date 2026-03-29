import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Barcode, AlertCircle, Check, Calendar, ShoppingCart, Trash2, Edit3 } from 'lucide-react';
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
  order, products, allOrders, onUpdateStatus, onUpdateItemStatus, onBuyItem, setDateModal, setTempDate, setNoteModal
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="modern-order-card p-4 mb-6 animate-in border border-white/10 shadow-2xl relative overflow-visible bg-slate-900/40 backdrop-blur-xl">
      {/* CABECERA DE ORDEN SIMPLIFICADA */}
      <div className="flex justify-between items-center mb-4">
        <div onClick={() => setIsExpanded(!isExpanded)} className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted font-bold">{new Date(order.created_at).toLocaleDateString()}</span>
            <span className="text-sm font-black text-primary tracking-tighter">ORDEN #{order.order_number || order.id.slice(0, 8)}</span>
            {order.is_modified && (
              <span className="text-[7px] font-black bg-accent-warning text-black px-1.5 py-0.5 rounded-sm uppercase">MOD</span>
            )}
          </div>
        </div>
      </div>

      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="w-full bg-white/5 border border-white/10 py-3 rounded-2xl text-[10px] font-black uppercase mb-6 flex items-center justify-center gap-2 shadow-inner"
      >
        {isExpanded ? <><ChevronUp size={16} /> OCULTAR DETALLES</> : <><ChevronDown size={16} /> VER ARTÍCULOS</>}
      </button>

      {isExpanded && (
        <div className="space-y-6 mb-6">
          {order.items.map((item, idx) => {
            const product = products.find(p => p.id === item.product_id);
            const duplicates = allOrders.filter(o => 
              o.id !== order.id && 
              o.items.some(i => i.product_id === item.product_id && ['placed', 'visto', 'en_curso'].includes(i.status))
            );

            return (
              <div key={idx} className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 relative shadow-2xl overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-2 item-status-${item.status} opacity-80`}></div>
                
                {/* FILA SUPERIOR: NOMBRE Y CANTIDAD ILUMINADA */}
                <div className="flex justify-between items-center gap-4 mb-5 pl-2">
                  <div className="flex-1">
                    <span className="text-[15px] font-black text-white leading-snug uppercase tracking-tight block">{item.product_name}</span>
                    {product?.code && (
                      <div className="flex items-center gap-1.5 text-[11px] text-primary/70 font-black mt-2">
                        <Barcode size={12} /> REF: {product.code}
                      </div>
                    )}
                  </div>
                  <div className="qty-illuminated flex-shrink-0 scale-110 mr-1">
                    {item.quantity}
                  </div>
                </div>

                {/* METADATOS TIPO LISTA PROFESIONAL */}
                <div className="bg-white/5 rounded-3xl p-4 mb-5 border border-white/5 ml-2 space-y-3">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                     <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Stock Disponible</span>
                     <span className="text-sm font-black text-white">{product?.stock ?? '0'} UNIDADES</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                     <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Costo Unitario</span>
                     <span className="text-sm font-black text-white">${product?.cost ?? '0'}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                     <span className="text-[9px] font-black text-primary uppercase tracking-widest">PVP Sugerido</span>
                     <span className="text-sm font-black text-white">${product?.price ?? '0'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[9px] font-black text-muted uppercase tracking-widest">Estado Actual</span>
                     <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg item-status-${item.status}`}>{item.status}</span>
                   </div>
                </div>

                {/* ALERTA DE DUPLICADOS (COMO EN PC) */}
                {duplicates.length > 0 && (
                  <div className="bg-[#fbbf24] p-4 rounded-xl mb-5 ml-2 shadow-xl flex items-start gap-3 border-l-4 border-black">
                     <AlertCircle size={20} className="text-black shrink-0 mt-0.5" />
                     <div className="flex-1">
                        <span className="text-[11px] font-black text-black uppercase block leading-none mb-1">PRODUCTO REPETIDO EN OTROS PEDIDOS:</span>
                        <div className="flex flex-wrap gap-1">
                           {duplicates.map((o, index) => (
                             <span key={index} className="text-[14px] font-black text-black underline">
                               #{o.order_number || o.id.slice(0, 4)}{index < duplicates.length - 1 ? ',' : ''}
                             </span>
                           ))}
                        </div>
                     </div>
                  </div>
                )}

                {item.admin_note && (
                  <div className="bg-primary/10 p-4 rounded-2xl border border-primary/30 flex gap-3 ml-2 mb-5">
                    <Edit3 size={16} className="text-primary shrink-0" />
                    <span className="text-[12px] text-white leading-relaxed italic font-medium">{item.admin_note}</span>
                  </div>
                )}
                
                {/* GRILLA DE ACCIONES DIRECTAS 2x2 (HORIZONTALES) */}
                <div className="grid grid-cols-2 gap-3 pt-2 ml-2">
                  <button 
                    onClick={() => onUpdateItemStatus(order, item.id, 'visto')}
                    className="btn btn-vivid-blue flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg"
                  >
                    <Check size={16} /> VISTO
                  </button>
                  <button 
                    onClick={() => {
                      setTempDate('');
                      setDateModal({
                        isOpen: true,
                        title: 'PROGRAMAR ÍTEM',
                        onConfirm: (d: string) => onUpdateItemStatus(order, item.id, 'en_curso', d)
                      });
                    }}
                    className="btn btn-vivid-amber flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg"
                  >
                    <Calendar size={16} /> PROG.
                  </button>
                  <button 
                    onClick={() => onBuyItem(order, item)}
                    className="btn btn-vivid-green flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg"
                  >
                    <ShoppingCart size={16} /> COMPRA
                  </button>
                  <button 
                    onClick={() => onUpdateItemStatus(order, item.id, 'anulado')}
                    className="btn btn-vivid-red flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg"
                  >
                    <Trash2 size={16} /> ANULAR
                  </button>
                  <button 
                    onClick={() => setNoteModal({ isOpen: true, order, itemId: item.id, status: item.status, title: 'Nota Ítem' })}
                    className="col-span-2 bg-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-3 border border-white/20 mt-1"
                  >
                    <Edit3 size={16} /> NOTA AL ÍTEM
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK ACTIONS FOR ADMIN */}
      {order.items.some(i => ['placed', 'visto', 'en_curso'].includes(i.status)) && (
        <div className="pt-4 mt-2">
           <button 
             onClick={() => onUpdateStatus(order.id, 'bought')}
             className="w-full btn btn-vivid-green py-5 rounded-3xl text-[12px] font-black uppercase shadow-[0_0_30px_rgba(5,150,105,0.4)] flex items-center justify-center gap-4 active:scale-95 transition-all"
           >
             <ShoppingCart size={24} /> COMPRAR TODO EL LOTE
           </button>
        </div>
      )}
    </div>
  );
};
