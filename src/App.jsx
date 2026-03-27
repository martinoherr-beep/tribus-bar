import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Trash2, X, Plus, Minus, Wifi, UtensilsCrossed, Zap } from 'lucide-react';

const MENU_LOCAL = [
  { id: 1, nombre: "Burger Tribus Clásica", precio: 200, categoria: "Comidas", descripcion: "Doble medallón de carne, cheddar y salsa de la casa.", imagen: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500" },
  { id: 2, nombre: "Papas con Cheddar", precio: 120, categoria: "Comidas", descripcion: "Papas naturales fritas con mucho cheddar.", imagen: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?q=80&w=1925&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D=500" },
  { id: 3, nombre: "Cerveza IPA", precio: 60, categoria: "Bebidas", descripcion: "Pinta de 500ml con aroma cítrico.", imagen: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=500" },
  { id: 4, nombre: "Fernet con Coca", precio: 140, categoria: "Bebidas", descripcion: "El clásico de la casa en vaso grande.", imagen: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=500" },
  { id: 5, nombre: "Volcán de Chocolate", precio: 180, categoria: "Postres", descripcion: "Con una bocha de helado de crema americana.", imagen: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=500" }
];

const CATEGORIAS = ["Todos", "Comidas", "Bebidas", "Postres"];

function App() {
  const [view, setView] = useState('welcome');
  const [menuItems, setMenuItems] = useState(MENU_LOCAL);
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState(null);
  const [verCarrito, setVerCarrito] = useState(false);
  const [catSeleccionada, setCatSeleccionada] = useState("Todos");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get("mesa");
    if (mesaParam) setMesa(mesaParam);
  }, []);

  const agregarAlCarrito = (item) => {
    const existe = carrito.find(x => x.id === item.id);
    if (existe) {
      setCarrito(carrito.map(x => x.id === item.id ? { ...existe, cantidad: existe.cantidad + 1 } : x));
    } else {
      setCarrito([...carrito, { ...item, cantidad: 1 }]);
    }
  };

  const restarDelCarrito = (id) => {
    const existe = carrito.find(x => x.id === id);
    if (existe.cantidad === 1) {
      setCarrito(carrito.filter(x => x.id !== id));
    } else {
      setCarrito(carrito.map(x => x.id === id ? { ...existe, cantidad: existe.cantidad - 1 } : x));
    }
  };

  const eliminarTotalmente = (id) => setCarrito(carrito.filter(x => x.id !== id));
  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const enviarPedido = () => {
    const telefono = "5491100000000"; 
    const lista = carrito.map(i => `• ${i.cantidad}x ${i.nombre}`).join('\n');
    const mensaje = encodeURIComponent(`*PEDIDO TRIBUS*\n\n${lista}\n\n*Total:* $${total}\n*Ubicación:* ${mesa ? `Mesa ${mesa}` : 'Domicilio'}`);
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  };

  const productosFiltrados = catSeleccionada === "Todos" 
    ? menuItems 
    : menuItems.filter(p => p.categoria === catSeleccionada);

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
            <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="fondo bar" />
            <div className="absolute inset-0 bg-slate-950/80"></div>
        </div>

        <div className="relative z-10 space-y-12 w-full max-w-lg">
            <div className="space-y-3">
                <div className="flex justify-center items-center gap-2 text-orange-500 mb-6">
                    <Zap size={48} className="animate-pulse" />
                    <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter leading-none">TRIBUS</h1>
                </div>
                <p className="text-2xl font-light tracking-widest uppercase text-slate-300">Bar & Grill</p>
                {mesa && <p className="text-green-400 font-bold mt-6 italic text-xl animate-pulse">¡Mesa {mesa} lista!</p>}
            </div>

            <div className="grid gap-6 w-full pt-10">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("tribus2026");
                    alert("✅ Clave copiada: tribus2026");
                  }} 
                  className="flex items-center justify-center gap-5 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl hover:bg-slate-700 transition-all shadow-xl"
                >
                    <Wifi className="text-sky-400" size={32} />
                    <div className="text-left">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">Wi-Fi Gratis</p>
                        <p className="text-xl font-bold leading-tight">Conectarse</p>
                    </div>
                </button>

                <button 
                  onClick={() => setView('menu')} 
                  className="flex items-center justify-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 transition-all transform hover:scale-105"
                >
                    <UtensilsCrossed size={32} />
                    <div className="text-left">
                        <p className="text-xs text-orange-200 uppercase font-bold tracking-widest leading-none mb-1">Menú Digital</p>
                        <p className="text-xl font-bold leading-tight">Explorar</p>
                    </div>
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-28 font-sans relative text-slate-100 flex flex-col items-center">
      
      {/* HEADER ADAPTADO */}
      <header className="bg-slate-950/90 backdrop-blur-md p-6 sticky top-0 z-20 shadow-xl border-b border-slate-800 w-full flex justify-center">
        <div className="max-w-6xl w-full flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex flex-col">
            <button onClick={() => setView('welcome')} className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5 hover:text-orange-400">← Inicio</button>
            <h1 className="text-3xl font-black text-orange-500 italic leading-none">TRIBUS BAR</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {CATEGORIAS.map(cat => (
                <button key={cat} onClick={() => setCatSeleccionada(cat)} className={`px-6 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${catSeleccionada === cat ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{cat}</button>
              ))}
            </div>
            <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-3.5 rounded-full relative hover:bg-slate-700">
              <ShoppingCart size={22} className="text-white" />
              {carrito.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[11px] w-6 h-6 rounded-full flex items-center justify-center font-bold">{carrito.reduce((a, b) => a + b.cantidad, 0)}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* CUADRÍCULA DE PRODUCTOS RESPONSIVA */}
      <main className="p-5 w-full max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map(item => (
            <div key={item.id} className="bg-slate-800/80 rounded-3xl p-5 shadow-xl shadow-black/10 flex flex-col gap-4 border border-slate-700/50 hover:border-orange-500/30 transition-all group">
              <div className="relative overflow-hidden rounded-2xl h-48">
                <img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.nombre} />
              </div>
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">{item.nombre}</h3>
                  <p className="text-slate-400 text-sm mt-1 leading-snug">{item.descripcion}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-black text-2xl text-orange-500">${item.precio}</span>
                  <button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-12 h-12 rounded-2xl font-bold text-2xl active:scale-90 hover:scale-105 transition-all shadow-lg shadow-orange-900/30">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* PANEL DEL CARRITO (SIDEBAR) */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${verCarrito ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity ${verCarrito ? 'opacity-100' : 'opacity-0'}`} onClick={() => setVerCarrito(false)} />
        <div className={`absolute right-0 top-0 h-full w-full sm:w-[400px] bg-slate-950 shadow-2xl transition-transform duration-300 transform ${verCarrito ? 'translate-x-0' : 'translate-x-full'} p-7 flex flex-col border-l border-slate-800`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-5">
            <h2 className="text-2xl font-black text-white">Tu Pedido</h2>
            <X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer hover:text-white" size={24} />
          </div>
          
          <div className="flex-1 overflow-y-auto py-5 space-y-5 no-scrollbar">
            {carrito.length === 0 ? <p className="text-center text-slate-600 mt-14 italic">Tu pedido está vacío...</p> : 
              carrito.map(item => (
                <div key={item.id} className="flex flex-col gap-2.5 border-b border-slate-800/50 pb-5">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-white uppercase pr-3">{item.nombre}</span>
                    <button onClick={() => eliminarTotalmente(item.id)} className="text-red-400/80"><Trash2 size={16}/></button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-500 font-bold text-base">${item.precio * item.cantidad}</span>
                    <div className="flex items-center gap-3 bg-slate-800 rounded-full px-4 py-1.5">
                      <button onClick={() => restarDelCarrito(item.id)} className="text-slate-400"><Minus size={14}/></button>
                      <span className="font-bold text-white text-sm">{item.cantidad}</span>
                      <button onClick={() => agregarAlCarrito(item)} className="text-orange-500"><Plus size={14}/></button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
          
          <div className="pt-6 border-t border-slate-800 space-y-6">
            <div className="flex justify-between items-end">
                <span className="font-bold text-slate-500 uppercase text-xs tracking-widest">Total</span>
                <span className="font-black text-3xl text-orange-500">${total}</span>
            </div>
            <button disabled={carrito.length === 0} onClick={enviarPedido} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-center items-center gap-2.5 active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 shadow-xl shadow-orange-900/40 text-lg">
              <MessageCircle size={24} /> ENVIAR PEDIDO
            </button>
          </div>
        </div>
      </div>

      {/* BOTÓN FLOTANTE (Centrado para PC) */}
      {carrito.length > 0 && !verCarrito && (
        <div className="fixed bottom-7 left-0 right-0 px-5 z-30 flex justify-center">
          <button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-slate-950 text-white py-4.5 rounded-3xl font-black shadow-2xl flex justify-between px-8 border border-slate-800 hover:scale-105 transition-all">
            <span className="text-xs uppercase tracking-widest flex items-center gap-2.5 text-orange-500">🛒 Ver Pedido ({carrito.reduce((a, b) => a + b.cantidad, 0)})</span>
            <span className="text-xl leading-none">${total}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;