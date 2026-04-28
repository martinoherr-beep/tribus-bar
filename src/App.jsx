import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, 
  query, where, orderBy, serverTimestamp, writeBatch 
} from "firebase/firestore";
import { 
  ShoppingCart, MessageCircle, Trash2, X, Plus, Minus, Wifi, 
  UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, CreditCard 
} from 'lucide-react';

const DATOS_PAGO = "💳 *DATOS DE PAGO*:\nBanco: Tu Banco\nCuenta: 0000 0000 0000 0000\nCLABE: 000000000000000000\nA nombre de: Tribus Bar";
const PIN_CORRECTO = "2370";

const MENU_LOCAL = [
  { id: 1, nombre: "Corona Extra", precioMesa: 45, precioDomicilio: 50, categoria: "Cerveza", subcategoria: "Media", descripcion: "Cerveza clara 355ml.", imagen: "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?q=80&w=500" },
  { id: 2, nombre: "Victoria Caguama", precioMesa: 95, precioDomicilio: 110, categoria: "Cerveza", subcategoria: "Caguama", descripcion: "Cerveza de 940ml ideal para compartir.", imagen: "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?q=80&w=500" },
  { id: 3, nombre: "Margarita Clásica", precioMesa: 120, precioDomicilio: 140, categoria: "Bebidas Preparadas", descripcion: "Tequila, controy y limón fresco.", imagen: "https://images.unsplash.com/photo-1592318963241-d796d5245cba?q=80&w=500" },
  { id: 4, nombre: "Alitas BBQ (10 pz)", precioMesa: 180, precioDomicilio: 200, categoria: "Snacks", descripcion: "Bañadas en salsa artesanal con aderezo ranch.", imagen: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?q=80&w=500" },
  { id: 5, nombre: "Tequila 7 Leguas Blanco", precioMesa: 1200, precioDomicilio: 1400, categoria: "Botellas", descripcion: "Botella 750ml incluye 4 refrescos o jugos.", imagen: "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=500" }
];

const CATEGORIAS = ["Todos", "Cerveza", "Bebidas Preparadas", "Snacks", "Botellas"];

function App() {
  const [view, setView] = useState('welcome');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState(null);
  const [verCarrito, setVerCarrito] = useState(false);
  const [catSeleccionada, setCatSeleccionada] = useState("Todos");
  const [subCatSeleccionada, setSubCatSeleccionada] = useState("Todas");
  const [pedidosBarra, setPedidosBarra] = useState([]);
  const [historialCerrado, setHistorialCerrado] = useState([]); 
  const [filtroMesa, setFiltroMesa] = useState(""); 
  const [ticketParaReimprimir, setTicketParaReimprimir] = useState(null);

  const obtenerPrecioItem = (item) => mesa ? item.precioMesa : item.precioDomicilio;
  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const totalCajaHoy = historialCerrado.filter(hc => !hc.archivado).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mesa")) setMesa(params.get("mesa"));
    if (params.get("view") === 'barra') setView('barra');

    const qPedidos = onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pendiente")), (snapshot) => {
      setPedidosBarra(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.fecha?.seconds || 0) - (b.fecha?.seconds || 0)));
    });

    const qHistorial = onSnapshot(query(collection(db, "historial_tickets"), orderBy("fecha", "desc")), (snapshot) => {
      setHistorialCerrado(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { qPedidos(); qHistorial(); };
  }, []);

  // Resetear PIN al salir de la barra
  useEffect(() => {
    if (view !== 'barra') {
      setIsAdmin(false);
      setPinInput("");
    }
  }, [view]);

  const manejarPin = (num) => {
    if (pinInput.length < 4) {
      const nuevoPin = pinInput + num;
      setPinInput(nuevoPin);
      if (nuevoPin === PIN_CORRECTO) setIsAdmin(true);
      else if (nuevoPin.length === 4) setTimeout(() => setPinInput(""), 500);
    }
  };

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
    const detalleNuevo = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
    let idFinal = mesa ? String(mesa) : null;

    if (!mesa) {
      const t = window.prompt("Ingresa tu teléfono:");
      if (!t) return;
      idFinal = `TEL: ${t}`;
      window.open(`https://wa.me/526278897648?text=${encodeURIComponent(`¡Hola! Mi pedido es:\n\n${detalleNuevo}\n\n*Total: $${totalCarrito}*\n\n${DATOS_PAGO}`)}`, '_blank');
    }

    try {
      const existente = pedidosBarra.find(p => String(p.mesa) === String(idFinal));
      if (existente) {
        await updateDoc(doc(db, "pedidos", existente.id), {
          detalle: existente.detalle + "\n" + detalleNuevo,
          total: Number(existente.total) + Number(totalCarrito),
          fecha: serverTimestamp() 
        });
      } else {
        await addDoc(collection(db, "pedidos"), {
          mesa: String(idFinal), detalle: detalleNuevo, total: Number(totalCarrito),
          estado: "pendiente", fecha: serverTimestamp(), archivado: false
        });
      }
      setView('success'); setCarrito([]); setVerCarrito(false);
    } catch (e) { console.error(e); }
  };

  const cobrarCuenta = async (p) => {
    try {
      await addDoc(collection(db, "historial_tickets"), { mesa: p.mesa, detalle: p.detalle, total: p.total, fecha: serverTimestamp(), archivado: false });
      await deleteDoc(doc(db, "pedidos", p.id));
      setTicketParaReimprimir(p);
    } catch (e) { console.error(e); }
  };

  const realizarCierreTurno = async () => {
    if (window.confirm(`¿Cerrar turno con $${totalCajaHoy}?`)) {
      const batch = writeBatch(db);
      historialCerrado.forEach((t) => { if (!t.archivado) batch.update(doc(db, "historial_tickets", t.id), { archivado: true }); });
      await batch.commit();
    }
  };

  // --- RENDERS ---

  if (view === 'barra' && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="mb-8 text-center">
          <div className="bg-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-900/20"><Zap size={32} /></div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Acceso Tribu´s Barra</h2>
          <p className="text-slate-500 text-[10px] mt-2 uppercase font-bold tracking-widest text-gray-500">PIN de Seguridad</p>
        </div>
        <div className="flex gap-4 mb-12">
          {[1, 2, 3, 4].map((dot) => (
            <div key={dot} className={`w-4 h-4 rounded-full border-2 border-orange-600 transition-all ${pinInput.length >= dot ? 'bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-transparent'}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => manejarPin(n)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black hover:bg-orange-600 active:scale-90 transition-all">{n}</button>)}
          <div />
          <button onClick={() => manejarPin(0)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black hover:bg-orange-600 active:scale-90 transition-all">0</button>
          <button onClick={() => setView('welcome')} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500"><X size={24} /></button>
        </div>
      </div>
    );
  }

  if (view === 'success') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
      <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
      <h1 className="text-4xl font-black italic mb-4 uppercase">¡RECIBIDO!</h1>
      <button onClick={() => setView('welcome')} className="text-orange-500 font-bold border-b border-orange-500 uppercase">Inicio</button>
    </div>
  );

  if (view === 'welcome') return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-40">
        <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="f" />
        <div className="absolute inset-0 bg-slate-950/80"></div>
      </div>
      <div className="relative z-10 space-y-12 w-full max-w-lg">
        <div className="space-y-4">
          <div className="flex justify-center items-center gap-2 text-orange-500 animate-pulse"><Zap size={48} /><h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none">TRIBU'S BAR</h1></div>
          <div className="space-y-2 uppercase tracking-tight">
            <h2 className="text-3xl font-bold">{mesa ? `¡BIENVENIDO MESA ${mesa}!` : "¡BIENVENIDO!"}</h2>
            <p className="text-orange-500 text-sm font-medium tracking-[0.2em]">{mesa ? "Tu pedido va directo a la barra" : "Pide para llevar o reserva"}</p>
          </div>
        </div>
        <div className="grid gap-4">
          <button onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} className="flex items-center gap-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/30 backdrop-blur-sm shadow-xl"><Wifi className="text-sky-400" size={28} /><div className="text-left font-bold uppercase text-[10px] text-slate-400"><p>Wi-Fi Gratis</p><p className="text-lg text-white font-black">tribus2026</p></div></button>
          <button onClick={() => setView('menu')} className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 transition-all"><UtensilsCrossed size={28} /><div className="text-left font-bold uppercase text-[10px] text-orange-200"><p>Menú Digital</p><p className="text-lg text-white font-black uppercase tracking-tight">Ver la carta</p></div></button>
        </div>
        <button onClick={() => setView('barra')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
      </div>
    </div>
  );

  if (view === 'barra') return (
    <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col lg:flex-row gap-6 font-sans">
      <style dangerouslySetInnerHTML={{__html: `@media print { .no-print { display: none !important; } body { background: white; color: black; } .print-container { width: 100% !important; padding: 5mm !important; } }`}} />
      {ticketParaReimprimir && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md print:static print:bg-white print:p-0">
          <div className="bg-white text-black w-full max-w-[280px] p-6 font-mono shadow-2xl relative print-container">
            <button onClick={() => setTicketParaReimprimir(null)} className="absolute -top-12 right-0 text-white no-print"><X size={32}/></button>
            <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4"><h2 className="font-black text-xl italic uppercase">TRIBUS BAR</h2><p className="text-[10px] uppercase font-bold mt-1 text-gray-500">Nota de Venta</p></div>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-[11px] font-black uppercase"><span>{ticketParaReimprimir.mesa?.startsWith("TEL:") ? "CLIENTE:" : "MESA:"}</span><span>{ticketParaReimprimir.mesa}</span></div>
              <div className="flex justify-between text-[10px] text-gray-700 font-bold uppercase"><span>FECHA:</span><span>{ticketParaReimprimir.fecha?.seconds ? new Date(ticketParaReimprimir.fecha.seconds * 1000).toLocaleString('es-MX') : new Date().toLocaleString('es-MX')}</span></div>
            </div>
            <div className="text-[11px] whitespace-pre-line leading-tight mb-6 border-t border-dashed border-gray-300 pt-4">{ticketParaReimprimir.detalle}</div>
            <div className="flex justify-between font-black text-2xl border-t-2 border-dashed border-black pt-4 mb-6"><span>TOTAL:</span><span>${ticketParaReimprimir.total}</span></div>
            <p className="text-[10px] text-center uppercase font-black italic">"¡LA TRIBU TE ESPERA DE VUELTA!"</p>
            <button onClick={() => window.print()} className="mt-8 w-full bg-black text-white py-4 rounded-xl font-black no-print flex items-center justify-center gap-2"><Printer size={18}/> Imprimir</button>
          </div>
        </div>
      )}
      <div className="flex-1 no-print">
        <header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4"><h1 className="text-4xl font-black text-orange-600 italic uppercase tracking-tighter">Barra</h1><div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold animate-pulse uppercase">● En Vivo</div></header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pedidosBarra.filter(p => p.mesa.toLowerCase().includes(filtroMesa.toLowerCase())).map(p => (
            <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl relative shadow-xl flex flex-col justify-between">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${p.mesa.startsWith("TEL:") ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
              <div>
                <div className="flex justify-between items-start"><h3 className="text-2xl font-black italic uppercase tracking-tighter">{p.mesa.startsWith("TEL:") ? "📦 EXTERNO" : `MESA ${p.mesa}`}</h3>{p.mesa.startsWith("TEL:") && <span className="bg-blue-900/30 text-blue-400 text-[9px] px-2 py-1 rounded-lg border border-blue-800 font-black animate-pulse uppercase"><CreditCard size={10}/> Pago Pendiente</span>}</div>
                {p.mesa.startsWith("TEL:") && <p className="text-blue-500 font-black text-xs mb-3 tracking-widest">{p.mesa}</p>}
                <p className="text-lg text-slate-300 whitespace-pre-line leading-tight mt-2">{p.detalle}</p>
              </div>
              <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-3 rounded-xl font-black text-lg mt-4 active:scale-95 uppercase tracking-tighter">Cobrar</button>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-[350px] space-y-4 no-print">
        <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800"><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-600" size={16}/><input type="text" placeholder="Buscar..." value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl pl-10 py-2 text-sm text-white focus:border-orange-500" /></div></div>
        <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-orange-900/10 shadow-2xl">
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-black text-orange-600 uppercase italic flex items-center gap-2"><ReceiptText size={20}/> Caja Hoy</h2><button onClick={realizarCierreTurno} className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg uppercase hover:bg-red-950 transition-all">Cierre</button></div>
          <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar mb-4">
            {historialCerrado.filter(hc => !hc.archivado && hc.mesa.toLowerCase().includes(filtroMesa.toLowerCase())).map((hc) => (
              <div key={hc.id} className="group p-3 bg-[#05070a] rounded-xl border border-slate-700 flex items-center justify-between">
                <div onClick={() => setTicketParaReimprimir(hc)} className="flex-1 cursor-pointer"><div className="flex justify-between font-black text-[11px] uppercase tracking-tighter"><span>{hc.mesa}</span><span className="text-green-500">${hc.total}</span></div></div>
                <button onClick={async (e) => { e.stopPropagation(); if(window.confirm("¿Borrar?")) await deleteDoc(doc(db, "historial_tickets", hc.id)); }} className="ml-2 p-1.5 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-800 flex justify-between font-black"><span className="text-slate-500 text-[10px] uppercase italic">Total:</span><span className="text-2xl text-green-500">${totalCajaHoy}</span></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans">
      <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter">TRIBU'S BAR</div>
            <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative active:scale-90 border border-slate-700"><ShoppingCart size={20} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] px-1.5 rounded-full font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">{CATEGORIAS.map(c => (<button key={c} onClick={() => { setCatSeleccionada(c); setSubCatSeleccionada("Todas"); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border ${catSeleccionada === c ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400'}`}>{c}</button>))}</div>
          {catSeleccionada === "Cerveza" && (<div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/50">{["Todas", "Media", "Caguama"].map(sc => (<button key={sc} onClick={() => setSubCatSeleccionada(sc)} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${subCatSeleccionada === sc ? 'text-sky-400 bg-sky-900/20' : 'text-slate-500'}`}>{sc}</button>))}</div>)}
        </div>
      </header>
      <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MENU_LOCAL.filter(p => (catSeleccionada === "Todos" || p.categoria === catSeleccionada) && (subCatSeleccionada === "Todas" || p.subcategoria === subCatSeleccionada)).map(item => (
          <div key={item.id} className="bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30 group shadow-lg">
            <div className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden"><img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="p" /></div>
            <div className="flex-1 flex flex-col justify-between">
              <div><h3 className="font-bold text-white uppercase tracking-tight leading-tight">{item.nombre}</h3><p className="text-slate-500 text-xs mt-1 italic line-clamp-2">{item.descripcion}</p></div>
              <div className="flex justify-between items-center mt-3"><span className="font-black text-xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-10 h-10 rounded-xl font-bold active:scale-90 shadow-lg">+</button></div>
            </div>
          </div>
        ))}
      </main>
      {/* MODAL CARRITO */}
      <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible' : 'invisible'}`}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />
        <div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl"><h2>Mi Pedido</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
            {carrito.map(item => (
              <div key={item.id} className="bg-slate-900/50 p-3 rounded-2xl flex flex-col gap-2 border border-slate-800 shadow-sm">
                <div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600"/></button></div>
                <div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1"><Minus onClick={() => restarDelCarrito(item.id)} size={12}/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12}/></div></div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex justify-between font-black text-2xl text-orange-500 italic uppercase tracking-tighter"><span>Total</span><span>${totalCarrito}</span></div>
            <button disabled={carrito.length === 0} onClick={enviarPedido} className={`w-full py-4 rounded-2xl font-black text-white active:scale-95 transition-all shadow-xl ${mesa ? 'bg-orange-600' : 'bg-green-600'} uppercase tracking-widest`}>{mesa ? 'Confirmar Pedido' : 'Confirmar Reserva'}</button>
          </div>
        </div>
      </div>
      {carrito.length > 0 && !verCarrito && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center no-print"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl active:scale-95"><span className="text-[10px] uppercase font-bold tracking-widest text-white">🛒 MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span className="font-black text-xl italic text-white">${totalCarrito}</span></button></div>
      )}
    </div>
  );
}

export default App;