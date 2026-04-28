import React, { useState, useEffect } from 'react';
// --- IMPORTACIONES DE FIREBASE ---
import { db } from './firebase'; 
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, 
  query, where, orderBy, serverTimestamp, writeBatch 
} from "firebase/firestore";
// ---------------------------------
import { 
  ShoppingCart, MessageCircle, Trash2, X, Plus, Minus, Wifi, 
  UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, CreditCard 
} from 'lucide-react';

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
  const [historialCerrado, setHistorialCerrado] = useState([]); 
  const [filtroMesa, setFiltroMesa] = useState(""); 
  const [ticketParaReimprimir, setTicketParaReimprimir] = useState(null);

  const obtenerPrecioItem = (item) => mesa ? item.precioMesa : item.precioDomicilio;
  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  
  const totalCajaHoy = historialCerrado
    .filter(hc => !hc.archivado)
    .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mesa")) setMesa(params.get("mesa"));
    if (params.get("view") === 'barra') setView('barra');

    const qPedidos = query(collection(db, "pedidos"), where("estado", "==", "pendiente"));
    const unsubPedidos = onSnapshot(qPedidos, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosBarra(docs.sort((a, b) => (a.fecha?.seconds || 0) - (b.fecha?.seconds || 0)));
    });

    const qHistorial = query(collection(db, "historial_tickets"), orderBy("fecha", "desc"));
    const unsubHistorial = onSnapshot(qHistorial, (snapshot) => {
      setHistorialCerrado(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubPedidos(); unsubHistorial(); };
  }, []);

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
    if (carrito.length === 0) return;
    
    const detalleTexto = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
    let idFinal = mesa || null;
    let esExterno = !mesa;

    if (esExterno) {
      const t = window.prompt("Ingresa tu teléfono:");
      if (!t) return;
      idFinal = `TEL: ${t}`;
    }

    // Preparamos el link de WhatsApp antes para evitar bloqueos del navegador
    const mensajeWA = `¡Hola! Mi pedido es:\n\n${detalleTexto}\n\n*Total: $${totalCarrito}*\n\n${DATOS_PAGO}`;
    const urlWA = `https://wa.me/526278897648?text=${encodeURIComponent(mensajeWA)}`;

    try {
      await addDoc(collection(db, "pedidos"), {
        mesa: String(idFinal),
        detalle: detalleTexto,
        total: Number(totalCarrito),
        estado: "pendiente",
        fecha: serverTimestamp(),
        archivado: false
      });

      if (esExterno) {
        window.open(urlWA, '_blank');
      }

      setView('success');
      setCarrito([]); 
      setVerCarrito(false);
    } catch (e) { 
      console.error(e);
    }
  };

  const cobrarCuenta = async (p) => {
    try {
      await addDoc(collection(db, "historial_tickets"), {
        mesa: p.mesa,
        detalle: p.detalle,
        total: p.total,
        fecha: serverTimestamp(),
        archivado: false
      });
      await deleteDoc(doc(db, "pedidos", p.id));
      setTicketParaReimprimir(p);
    } catch (e) { console.error(e); }
  };

  const realizarCierreTurno = async () => {
    if (window.confirm(`¿Cerrar turno con $${totalCajaHoy}?`)) {
      try {
        const batch = writeBatch(db);
        historialCerrado.forEach((t) => {
          if (!t.archivado) {
            batch.update(doc(db, "historial_tickets", t.id), { archivado: true });
          }
        });
        await batch.commit();
      } catch (e) { console.error(e); }
    }
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white font-sans">
        <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
        <h1 className="text-4xl font-black italic mb-4 uppercase tracking-tighter leading-none">¡RECIBIDO!</h1>
        <p className="text-slate-400 mb-8 uppercase text-sm tracking-widest">Estamos preparando tu pedido</p>
        <button onClick={() => setView('welcome')} className="text-orange-500 font-bold border-b border-orange-500 uppercase tracking-widest">Volver al inicio</button>
      </div>
    );
  }

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
        <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="fondo" />
          <div className="absolute inset-0 bg-slate-950/80"></div>
        </div>
        <div className="relative z-10 space-y-12 w-full max-w-lg">
          <div className="space-y-4">
            <div className="flex justify-center items-center gap-2 text-orange-500 mb-2 animate-pulse">
              <Zap size={48} />
              <h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none">TRIBUS</h1>
            </div>
            <div className="space-y-2 uppercase tracking-tight">
              <h2 className="text-3xl font-bold">{mesa ? `¡BIENVENIDO MESA ${mesa}!` : "¡BIENVENIDO!"}</h2>
              <p className="text-orange-500 text-sm font-medium tracking-[0.2em]">{mesa ? "Tu pedido va directo a la barra" : "Pide para llevar o reserva"}</p>
            </div>
          </div>
          <div className="grid gap-4">
            <button onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} className="flex items-center gap-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/30 backdrop-blur-sm shadow-xl active:scale-95 transition-all">
              <Wifi className="text-sky-400" size={28} />
              <div className="text-left font-bold uppercase text-[10px] text-slate-400"><p>Wi-Fi Gratis</p><p className="text-lg text-white font-black">tribus2026</p></div>
            </button>
            <button onClick={() => setView('menu')} className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 transition-all">
              <UtensilsCrossed size={28} />
              <div className="text-left font-bold uppercase text-[10px] text-orange-200"><p>Menú Digital</p><p className="text-lg text-white font-black uppercase tracking-tight">Ver la carta</p></div>
            </button>
          </div>
          <button onClick={() => setView('barra')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
        </div>
      </div>
    );
  }

  if (view === 'barra') {
    const filtradosPendientes = pedidosBarra.filter(p => p.mesa.toLowerCase().includes(filtroMesa.toLowerCase()));
    const historialParaMostrar = filtroMesa 
      ? historialCerrado.filter(hc => hc.mesa.toLowerCase().includes(filtroMesa.toLowerCase())).slice(0, 20)
      : historialCerrado.filter(hc => !hc.archivado);

    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col lg:flex-row gap-6 font-sans">
        <style dangerouslySetInnerHTML={{__html: `@media print { .no-print { display: none !important; } body { background: white; color: black; } .print-container { width: 100% !important; padding: 5mm !important; } }`}} />
        
      {/* MODAL TICKET PARA IMPRESIÓN */}
{ticketParaReimprimir && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md print:static print:bg-white print:p-0">
    <div className="bg-white text-black w-full max-w-[280px] p-6 font-mono shadow-2xl relative print:shadow-none print:w-full print:max-w-none print-container">
      <button onClick={() => setTicketParaReimprimir(null)} className="absolute -top-12 right-0 text-white no-print"><X size={32}/></button>
      
      <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
        <h2 className="font-black text-xl italic uppercase tracking-tighter">TRIBUS BAR</h2>
        <p className="text-[10px] uppercase font-bold mt-1">Nota de Venta</p>
      </div>

      <div className="flex justify-between text-[11px] mb-2 font-bold uppercase">
        <span>{ticketParaReimprimir.mesa?.startsWith("TEL:") ? "CLIENTE:" : "MESA:"}</span>
        <span>{ticketParaReimprimir.mesa}</span>
      </div>

      {/* FECHA DE COBRO AÑADIDA AQUÍ */}
      <div className="flex justify-between text-[9px] mb-4 text-gray-600 font-bold uppercase border-b border-gray-100 pb-2">
        <span>FECHA COBRO:</span>
        <span>
          {ticketParaReimprimir.fecha?.seconds 
            ? new Date(ticketParaReimprimir.fecha.seconds * 1000).toLocaleString('es-MX', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            : new Date().toLocaleString('es-MX')}
        </span>
      </div>

      <div className="text-[10px] whitespace-pre-line leading-tight mb-6 min-h-[50px]">
        {ticketParaReimprimir.detalle}
      </div>

      <div className="flex justify-between font-black text-xl border-t-2 border-dashed border-black pt-4">
        <span>TOTAL:</span>
        <span>${ticketParaReimprimir.total}</span>
      </div>

      <div className="mt-8 text-center border-t border-gray-100 pt-4">
        <p className="text-[9px] uppercase font-bold text-gray-400 italic">¡Gracias por tu visita!</p>
      </div>

      <button onClick={() => window.print()} className="mt-8 w-full bg-black text-white py-4 rounded-xl font-black no-print active:scale-95 transition-all flex items-center justify-center gap-2">
        <Printer size={18}/> Imprimir Ticket
      </button>
    </div>
  </div>
)}

        <div className="flex-1 no-print">
          <header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <h1 className="text-4xl font-black text-orange-600 italic uppercase tracking-tighter">BARRA</h1>
            <div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold animate-pulse uppercase">● En Vivo</div>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtradosPendientes.map(p => (
              <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl relative shadow-xl flex flex-col justify-between">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${p.mesa.startsWith("TEL:") ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black italic mb-1 uppercase tracking-tighter">
                      {p.mesa.startsWith("TEL:") ? "📦 EXTERNO" : `MESA ${p.mesa}`}
                    </h3>
                    {p.mesa.startsWith("TEL:") && (
                      <span className="bg-blue-900/30 text-blue-400 text-[9px] px-2 py-1 rounded-lg border border-blue-800 font-black animate-pulse flex items-center gap-1 uppercase tracking-tighter">
                        <CreditCard size={10}/> Pago Pendiente
                      </span>
                    )}
                  </div>
                  {p.mesa.startsWith("TEL:") && <p className="text-blue-500 font-black text-xs mb-3 tracking-widest">{p.mesa}</p>}
                  <p className="text-lg text-slate-300 whitespace-pre-line leading-tight mt-2">{p.detalle}</p>
                </div>
                <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-3 rounded-xl font-black text-lg mt-4 active:scale-95 uppercase tracking-tighter">Cobrar</button>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[350px] space-y-4 no-print">
          <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-600" size={16}/>
              <input type="text" placeholder="Buscar mesa..." value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl pl-10 py-2 text-sm text-white focus:border-orange-500" />
            </div>
          </div>
          <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-orange-900/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-black text-orange-600 uppercase italic flex items-center gap-2"><ReceiptText size={20}/> Caja Hoy</h2><button onClick={realizarCierreTurno} className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg uppercase hover:bg-red-950 transition-all">Cierre</button></div>
            <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar mb-4">
              {historialParaMostrar.map((hc) => (
                <div key={hc.id} onClick={() => setTicketParaReimprimir(hc)} className={`p-3 bg-[#05070a] rounded-xl border flex flex-col gap-1.5 cursor-pointer hover:border-orange-500 transition-all ${hc.archivado ? 'opacity-40 border-slate-800' : 'border-slate-700'}`}>
                  <div className="flex justify-between font-black text-[11px] uppercase tracking-tighter"><span className={hc.mesa.startsWith("TEL:") ? "text-blue-400" : "text-slate-400"}>{hc.mesa}</span><span className="text-green-500">${hc.total}</span></div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between font-black"><span className="text-slate-500 text-[10px] uppercase italic">Total:</span><span className="text-2xl text-green-500">${totalCajaHoy}</span></div>
          </div>
        </div>
      </div>
    );
  }

  const menuFiltrado = catSeleccionada === "Todos" ? MENU_LOCAL : MENU_LOCAL.filter(p => p.categoria === catSeleccionada);

  return (
    <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans">
      <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter">TRIBUS</div>
            <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative active:scale-90 border border-slate-700">
              <ShoppingCart size={20} />
              {carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] px-1.5 rounded-full font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIAS.map(c => (
              <button key={c} onClick={() => setCatSeleccionada(c)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border ${catSeleccionada === c ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{c}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuFiltrado.map(item => (
          <div key={item.id} className="bg-slate-800/60 rounded-3xl p-4 flex flex-row md:flex-col gap-4 border border-slate-700/30 group shadow-lg">
            <div className="w-24 h-24 md:w-full md:h-48 flex-shrink-0 rounded-2xl overflow-hidden"><img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="p" /></div>
            <div className="flex-1 flex flex-col justify-between">
              <div><h3 className="font-bold text-white uppercase tracking-tight leading-tight">{item.nombre}</h3><p className="text-slate-500 text-xs mt-1 italic leading-tight">{item.descripcion}</p></div>
              <div className="flex justify-between items-center mt-3"><span className="font-black text-xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-10 h-10 md:w-12 md:h-12 rounded-xl font-bold active:scale-90 shadow-lg shadow-orange-950/20">+</button></div>
            </div>
          </div>
        ))}
      </main>

      <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible' : 'invisible'}`}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />
        <div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl tracking-tighter"><h2>Mi Pedido</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
            {carrito.map(item => (
              <div key={item.id} className="bg-slate-900/50 p-3 rounded-2xl flex flex-col gap-2 border border-slate-800">
                <div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600"/></button></div>
                <div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex justify-between font-black text-2xl text-orange-500 italic uppercase tracking-tighter"><span>Total</span><span>${totalCarrito}</span></div>
            <button disabled={carrito.length === 0} onClick={enviarPedido} className={`w-full py-4 rounded-2xl font-black text-white active:scale-95 transition-all shadow-xl ${mesa ? 'bg-orange-600 shadow-orange-950/20' : 'bg-green-600 shadow-green-950/20'} uppercase tracking-widest`}>{mesa ? 'Confirmar Pedido' : 'Confirmar Reserva'}</button>
          </div>
        </div>
      </div>

      {carrito.length > 0 && !verCarrito && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center no-print">
          <button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl active:scale-95">
            <span className="text-[10px] uppercase font-bold tracking-widest">🛒 MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span>
            <span className="font-black text-xl italic">${totalCarrito}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;