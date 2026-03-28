import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Trash2, X, Plus, Minus, Wifi, UtensilsCrossed, Zap, CheckCircle, ReceiptText, DollarSign } from 'lucide-react';

const MENU_LOCAL = [
  { id: 1, nombre: "Burger Tribus Clásica", precio: 200, categoria: "Comidas", descripcion: "Doble medallón de carne, cheddar y salsa de la casa.", imagen: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500" },
  { id: 2, nombre: "Papas con Cheddar", precio: 120, categoria: "Comidas", descripcion: "Papas naturales fritas con mucho cheddar.", imagen: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?q=80&w=1925" },
  { id: 3, nombre: "Cerveza IPA", precio: 60, categoria: "Bebidas", descripcion: "Pinta de 500ml con aroma cítrico.", imagen: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=500" },
  { id: 4, nombre: "Fernet con Coca", precio: 140, categoria: "Bebidas", descripcion: "El clásico de la casa en vaso grande.", imagen: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=500" },
  { id: 5, nombre: "Volcán de Chocolate", precio: 180, categoria: "Postres", descripcion: "Con una bocha de helado de crema americana.", imagen: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=500" }
];

const CATEGORIAS = ["Todos", "Comidas", "Bebidas", "Postres"];

function App() {
  // --- ESTADOS (HOOKS) ---
  const [view, setView] = useState('welcome');
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState(null);
  const [verCarrito, setVerCarrito] = useState(false);
  const [catSeleccionada, setCatSeleccionada] = useState("Todos");
  const [pedidosBarra, setPedidosBarra] = useState([]);
  const [historialEntregados, setHistorialEntregados] = useState([]); 
  const [historialCerrado, setHistorialCerrado] = useState([]);      
  const [cantidadAnterior, setCantidadAnterior] = useState(0);
  const [filtroMesa, setFiltroMesa] = useState(""); 

  // --- EFECTOS ---
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

  // --- LÓGICA CARRITO ---
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
    let urlWhatsApp = "";

    // 1. SI ES DOMICILIO, PEDIMOS EL TELÉFONO Y PREPARAMOS EL LINK ANTES DEL FETCH
    if (!mesa) {
      const telCliente = window.prompt("Introduce tu número de teléfono para confirmar el pedido:");
      if (!telCliente) return; 
      identificadorMesa = `TEL: ${telCliente}`;
      
      const mensajeWA = encodeURIComponent(`*PEDIDO TRIBUS*\n\n${detalleTexto}\n\n*Total:* $${totalCarrito}\n*Contacto:* ${identificadorMesa}`);
      urlWhatsApp = `https://wa.me/526278897648?text=${mensajeWA}`;
      
      // Abrimos WhatsApp inmediatamente para que el navegador no lo bloquee
      window.open(urlWhatsApp, '_blank');
    }

    try {
      // 2. ENVIAMOS A LA BASE DE DATOS
      await fetch('http://localhost:3001/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa: identificadorMesa, detalle: detalleTexto, total: totalCarrito })
      });
      
      // 3. MOSTRAMOS ÉXITO
      setView('success'); 
      setCarrito([]);
      setVerCarrito(false);

    } catch (error) { 
      console.error("Error DB:", error);
      setView('success'); 
    }
  };

  // --- AGRUPACIÓN CAJA ---
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

  const entregadosAgrupados = agruparPorMesa(historialEntregados);
  const entregadosFiltrados = filtroMesa 
    ? entregadosAgrupados.filter(h => String(h.mesa) === String(filtroMesa))
    : entregadosAgrupados;

  const subtotalCaja = entregadosFiltrados.reduce((acc, curr) => acc + curr.total, 0);
  const totalHistoricoCobrado = historialCerrado.reduce((acc, curr) => acc + parseFloat(curr.total), 0);

  // --- VISTAS ---

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-green-500/20 p-6 rounded-full mb-6 animate-bounce">
          <CheckCircle size={80} className="text-green-500" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 italic uppercase leading-none">¡Pedido Recibido!</h1>
        <p className="text-slate-400 text-lg max-w-xs leading-relaxed">
          {mesa 
            ? `Tu comanda ya está en la barra. Te lo llevamos a la Mesa ${mesa} en un momento.` 
            : "Se ha abierto WhatsApp para confirmar tu pedido a domicilio."}
        </p>
        <button onClick={() => setView('welcome')} className="mt-10 bg-slate-900 text-slate-300 px-8 py-3 rounded-2xl font-bold border border-slate-800 uppercase text-xs tracking-widest">Volver al Menú</button>
      </div>
    );
  }

  if (view === 'barra') {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white font-sans flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl font-black text-orange-500 italic uppercase leading-none">Tribus <span className="text-white">Barra</span></h1>
            <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 text-green-500 font-bold text-sm animate-pulse">● EN LÍNEA</div>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pedidosBarra.map(p => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-600"></div>
                <div>
                  <div className="flex justify-between items-start mb-4 text-3xl font-black italic">
                    <span>MESA {p.mesa}</span>
                    <span className="text-slate-500 text-sm font-mono">{new Date(p.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xl text-slate-300 mb-6 leading-relaxed whitespace-pre-line">{p.detalle}</p>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-4">
                  <span className="text-2xl font-black text-orange-500">${p.total}</span>
                  <button onClick={async () => {
                      await fetch(`http://localhost:3001/api/pedidos/entregar/${p.id}`, { method: 'PUT' });
                      setHistorialEntregados([p, ...historialEntregados]);
                      cargarPedidosBarra(); 
                    }} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-2xl font-black transition-all">LISTO</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-96 space-y-6">
          <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold text-slate-400 mb-4 flex items-center gap-2"><CheckCircle className="text-green-500" size={24} /> POR COBRAR</h2>
            <input type="text" placeholder="Filtrar por mesa (ej: 5)" value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 mb-6 text-white outline-none focus:border-orange-500 text-sm" />
            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar mb-6">
              {entregadosFiltrados.map((h, idx) => (
                <div key={idx} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/30">
                  <div className="flex justify-between border-b border-slate-700/50 pb-2 mb-2 font-bold"><span className="text-orange-500 text-lg uppercase">Mesa {h.mesa}</span><span className="text-white">${h.total}</span></div>
                  <p className="text-[11px] text-slate-400 whitespace-pre-line font-mono leading-relaxed">{h.detalle}</p>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-700">
              <div className="flex justify-between mb-4 text-xs font-bold uppercase text-slate-500"><span>Subtotal</span><span className="text-2xl text-white">${subtotalCaja}</span></div>
              {filtroMesa && entregadosFiltrados.length > 0 && (
                <button onClick={() => {
                  if(window.confirm(`¿Confirmar cobro Mesa ${filtroMesa}?`)) {
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
                  }
                }} className="w-full bg-green-600 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-green-900/20">Confirmar Cobro</button>
              )}
            </div>
          </div>
          <div className="bg-slate-900/80 rounded-3xl p-6 border border-orange-900/30">
            <h2 className="text-xl font-bold text-orange-500 mb-4 flex items-center gap-2"><ReceiptText size={24} /> CAJA DEL DÍA</h2>
            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar mb-6">
              {historialCerrado.map((hc, idx) => (
                <div key={idx} className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 transition-all hover:bg-slate-900/50">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 font-bold">
                    <span className="text-white text-sm uppercase tracking-tighter">Mesa {hc.mesa}</span>
                    <span className="text-green-500">$ {hc.total}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 whitespace-pre-line italic leading-tight">{hc.detalle}</p>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Caja Total</span>
               <span className="text-3xl font-black text-green-500">$ {totalHistoricoCobrado}</span>
            </div>
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
          <div className="space-y-3">
            <div className="flex justify-center items-center gap-2 text-orange-500 mb-6 animate-pulse"><Zap size={48} /><h1 className="text-7xl font-black italic tracking-tighter leading-none">TRIBUS</h1></div>
            <p className="text-2xl font-light uppercase text-slate-300 tracking-widest">Bar & Grill</p>
            {mesa && <p className="text-green-400 font-bold mt-6 italic text-xl animate-pulse uppercase">Mesa {mesa}</p>}
          </div>
          <div className="grid gap-6">
            <button onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} className="flex items-center justify-center gap-5 bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50"><Wifi className="text-sky-400" size={32} /> <div className="text-left uppercase font-bold text-xs text-slate-400"><p>Wi-Fi Gratis</p><p className="text-xl text-white">tribus2026</p></div></button>
            <button onClick={() => setView('menu')} className="flex items-center justify-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl transition-all active:scale-95"><UtensilsCrossed size={32} /> <div className="text-left uppercase font-bold text-xs text-orange-200"><p>Menú Digital</p><p className="text-xl text-white">Explorar</p></div></button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA DEL MENÚ ---
  const productosFiltrados = catSeleccionada === "Todos" ? MENU_LOCAL : MENU_LOCAL.filter(p => p.categoria === catSeleccionada);

  return (
    <div className="min-h-screen bg-slate-900 pb-28 font-sans text-slate-100 flex flex-col items-center">
      <header className="bg-slate-950/90 backdrop-blur-md p-6 sticky top-0 z-20 shadow-xl border-b border-slate-800 w-full flex justify-center">
        <div className="max-w-6xl w-full flex justify-between items-center">
          <div><button onClick={() => setView('welcome')} className="text-xs font-bold text-slate-500 hover:text-orange-400 uppercase">← Volver</button><h1 className="text-3xl font-black text-orange-500 italic leading-none">TRIBUS</h1></div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">{CATEGORIAS.map(cat => (
              <button key={cat} onClick={() => setCatSeleccionada(cat)} className={`px-6 py-2 rounded-full text-xs font-bold ${catSeleccionada === cat ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{cat}</button>
            ))}</div>
            <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-3.5 rounded-full relative"><ShoppingCart size={22} /> {carrito.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[11px] w-6 h-6 rounded-full flex items-center justify-center font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
          </div>
        </div>
      </header>

      <main className="p-5 w-full max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productosFiltrados.map(item => (
            <div key={item.id} className="bg-slate-800/80 rounded-3xl p-5 border border-slate-700/50 group flex flex-col justify-between">
              <div className="overflow-hidden rounded-2xl h-48 mb-4"><img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.nombre} /></div>
              <div className="space-y-4">
                <div><h3 className="font-bold text-white text-lg">{item.nombre}</h3><p className="text-slate-400 text-sm line-clamp-2">{item.descripcion}</p></div>
                <div className="flex justify-between items-center"><span className="font-black text-2xl text-orange-500">${item.precio}</span><button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-12 h-12 rounded-2xl font-bold shadow-lg shadow-orange-950/40 hover:scale-105 active:scale-95 transition-all">+</button></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* PANEL CARRITO */}
      <div className={`fixed inset-0 z-50 transition-all ${verCarrito ? 'visible' : 'invisible'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />
        <div className={`absolute right-0 top-0 h-full w-full sm:w-[400px] bg-slate-950 p-7 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-5"><h2 className="text-2xl font-black text-white italic">TU PEDIDO</h2><X onClick={() => setVerCarrito(false)} className="cursor-pointer" size={24} /></div>
          <div className="flex-1 overflow-y-auto py-5 space-y-5 no-scrollbar">{carrito.map(item => (
            <div key={item.id} className="flex flex-col gap-2.5 border-b border-slate-800/50 pb-5">
              <div className="flex justify-between font-bold text-white uppercase text-sm"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div>
              <div className="flex justify-between items-center"><span className="text-orange-500 font-bold">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-4 py-1.5"><Minus onClick={() => restarDelCarrito(item.id)} className="cursor-pointer" size={14}/><span className="font-bold">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} className="cursor-pointer" size={14}/></div></div>
            </div>
          ))}</div>
          <div className="pt-6 border-t border-slate-800 space-y-6">
            <div className="flex justify-between items-end"><span className="font-bold text-slate-500 uppercase text-xs font-bold tracking-widest">Total</span><span className="font-black text-3xl text-orange-500">${totalCarrito}</span></div>
            <button disabled={carrito.length === 0} onClick={enviarPedido} className={`w-full py-4 rounded-2xl font-black shadow-xl flex justify-center items-center gap-2.5 transition-all active:scale-95 ${mesa ? 'bg-orange-600 shadow-orange-950/20' : 'bg-green-600 shadow-green-950/20'}`}>
              {mesa ? ( <> <CheckCircle size={24} /> CONFIRMAR PEDIDO </> ) : ( <> <MessageCircle size={24} /> PEDIR POR WHATSAPP </> )}
            </button>
          </div>
        </div>
      </div>

      {carrito.length > 0 && !verCarrito && (
        <div className="fixed bottom-7 left-0 right-0 px-5 z-30 flex justify-center">
          <button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-slate-950 text-white py-4.5 rounded-3xl font-black shadow-2xl flex justify-between px-8 border border-slate-800 transition-all hover:scale-105">
            <span className="text-orange-500 text-xs uppercase tracking-widest">🛒 Ver Pedido ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span>
            <span className="text-xl font-black">${totalCarrito}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;