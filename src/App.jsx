import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Trash2, X, Plus, Minus, Wifi, UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, CreditCard } from 'lucide-react';

// DATOS DE TU TARJETA PARA EL CLIENTE
const DATOS_PAGO = "💳 *DATOS DE PAGO*:\nBanco: Tu Banco\nCuenta: 0000 0000 0000 0000\nCLABE: 000000000000000000\nA nombre de: Tribus Bar";

const MENU_LOCAL = [
  { id: 1, nombre: "Burger Tribus Clásica", precioMesa: 200, precioDomicilio: 220, categoria: "Comidas", descripcion: "Doble medallón de carne, cheddar y salsa de la casa.", imagen: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500" },
  { id: 2, nombre: "Papas con Cheddar", precioMesa: 120, precioDomicilio: 135, categoria: "Comidas", descripcion: "Papas naturales fritas con mucho cheddar.", imagen: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?q=80&w=1925" },
  { id: 3, nombre: "Cerveza IPA", precioMesa: 60, precioDomicilio: 70, categoria: "Bebidas", descripcion: "Pinta de 500ml con aroma cítrico.", imagen: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=500" },
  { id: 4, nombre: "Fernet con Coca", precioMesa: 140, precioDomicilio: 160, categoria: "Bebidas", descripcion: "El clásico de la casa en vaso grande.", imagen: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=500" },
  { id: 5, nombre: "Volcán de Chocolate", precioMesa: 180, precioDomicilio: 200, categoria: "Postres", descripcion: "Con una bocha de helado de chocolate.", imagen: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=500" }
];

const CATEGORIAS = ["Todos", "Comidas", "Bebidas", "Postres"];

function App() {
  const [view, setView] = useState('welcome');
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState(null);
  const [verCarrito, setVerCarrito] = useState(false);
  const [catSeleccionada, setCatSeleccionada] = useState("Todos");
  const [pedidosBarra, setPedidosBarra] = useState([]);
  const [historialEntregados, setHistorialEntregados] = useState([]); 
  
  // PERSISTENCIA MEJORADA
  const [historialCerrado, setHistorialCerrado] = useState(() => {
    const saved = localStorage.getItem('tribus_tickets_v1');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [cantidadAnterior, setCantidadAnterior] = useState(0);
  const [filtroMesa, setFiltroMesa] = useState(""); 
  const [ticketParaReimprimir, setTicketParaReimprimir] = useState(null);

  useEffect(() => {
    localStorage.setItem('tribus_tickets_v1', JSON.stringify(historialCerrado));
  }, [historialCerrado]);

  const obtenerPrecioItem = (item) => mesa ? item.precioMesa : item.precioDomicilio;
  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  
  // Total del turno actual (solo no archivados)
  const totalCajaHoy = historialCerrado
    .filter(hc => !hc.archivado)
    .reduce((acc, curr) => acc + parseFloat(curr.total), 0);

  const agruparPorMesa = (lista) => {
    const agrupados = {};
    lista.forEach(p => {
      const key = p.mesa;
      if (!agrupados[key]) {
        agrupados[key] = { ...p, total: parseFloat(p.total) };
      } else {
        agrupados[key].detalle += "\n" + p.detalle;
        agrupados[key].total += parseFloat(p.total);
      }
    });
    return Object.values(agrupados);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mesa")) setMesa(params.get("mesa"));
    if (params.get("view") === 'barra') setView('barra');
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

  const agregarAlCarrito = (item) => {
    const p = obtenerPrecioItem(item);
    const ex = carrito.find(x => x.id === item.id);
    if (ex) setCarrito(carrito.map(x => x.id === item.id ? { ...ex, cantidad: ex.cantidad + 1 } : x));
    else setCarrito([...carrito, { ...item, precio: p, cantidad: 1 }]);
  };

  const restarDelCarrito = (id) => {
    const ex = carrito.find(x => x.id === id);
    if (!ex) return;
    if (ex.cantidad === 1) setCarrito(carrito.filter(x => x.id !== id));
    else setCarrito(carrito.map(x => x.id === id ? { ...ex, cantidad: ex.cantidad - 1 } : x));
  };

  const enviarPedido = async () => {
    const detalleTexto = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
    let m = mesa || "DOM";

    if (!mesa) {
      const t = window.prompt("Ingresa tu teléfono:");
      if (!t) return;
      m = `TEL: ${t}`;
      const msg = `*TRIBUS BAR*\n\n${detalleTexto}\n\n*Total: $${totalCarrito}*\n\n${DATOS_PAGO}\n\n_Favor de enviar comprobante por este medio._`;
      window.location.href = `https://wa.me/526278897648?text=${encodeURIComponent(msg)}`;
    }

    try {
      await fetch('http://localhost:3001/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa: m, detalle: detalleTexto, total: totalCarrito, pagado: mesa ? 1 : 0 })
      });
      if (mesa) setView('success');
      setCarrito([]); setVerCarrito(false);
    } catch (e) { setView('success'); }
  };

  // CIERRE DE TURNO SEGURO: Archiva pero no borra
  const realizarCierreTurno = () => {
    if (window.confirm(`¿Cerrar turno con $${totalCajaHoy}? Los tickets se guardarán en el historial pero la caja volverá a $0.`)) {
      setHistorialCerrado(historialCerrado.map(t => ({ ...t, archivado: true })));
    }
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white font-sans">
        <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
        <h1 className="text-4xl font-black italic mb-4 uppercase">¡RECIBIDO!</h1>
        <button onClick={() => setView('welcome')} className="mt-10 text-orange-500 font-bold border-b border-orange-500 tracking-widest uppercase">Volver</button>
      </div>
    );
  }

  if (view === 'barra') {
    const listaAgrupada = agruparPorMesa(historialEntregados);
    const busqueda = filtroMesa.toLowerCase();

    // Filtros flexibles para la vista principal
    const filtradosMesas = listaAgrupada.filter(h => !h.mesa.startsWith("TEL:") && (String(h.mesa).toLowerCase().includes(busqueda)));
    const mostrarExternos = filtroMesa.length >= 3;
    const pedidosExternos = listaAgrupada.filter(h => h.mesa.startsWith("TEL:") && h.mesa.toLowerCase().includes(busqueda));
    
    // Historial: Muestra actuales si no hay búsqueda, o busca en TODO si escribes
    const historialParaMostrar = filtroMesa 
      ? historialCerrado.filter(hc => hc.mesa.toLowerCase().includes(busqueda) || hc.detalle.toLowerCase().includes(busqueda)).slice(0, 20)
      : historialCerrado.filter(hc => !hc.archivado);

    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col lg:flex-row gap-6 font-sans print:bg-white print:p-0">
        
        {/* MODAL TICKET */}
        {ticketParaReimprimir && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md print:bg-white print:static">
            <div className="bg-white text-black w-full max-w-[300px] p-8 font-mono shadow-2xl relative print:shadow-none print:w-full">
              <button onClick={() => setTicketParaReimprimir(null)} className="absolute -top-12 right-0 text-white print:hidden"><X size={32}/></button>
              <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                <h2 className="font-black text-2xl italic tracking-tighter">TRIBUS BAR</h2>
                <p className="text-[10px] uppercase font-bold mt-1 tracking-widest">Nota de Venta</p>
              </div>
              <div className="flex justify-between text-[11px] mb-4 font-bold uppercase">
                <span>{ticketParaReimprimir.mesa.startsWith("TEL:") ? "CLIENTE:" : "MESA:"}</span>
                <span>{ticketParaReimprimir.mesa}</span>
              </div>
              <div className="text-[10px] whitespace-pre-line leading-tight mb-6 border-b border-gray-100 pb-4">{ticketParaReimprimir.detalle}</div>
              <div className="flex justify-between font-black text-2xl border-t-2 border-dashed border-black pt-4">
                <span>TOTAL:</span><span>${ticketParaReimprimir.total}</span>
              </div>
              <p className="text-[9px] text-center mt-8 text-gray-400 font-bold uppercase">{new Date(ticketParaReimprimir.fecha).toLocaleString()}</p>
              <button onClick={() => window.print()} className="mt-8 w-full bg-black text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 uppercase text-xs print:hidden"><Printer size={18}/> Imprimir</button>
            </div>
          </div>
        )}

        <div className="flex-1 print:hidden">
          <header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <h1 className="text-4xl font-black text-orange-600 italic uppercase tracking-tighter">BARRA</h1>
            <div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold border border-slate-800 uppercase animate-pulse">● Online</div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pedidosBarra.map(p => (
              <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl relative flex flex-col justify-between shadow-xl">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${p.mesa.startsWith("TEL:") ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black italic mb-1 text-white uppercase tracking-tighter">
                      {p.mesa.startsWith("TEL:") ? "📦 DOMICILIO" : `MESA ${p.mesa}`}
                    </h3>
                    {p.mesa.startsWith("TEL:") && (
                      <span className="bg-blue-900/30 text-blue-400 text-[9px] px-2 py-1 rounded-lg border border-blue-800 font-black animate-pulse flex items-center gap-1 uppercase tracking-tighter">
                        <CreditCard size={10}/> Pago Pendiente
                      </span>
                    )}
                  </div>
                  {p.mesa.startsWith("TEL:") && <p className="text-blue-500 font-black text-xs mb-3 tracking-widest">{p.mesa}</p>}
                  <p className="text-lg text-slate-300 whitespace-pre-line leading-tight">{p.detalle}</p>
                </div>
                <button onClick={async () => {
                  await fetch(`http://localhost:3001/api/pedidos/entregar/${p.id}`, { method: 'PUT' });
                  setHistorialEntregados([p, ...historialEntregados]);
                  cargarPedidosBarra(); 
                }} className="bg-orange-600 hover:bg-orange-500 w-full py-3 rounded-xl font-black text-lg mt-4 uppercase">Listo</button>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[350px] space-y-4 print:hidden">
          <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800 shadow-xl">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-600" size={16}/>
                <input type="text" placeholder="Buscar mesa o ticket..." value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-orange-500 font-bold" />
            </div>
          </div>

          {mostrarExternos && pedidosExternos.length > 0 && (
            <div className="bg-[#0c111a] p-5 rounded-[2rem] border-2 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                <h2 className="text-lg font-black text-blue-400 mb-4 flex items-center gap-2 uppercase italic leading-none"><MessageCircle size={20}/> Externos</h2>
                <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar pr-1">
                {pedidosExternos.map((h, i) => (
                    <div key={i} className="bg-[#161d2b] p-3 rounded-2xl border border-blue-700/20">
                      <div className="flex justify-between font-black text-blue-400 text-xs mb-1 uppercase italic">
                        <span>{h.mesa}</span><span className="text-white text-lg">${h.total}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 whitespace-pre-line bg-black/30 p-2 rounded-lg mb-3 leading-tight">{h.detalle}</p>
                      <button onClick={() => {
                          const ticket = { ...h, fecha: new Date(), archivado: false };
                          setHistorialCerrado([ticket, ...historialCerrado]);
                          setHistorialEntregados(historialEntregados.filter(item => String(item.mesa) !== String(h.mesa)));
                          setTicketParaReimprimir(ticket);
                      }} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Confirmar Pago y Cobrar</button>
                    </div>
                ))}
                </div>
            </div>
          )}

          <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-slate-800 shadow-2xl">
            <h2 className="text-lg font-black text-green-500 mb-4 flex items-center gap-2 uppercase italic leading-none"><CheckCircle size={20}/> Mesas</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
              {filtradosMesas.map((h, i) => (
                <div key={i} className="bg-[#161d2b] p-3 rounded-2xl border border-slate-700/30">
                  <div className="flex justify-between font-black text-orange-500 text-base mb-1 italic">
                    <span>Mesa {h.mesa}</span><span className="text-white">${h.total}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 whitespace-pre-line bg-black/30 p-2 rounded-lg mb-3 leading-tight">{h.detalle}</p>
                  <button onClick={() => {
                     const ticket = { ...h, fecha: new Date(), archivado: false };
                     setHistorialCerrado([ticket, ...historialCerrado]);
                     setHistorialEntregados(historialEntregados.filter(item => String(item.mesa) !== String(h.mesa)));
                     setTicketParaReimprimir(ticket);
                  }} className="w-full bg-green-600 hover:bg-green-500 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Cobrar Mesa</button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-orange-900/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-orange-600 flex items-center gap-2 uppercase italic leading-none"><ReceiptText size={20}/> Caja</h2>
                {!filtroMesa && <button onClick={realizarCierreTurno} className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg uppercase tracking-tighter">Cierre Turno</button>}
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar mb-4 pr-1">
              {historialParaMostrar.map((hc, idx) => (
                <div key={idx} onClick={() => setTicketParaReimprimir(hc)} className={`p-3 bg-[#05070a] rounded-xl border flex flex-col gap-1.5 shadow-inner cursor-pointer hover:border-orange-500 transition-all ${hc.archivado ? 'opacity-40 border-slate-800' : 'border-slate-700'}`}>
                  <div className="flex justify-between font-black text-[11px] uppercase tracking-tighter">
                    <span className={hc.mesa.startsWith("TEL:") ? "text-blue-400 italic" : "text-slate-400"}>{hc.mesa.startsWith("TEL:") ? "📦 EXTERNO" : `MESA ${hc.mesa}`}</span>
                    <span className="text-green-500">${hc.total}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 whitespace-pre-line bg-[#0c111a] rounded-lg line-clamp-1 italic px-1">{hc.detalle}</p>
                  <div className="text-[8px] text-slate-700 text-right uppercase font-bold flex justify-between tracking-tighter">
                    <span>{new Date(hc.fecha).toLocaleDateString()}</span>
                    <span>{new Date(hc.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
            </div>
            {!filtroMesa && (
                <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline font-black">
                    <span className="text-slate-500 text-[10px] uppercase italic tracking-tighter">Total Caja Turno:</span>
                    <span className="text-2xl text-green-500 tracking-tighter">${totalCajaHoy}</span>
                </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VISTAS CLIENTE ---
  const filtered = catSeleccionada === "Todos" ? MENU_LOCAL : MENU_LOCAL.filter(p => p.categoria === catSeleccionada);

  return (
    <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans">
      <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter">TRIBUS</div>
            <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative active:scale-90 transition-all shadow-xl"><ShoppingCart size={20} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIAS.map(c => (
              <button key={c} onClick={() => setCatSeleccionada(c)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${catSeleccionada === c ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{c}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-4 w-full max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-slate-800/60 rounded-3xl p-4 flex flex-row md:flex-col gap-4 border border-slate-700/30 group shadow-lg">
              <div className="w-24 h-24 md:w-full md:h-48 flex-shrink-0 rounded-2xl overflow-hidden"><img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="p" /></div>
              <div className="flex-1 flex flex-col justify-between">
                <div><h3 className="font-bold text-white leading-tight text-base md:text-lg uppercase tracking-tight">{item.nombre}</h3><p className="text-slate-500 text-xs mt-1 line-clamp-2 italic">{item.descripcion}</p></div>
                <div className="flex justify-between items-center mt-3"><span className="font-black text-xl md:text-2xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-10 h-10 md:w-12 md:h-12 rounded-xl font-bold shadow-lg active:scale-90 transition-all">+</button></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible' : 'invisible'}`}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />
        <div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase tracking-tighter text-xl"><h2>Mi Pedido</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
            {carrito.map(item => (
              <div key={item.id} className="bg-slate-900/50 p-3 rounded-2xl flex flex-col gap-2 border border-slate-800 shadow-sm">
                <div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600"/></button></div>
                <div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1 shadow-inner"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex justify-between font-black text-2xl text-orange-500 italic uppercase tracking-tighter"><span>Total</span><span>${totalCarrito}</span></div>
            <button disabled={carrito.length === 0} onClick={enviarPedido} className={`w-full py-4 rounded-2xl font-black text-white active:scale-95 transition-all shadow-xl ${mesa ? 'bg-orange-600 shadow-orange-950/20' : 'bg-green-600 shadow-green-950/20'} uppercase tracking-widest`}>{mesa ? 'Confirmar Pedido' : 'Pedir por WhatsApp'}</button>
          </div>
        </div>
      </div>

      {carrito.length > 0 && !verCarrito && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center">
          <button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 border border-orange-500 shadow-2xl active:scale-95 transition-all">
            <span className="text-xs uppercase font-bold tracking-widest text-[10px]">🛒 MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span>
            <span className="font-black text-xl italic">${totalCarrito}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;