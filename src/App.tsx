import React, { useState, useEffect } from 'react';
import { ShoppingBag, LayoutDashboard, Truck, Search, Trash2, Plus, Minus, LogOut, BarChart2, FileUp, CheckCircle, Clock, ChevronDown, Package, Edit2, XCircle, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import type { Order, Product, UserRole, OrderStatus, OrderItem, OrderItemStatus } from './types';
import { AuthScreen } from './components/AuthScreen';
import { useIsMobile } from './hooks/useIsMobile';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileCartDrawer } from './components/MobileCartDrawer';
import { MobileAdminOrderCard } from './components/MobileAdminOrderCard';


const App: React.FC = () => {
  const [authRole, setAuthRole] = useState<UserRole | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const hookIsMobile = useIsMobile(1280);
  const isMobile = hookIsMobile || (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'stats' | 'totales'>(() => {
    const saved = localStorage.getItem('vidal_active_tab');
    return (saved as OrderStatus | 'stats' | 'totales') || 'pending';
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateModal, setDateModal] = useState<{
    isOpen: boolean;
    title: string;
    onConfirm: (date: string) => void;
  }>({ isOpen: false, title: '', onConfirm: () => {} });
  const [tempDate, setTempDate] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: string | null }>({ isOpen: false, orderId: null });
  const [cancelItemModal, setCancelItemModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    itemId: string | null;
    note: string;
  }>({ isOpen: false, order: null, itemId: null, note: '' });
  const [systemModal, setSystemModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });
  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    itemId: string | null;
    status: OrderItemStatus | null;
    title: string;
    estimatedDate?: string;
  }>({ isOpen: false, order: null, itemId: null, status: null, title: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tempNote, setTempNote] = useState('');
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    return localStorage.getItem('vidal_haptics') !== 'false';
  });

  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    if (isMobile) {
      document.documentElement.classList.add('is-mobile');
    } else {
      document.documentElement.classList.remove('is-mobile');
    }
  }, [isMobile]);

  useEffect(() => {
    if (role) {
      localStorage.setItem('vidal_role', role);
    } else {
      localStorage.removeItem('vidal_role');
    }
  }, [role]);

  useEffect(() => {
    localStorage.setItem('vidal_haptics', String(hapticsEnabled));
  }, [hapticsEnabled]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const metadataRole = session.user?.user_metadata?.role || 'employee';
        setAuthRole(metadataRole);
        if (metadataRole !== 'admin') {
          setRole('employee');
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const metadataRole = session.user?.user_metadata?.role || 'employee';
        setAuthRole(metadataRole);
        if (metadataRole !== 'admin') {
          setRole('employee');
        }
      } else {
        setAuthRole(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('vidal_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      const { data: pData } = await supabase.from('products').select('*');
      const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (pData) {
        setProducts(pData.filter(p => p.name && p.name !== 'Producto sin nombre'));
      }
      if (oData) setOrders(oData);
    };
    fetchData();

    if (supabase) {
      const channel = supabase
        .channel('orders_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
          }
        })
        .subscribe();
      return () => { if (supabase) supabase.removeChannel(channel); };
    }
  }, []);


  const handleClearProducts = async () => {
    setSystemModal({
      isOpen: true,
      type: 'confirm',
      title: 'Limpiar Catálogo',
      message: '¿Estás seguro de que quieres borrar TODOS los productos?',
      confirmText: 'Sí, Borrar Todo',
      onConfirm: async () => {
        try {
          if (!supabase) return;
          const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) {
            console.error('Error clearing products:', error);
            setSystemModal({ isOpen: true, type: 'alert', title: 'Error', message: 'Error al limpiar el catálogo: ' + error.message });
          } else {
            setProducts([]);
            setSystemModal({ isOpen: true, type: 'alert', title: 'Éxito', message: 'Catálogo limpiado exitosamente.' });
          }
        } catch (err) {
          console.error('Error clearing products:', err);
          setSystemModal({ isOpen: true, type: 'alert', title: 'Error', message: 'Error inesperado al limpiar el catálogo.' });
        }
      }
    });
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus, arrivalDate?: string) => {
    triggerHaptic(20);
    const order = orders.find(o => o.id === id);
    if (!order) return;

    let updatedItems = [...order.items];
    if (status === 'bought') {
      updatedItems = order.items.map(i => ({ ...i, status: 'bought' as const }));
    } else if (status === 'received') {
      updatedItems = order.items.map(i => ({ ...i, status: 'received' as const }));
    }

    if (supabase) {
      const { error } = await supabase.from('orders').update({ 
        status, 
        arrival_date: arrivalDate,
        items: updatedItems
      }).eq('id', id);
      if (error) console.error('Error updating status:', error);
    }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, arrival_date: arrivalDate, items: updatedItems } : o));
  };

  const addToCart = (product: Product) => {
    triggerHaptic(10);
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { 
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price || 0,
        status: 'placed' as const
      }];
    });
  };

  const addManualToCart = (name: string, quantity: number) => {
    triggerHaptic(15);
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      product_id: `manual-${crypto.randomUUID()}`,
      product_name: name,
      quantity: quantity,
      price: 0,
      status: 'placed' as const
    }]);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    triggerHaptic([30, 50, 30]);
    setIsSubmitting(true);
    
    if (editingOrderId) {
      if (supabase) {
        const { error } = await supabase.from('orders').update({ 
          items: [...cart], 
          notes: orderNotes,
          is_modified: true 
        }).eq('id', editingOrderId);
        if (error) {
          console.error('Error updating order:', error);
          setSystemModal({ isOpen: true, type: 'alert', title: 'Error de Red', message: 'Error al guardar cambios en la nube: ' + error.message });
          setIsSubmitting(false);
          return;
        }
      }
      setOrders(prev => prev.map(o => o.id === editingOrderId ? { ...o, items: [...cart], notes: orderNotes, is_modified: true } : o));
      setEditingOrderId(null);
    } else {
      const nextNum = orders.length > 0 ? Math.max(...orders.map(o => o.order_number || 0), 999) + 1 : 1000;
      const newOrder: Order = {
        id: crypto.randomUUID(),
        order_number: nextNum,
        created_at: new Date().toISOString(),
        employee_id: '00000000-0000-0000-0000-000000000001',
        status: 'pending',
        items: cart.map(item => ({ ...item, status: item.status || 'placed' })),
        is_bought: false,
        notes: orderNotes
      };

      if (supabase) {
        const { error } = await supabase.from('orders').insert([newOrder]);
        if (error) {
          console.error('Error saving order:', error);
          setSystemModal({ isOpen: true, type: 'alert', title: 'Error de Red', message: 'Error crítico: El pedido NO se guardó en la base de datos. Verifique su conexión.' });
          setIsSubmitting(false);
          return;
        }
      }
      setOrders(prev => [newOrder, ...prev]);
    }

    setCart([]);
    setOrderNotes('');
    setIsSubmitting(false);
  };

  const handleBuyItem = async (order: Order, item: OrderItem) => {
    if (!supabase) return;
    triggerHaptic([15, 5, 15]);
    setIsSubmitting(true);

    const otherItems = order.items.filter(i => i.id !== item.id);
    
    if (otherItems.length === 0) {
      // All items bought (or last one)
      await handleUpdateStatus(order.id, 'bought');
    } else {
      // Split order: create new order for the bought item
      const nextNum = orders.length > 0 ? Math.max(...orders.map(o => o.order_number || 0), 999) + 1 : 1000;
      const boughtItem = { ...item, status: 'bought' as const };
      const newOrder: Order = {
        id: crypto.randomUUID(),
        order_number: nextNum,
        created_at: new Date().toISOString(),
        employee_id: order.employee_id,
        status: 'bought',
        items: [boughtItem],
        is_bought: true,
        notes: `Division de pedido #${order.order_number || order.id.slice(0, 8)} - ${order.notes || ''}`
      };

      // Update original order
      await supabase.from('orders').update({ items: otherItems }).eq('id', order.id);
      await supabase.from('orders').insert([newOrder]);
      
      setOrders(prev => [
        newOrder,
        ...prev.map(o => o.id === order.id ? { ...o, items: otherItems } : o)
      ]);
    }
    setIsSubmitting(false);
  };

  const handleUpdateItemStatus = async (order: Order, itemId: string, status: OrderItemStatus, estimatedDate?: string, cancellationNote?: string, adminNote?: string) => {
    triggerHaptic(10);
    const updatedItems = order.items.map(i => 
      i.id === itemId ? { ...i, status, estimated_date: estimatedDate, cancellation_note: cancellationNote, admin_note: adminNote } : i
    );
    
    // UI Update Optimistic
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: updatedItems } : o));

    if (supabase) {
      supabase.from('orders').update({ items: updatedItems }).eq('id', order.id).then(({error}) => {
        if(error) console.error('Error syncing status to DB:', error);
      });
    }
  };

  const handleDeleteOrder = (id: string) => {
    setDeleteModal({ isOpen: true, orderId: id });
  };

  const confirmDeleteOrder = async () => {
    const id = deleteModal.orderId;
    if (!id) return;
    
    if (supabase) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) console.error('Error deleting order:', error);
    }
    setOrders(prev => prev.filter(o => o.id !== id));
    setDeleteModal({ isOpen: false, orderId: null });
  };

  const handleEditOrder = (order: Order) => {
    setCart(order.items);
    setOrderNotes(order.notes || '');
    setEditingOrderId(order.id);
    setActiveTab('pending');
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setAuthRole(null);
    setRole(null);
  };

  return (
    <div className="min-h-screen">
      {authLoading ? (
        <div className="flex items-center justify-center p-4 min-h-screen">
          <div className="animate-spin text-primary flex items-center justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
              <ShoppingBag size={32} />
            </div>
          </div>
        </div>
      ) : !session || !authRole ? (
        <AuthScreen onLoginSuccess={(sess, newRole) => {
          setSession(sess);
          setAuthRole(newRole);
          if (newRole !== 'admin') {
            setRole('employee');
          }
        }} />
      ) : !role && authRole === 'admin' ? (
        <div className="flex items-center justify-center p-4 min-h-screen">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel w-full max-w-sm text-center p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-xl shadow-black/20 border border-white/10">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-2xl font-black mb-1 text-white tracking-widest uppercase">MODO DE VISTA</h1>
            <p className="text-xs font-bold text-muted uppercase tracking-[0.2em] mb-8">Elige tu interfaz</p>
            <div className="grid gap-4">
              <button onClick={() => setRole('employee')} className="btn btn-primary w-full p-4 flex flex-col items-center gap-2 h-auto group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-hover to-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Truck size={24} className="relative z-10" />
                <div className="relative z-10">
                  <div className="text-sm font-black tracking-widest uppercase mb-1">Cargar Pedidos</div>
                  <div className="text-[9px] font-bold opacity-70 uppercase tracking-widest text-primary-100">Como Sucursal</div>
                </div>
              </button>
              <button onClick={() => setRole('admin')} className="btn w-full p-4 flex flex-col items-center gap-2 h-auto border border-glass-border hover:bg-white/5 group relative overflow-hidden">
                <LayoutDashboard size={24} className="text-white group-hover:scale-110 transition-transform" />
                <div className="relative z-10 text-white">
                  <div className="text-sm font-black tracking-widest uppercase mb-1">Gestión Central</div>
                  <div className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Aprobar y Comprar</div>
                </div>
              </button>
            </div>
            
            <button 
              onClick={handleLogout}
              className="mt-8 text-[10px] font-bold text-muted hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
            >
              <LogOut size={14} /> Cerrar Sesión Segura
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col min-h-screen">
      {/* MOBILE SIDEBAR DRAWERS */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
           <motion.div 
             initial={{ x: '-100%' }} animate={{ x: 0 }} 
             className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#0f172a] border-r border-white/10 p-6 shadow-2xl flex flex-col"
           >
              <div className="flex items-center gap-4 mb-8 pb-4 border-b border-white/10">
                <div className="bg-white rounded-lg p-1" style={{ width: '60px', height: '30px' }}>
                   <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-black text-lg text-white">RAMPET MENU</span>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto">
                {(role === 'employee' 
                    ? [
                        { id: 'pending', label: 'NUEVO PEDIDO', icon: <Plus size={20} /> },
                        { id: 'placed', label: 'MIS PEDIDOS', icon: <Package size={20} /> },
                        { id: 'arriving', label: 'RECEPCIÓN', icon: <Truck size={20} /> },
                        { id: 'received', label: 'HISTORIAL', icon: <CheckCircle size={20} /> }
                      ]
                    : [
                        { id: 'pending', label: 'PEDIDOS', icon: <Plus size={20} /> },
                        { id: 'totales', label: 'TOTALES', icon: <ClipboardList size={20} /> },
                        { id: 'bought', label: 'COMPRAS', icon: <ShoppingBag size={20} /> },
                        { id: 'arriving', label: 'RECEPCIÓN', icon: <Truck size={20} /> },
                        { id: 'received', label: 'HISTORIAL', icon: <CheckCircle size={20} /> },
                        { id: 'stats', label: 'ESTADÍSTICAS', icon: <BarChart2 size={20} /> }
                      ]
                  ).map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as any); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black text-[12px] uppercase transition-all ${activeTab === tab.id ? 'bg-primary text-black' : 'text-white hover:bg-white/5'}`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
              </nav>

              <div className="pt-4 border-t border-white/10 space-y-2">
                 <button onClick={() => { setHapticsEnabled(!hapticsEnabled); triggerHaptic(10); }} className="w-full flex items-center gap-4 p-4 text-white font-black text-[11px] uppercase">
                    <div className={hapticsEnabled ? 'text-primary' : 'text-muted'}>
                       {hapticsEnabled ? <motion.div animate={{ scale: [1, 1.2, 1] }}>📳 VIBRACIÓN ON</motion.div> : '📴 VIBRACIÓN OFF'}
                    </div>
                 </button>
                 <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 text-red-400 font-black text-[11px] uppercase">
                    <LogOut size={20} /> CERRAR SESIÓN
                 </button>
              </div>
           </motion.div>
        </div>
      )}

      {/* HEADER LIMPIO (Logo + Perfil + Hamburguesa) */}
      <header className={`glass-panel rounded-none border-x-0 border-t-0 p-4 sticky top-0 z-[60] transition-all bg-slate-900/95 backdrop-blur-3xl shadow-2xl ${isMobile ? 'pt-24 pb-6' : ''}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {(isMobile || hookIsMobile) && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
                className="p-3.5 bg-primary text-black rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 transition-all z-[70]"
                aria-label="Abrir Menú"
              >
                 <div className="w-6 h-1 bg-black mb-1 rounded-full" />
                 <div className="w-6 h-1 bg-black mb-1 rounded-full" />
                 <div className="w-6 h-1 bg-black rounded-full" />
              </button>
            )}
            <div className="bg-white rounded-lg flex items-center justify-center p-1 shadow-lg shrink-0 overflow-hidden" style={{ width: '80px', height: '40px' }}>
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span id="debug-header-dashboard" className="font-black text-xl tracking-tighter text-white">
              RAMPET <span className="hidden sm:inline">SISTEMA</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {authRole === 'admin' && (
              <button 
                onClick={() => setRole(role === 'admin' ? 'employee' : 'admin')} 
                className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-tighter text-emerald-400 hover:text-white px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-500/5 transition-all`}
              >
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>{isMobile ? role === 'admin' ? 'A EMPLEADO' : 'A ADMIN' : 'CAMBIAR VISTA'}</span>
              </button>
            )}
            {!isMobile && <button onClick={handleLogout} className="p-2 hover:bg-glass-bg rounded-full transition-colors"><LogOut size={20} /></button>}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {/* Role-Specific Tabs Navigation */}
        {/* EXCLUSIÓN ESTRICTA: Solo para escritorio, bajo 1280px ni se intenta renderizar */}
        {!isMobile && (
          <div id="desktop-nav-header" className="tabs-container desktop-tabs-nav">
            {(role === 'employee' 
              ? [
                  { id: 'pending', label: 'NUEVO PEDIDO', icon: <Plus size={16} /> },
                  { id: 'placed', label: 'MIS PEDIDOS', icon: <Package size={16} /> },
                  { id: 'arriving', label: 'RECEPCIÓN', icon: <Truck size={16} /> },
                  { id: 'received', label: 'HISTORIAL', icon: <CheckCircle size={16} /> }
                ]
              : [
                  { id: 'pending', label: 'PEDIDOS', icon: <Plus size={16} /> },
                  { id: 'totales', label: 'TOTALES', icon: <ClipboardList size={16} /> },
                  { id: 'bought', label: 'COMPRAS', icon: <ShoppingBag size={16} /> },
                  { id: 'arriving', label: 'RECEPCIÓN', icon: <Truck size={16} /> },
                  { id: 'received', label: 'HISTORIAL', icon: <CheckCircle size={16} /> },
                  { id: 'stats', label: 'ESTADÍSTICAS', icon: <BarChart2 size={16} /> }
                ]
            ).map(tab => {
              // For 'totales' we need a different calculation (unique products)
              let count = 0;
              if (role === 'admin' && tab.id === 'totales') {
                const uniquePendingProducts = new Set(
                  orders.flatMap(o => o.items)
                    .filter(i => ['placed', 'visto', 'en_curso'].includes(i.status))
                    .map(i => i.product_id)
                );
                count = uniquePendingProducts.size;
              } else {
                count = orders.filter(o => {
                  const isEmployee = role === 'employee';
                  if (isEmployee) {
                    if (tab.id === 'placed') return o.items.some(i => ['placed', 'visto', 'en_curso'].includes(i.status));
                    if (tab.id === 'arriving') return o.items.some(i => i.status === 'bought');
                    if (tab.id === 'received') return o.items.some(i => i.status === 'received');
                  } else {
                    if (tab.id === 'pending') return o.items.some(i => ['placed', 'visto', 'en_curso'].includes(i.status));
                    if (tab.id === 'bought') return o.items.some(i => i.status === 'bought');
                    if (tab.id === 'arriving') return o.items.some(i => i.status === 'bought');
                    if (tab.id === 'received') return o.items.some(i => i.status === 'received');
                  }
                  return false;
                }).length;
              }
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as OrderStatus)}
                  className={`nav-tab ${isActive ? 'nav-tab-active' : ''}`}
                >
                  <div className="flex items-center gap-2 relative">
                    {tab.icon}
                    {tab.label}
                    {count > 0 && (
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] min-w-[20px] text-center font-black ${isActive ? 'bg-primary text-white' : 'bg-white/10 text-muted'}`}>
                        {count}
                      </span>
                    )}
                    {(() => {
                      const isNewAdmin = role === 'admin' && tab.id === 'pending' && orders.some(o => o.items.some(i => i.status === 'placed'));
                      const isNewEmployee = role === 'employee' && tab.id === 'arriving' && orders.some(o => o.items.some(i => i.status === 'bought'));
                      const isUpdatedEmployee = role === 'employee' && tab.id === 'placed' && orders.some(o => o.items.some(i => ['visto', 'en_curso', 'anulado'].includes(i.status)));
                      
                      if (isNewAdmin || isNewEmployee || isUpdatedEmployee) {
                        return <div className="notification-dot animate-pulse-fast" style={{ right: count > 0 ? '-14px' : '-8px', top: '2px' }}></div>;
                      }
                      return null;
                    })()}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {role === 'employee' ? (
          <EmployeeDashboard 
            isMobile={isMobile}
            products={products} onProductsImport={setProducts} cart={cart} onAddToCart={addToCart} 
            onAddManualToCart={addManualToCart}
            onUpdateCartQuantity={updateCartQuantity}
            onRemoveFromCart={removeFromCart} onSubmitOrder={submitOrder} isSubmitting={isSubmitting} 
            orders={orders} onUpdateStatus={handleUpdateStatus} onUpdateItemStatus={handleUpdateItemStatus} activeTab={activeTab as OrderStatus}
            editingOrderId={editingOrderId} onEditOrder={handleEditOrder} onDeleteOrder={handleDeleteOrder}
            onCancelEdit={() => { setEditingOrderId(null); setOrderNotes(''); setCart([]); }}
            orderNotes={orderNotes} onOrderNotesChange={setOrderNotes}
          />
        ) : activeTab === 'totales' ? (
          <div className="space-y-8 animate-in">
            <div className={`flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 ${isMobile ? 'flex-col gap-4 text-center' : ''}`}>
              <div>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-white tracking-widest uppercase mb-1`}>COMPILADO DE PEDIDOS</h2>
                <p className="text-xs text-muted font-bold uppercase tracking-widest">Total acumulado de todos los pedidos pendientes</p>
              </div>
              <button 
                onClick={() => window.print()} 
                className={`btn py-2 px-6 text-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 transition-all font-black tracking-widest flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
              >
                <FileUp size={14} /> IMPRIMIR LISTA
              </button>
            </div>

            {(() => {
              const aggregated: { [key: string]: any } = {};
              orders.forEach(order => {
                order.items.forEach(item => {
                  if (['placed', 'visto', 'en_curso'].includes(item.status)) {
                    const prod = products.find(p => p.id === item.product_id);
                    if (!aggregated[item.product_id]) {
                      aggregated[item.product_id] = {
                        name: item.product_name,
                        quantity: 0,
                        code: prod?.code || 'N/A',
                        product_id: item.product_id,
                        cost: prod?.cost || 0,
                        price: prod?.price || 0,
                        stock: prod?.stock || 0,
                        ordersCount: 0
                      };
                    }
                    aggregated[item.product_id].quantity += item.quantity;
                    aggregated[item.product_id].ordersCount += 1;
                  }
                });
              });

              const items = Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
              const totalInvestment = items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

              if (items.length === 0) {
                return (
                  <div className="glass-panel p-20 text-center border-dashed border-2 flex flex-col items-center gap-4">
                    <div className="p-4 bg-white/5 rounded-full text-muted">
                      <ClipboardList size={48} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white/50">No hay pedidos pendientes para compilar</p>
                      <p className="text-xs text-muted uppercase tracking-widest mt-1">Los pedidos aparecerán aquí cuando sean cargados por los empleados</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-12 px-6 text-[10px] font-black text-muted uppercase tracking-widest mb-2">
                    <div className="col-span-6">Producto / Referencia</div>
                    <div className="col-span-2 text-center">Cantidad Total</div>
                    <div className="col-span-2 text-center">Stock Actual</div>
                    <div className="col-span-2 text-right">Inversión</div>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="modern-order-card p-6 hover:bg-white/[0.03] transition-all group">
                      <div className="grid grid-cols-12 items-center">
                        <div className="col-span-6 flex flex-col gap-1">
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.name}</span>
                          <span className="text-[10px] text-muted font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit uppercase">REF: {item.code}</span>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <div className="qty-badge w-10 h-10 border-2 border-primary/30">
                            <span className="text-lg font-black">{item.quantity}</span>
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <div className={`badge ${item.stock > 0 ? 'badge-on-stock' : 'badge-out-of-stock'} text-[9px] py-1 px-3`} style={{
                            background: item.stock > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: item.stock > 0 ? '#10b981' : '#ef4444',
                            border: `1px solid ${item.stock > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          }}>
                            {item.stock > 0 ? `STOCK: ${Math.round(item.stock)}` : 'SIN STOCK'}
                          </div>
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="text-[10px] text-muted font-bold uppercase mb-1">Subtotal Costo</div>
                          <div className="text-lg font-black text-white">${(item.cost * item.quantity).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-8 p-8 bg-primary/10 rounded-2xl border border-primary/20 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/20 rounded-xl text-primary">
                        <ShoppingBag size={24} />
                      </div>
                      <div>
                        <div className="text-[10px] text-primary-100 font-bold uppercase tracking-widest mb-1">Inversión Total Estimada</div>
                        <div className="text-3xl font-black text-white leading-none">${totalInvestment.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-primary-100 font-bold uppercase tracking-widest mb-1">Ítems Diferentes</div>
                      <div className="text-2xl font-black text-white">{items.length}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : activeTab === 'stats' ? (
          <StatsDashboard orders={orders} products={products} />
        ) : (
          <AdminDashboard 
            isMobile={isMobile}
            orders={orders} products={products} onUpdateStatus={handleUpdateStatus} onClearProducts={handleClearProducts} 
            onBuyItem={handleBuyItem} onUpdateItemStatus={handleUpdateItemStatus} activeTab={activeTab as OrderStatus} isSubmitting={isSubmitting}
            setDateModal={setDateModal}
            setTempDate={setTempDate}
            setCancelItemModal={setCancelItemModal}
            setNoteModal={setNoteModal}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      {isMobile && role && (
        <MobileBottomNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          role={role} 
          orders={orders} 
        />
      )}

      {/* MODAL DE SELECCIÓN DE FECHA (GLOBLAMENTE ACCESIBLE) */}
      {dateModal.isOpen && (
        <div className="modal-backdrop z-[999]" onClick={() => setDateModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content-glass max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">{dateModal.title}</h3>
              <p className="text-sm text-muted">Selecciona la fecha estimada</p>
            </div>
            
            <div className="w-full mb-6">
              <input 
                type="date" 
                className="date-input-modern w-full"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-4 w-full px-2">
              <button 
                onClick={() => setDateModal(prev => ({ ...prev, isOpen: false }))}
                className="btn flex-1 border border-glass-border hover:bg-white/5 text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (tempDate) {
                    const [, m, d] = tempDate.split('-');
                    dateModal.onConfirm(`${d}/${m}`);
                    setDateModal(prev => ({ ...prev, isOpen: false }));
                  }
                }}
                className="btn flex-1 text-white text-sm font-bold shadow-lg bg-primary hover:bg-primary-hover shadow-primary/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOTA GENÉRICA (ADMIN) */}
      {noteModal.isOpen && (
        <div className="modal-backdrop z-[1000]" onClick={() => setNoteModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content-glass max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">{noteModal.title}</h3>
              <p className="text-[10px] text-muted uppercase tracking-[0.2em]">Agregar nota informativa</p>
            </div>
            
            <div className="w-full mb-6">
              <textarea 
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-primary/50 outline-none transition-all placeholder:text-white/20 min-h-[100px] resize-none"
                placeholder="Escribe una nota para el colaborador..."
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setNoteModal(prev => ({ ...prev, isOpen: false }))}
                className="btn flex-1 border border-glass-border hover:bg-white/5 text-xs font-bold uppercase tracking-widest text-muted"
              >
                Omitir
              </button>
              <button 
                onClick={() => {
                  if (noteModal.order && noteModal.itemId && noteModal.status) {
                    handleUpdateItemStatus(noteModal.order, noteModal.itemId, noteModal.status, noteModal.estimatedDate, undefined, tempNote);
                    setNoteModal(prev => ({ ...prev, isOpen: false, estimatedDate: undefined }));
                    setTempNote('');
                  }
                }}
                className="btn flex-1 bg-primary text-white text-xs font-black tracking-widest shadow-lg shadow-primary/20"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN DE PEDIDO */}
      {deleteModal.isOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteModal({ isOpen: false, orderId: null })}>
          <div className="modal-content-glass max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">¿Eliminar Pedido?</h3>
              <p className="text-sm text-muted">Esta acción no se puede deshacer. Se borrará todo el registro de este pedido de forma permanente.</p>
            </div>
            
            <div className="flex gap-4 w-full px-2">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, orderId: null })}
                className="btn flex-1 border border-glass-border hover:bg-white/5 text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteOrder}
                className="btn flex-1 bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold border border-red-500/50 shadow-lg shadow-red-500/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM MODAL (Global) */}
      {systemModal.isOpen && (
        <div className="modal-backdrop z-[999]" onClick={() => systemModal.type === 'alert' && setSystemModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content-glass max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${systemModal.type === 'confirm' ? 'bg-accent-warning/20 text-accent-warning' : 'bg-primary/20 text-primary'}`}>
                {systemModal.type === 'confirm' ? (
                  <Trash2 size={32} /> 
                ) : (
                  <FileUp size={32} />
                )}
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">{systemModal.title}</h3>
              <p className="text-sm text-muted whitespace-pre-wrap">{systemModal.message}</p>
            </div>
            
            <div className="flex gap-4 w-full px-2">
              {systemModal.type === 'confirm' && (
                <button 
                  onClick={() => setSystemModal(prev => ({ ...prev, isOpen: false }))}
                  className="btn flex-1 border border-glass-border hover:bg-white/5 text-sm"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  setSystemModal(prev => ({ ...prev, isOpen: false }));
                  if (systemModal.onConfirm) systemModal.onConfirm();
                }}
                className={`btn flex-1 text-white text-sm font-bold shadow-lg ${systemModal.type === 'confirm' ? 'bg-accent-warning hover:bg-yellow-600 shadow-accent-warning/20' : 'bg-primary hover:bg-primary-hover shadow-primary/20'}`}
              >
                {systemModal.confirmText || 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ANULAR ARTÍCULO CON NOTA */}
      {cancelItemModal.isOpen && (
        <div className="modal-backdrop z-[999]" onClick={() => setCancelItemModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content-glass max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-500/20 text-red-500">
                <XCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Anular Artículo</h3>
              <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mb-2">Motivo de Anulación (Opcional)</p>
            </div>
            
            <div className="w-full mb-6">
              <textarea 
                className="input-field h-24 text-base leading-relaxed resize-none custom-scrollbar w-full"
                placeholder="Nota para el empleado..."
                value={cancelItemModal.note}
                onChange={(e) => setCancelItemModal(prev => ({ ...prev, note: e.target.value }))}
                autoFocus
              />
            </div>
            
            <div className="flex gap-4 w-full px-2">
              <button 
                onClick={() => setCancelItemModal(prev => ({ ...prev, isOpen: false }))}
                className="btn flex-1 border border-glass-border hover:bg-white/5 text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (cancelItemModal.order && cancelItemModal.itemId) {
                    handleUpdateItemStatus(cancelItemModal.order, cancelItemModal.itemId, 'anulado', undefined, cancelItemModal.note.trim() || undefined);
                  }
                  setCancelItemModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="btn flex-1 text-white text-sm font-bold shadow-lg bg-red-500 hover:bg-red-600 shadow-red-500/20"
              >
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

const StatsDashboard: React.FC<{
  orders: Order[];
  products: Product[];
}> = ({ orders, products }) => {
  // Logic to find Top 15 items
  const itemCounts = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const topItems = Object.entries(itemCounts)
    .map(([pid, qty]) => ({
      product: products.find(p => p.id === pid),
      quantity: qty
    }))
    .filter(item => item.product)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15);

  const maxQty = topItems.length > 0 ? topItems[0].quantity : 1;

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-2 mb-4">
        <h2 className="text-3xl font-black flex items-center gap-3 uppercase tracking-tighter">
          <BarChart2 size={32} className="text-primary" /> Top 15 Artículos Más Solicitados
        </h2>
        <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Resumen de demanda acumulada en todos los pedidos</p>
      </div>

      <div className="stats-grid">
        {topItems.map((item, idx) => (
          <div key={item.product?.id} className="stats-card group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Rank #{idx + 1}</span>
                <h4 className="font-bold text-lg text-white group-hover:text-primary transition-colors pr-4">{item.product?.name}</h4>
                <span className="text-[11px] text-muted font-mono uppercase tracking-widest">REF: {item.product?.code}</span>
              </div>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-black">
                {item.quantity} U.
              </div>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${(item.quantity / maxQty) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-3">
               <span className="text-[9px] font-black text-muted uppercase tracking-widest">Demanda Relativa</span>
               <span className="text-[9px] font-black text-white uppercase tracking-widest">{Math.round((item.quantity / maxQty) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      {topItems.length === 0 && (
        <div className="glass-panel p-20 text-center border-dashed border-2">
          <p className="text-muted text-lg font-bold">No hay datos suficientes para mostrar estadísticas</p>
        </div>
      )}
    </div>
  );
};

const EmployeeDashboard: React.FC<{ 
  isMobile: boolean;
  products: Product[]; onProductsImport: (p: Product[]) => void;
  cart: OrderItem[]; onAddToCart: (p: Product) => void;
  onUpdateCartQuantity: (id: string, q: number) => void; onRemoveFromCart: (id: string) => void;
  onSubmitOrder: () => void; isSubmitting: boolean;
  orders: Order[]; onUpdateStatus: (id: string, s: OrderStatus, d?: string) => void;
  activeTab: OrderStatus;
  editingOrderId: string | null; onEditOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onCancelEdit: () => void;
  orderNotes: string;
  onOrderNotesChange: (notes: string) => void;
  onUpdateItemStatus: (order: Order, itemId: string, s: OrderItemStatus, d?: string, cn?: string) => void;
  onAddManualToCart?: (name: string, quantity: number) => void;
}> = ({ 
  isMobile, products, onProductsImport, cart, onAddToCart, onAddManualToCart, onUpdateCartQuantity, onRemoveFromCart, 
  onSubmitOrder, isSubmitting, orders, onUpdateStatus, activeTab, editingOrderId, onEditOrder, 
  onDeleteOrder, onCancelEdit, orderNotes, onOrderNotesChange, onUpdateItemStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const cartContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (cart.length > 0 && cartContainerRef.current) {
      cartContainerRef.current.scrollTo({
        top: cartContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [cart.length]);

  const filteredOrders = orders.filter(o => {
    const isMyOrdersTab = activeTab === 'placed';
    const isReceptionTab = activeTab === 'arriving';
    const isHistoryTab = activeTab === 'received';

    return o.items.some(item => {
      if (isMyOrdersTab) return ['placed', 'visto', 'en_curso', 'anulado'].includes(item.status);
      if (isReceptionTab) return item.status === 'bought';
      if (isHistoryTab) return ['received', 'anulado_historial'].includes(item.status);
      return false;
    });
  });
  const myOrders = filteredOrders.filter(o => o.employee_id === '00000000-0000-0000-0000-000000000001');

  const categories = ['TODOS', ...new Set(products.map(p => p.category))].sort();
  const lastUpdate = products.length > 0 ? new Date(Math.max(...products.map(p => new Date(p.updated_at || 0).getTime()))).toLocaleString('es-AR') : null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const { read, utils } = await import('xlsx');
      const wb = read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      let currentCategory = 'General';
      const results: (Product | null)[] = data.filter((_, i) => i > 0).map((row) => {
        const col0 = String(row[0] || '').trim();
        const col1 = String(row[1] || '').trim();
        const col2 = String(row[2] || '').trim();
        
        // Use Column F (index 5) as Rubro if available, otherwise keep current
        if (row[5]) {
          currentCategory = String(row[5]).trim();
        }

        const code = (col0.length > 2 && col0.length < 15) ? col0 : col1;
        const name = (code === col0) ? col1 || col2 : col2;

        if (!code || !name || name === 'Producto sin nombre' || name.length < 3) return null;

        const price = row[4] != null ? parseFloat(String(row[4]).replace(/[^\d.,-]/g, '').replace(',', '.')) : 0;
        const cost = row[8] != null ? parseFloat(String(row[8]).replace(/[^\d.,-]/g, '').replace(',', '.')) : 0;

        const existing = products.find(p => p.code === code);
        return {
          id: existing ? existing.id : crypto.randomUUID(),
          code: code,
          name: name,
          price: price,
          category: currentCategory,
          stock: row[7] != null ? parseFloat(String(row[7]).toString().replace(',', '.')) : 0,
          cost: cost || 0,
          margin: row[9] != null ? parseFloat(String(row[9]).toString().replace(',', '.')) : 0,
          updated_at: new Date().toISOString()
        } as Product;
      });

      const importedProducts = results.filter((p): p is Product => 
        p !== null && 
        p.name !== 'Producto sin nombre' && 
        p.price >= 0
      );

      if (importedProducts.length > 0) {
        if (supabase) {
          await supabase.from('products').upsert(importedProducts, { onConflict: 'code' });
        }
        onProductsImport(importedProducts);
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
      onProductsImport(importedProducts);
    };
    reader.readAsBinaryString(file);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'TODOS' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {activeTab === 'pending' ? (
        <>
          <div className="space-y-6 mb-8 glass-panel border-none p-6">
            {/* Row 1: Import and Last Update */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/5">
              <label className="btn btn-primary py-3 px-8 flex items-center gap-2 cursor-pointer shadow-lg group relative w-full sm:w-auto justify-center">
                <FileUp size={18} className="group-hover:scale-110 transition-transform" /> 
                <span className="text-[11px] uppercase tracking-widest font-black">
                  {importStatus === 'success' ? '¡LISTO!' : (
                    <>
                      <span className="hidden sm:inline">Importar Listado Excel</span>
                      <span className="sm:hidden">Importar</span>
                    </>
                  )}
                </span>
                <input type="file" style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleFileUpload} />
                {importStatus === 'success' && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-accent-success text-white text-[9px] font-bold py-1.5 px-3 rounded shadow-xl animate-bounce whitespace-nowrap z-50">
                    ✓ CARGA EXITOSA
                  </div>
                )}
              </label>

              {lastUpdate && (
                <div className="flex flex-col items-center sm:items-end">
                  <span className="text-[9px] text-muted font-black uppercase tracking-widest mb-1.5">Última Actualización</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <Clock size={12} className="text-primary" />
                    <span className="text-[11px] font-mono font-bold text-white/90">{lastUpdate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 2: Search and Category Filter */}
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="relative group flex-1 w-full text-white">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors pointer-events-none" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o código de artículo..." 
                  className="input-field pl-12 pr-4 py-3 text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full md:w-64">
                <label className="text-[9px] font-black text-muted uppercase tracking-widest pl-1">Filtrar por Rubro</label>
                <div className="relative">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input-field py-3 px-4 text-sm w-full appearance-none pr-10"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="bg-bg-dark">{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* PRODUCTO MANUAL FORM */}
            <div className="mt-4 pt-4 border-t border-white/5">
              {!showManualForm ? (
                <button 
                  onClick={() => setShowManualForm(true)}
                  className="flex items-center gap-2 text-[10px] font-black text-primary hover:text-white uppercase tracking-[0.2em] transition-all bg-primary/5 hover:bg-primary/10 px-4 py-3 rounded-xl border border-primary/10 w-full justify-center"
                >
                  <Plus size={14} /> ¿No encuentras un producto? Agrégalo manualmente
                </button>
              ) : (
                <div className="glass-panel p-6 border-primary/30 animate-in slide-in-from-top-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                       <Package size={16} className="text-primary" /> Nuevo Producto Manual
                    </h4>
                    <button onClick={() => setShowManualForm(false)} className="text-muted hover:text-white transition-colors">
                      <XCircle size={18} />
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full flex flex-col gap-2">
                      <label className="text-[9px] font-black text-muted uppercase tracking-widest pl-1">Nombre del artículo</label>
                      <input 
                        type="text" 
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Ej: Repuesto especial X..."
                        className="input-field py-3 px-4 text-sm w-full"
                      />
                    </div>
                    <div className="w-full sm:w-32 flex flex-col gap-2">
                      <label className="text-[9px] font-black text-muted uppercase tracking-widest pl-1">Cantidad</label>
                      <input 
                        type="number" 
                        value={manualQty}
                        onChange={(e) => setManualQty(Number(e.target.value))}
                        min="1"
                        className="input-field py-3 px-4 text-sm w-full"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (manualName.trim() && onAddManualToCart) {
                          onAddManualToCart(manualName, manualQty);
                          setManualName('');
                          setManualQty(1);
                          setShowManualForm(false);
                        }
                      }}
                      className="btn btn-primary py-3 px-8 text-xs font-black w-full sm:w-auto"
                    >
                      AGREGAR
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-2'} space-y-6`}>
              <div className="product-list space-y-3 custom-scrollbar" style={{ maxHeight: isMobile ? '60vh' : '70vh', overflowY: 'auto' }}>
                {filteredProducts.map(product => (
                  <div key={product.id} className={`product-card animate-in flex items-center justify-between gap-4 ${isMobile ? 'py-2 px-3' : 'py-3 px-4'}`}>
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`flex flex-col gap-1.5 ${isMobile ? 'min-w-[90px]' : 'min-w-[120px]'} flex-shrink-0`}>
                        <div className="bg-white/5 px-2 py-1 rounded text-[10px] sm:text-[11px] font-mono text-primary font-bold w-fit">
                          {product.code}
                        </div>
                        <div className={`badge ${(product.stock || 0) > 0 ? 'badge-on-stock' : 'badge-out-of-stock'} text-[9px] sm:text-[10px] py-1 px-2 w-full text-center`} style={{ 
                          background: (product.stock || 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: (product.stock || 0) > 0 ? '#10b981' : '#ef4444',
                          border: `1px solid ${(product.stock || 0) > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          display: 'block'
                        }}>
                          {(product.stock || 0) > 0 ? `STOCK: ${Math.round(product.stock || 0)}` : 'S/STOCK'}
                        </div>
                      </div>
                      
                      <div className="min-w-0">
                        <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold leading-tight group-hover:text-primary transition-colors truncate`}>
                          {product.name}
                        </h4>
                        <span className="text-[9px] sm:text-[10px] text-muted uppercase tracking-widest font-bold block">
                          {product.category}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => onAddToCart(product)} 
                      className={`${isMobile ? 'p-1.5' : 'p-2'} bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all flex-shrink-0`}
                    >
                      <Plus size={isMobile ? 16 : 18} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {!isMobile && (
              <div className="cart-sidebar space-y-6">
              <div className="glass-panel p-6 sticky top-24 border-primary/20 bg-primary/[0.02]">
                <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={24} className="text-primary" /> 
                    <span>Tu Pedido</span>
                  </div>
                  {cart.length > 0 && <span className="badge badge-bought">{cart.length} items</span>}
                </h3>
              <div 
                ref={cartContainerRef}
                className="space-y-4 custom-scrollbar" 
                style={{ maxHeight: '350px', overflowY: 'auto' }}
              >
                {cart.map(item => (
                  <div key={item.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 group transition-all hover:bg-white/[0.08] relative overflow-hidden">
                    <div className="flex flex-col gap-4">
                      {/* Product Info */}
                      <div className="min-w-0">
                        <div className="font-bold text-base uppercase tracking-tight text-white/90 leading-tight truncate pr-4">{item.product_name}</div>
                        <div className="flex items-center gap-2 mt-1.5 ">
                          {item.product_id.startsWith('manual-') ? (
                            <span className="text-[9px] font-black bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              Producto Manual
                            </span>
                          ) : (
                            <div className="text-[11px] text-muted font-bold opacity-60">REF: {products.find(p => p.id === item.product_id)?.code || 'N/A'}</div>
                          )}
                        </div>
                      </div>

                      {/* Controls Row: [-] [Badge] [+] [Trash] */}
                      <div className="qty-control-row">
                        <button 
                          onClick={() => onUpdateCartQuantity(item.id, -1)}
                          className="qty-btn-cart"
                          title="Restar cantidad"
                        >
                          <Minus size={18} strokeWidth={3} />
                        </button>

                        <div className="qty-badge-cart shadow-lg shadow-primary/10">
                          <span className="label">Cant</span>
                          <span className="value">{item.quantity}</span>
                        </div>

                        <button 
                          onClick={() => onUpdateCartQuantity(item.id, 1)}
                          className="qty-btn-cart"
                          title="Sumar cantidad"
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>

                        <button 
                          onClick={() => onRemoveFromCart(item.id)}
                          className="trash-btn-cart"
                          title="Eliminar artículo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-muted uppercase tracking-widest pl-1">Notas del Pedido</label>
                    <textarea 
                      className="input-field h-32 text-base leading-relaxed resize-none custom-scrollbar"
                      placeholder="Escribe detalles adicionales para las compras..."
                      value={orderNotes}
                      onChange={(e) => onOrderNotesChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <button 
                      onClick={onSubmitOrder} 
                      disabled={isSubmitting || cart.length === 0} 
                      className={`btn w-full py-5 text-xl tracking-tight ${editingOrderId ? 'bg-accent-warning text-white' : 'btn-primary'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Procesando...</span>
                        </div>
                      ) : editingOrderId ? 'Guardar Cambios' : 'Confirmar Pedido'}
                    </button>
                    {editingOrderId && (
                      <button 
                        onClick={onCancelEdit} 
                        className="btn w-full py-3 text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest"
                      >
                        Descartar Edición
                      </button>
                    )}
                  </div>
                  </div>
              </div>
            </div>
            )}
          </div>

          {/* MOBILE FLOATING CART ACTION */}
          {isMobile && cart.length > 0 && (
            <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="btn btn-primary w-full py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag size={20} />
                    <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">Ver mi pedido</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] opacity-70 font-bold uppercase tracking-widest">Subtotal Est.</span>
                  <span className="text-sm font-black">${cart.reduce((acc, item) => {
                    const prod = products.find(p => p.id === item.product_id);
                    return acc + (prod?.price || 0) * item.quantity;
                  }, 0).toLocaleString()}</span>
                </div>
              </button>
            </div>
          )}

          {/* MOBILE CART DRAWER */}
          {isMobile && (
            <MobileCartDrawer 
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              cart={cart}
              products={products}
              onUpdateQuantity={onUpdateCartQuantity}
              onRemove={onRemoveFromCart}
              orderNotes={orderNotes}
              onOrderNotesChange={onOrderNotesChange}
              onSubmit={async () => {
                await onSubmitOrder();
                setIsCartOpen(false);
              }}
              isSubmitting={isSubmitting}
              editingOrderId={editingOrderId}
              onCancelEdit={onCancelEdit}
            />
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
              <Package size={28} className="text-primary" /> 
              {activeTab === 'placed' ? 'Mis Pedidos Realizados' : 
               activeTab === 'arriving' ? 'En Camino (Logística)' : 'Historial de Recepción'}
            </h2>
            <div className="badge badge-primary px-4 py-1.5 text-xs font-black">{myOrders.length} PEDIDOS</div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {myOrders.length === 0 ? (
              <div className="glass-panel p-20 text-center border-dashed border-2 flex flex-col items-center gap-4">
                <div className="p-4 bg-white/5 rounded-full text-muted">
                  <Package size={48} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white/50">No hay pedidos en esta sección</p>
                  <p className="text-xs text-muted uppercase tracking-widest mt-1">Explora el catálogo para crear uno nuevo</p>
                </div>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className="modern-order-card p-8 mb-12">
                  {/* SECCIÓN 1: CABECERA Y RESUMEN */}
                  <div className="flex flex-row justify-between items-center gap-4 mb-3 px-2">
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-4">
                         <span className="text-[16px] font-black text-white uppercase tracking-tighter">Pedido #{order.order_number || order.id.slice(0, 8)}</span>
                         {order.is_modified && (
                           <span className="text-[9px] font-black bg-accent-warning/20 text-accent-warning border border-accent-warning/30 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                             Modificado
                           </span>
                         )}
                       </div>
                       <p className="text-sm text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} className="text-primary" /> {new Date(order.created_at).toLocaleDateString()} - {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                    
                    <div className="flex items-center gap-3 pr-2">
                      {activeTab === 'placed' && (
                        <>
                          <button 
                            onClick={() => {
                              onEditOrder(order);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="icon-action-btn"
                            title="Editar Pedido"
                          >
                            <Edit2 size={24} />
                          </button>
                          <button 
                            onClick={() => onDeleteOrder(order.id)}
                            className="icon-action-btn btn-delete"
                            title="Eliminar Pedido"
                          >
                            <Trash2 size={24} />
                          </button>
                        </>
                      )}
                      {activeTab === 'bought' && <span className="badge badge-bought py-2 px-6 rounded-full font-black text-[12px]">PROCESANDO</span>}
                    </div>
                  </div>

                  <h4 className="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-4 pr-1 px-2">
                    Detalle de Artículos: <span className="text-primary ml-1">{
                      order.items.filter(item => {
                        const isMyOrdersTab = activeTab === 'placed';
                        const isReceptionTab = activeTab === 'arriving';
                        const isHistoryTab = activeTab === 'received';
                        if (isMyOrdersTab) return ['placed', 'visto', 'en_curso', 'anulado'].includes(item.status);
                        if (isReceptionTab) return item.status === 'bought';
                        if (isHistoryTab) return ['received', 'anulado_historial'].includes(item.status);
                        return false;
                      }).length
                    } ÍTEMS</span>
                  </h4>
                  
                  <div className="card-divider" />
                  
                  {/* SECCIÓN 2: TABLA DE ARTÍCULOS */}
                    <div className="overflow-x-auto -mx-2 px-2 pb-2">
                      <div className="w-full">
                        {/* Table Header */}
                        <div className="flex items-center gap-4 pb-4 mb-4 opacity-50 px-2 justify-between">
                          <div className="min-w-0 flex-1 pl-2 text-[10px] font-black uppercase tracking-[0.2em] text-white">Descripción del Artículo</div>
                          <div className="flex items-center gap-6">
                            <div className="status-col-fixed text-[10px] font-black uppercase tracking-[0.2em] text-center">Estado</div>
                            <div className="qty-col-fixed text-[10px] font-black uppercase tracking-[0.2em] text-center pr-2">Cant.</div>
                          </div>
                        </div>
                        
                        <div className="divide-y divide-white/5">
                      {order.items.map((item, idx) => {
                        const showInMyOrders = ['placed', 'visto', 'en_curso', 'anulado'].includes(item.status);
                        const showInReception = item.status === 'bought';
                        const showInHistory = ['received', 'anulado_historial'].includes(item.status);

                        if (activeTab === 'placed' && !showInMyOrders) return null;
                        if (activeTab === 'arriving' && !showInReception) return null;
                        if (activeTab === 'received' && !showInHistory) return null;

                        return (
                          <React.Fragment key={idx}>
                            <div className="item-row-minimal group px-2 py-5 justify-between hover:bg-white/[0.02] rounded-xl transition-all duration-300">
                            <div className="flex-1 pl-2">
                              <div className="text-[14px] font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors duration-200 whitespace-normal pr-6">
                                {item.product_name}
                              </div>
                              <div className="mt-2" />


                            </div>

                            {/* NOTA DE CANCELACIÓN (MEDIO, ANTES DEL ESTADO) */}
                            {item.status === 'anulado' && item.cancellation_note && (
                              <div className="bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20 max-w-[250px] animate-in flex items-start gap-2 mr-4 hidden sm:flex">
                                <ClipboardList size={14} className="text-red-500 shrink-0 mt-0.5" />
                                <span className="text-[11px] italic text-red-100 font-medium whitespace-pre-wrap leading-tight">{item.cancellation_note}</span>
                              </div>
                            )}

                            {item.admin_note && (
                              <div className="bg-primary/10 py-2 px-3 rounded-lg border border-primary/20 max-w-[250px] animate-in flex items-start gap-2 mr-4 hidden sm:flex">
                                <FileUp size={14} className="text-primary shrink-0 mt-0.5" />
                                <span className="text-[11px] italic text-primary-100 font-medium whitespace-pre-wrap leading-tight">{item.admin_note}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-6">
                              <div className="status-col-fixed">
                                <div className={`item-status-badge relative item-status-${item.status}`}>
                                  {item.status === 'placed' && (
                                    <>
                                      {activeTab === 'placed' && (
                                        <>
                                          <div className="absolute -top-1.5 -right-1.5 rounded-full animate-ping z-10" style={{ width: '12px', height: '12px', backgroundColor: '#ef4444' }}></div>
                                          <div className="absolute -top-1.5 -right-1.5 rounded-full z-10" style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)', border: '2px solid var(--bg-card)' }}></div>
                                        </>
                                      )}
                                      <div className="flex flex-col items-center gap-1">
                                        <Clock size={14} />
                                        <span>PENDIENTE</span>
                                      </div>
                                    </>
                                  )}
                                  {item.status === 'visto' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <Search size={14} />
                                      <span>VISTO</span>
                                    </div>
                                  )}
                                  {item.status === 'en_curso' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <Truck size={14} />
                                      <span>EN CURSO</span>
                                      {item.estimated_date && <span className="status-date">{item.estimated_date}</span>}
                                    </div>
                                  )}
                                  {item.status === 'bought' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <ShoppingBag size={14} />
                                      <span>COMPRADO</span>
                                    </div>
                                  )}
                                  {item.status === 'received' && (
                                    <div className="flex flex-col items-center gap-1">
                                      <CheckCircle size={14} />
                                      <span>RECIBIDO</span>
                                    </div>
                                  )}
                                  {item.status === 'anulado' && (
                                    <>
                                      {activeTab === 'placed' && (
                                        <>
                                          <div className="absolute -top-1.5 -right-1.5 rounded-full animate-ping z-10" style={{ width: '12px', height: '12px', backgroundColor: '#ef4444' }}></div>
                                          <div className="absolute -top-1.5 -right-1.5 rounded-full z-10" style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)', border: '2px solid var(--bg-card)' }}></div>
                                        </>
                                      )}
                                      <div className="flex flex-col items-center gap-1 text-red-500">
                                        <XCircle size={14} />
                                        <span>ANULADO</span>
                                      </div>
                                    </>
                                  )}
                                  {item.status === 'anulado_historial' && (
                                    <div className="flex flex-col items-center gap-1 opacity-50 text-red-500">
                                      <XCircle size={14} />
                                      <span className="text-[9px]">CANCELADO</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="qty-col-fixed pr-2 flex justify-center items-center">
                                <div className="qty-badge shadow-xl group-hover:scale-110 transition-transform duration-300 flex items-center justify-center p-0 w-10 h-10">
                                  <span className="text-base font-black leading-none">{item.quantity}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                      
                          {/* Notice for employee to acknowledge */}
                          {item.status === 'anulado' && activeTab === 'placed' && (
                            <div className="bg-red-500/5 border border-red-500/20 p-3 flex flex-col gap-3 rounded-xl mb-4 ml-2 mr-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-red-500 flex items-center gap-2 uppercase tracking-widest">
                                  <XCircle size={14} /> Confirma haber visto la cancelación
                                </span>
                                <button 
                                  onClick={() => onUpdateItemStatus(order, item.id, 'anulado_historial')}
                                  className="btn py-1.5 px-4 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                                >
                                  ENTERADO
                                </button>
                              </div>
                            </div>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>

                  {order.notes && (
                    <>
                      <div className="card-divider" />
                      {/* SECCIÓN 3: NOTAS DEL COLABORADOR */}
                      <div className="px-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-2 pl-1">
                          <FileUp size={16} className="text-primary" /> Notas del Colaborador
                        </p>
                        <div className="bg-black/10 p-5 rounded-2xl border border-white/5 border-dashed">
                          <p className="text-[13px] italic leading-relaxed text-white/90 font-medium whitespace-pre-wrap">"{order.notes}"</p>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'arriving' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/5 gap-4">
                      <div className="flex items-center gap-3 text-accent-success bg-accent-success/10 px-4 py-2 rounded-full border border-accent-success/20">
                        <Truck size={18} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Entrega estimada: {order.arrival_date}</span>
                      </div>
                      <button 
                        onClick={() => onUpdateStatus(order.id, 'received')}
                        className="btn py-4 px-10 bg-accent-success text-white text-xs font-black tracking-widest shadow-xl shadow-accent-success/20 w-full sm:w-auto hover:scale-105 active:scale-95 transition-all rounded-xl"
                      >
                        CONFIRMAR RECEPCIÓN
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC<{ 
  isMobile: boolean;
  orders: Order[]; products: Product[]; onUpdateStatus: (id: string, s: OrderStatus, d?: string) => void;
  onClearProducts: () => void;
  onBuyItem: (order: Order, item: OrderItem) => void;
  onUpdateItemStatus: (order: Order, itemId: string, s: OrderItemStatus, d?: string, n?: string, an?: string) => void;
  activeTab: OrderStatus;
  isSubmitting: boolean;
  setDateModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; onConfirm: (date: string) => void; }>>;
  setTempDate: (d: string) => void;
  setCancelItemModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; order: Order | null; itemId: string | null; note: string; }>>;
  setNoteModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; order: Order | null; itemId: string | null; status: OrderItemStatus | null; title: string; estimatedDate?: string; }>>;
}> = ({ isMobile, orders, products, onUpdateStatus, onClearProducts, onBuyItem, onUpdateItemStatus, activeTab, isSubmitting, setDateModal, setTempDate, setCancelItemModal, setNoteModal }) => {
  const [shouldAddNote, setShouldAddNote] = useState(false);
  const filteredOrders = orders.filter(o => {
    const isSalesTab = activeTab === 'pending';
    const isPurchasesTab = activeTab === 'bought';
    const isReceptionTab = activeTab === 'arriving';
    const isHistoryTab = activeTab === 'received';

    return o.items.some(item => {
      if (isSalesTab) return ['placed', 'visto', 'en_curso'].includes(item.status);
      if (isPurchasesTab) return item.status === 'bought';
      if (isReceptionTab) return item.status === 'bought'; // Reception shows bought items too? 
      // User said: "vaya pasando a RECEPCION...". In Admin, 'bought' IS the Compras tab.
      if (isHistoryTab) return ['received', 'anulado', 'anulado_historial'].includes(item.status);
      return false;
    });
  });
  const lastUpdate = products.length > 0 ? new Date(Math.max(...products.map(p => new Date(p.updated_at || 0).getTime()))).toLocaleString('es-AR') : null;

  return (
    <div className="space-y-8">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 glass-panel border-none ${isMobile ? 'p-4' : 'p-6'}`}>
        <div className="flex flex-col gap-2">
          <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold flex items-center gap-2`}>
            <BarChart2 size={isMobile ? 20 : 24} className="text-primary" /> Gestión de Flujo
          </h2>
          {lastUpdate && (
            <div className="text-[10px] text-muted font-bold uppercase tracking-widest">
              Stock del catálogo: <span className="text-primary">{lastUpdate}</span>
            </div>
          )}
        </div>
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4`}>
          <div className={`flex items-center justify-between ${isMobile ? 'w-full px-2' : 'gap-4'}`}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={shouldAddNote}
                  onChange={(e) => setShouldAddNote(e.target.checked)}
                />
                <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:bg-primary transition-all border border-white/10"></div>
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform shadow-lg"></div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-white transition-colors">Adjuntar nota</span>
            </label>
            {!isMobile && <div className="w-px h-8 bg-white/5 mx-2" />}
          </div>
          <button 
            onClick={onClearProducts}
            className={`btn py-2 px-6 text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all font-black tracking-widest ${isMobile ? 'w-full justify-center' : ''}`}
          >
            <Trash2 size={14} /> LIMPIAR CATÁLOGO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredOrders.length === 0 ? (
          <div className="glass-panel p-20 text-center border-dashed border-2 flex flex-col items-center gap-4">
            <div className="p-4 bg-white/5 rounded-full text-muted">
              <Package size={48} />
            </div>
            <div>
              <p className="text-lg font-bold text-white/50">Sin pedidos en esta etapa</p>
              <p className="text-xs text-muted uppercase tracking-widest mt-1">Los pedidos de los empleados aparecerán aquí</p>
            </div>
          </div>
        ) : (
          filteredOrders.map(order => {
            const totalCost = order.items.reduce((acc, item) => {
              const prod = products.find(p => p.id === item.product_id);
              return acc + (prod?.cost || 0) * item.quantity;
            }, 0);

            if (isMobile) {
              return (
                <MobileAdminOrderCard 
                  key={order.id}
                  order={order}
                  totalCost={totalCost}
                  products={products}
                  allOrders={orders}
                  onUpdateStatus={onUpdateStatus}
                  onUpdateItemStatus={onUpdateItemStatus}
                  onBuyItem={onBuyItem}
                  setDateModal={setDateModal}
                  setTempDate={setTempDate}
                  setNoteModal={setNoteModal}
                />
              );
            }

            return (
              <div key={order.id} className="modern-order-card p-8">
                {/* CABECERA DEL PEDIDO (ADMIN) */}
                <div className="flex flex-row justify-between items-start gap-4 mb-3 px-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <span className="text-[16px] font-black text-white uppercase tracking-tighter">Pedido #{order.order_number || order.id.slice(0, 8)}</span>
                      {order.is_modified && (
                        <span className="text-[9px] font-black bg-accent-warning/20 text-accent-warning border border-accent-warning/30 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none animate-pulse">
                          Modificado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted font-black uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16} className="text-primary" /> {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right pr-2">
                    <div className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mb-1">Inversión Estimada</div>
                    <div className="text-2xl font-black text-white">${totalCost.toLocaleString()}</div>
                  </div>
                </div>

                <div className="card-divider" />

                {/* LISTA DE ARTÍCULOS (ADMIN) */}
                <div className="mb-6 px-2">
                  <h4 className="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Package size={16} className="text-primary" /> Detalle Lote: <span className="text-primary">{order.items.length} ÍTEMS</span>
                  </h4>

                  <div className="overflow-x-auto -mx-2 px-2 pb-2">
                    <div className="w-full space-y-4">
                      {order.items.map((item, idx) => {
                      const prod = products.find(p => p.id === item.product_id);
                      const itemCost = (prod?.cost || 0) * item.quantity;

                      return (
                        <div key={idx} className="item-row-minimal group px-2 py-4 justify-between hover:bg-white/[0.03] rounded-2xl transition-all duration-300 border border-transparent hover:border-white/5">
                          <div className="min-w-0 flex-1 pl-2">
                            <div className="text-[14px] font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors duration-200 whitespace-normal pr-6">
                              {item.product_name}
                            </div>
                             <div className="mt-2 space-y-2">
                                {item.product_id.startsWith('manual-') ? (
                                  <span className="text-[9px] font-black bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    Producto Manual
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <span className="text-[11px] text-muted font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit">REF: {prod?.code || 'N/A'}</span>
                                    <div className="flex items-center gap-4 flex-wrap">
                                      <div className={`badge ${(prod?.stock || 0) > 0 ? 'badge-on-stock' : 'badge-out-of-stock'} text-[9px] py-0.5 px-2 text-center w-fit`} style={{ 
                                        background: (prod?.stock || 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: (prod?.stock || 0) > 0 ? '#10b981' : '#ef4444',
                                        border: `1px solid ${(prod?.stock || 0) > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                      }}>
                                        {(prod?.stock || 0) > 0 ? `STOCK: ${Math.round(prod?.stock || 0)}` : 'S/STOCK'}
                                      </div>
                                      <span className="text-[11px] text-accent-warning font-bold uppercase tracking-widest">Costo: ${itemCost.toLocaleString()}</span>
                                      <span className="text-[11px] text-accent-success font-bold uppercase tracking-widest">PVP: ${((prod?.price || 0) * item.quantity).toLocaleString()}</span>
                                    </div>
                                  </div>
                                )}
                             </div>

                            {/* DETECCIÓN DE DUPLICADOS EN OTROS PEDIDOS (Admin) */}
                            {(() => {
                              const others = orders.filter(o => 
                                o.id !== order.id && 
                                o.items.some(i => i.product_id === item.product_id && ['placed', 'visto', 'en_curso', 'bought'].includes(i.status))
                              );
                              if (others.length > 0) {
                                return (
                                  <div className="duplicate-item-warning animate-in">
                                    <ShoppingBag size={12} />
                                    <span>También solicitado en: {others.map(o => `#${o.order_number || o.id.slice(0, 4)}`).join(', ')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {item.status === 'anulado' && item.cancellation_note && (
                            <div className="bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20 max-w-[250px] animate-in flex items-start gap-2 mr-4 hidden sm:flex">
                              <ClipboardList size={14} className="text-red-500 shrink-0 mt-0.5" />
                              <span className="text-[11px] italic text-red-100 font-medium whitespace-pre-wrap leading-tight">{item.cancellation_note}</span>
                            </div>
                          )}

                          {item.admin_note && (
                            <div className="bg-primary/10 py-2 px-3 rounded-lg border border-primary/20 max-w-[250px] animate-in flex items-start gap-2 mr-4 hidden sm:flex">
                              <FileUp size={14} className="text-primary shrink-0 mt-0.5" />
                              <span className="text-[11px] italic text-primary-100 font-medium whitespace-pre-wrap leading-tight">{item.admin_note}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-6">
                            {/* ESTADO CON ICONOS (ADMIN) */}
                            <div className="status-col-fixed">
                              <div className={`item-status-badge relative item-status-${item.status}`}>
                                {item.status === 'placed' && (
                                  <>
                                    {activeTab === 'pending' && (
                                      <>
                                        <div className="absolute -top-1.5 -right-1.5 rounded-full animate-ping z-10" style={{ width: '14px', height: '14px', backgroundColor: '#ef4444' }}></div>
                                        <div className="absolute -top-1.5 -right-1.5 rounded-full z-10" style={{ width: '14px', height: '14px', backgroundColor: '#ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)', border: '2px solid var(--bg-card)' }}></div>
                                      </>
                                    )}
                                    <div className="flex flex-col items-center gap-1">
                                      <Clock size={14} />
                                      <span>PENDIENTE</span>
                                    </div>
                                  </>
                                )}
                                {item.status === 'visto' && (
                                  <div className="flex flex-col items-center gap-1">
                                    <Search size={14} />
                                    <span>VISTO</span>
                                  </div>
                                )}
                                {item.status === 'en_curso' && (
                                  <div className="flex flex-col items-center gap-1">
                                    <Truck size={14} />
                                    <span>EN CURSO</span>
                                    {item.estimated_date && <span className="status-date">{item.estimated_date}</span>}
                                  </div>
                                )}
                                {item.status === 'bought' && (
                                  <div className="flex flex-col items-center gap-1">
                                    <ShoppingBag size={14} />
                                    <span>CAMINO</span>
                                  </div>
                                )}
                                {item.status === 'received' && (
                                  <div className="flex flex-col items-center gap-1 text-accent-success">
                                    <CheckCircle size={14} />
                                    <span>RECIBIDO</span>
                                  </div>
                                )}
                                {item.status === 'anulado' && (
                                  <div className="flex flex-col items-center gap-1 text-red-500">
                                    <XCircle size={14} />
                                    <span>ANULADO</span>
                                  </div>
                                )}
                                {item.status === 'anulado_historial' && (
                                  <div className="flex flex-col items-center gap-1 opacity-50 text-red-500">
                                    <XCircle size={14} />
                                    <span className="text-[9px]">CANCELADO</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* CANTIDAD */}
                            <div className="qty-col-fixed flex justify-center items-center">
                              <div className="qty-badge shadow-xl group-hover:scale-110 transition-transform duration-300 flex flex-col items-center justify-center p-0 w-12 h-12">
                                <span className="text-[8px] uppercase font-black opacity-40 mb-1">Cant</span>
                                <span className="text-lg font-black leading-none">{item.quantity}</span>
                              </div>
                            </div>

                            {/* ACCIONES INDIVIDUALES (SOLO EN PENDIENTES) */}
                            {activeTab === 'pending' && (
                              <div className="flex items-center gap-2 pl-4 border-l border-white/5 ml-2">
                                <button 
                                  onClick={() => {
                                    if (shouldAddNote) {
                                      setNoteModal({ isOpen: true, order, itemId: item.id, status: 'visto', title: 'Marcar como Visto' });
                                    } else {
                                      onUpdateItemStatus(order, item.id, 'visto');
                                    }
                                  }}
                                  className="action-icon-refined action-blue"
                                  title="Marcar como Visto"
                                >
                                  <Search size={18} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setTempDate('');
                                    setDateModal({
                                      isOpen: true,
                                      title: 'Programar Compra',
                                      onConfirm: (d) => {
                                        if (shouldAddNote) {
                                          setNoteModal({ isOpen: true, order, itemId: item.id, status: 'en_curso', title: 'Programar Compra', estimatedDate: d });
                                        } else {
                                          onUpdateItemStatus(order, item.id, 'en_curso', d);
                                        }
                                      }
                                    });
                                  }}
                                  className="action-icon-refined action-amber"
                                  title="Programar compra"
                                >
                                  <Clock size={18} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (shouldAddNote) {
                                      setNoteModal({ isOpen: true, order, itemId: item.id, status: 'bought', title: 'Marcar como Comprado' });
                                    } else {
                                      onBuyItem(order, item);
                                    }
                                  }}
                                  disabled={isSubmitting || item.status === 'anulado'}
                                  className="action-icon-refined action-green disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Comprar este artículo"
                                >
                                  <ShoppingBag size={18} />
                                </button>
                                {item.status !== 'anulado' && (
                                  <button 
                                    onClick={() => {
                                      setCancelItemModal({
                                        isOpen: true,
                                        order: order,
                                        itemId: item.id,
                                        note: ''
                                      });
                                    }}
                                    className="action-icon-refined hover:bg-red-500/20 text-red-500/70 hover:text-red-500"
                                    title="Anular artículo"
                                  >
                                    <XCircle size={18} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>

                {/* NOTAS (ADMIN) */}
                {order.notes && (
                  <div className="mb-8 px-2">
                     <div className="card-divider" />
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-2 pl-1">
                        <FileUp size={16} className="text-primary" /> Notas del Pedido
                     </p>
                     <div className="bg-black/10 p-5 rounded-2xl border border-white/5 border-dashed">
                        <p className="text-[13px] italic leading-relaxed text-white/90 font-medium whitespace-pre-wrap">"{order.notes}"</p>
                     </div>
                  </div>
                )}

                {/* ACCIONES DE NIVEL DE PEDIDO (FOOTER) */}
                <div className="flex flex-col sm:flex-row items-center justify-end pt-6 border-t border-white/5 gap-4 px-2">
                   {activeTab === 'pending' && (
                     <button 
                        onClick={() => onUpdateStatus(order.id, 'bought')} 
                        disabled={isSubmitting}
                        className="btn py-4 px-10 bg-primary text-white text-xs font-black tracking-[0.2em] shadow-xl shadow-primary/20 w-full sm:w-auto hover:scale-105 active:scale-95 transition-all rounded-xl"
                      >
                        COMPRAR TODO EL LOTE
                      </button>
                   )}
                   {activeTab === 'bought' && (
                      <button 
                        onClick={() => {
                          setTempDate('');
                          setDateModal({
                            isOpen: true,
                            title: 'Asignar Fecha de Recepción',
                            onConfirm: (d) => onUpdateStatus(order.id, 'arriving', d)
                          });
                        }} 
                        className="btn py-4 px-10 bg-accent-warning text-white text-xs font-black tracking-[0.2em] shadow-xl shadow-accent-warning/20 w-full sm:w-auto hover:scale-105 active:scale-95 transition-all rounded-xl"
                      >
                        ASIGNAR FECHA DE RECEPCIÓN
                      </button>
                   )}
                   {activeTab === 'arriving' && (
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-3 text-accent-success bg-accent-success/10 px-6 py-3 rounded-xl border border-accent-success/20">
                          <Truck size={20} />
                          <span className="text-[12px] font-black uppercase tracking-widest">Entrega: {order.arrival_date}</span>
                        </div>
                        <button 
                          onClick={() => onUpdateStatus(order.id, 'received')} 
                          className="btn py-4 px-10 bg-accent-success text-white text-xs font-black tracking-[0.2em] shadow-xl shadow-accent-success/20 w-full sm:w-auto hover:scale-105 active:scale-95 transition-all rounded-xl"
                        >
                          CERRAR PEDIDO (RECIBIDO)
                        </button>
                      </div>
                   )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default App;
// Restauración estable v2
