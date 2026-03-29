import React, { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, Barcode, AlertCircle, MoreHorizontal, Check, Calendar, ShoppingCart, Trash2, Edit3 } from 'lucide-react';
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <div className="modern-order-card p-4 mb-6 animate-in border border-white/10 shadow-2xl relative overflow-visible">
      {/* CABECERA DE ORDEN */}
      <div className="flex justify-between items-start mb-4">
        <div onClick={() => setIsExpanded(!isExpanded)} className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black text-primary tracking-tighter">#{order.order_number || order.id.slice(0, 8)}</span>
            {order.is_modified && (
              <span className="text-[7px] font-black bg-accent-warning text-black px-1.5 py-0.5 rounded-sm uppercase">MODIFICADA</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted font-bold">
            <Clock size={12} className="text-primary" />
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-white leading-none">${totalCost.toLocaleString()}</div>
          <div className="text-[8px] text-primary font-black uppercase tracking-widest mt-1">TOTAL INVERSIÓN</div>
        </div>
      </div>

      {/* BOTÓN COLAPSO */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="w-full bg-white/5 border border-white/10 py-2 rounded-xl text-[9px] font-black uppercase mb-4 flex items-center justify-center gap-2"
      >
        {isExpanded ? <><ChevronUp size={14} /> OCULTAR DETALLES</> : <><ChevronDown size={14} /> VER ARTÍCULOS</>}
      </button>

      {isExpanded && (
        <div className="space-y-4 mb-4">
          {order.items.map((item, idx) => {
            const product = products.find(p => p.id === item.product_id);
            const duplicates = allOrders.filter(o => 
              o.id !== order.id && 
              o.items.some(i => i.product_id === item.product_id && ['placed', 'visto', 'en_curso'].includes(i.status))
            );
            const isMenuOpen = activeMenu === `${order.id}-${item.id}`;

            return (
              <div key={idx} className="bg-white/5 p-4 rounded-3xl border border-white/10 relative shadow-lg">
                <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full item-status-${item.status}`}></div>
                
                {/* FILA SUPERIOR: NOMBRE Y CANTIDAD */}
                <div className="flex justify-between items-start gap-2 mb-3 pl-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-black text-white leading-tight uppercase tracking-tight">{item.product_name}</span>
                      <div className="bg-primary text-black font-black text-[12px] px-2 py-0.5 rounded-lg shadow-lg">
                        X{item.quantity}
                      </div>
                    </div>
                    {product?.code && (
                      <div className="flex items-center gap-1 text-[10px] text-muted font-bold mt-1">
                        <Barcode size={10} /> {product.code}
                      </div>
                    )}
                  </div>
                  
                  {/* BOTÓN DE ACCIONES ÚNICO */}
                  <button 
                    onClick={() => setActiveMenu(isMenuOpen ? null : `${order.id}-${item.id}`)}
                    className={`p-3 rounded-2xl transition-all ${isMenuOpen ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* MENÚ DE ACCIONES (ESTILO DRAWER) */}
                {isMenuOpen && (
                  <div className="absolute inset-0 bg-[#0f172a] z-50 rounded-3xl p-4 flex flex-col gap-2 animate-in slide-in-from-bottom shadow-2xl overflow-y-auto">
                    <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
                       <span className="text-[10px] font-black text-primary uppercase">Opciones para Ítem</span>
                       <button onClick={() => setActiveMenu(null)} className="text-white bg-white/10 p-1.5 rounded-full"><ChevronDown size={14}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { onUpdateItemStatus(order, item.id, 'visto'); setActiveMenu(null); }} className="btn btn-vivid-blue flex flex-col items-center py-3 rounded-2xl gap-1">
                        <Check size={18} /><span className="text-[10px] font-black">VISTO</span>
                      </button>
                      <button onClick={() => { 
                        setTempDate('');
                        setDateModal({
                          isOpen: true,
                          title: 'PROGRAMAR FECHA',
                          onConfirm: (d: string) => onUpdateItemStatus(order, item.id, 'en_curso', d)
                        });
                        setActiveMenu(null); 
                      }} className="btn btn-vivid-amber flex flex-col items-center py-3 rounded-2xl gap-1">
                        <Calendar size={18} /><span className="text-[10px] font-black">PROGRAMAR</span>
                      </button>
                      <button onClick={() => { onBuyItem(order, item); setActiveMenu(null); }} className="btn btn-vivid-green flex flex-col items-center py-3 rounded-2xl gap-1">
                        <ShoppingCart size={18} /><span className="text-[10px] font-black">COMPRA</span>
                      </button>
                      <button onClick={() => { onUpdateItemStatus(order, item.id, 'anulado'); setActiveMenu(null); }} className="btn btn-vivid-red flex flex-col items-center py-3 rounded-2xl gap-1">
                        <Trash2 size={18} /><span className="text-[10px] font-black">ANULAR</span>
                      </button>
                    </div>
                    <button onClick={() => { setNoteModal({ isOpen: true, order, itemId: item.id, status: item.status, title: 'Nota Ítem' }); setActiveMenu(null); }} className="bg-white/10 text-white py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                      <Edit3 size={16} /> AGREGAR NOTA AL ÍTEM
                    </button>
                  </div>
                )}

                {/* METADATOS (EQUIVALENTE PC) */}
                <div className="grid grid-cols-2 gap-3 mb-4 pl-3">
                   <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5">
                     <span className="text-[8px] font-black text-emerald-400 block mb-1">STOCK</span>
                     <span className="text-[13px] font-black text-white">{product?.stock ?? '0'}</span>
                   </div>
                   <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5">
                     <span className="text-[8px] font-black text-amber-400 block mb-1">COSTO</span>
                     <span className="text-[13px] font-black text-white">${product?.cost ?? '0'}</span>
                   </div>
                   <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5">
                     <span className="text-[8px] font-black text-primary block mb-1">PVP</span>
                     <span className="text-[13px] font-black text-white">${product?.price ?? '0'}</span>
                   </div>
                   <div className={`p-2.5 rounded-2xl border border-white/5 flex flex-col item-status-${item.status} bg-opacity-10`}>
                     <span className="text-[8px] font-black opacity-60">ESTADO</span>
                     <span className="text-[10px] font-black">{item.status.toUpperCase()}</span>
                   </div>
                </div>

                {/* AVISO DE DUPLICADOS (SOLIDO) */}
                {duplicates.length > 0 && (
                  <div className="bg-[#fbbf24] p-3 rounded-2xl mb-4 ml-3 shadow-xl">
                    <div className="flex items-center gap-2">
                       <AlertCircle size={16} className="text-black" />
                       <span className="text-[10px] font-black text-black leading-none py-1">SOLICITADO EN OTROS PEDIDOS:</span>
                    </div>
                    <div className="text-[12px] font-black text-black ml-6 mt-1 underline">
                       {duplicates.map(o => `#${o.order_number || o.id.slice(0, 4)}`).join(', ')}
                    </div>
                  </div>
                )}

                {item.admin_note && (
                  <div className="bg-primary/5 p-3 rounded-[1.5rem] border border-primary/20 flex gap-3 ml-3">
                    <Edit3 size={14} className="text-primary shrink-0" />
                    <span className="text-[11px] text-white/90 leading-tight italic">{item.admin_note}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK ACTIONS FOR ADMIN */}
      {order.items.some(i => ['placed', 'visto', 'en_curso'].includes(i.status)) && (
        <div className="pt-2">
           <button 
             onClick={() => onUpdateStatus(order.id, 'bought')}
             className="w-full btn btn-vivid-green py-4 rounded-2xl text-[11px] font-black uppercase shadow-2xl flex items-center justify-center gap-3"
           >
             <ShoppingCart size={20} /> COMPRAR TODO EL LOTE
           </button>
        </div>
      )}
    </div>
  );
};
