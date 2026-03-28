import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Trash2, X, Plus, Minus, Wifi, UtensilsCrossed, Zap, CheckCircle, ReceiptText, DollarSign } from 'lucide-react';

const MENU_LOCAL = [
  { id: 1, nombre: "Burger Tribus Clásica", precio: 200, categoria: "Comidas", descripcion: "Doble medallón de carne, cheddar y salsa de la casa.", imagen: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500" },
  { id: 2, nombre: "Papas con Cheddar", precio: 120, categoria: "Comidas", descripcion: "Papas naturales fritas con mucho cheddar.", imagen: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?q=80&w=1925" },
  { id: 3, nombre: "Cerveza IPA", precio: 60, categoria: "Bebidas", descripcion: "Pinta de 500ml con aroma cítrico.", imagen: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=500" },
  { id: 4, nombre: "Fernet con Coca", precio: 140, categoria: "Bebidas", descripcion: "El clásico de la casa en vaso grande.", imagen: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=500" },
  { id: 5, nombre: "Volcán de Chocolate", precio: 180, categoria: "Postres", descripcion: "Con una bocha de helado de chocolate.", imagen: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=500" }
];

const CATEGORIAS = ["Todos", "Comidas", "Bebidas", "Postres"];

function App() {
  // --- 1. ESTADOS (HOOKS) ---
  const [view, setView] = useState('welcome');
  const [menuItems, setMenuItems] = useState(MENU_LOCAL); // <-- DECLARADO AQUÍ
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState(null);
  const [verCarrito, setVerCarrito] = useState(false);
  const [catSeleccionada, setCatSeleccionada] = useState("Todos");
  const [pedidosBarra, setPedidosBarra] = useState([]);
  const [historialEntregados, setHistorialEntregados] = useState([]); 
  const [historialCerrado, setHistorialCerrado] = useState([]);      
  const [cantidadAnterior, setCantidadAnterior] = useState(0);
  const [filtroMesa, setFiltroMesa] = useState(""); 

  // --- 2. EFECTOS ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesaParam = params.get("mesa");
    const viewParam = params.get("view");
    if (mesaParam) setMesa(mesaParam);
    if (viewParam === 'barra') setView('barra');
  }, []);

  const cargarPedidosBarra = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/pedidos/pendientes');
      const data = await res.json();
      if (data.length > cantidadAnterior && cantidadAnterior !== 0) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2216/2216-preview.mp3').play().catch(() => {});
      }
      setPedidosBarra(data);
      setCantidadAnterior(data.length);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (view === 'barra') {
      cargarPedidosBarra();
      const interval = setInterval(cargarPedidosBarra, 10000);
      return () => clearInterval(interval);
    }
  }, [view, cantidadAnterior]);

  // --- 3. LÓGICA ---
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

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const enviarPedido = async () => {
    const detalleTexto = carrito.map(i => `${i.cantidad}x ${i.nombre}`).join('\n');
    let identificadorMesa = mesa; 
    
    if (!mesa) {
      const telCliente = window.prompt("Introduce tu teléfono para confirmar:");
      if (!telCliente) return; 
      identificadorMesa = `TEL: ${telCliente}`;
      
      const mensajeWA = encodeURIComponent(`*PEDIDO TRIBUS*\n\n${detalleTexto}\n\n*Total:* $${totalCarrito}\n*Contacto:* ${identificadorMesa}`);
      window.open(`https://wa.me/526278897648?text=${mensajeWA}`, '_blank');
    }

    try {
      await fetch('http://localhost:3001/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa: identificadorMesa, detalle: detalleTexto, total: totalCarrito })
      });
      setView('success'); 
      setCarrito([]);
      setVerCarrito(false);
    } catch (error) { setView('success'); }
  };

  const agruparPorMesa = (lista) => {
    const agrupados = {};
    lista.forEach(p => {
      if (!agrupados[p.mesa]) {
        agrupados[p.mesa] = { ...p, total: parseFloat(p.total) };
      } else {
        agrupados[p.mesa].detalle += "\n" + p.detalle;
        agrupados[p.mesa].total += parseFloat(p.total);
      }
    });
    return Object.values(agrupados);
  };

  const entregadosFiltrados = agruparPorMesa(historialEntregados).filter(h => !filtroMesa || String(h.mesa) === String(filtroMesa));
  const subtotalCaja = entregadosFiltrados.reduce((acc, curr) => acc + curr.total, 0);
  const totalHistoricoCobrado = historialCerrado.reduce((acc, curr) => acc + parseFloat(curr.total), 0);

  // --- VISTAS ---

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
        <h1 className="text-4xl font-black text-white italic mb-4 uppercase">¡RECIBIDO!</h1>
        <p className="text-slate-400">{mesa ? `Directo a la Mesa ${mesa}` : "Confirmando por WhatsApp..."}</p>
        <button onClick={() => setView('welcome')} className="mt-10 text-orange-500 font-bold border-b border-orange-500 uppercase text-xs tracking-widest">VOLVER AL INICIO</button>
      </div>
    );
  }

  if (view === 'barra') {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-orange-500 italic mb-8 uppercase">Barra</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pedidosBarra.map(p => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[250px]">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-600"></div>
                <div>
                  <div className="flex justify-between items-start mb-4"><span className="text-3xl font-black">MESA {p.mesa}</span></div>
                  <p className="text-xl text-slate-300 whitespace-pre-line">{p.detalle}</p>
                </div>
                <button onClick={async () => {
                  await fetch(`http://localhost:3001/api/pedidos/entregar/${p.id}`, { method: 'PUT' });
                  setHistorialEntregados([p, ...historialEntregados]);
                  cargarPedidosBarra(); 
                }} className="bg-orange-600 w-full py-4 rounded-2xl font-black mt-4">LISTO</button>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-96 space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-green-500 mb-4 flex items-center gap-2"><CheckCircle size={20}/> POR COBRAR</h2>
            <input type="text" placeholder="Filtrar mesa..." value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 mb-4 text-white outline-none" />
            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar mb-4">
              {entregadosFiltrados.map((h, idx) => (
                <div key={idx} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/30">
                  <div className="flex justify-between font-bold text-orange-500 mb-2"><span>Mesa {h.mesa}</span><span>${h.total}</span></div>
                  <p className="text-[10px] text-slate-400 whitespace-pre-line font-mono">{h.detalle}</p>
                </div>
              ))}
            </div>
            {filtroMesa && entregadosFiltrados.length > 0 && (
              <button onClick={() => {
                const mesaCobrada = entregadosFiltrados[0];
                const indexExistente = historialCerrado.findIndex(hc => String(hc.mesa) === String(filtroMesa));
                if (indexExistente !== -1) {
                  const histAct = [...historialCerrado];
                  histAct[indexExistente] = { ...histAct[indexExistente], total: parseFloat(histAct[indexExistente].total) + mesaCobrada.total, detalle: histAct[indexExistente].detalle + "\n" + mesaCobrada.detalle, fecha: new Date() };
                  setHistorialCerrado(histAct);
                } else {
                  setHistorialCerrado([{ ...mesaCobrada, fecha: new Date() }, ...historialCerrado]);
                }
                setHistorialEntregados(historialEntregados.filter(h => String(h.mesa) !== String(filtroMesa)));
                setFiltroMesa("");
              }} className="w-full bg-green-600 py-4 rounded-2xl font-black uppercase text-xs">Confirmar Cobro Mesa {filtroMesa}</button>
            )}
          </div>
          <div className="bg-slate-900/80 p-6 rounded-3xl border border-orange-900/30">
            <h2 className="text-xl font-bold text-orange-500 mb-4 flex items-center gap-2"><ReceiptText size={20}/> CAJA</h2>
            <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar mb-4">
              {historialCerrado.map((hc, idx) => (
                <div key={idx} className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-xs">Mesa {hc.mesa}</span>
                  <span className="text-green-500 font-black text-sm">$ {hc.total}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-700 flex justify-between font-black text-xl"><span>TOTAL</span><span className="text-green-500">$ {totalHistoricoCobrado}</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-40"><img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="fondo" /><div className="absolute inset-0 bg-slate-950/80"></div></div>
        <div className="relative z-10 space-y-12 w-full max-w-lg">
          <div className="flex justify-center items-center gap-2 text-orange-500 animate-pulse"><Zap size={48} /><h1 className="text-7xl font-black italic">TRIBUS</h1></div>
          <div className="grid gap-6">
            <button onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 flex items-center gap-4 text-left"><Wifi className="text-sky-400" size={32} /><div><p className="text-xs text-slate-400 font-bold tracking-widest uppercase">WI-FI</p><p className="text-xl font-bold uppercase">tribus2026</p></div></button>
            <button onClick={() => setView('menu')} className="bg-orange-600 p-6 rounded-3xl shadow-2xl flex items-center gap-4 text-left"><UtensilsCrossed size={32} /><div><p className="text-xs text-orange-200 font-bold uppercase tracking-widest">Menú</p><p className="text-xl font-bold uppercase">Explorar</p></div></button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA MENÚ (USANDO menuItems CORRECTAMENTE) ---
  const productosFiltrados = catSeleccionada === "Todos" ? menuItems : menuItems.filter(p => p.categoria === catSeleccionada);

  return (
    <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center">
      <header className="bg-slate-950/90 backdrop-blur-md p-4 sticky top-0 z-40 w-full flex justify-center border-b border-slate-800">
        <div className="max-w-6xl w-full flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex justify-between items-center w-full md:w-auto">
            <div onClick={() => setView('welcome')} className="cursor-pointer"><h1 className="text-2xl font-black text-orange-500 italic uppercase leading-none">TRIBUS</h1></div>
            <button onClick={() => setVerCarrito(true)} className="md:hidden bg-slate-800 p-3 rounded-full relative"><ShoppingCart size={20} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] px-1.5 rounded-full">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
            {CATEGORIAS.map(cat => (
              <button key={cat} onClick={() => setCatSeleccionada(cat)} className={`px-5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap ${catSeleccionada === cat ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{cat}</button>
            ))}
          </div>
          <button onClick={() => setVerCarrito(true)} className="hidden md:block bg-slate-800 p-3 rounded-full relative"><ShoppingCart size={22} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs px-2 rounded-full font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
        </div>
      </header>

      <main className="p-4 md:p-8 w-full max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {productosFiltrados.map(item => (
            <div key={item.id} className="bg-slate-800/60 rounded-3xl p-4 border border-slate-700/50 flex flex-row md:flex-col gap-4">
              <div className="w-24 h-24 md:w-full md:h-48 flex-shrink-0 rounded-2xl overflow-hidden"><img src={item.imagen} className="w-full h-full object-cover" alt={item.nombre} /></div>
              <div className="flex-1 flex flex-col justify-between">
                <div><h3 className="font-bold text-white text-base md:text-lg">{item.nombre}</h3><p className="text-slate-500 text-xs md:text-sm line-clamp-2">{item.descripcion}</p></div>
                <div className="flex justify-between items-center mt-2"><span className="font-black text-xl text-orange-500">${item.precio}</span><button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-10 h-10 md:w-12 md:h-12 rounded-xl font-bold shadow-lg shadow-orange-950/40 hover:scale-105 active:scale-95 transition-all">+</button></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible' : 'invisible'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />
        <div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic"><h2>MI PEDIDO</h2><X onClick={() => setVerCarrito(false)} className="cursor-pointer text-slate-500" /></div>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
            {carrito.map(item => (
              <div key={item.id} className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between font-bold text-xs text-white uppercase"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600 hover:text-red-500"/></button></div>
                <div className="flex justify-between items-center"><span className="text-orange-500 font-bold">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800 space-y-6">
            <div className="flex justify-between items-end text-slate-500 font-bold uppercase text-xs tracking-widest"><span>Total</span><span className="font-black text-3xl text-orange-500">${totalCarrito}</span></div>
            <button disabled={carrito.length === 0} onClick={enviarPedido} className={`w-full py-4 rounded-2xl font-black flex justify-center items-center gap-2 active:scale-95 transition-all shadow-xl ${mesa ? 'bg-orange-600 shadow-orange-950/20' : 'bg-green-600 shadow-green-950/20'}`}>{mesa ? <CheckCircle size={20}/> : <MessageCircle size={20}/>} {mesa ? 'CONFIRMAR PEDIDO' : 'PEDIR POR WHATSAPP'}</button>
          </div>
        </div>
      </div>

      {carrito.length > 0 && !verCarrito && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center">
          <button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black shadow-2xl flex justify-between px-8 border border-orange-500 hover:scale-105 active:scale-95 transition-all">
            <span className="text-xs uppercase font-bold tracking-widest">🛒 MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span>
            <span className="font-black text-xl">${totalCarrito}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;