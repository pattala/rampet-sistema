import React from 'react';
import { ShoppingBag, X, Minus, Plus, Trash2, FileText } from 'lucide-react';
import type { OrderItem, Product } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: OrderItem[];
  products: Product[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  orderNotes: string;
  onOrderNotesChange: (s: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  editingOrderId: string | null;
  onCancelEdit: () => void;
}

export const MobileCartDrawer: React.FC<MobileCartDrawerProps> = ({
  isOpen, onClose, cart, products, onUpdateQuantity, onRemove, 
  orderNotes, onOrderNotesChange, onSubmit, isSubmitting, 
  editingOrderId, onCancelEdit
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ translateY: '100%' }} 
            animate={{ translateY: 0 }} 
            exit={{ translateY: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-bg-dark border-t border-glass-border rounded-t-[32px] z-[70] flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl text-primary">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Tu Pedido</h3>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{cart.length} artículos seleccionados</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted font-bold uppercase tracking-widest text-sm">El carrito está vacío</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{item.product_name}</div>
                        <div className="text-[10px] text-muted mt-1 font-mono uppercase">
                          {item.product_id.startsWith('manual-') ? 'Producto Manual' : `REF: ${products.find(p => p.id === item.product_id)?.code || 'N/A'}`}
                        </div>
                      </div>
                      <button onClick={() => onRemove(item.id)} className="text-red-400 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 bg-black/20 p-1 rounded-xl border border-white/5">
                        <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-white"><Minus size={14} /></button>
                        <span className="text-sm font-black text-primary min-w-[20px] text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-white"><Plus size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="pt-4 space-y-3">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2 px-1">
                  <FileText size={12} /> Notas adicionales
                </label>
                <textarea 
                  className="input-field h-24 text-sm resize-none"
                  placeholder="Detalles del pedido..."
                  value={orderNotes}
                  onChange={(e) => onOrderNotesChange(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 bg-white/[0.02] border-t border-white/5 pb-10">
              <button 
                onClick={onSubmit}
                disabled={isSubmitting || cart.length === 0}
                className={`btn w-full py-4 text-sm font-black tracking-widest uppercase ${editingOrderId ? 'bg-accent-warning text-white' : 'btn-primary'} shadow-lg shadow-primary/20`}
              >
                {isSubmitting ? 'Procesando...' : editingOrderId ? 'Guardar Cambios' : 'Confirmar Pedido'}
              </button>
              {editingOrderId && (
                <button 
                  onClick={onCancelEdit}
                  className="w-full mt-4 text-[10px] font-bold text-red-400 uppercase tracking-widest text-center"
                >
                  Descartar Edición
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
