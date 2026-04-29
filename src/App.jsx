import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, 
  query, where, orderBy, serverTimestamp, writeBatch, increment 
} from "firebase/firestore";
import { 
  ShoppingCart, Trash2, X, Plus, Minus, Wifi, 
  UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, CreditCard, Phone, Package, LayoutDashboard, Boxes
} from 'lucide-react';

const DATOS_PAGO = "💳 *DATOS DE PAGO*:\nBanco: Tu Banco\nCuenta: 0000 0000 0000 0000\nCLABE: 000000000000000000\nA nombre de: Tribus Bar";
const PIN_CORRECTO = "2370";
const CATEGORIAS = ["Todos", "Cerveza", "Bebidas Preparadas", "Snacks", "Botellas", "Comidas"];

function App() {
  const [view, setView] = useState('welcome');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [tabBarra, setTabBarra] = useState('comandas'); // 'comandas' o 'inventario'
  
  const [carrito, setCarrito] = useState([]);
  const [mesa, setMesa] = useState(null);
  const [verCarrito, setVerCarrito] = useState(false);
  const [verModalTelefono, setVerModalTelefono] = useState(false);
  const [telefonoInput, setTelefonoInput] = useState("");
  
  const [productosMenu, setProductosMenu] = useState([]);
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

    const unsubProd = onSnapshot(collection(db, "productos"), (snap) => {
      setProductosMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPedidos = onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pendiente")), (snap) => {
      setPedidosBarra(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha?.seconds || 0) - (b.fecha?.seconds || 0)));
    });

    const unsubHistorial = onSnapshot(query(collection(db, "historial_tickets"), orderBy("fecha", "desc")), (snap) => {
      setHistorialCerrado(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubProd(); unsubPedidos(); unsubHistorial(); };
  }, []);

  useEffect(() => {
    if (view !== 'barra') { setIsAdmin(false); setPinInput(""); }
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
    const itemStock = productosMenu.find(x => x.id === item.id);
    const ex = carrito.find(x => x.id === item.id);
    const cantEnCarrito = ex ? ex.cantidad : 0;
    if (itemStock && itemStock.stock <= cantEnCarrito) {
      alert("No queda más stock disponible.");
      return;
    }
    if (ex) setCarrito(carrito.map(x => x.id === item.id ? { ...ex, cantidad: ex.cantidad + 1 } : x));
    else setCarrito([...carrito, { ...item, precio: p, cantidad: 1 }]);
  };

  const procesarEnvio = async (idDestino) => {
    const batch = writeBatch(db);
    const detalleNuevo = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
    try {
      carrito.forEach((item) => {
        const prodRef = doc(db, "productos", item.id);
        batch.update(prodRef, { stock: increment(-item.cantidad) });
      });
      const existente = pedidosBarra.find(p => String(p.mesa) === String(idDestino));
      if (existente) {
        batch.update(doc(db, "pedidos", existente.id), {
          detalle: existente.detalle + "\n" + detalleNuevo,
          total: Number(existente.total) + Number(totalCarrito),
          fecha: serverTimestamp() 
        });
      } else {
        const nuevoPedRef = doc(collection(db, "pedidos"));
        batch.set(nuevoPedRef, {
          mesa: String(idDestino), detalle: detalleNuevo, total: Number(totalCarrito),
          estado: "pendiente", fecha: serverTimestamp(), archivado: false
        });
      }
      await batch.commit();
      if (!mesa) {
        const msg = `¡Hola! Mi pedido es:\n\n${detalleNuevo}\n\n*Total: $${totalCarrito}*\n\n${DATOS_PAGO}`;
        window.open(`https://wa.me/526278897648?text=${encodeURIComponent(msg)}`, '_blank');
      }
      setView('success'); setCarrito([]); setVerCarrito(false); setVerModalTelefono(false); setTelefonoInput("");
    } catch (e) { console.error(e); }
  };

  const intentarEnviar = () => {
    if (carrito.length === 0) return;
    if (mesa) procesarEnvio(mesa);
    else setVerModalTelefono(true);
  };

  const cobrarCuenta = async (p) => {
    try {
      await addDoc(collection(db, "historial_tickets"), { mesa: p.mesa, detalle: p.detalle, total: p.total, fecha: serverTimestamp(), archivado: false });
      await deleteDoc(doc(db, "pedidos", p.id));
      setTicketParaReimprimir(p);
    } catch (e) { console.error(e); }
  };

  const eliminarArticuloComanda = async (pedido, indexLinea) => {
    const lineas = pedido.detalle.split('\n');
    const matchPrecio = lineas[indexLinea].match(/\(\$(\d+)\)/);
    const montoARestar = matchPrecio ? Number(matchPrecio[1]) : 0;
    const nuevasLineas = lineas.filter((_, i) => i !== indexLinea);
    if (nuevasLineas.length === 0) {
      if (window.confirm("¿Eliminar cuenta completa?")) await deleteDoc(doc(db, "pedidos", pedido.id));
      return;
    }
    await updateDoc(doc(db, "pedidos", pedido.id), {
      detalle: nuevasLineas.join('\n'),
      total: Math.max(0, Number(pedido.total) - montoARestar)
    });
  };

  const actualizarStockManual = async (id, cantidad) => {
    await updateDoc(doc(db, "productos", id), {
      stock: increment(cantidad)
    });
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
          <div className="bg-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Zap size={32} /></div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Acceso Barra</h2>
          <p className="text-slate-500 text-[10px] mt-2 uppercase font-bold tracking-widest">Seguridad Tribus</p>
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
          <button onClick={() => setView('welcome')} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>
      </div>
    );
  }

  if (view === 'success') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
      <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
      <h1 className="text-4xl font-black italic mb-4 uppercase leading-none tracking-tighter">¡RECIBIDO!</h1>
      <button onClick={() => setView('welcome')} className="text-orange-500 font-bold border-b border-orange-500 uppercase tracking-widest">Inicio</button>
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
          <button onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} className="flex items-center gap-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/30 backdrop-blur-sm shadow-xl active:scale-95"><Wifi className="text-sky-400" size={28} /><div className="text-left font-bold uppercase text-[10px] text-slate-400"><p>Wi-Fi Gratis</p><p className="text-lg text-white font-black">tribus2026</p></div></button>
          <button onClick={() => setView('menu')} className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95"><UtensilsCrossed size={28} /><div className="text-left font-bold uppercase text-[10px] text-orange-200"><p>Menú Digital</p><p className="text-lg text-white font-black uppercase tracking-tight">Ver la carta</p></div></button>
        </div>
        <button onClick={() => setView('barra')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
      </div>
    </div>
  );

  if (view === 'barra') {
    const filtradosPendientes = pedidosBarra.filter(p => String(p.mesa).toLowerCase().includes(filtroMesa.toLowerCase()));
    const historialParaMostrar = historialCerrado.filter(hc => {
      const mesaStr = String(hc.mesa || "").toLowerCase();
      if (filtroMesa === "") return !hc.archivado;
      return mesaStr.includes(filtroMesa.toLowerCase());
    });

    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col font-sans">
        <style dangerouslySetInnerHTML={{__html: `@media print { .no-print { display: none !important; } body { background: white; color: black; } .print-container { width: 100% !important; padding: 5mm !important; } }`}} />
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-6 gap-4 no-print">
            <div>
                <h1 className="text-4xl font-black text-orange-600 italic uppercase tracking-tighter leading-none">TRIBU'S BARRA</h1>
                <div className="flex gap-4 mt-4">
                    <button 
                        onClick={() => setTabBarra('comandas')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'comandas' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'bg-slate-900 text-slate-500'}`}
                    >
                        <LayoutDashboard size={16}/> Comandas
                    </button>
                    <button 
                        onClick={() => setTabBarra('inventario')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'inventario' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'bg-slate-900 text-slate-500'}`}
                    >
                        <Boxes size={16}/> Inventario
                    </button>
                </div>
            </div>
            <div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold animate-pulse uppercase tracking-widest">● En Vivo</div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
            {/* VISTA COMANDAS (Pestaña Izquierda) */}
            {tabBarra === 'comandas' && (
                <div className="flex-1 no-print">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtradosPendientes.map(p => (
                            <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl relative shadow-xl flex flex-col justify-between group">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${String(p.mesa).startsWith("TEL:") ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{String(p.mesa).startsWith("TEL:") ? "📦 EXTERNO" : `MESA ${p.mesa}`}</h3>
                                        <button onClick={async () => { if(window.confirm("¿Borrar cuenta?")) await deleteDoc(doc(db, "pedidos", p.id)); }} className="p-1 text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {p.detalle.split('\n').map((linea, idx) => (
                                            <div key={idx} className="group/item flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                                                <span className="text-lg text-slate-300 leading-tight">{linea}</span>
                                                <button onClick={() => eliminarArticuloComanda(p, idx)} className="opacity-0 group-hover/item:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"><X size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-4 rounded-xl font-black text-lg mt-6 active:scale-95 uppercase tracking-tighter shadow-lg shadow-orange-900/20">Cobrar ${p.total}</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VISTA INVENTARIO (Pestaña Izquierda) */}
            {tabBarra === 'inventario' && (
                <div className="flex-1 no-print">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {productosMenu.map(prod => (
                            <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl shadow-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-black text-white uppercase tracking-tighter">{prod.nombre}</h4>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">{prod.categoria}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-lg font-black text-xl ${prod.stock <= 5 ? 'bg-red-900/20 text-red-500 border border-red-800' : prod.stock <= 10 ? 'bg-orange-900/20 text-orange-500 border border-orange-800' : 'bg-green-900/20 text-green-500 border border-green-800'}`}>
                                        {prod.stock}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => actualizarStockManual(prod.id, 12)} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2 rounded-xl text-[10px] font-black uppercase transition-all">+12 Unid</button>
                                    <button onClick={() => actualizarStockManual(prod.id, 24)} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2 rounded-xl text-[10px] font-black uppercase transition-all">+24 Unid</button>
                                    <button onClick={() => {
                                        const extra = window.prompt(`¿Cuántas unidades de ${prod.nombre} llegaron?`);
                                        if(extra && !isNaN(extra)) actualizarStockManual(prod.id, Number(extra));
                                    }} className="col-span-2 bg-orange-600/10 text-orange-500 border border-orange-500/20 py-2 rounded-xl text-[10px] font-black uppercase mt-2">Carga Manual</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* COLUMNA DERECHA: CAJA E HISTORIAL */}
            <div className="w-full lg:w-[350px] space-y-4 no-print">
                <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800">
                    <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-600" size={16}/><input type="text" placeholder="Buscar mesa..." value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl pl-10 py-2 text-sm text-white focus:border-orange-500 font-bold" /></div>
                </div>
                <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-orange-900/10 shadow-2xl">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-black text-orange-600 uppercase italic flex items-center gap-2"><ReceiptText size={20}/> Caja Hoy</h2><button onClick={realizarCierreTurno} className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg uppercase transition-all hover:bg-red-500 hover:text-white">Cierre</button></div>
                    <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar mb-4">
                    {historialParaMostrar.map((hc) => (
                        <div key={hc.id} className="group p-3 bg-[#05070a] rounded-xl border border-slate-700 flex items-center justify-between hover:border-orange-500 transition-all shadow-sm">
                        <div onClick={() => setTicketParaReimprimir(hc)} className="flex-1 cursor-pointer">
                            <div className="flex justify-between font-black text-[11px] uppercase tracking-tighter"><span className={String(hc.mesa || "").startsWith("TEL:") ? "text-blue-400" : "text-slate-400"}>{hc.mesa}</span><span className="text-green-500">${hc.total}</span></div>
                            <p className="text-[8px] text-slate-600 mt-1 uppercase font-bold">{hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : 'Reciente'}</p>
                        </div>
                        <button onClick={async (e) => { e.stopPropagation(); if(window.confirm("¿Borrar ticket?")) await deleteDoc(doc(db, "historial_tickets", hc.id)); }} className="ml-2 p-1.5 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                        </div>
                    ))}
                    </div>
                    <div className="pt-3 border-t border-slate-800 flex justify-between font-black"><span className="text-slate-500 text-[10px] uppercase italic tracking-widest">Total acumulado:</span><span className="text-2xl text-green-500 tracking-tighter">${totalCajaHoy}</span></div>
                </div>
            </div>
        </div>

        {/* MODAL TICKET RE-IMPRESION */}
        {ticketParaReimprimir && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md print:static print:bg-white print:p-0">
            <div className="bg-white text-black w-full max-w-[280px] p-6 font-mono shadow-2xl relative print-container">
              <button onClick={() => setTicketParaReimprimir(null)} className="absolute -top-12 right-0 text-white no-print"><X size={32}/></button>
              <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4"><h2 className="font-black text-xl italic uppercase leading-none">TRIBUS BAR</h2><p className="text-[10px] uppercase font-bold mt-1 text-gray-500">Nota de Venta</p></div>
              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter"><span>{String(ticketParaReimprimir.mesa).startsWith("TEL:") ? "CLIENTE:" : "MESA:"}</span><span>{ticketParaReimprimir.mesa}</span></div>
                <div className="flex justify-between text-[10px] text-gray-700 font-bold uppercase"><span>FECHA:</span><span>{ticketParaReimprimir.fecha?.seconds ? new Date(ticketParaReimprimir.fecha.seconds * 1000).toLocaleString('es-MX') : new Date().toLocaleString('es-MX')}</span></div>
              </div>
              <div className="text-[11px] whitespace-pre-line leading-tight mb-6 border-t border-dashed border-gray-300 pt-4">{ticketParaReimprimir.detalle}</div>
              <div className="flex justify-between font-black text-2xl border-t-2 border-dashed border-black pt-4 mb-6"><span>TOTAL:</span><span>${ticketParaReimprimir.total}</span></div>
              <p className="text-[10px] text-center uppercase font-black italic italic leading-none">"¡LA TRIBU TE ESPERA DE VUELTA!"</p>
              <button onClick={() => window.print()} className="mt-8 w-full bg-black text-white py-4 rounded-xl font-black no-print flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl"><Printer size={18}/> Imprimir</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA MENÚ ---
  if (view === 'menu') {
    const menuFiltrado = productosMenu.filter(p => {
      const matchCat = catSeleccionada === "Todos" || p.categoria === catSeleccionada;
      const matchSub = subCatSeleccionada === "Todas" || p.subcategoria === subCatSeleccionada;
      return matchCat && matchSub;
    });

    return (
      <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans">
        <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter leading-none">TRIBU'S BAR</div>
              <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative active:scale-90 border border-slate-700 transition-all"><ShoppingCart size={20} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] px-1.5 rounded-full font-bold shadow-lg">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">{CATEGORIAS.map(c => (<button key={c} onClick={() => { setCatSeleccionada(c); setSubCatSeleccionada("Todas"); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border transition-all ${catSeleccionada === c ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{c}</button>))}</div>
          </div>
        </header>
        <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuFiltrado.map(item => (
            <div key={item.id} className={`bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30 group shadow-lg transition-all ${item.stock <= 0 ? 'opacity-50 grayscale' : ''}`}>
              <div className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden relative shadow-inner">
                <img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="p" />
                {item.stock <= 5 && item.stock > 0 && <span className="absolute bottom-0 left-0 right-0 bg-red-600 text-[8px] font-black text-center uppercase py-0.5 tracking-widest shadow-lg">Últimas {item.stock}</span>}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div><h3 className="font-bold text-white uppercase tracking-tight leading-tight">{item.nombre}</h3><p className="text-slate-500 text-xs mt-1 italic line-clamp-2 leading-tight">{item.descripcion}</p></div>
                <div className="flex justify-between items-center mt-3"><span className="font-black text-xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button disabled={item.stock <= 0} onClick={() => agregarAlCarrito(item)} className={`${item.stock <= 0 ? 'bg-slate-700' : 'bg-orange-600 active:scale-90 shadow-orange-950/20'} text-white w-10 h-10 rounded-xl font-bold transition-all shadow-lg`}>{item.stock <= 0 ? <Package size={16} className="mx-auto" /> : '+'}</button></div>
              </div>
            </div>
          ))}
        </main>
        
        {/* MODAL CARRITO */}
        <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible' : 'invisible'}`}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />
            <div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl tracking-tighter leading-none"><h2>Mi Pedido</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div>
                <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
                    {carrito.map(item => (
                        <div key={item.id} className="bg-slate-900/50 p-3 rounded-2xl flex flex-col gap-2 border border-slate-800 shadow-sm transition-all">
                            <div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight leading-none"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600 hover:text-red-500 transition-colors"/></button></div>
                            <div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic tracking-tighter">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1 shadow-inner"><Minus onClick={() => setCarrito(carrito.map(x => x.id === item.id ? { ...item, cantidad: Math.max(0, item.cantidad - 1) } : x).filter(x => x.cantidad > 0))} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between font-black text-2xl text-orange-500 italic uppercase tracking-tighter leading-none"><span>Total</span><span>${totalCarrito}</span></div>
                    <button disabled={carrito.length === 0} onClick={intentarEnviar} className={`w-full py-4 rounded-2xl font-black text-white active:scale-95 transition-all shadow-xl shadow-orange-950/20 ${mesa ? 'bg-orange-600' : 'bg-green-600'} uppercase tracking-widest`}>{mesa ? 'Confirmar Pedido' : 'Confirmar Reserva'}</button>
                </div>
            </div>
        </div>

        {/* MODAL TELÉFONO */}
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all ${verModalTelefono ? 'visible opacity-100' : 'invisible opacity-0'}`}>
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setVerModalTelefono(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl text-center flex flex-col items-center">
             <div className="bg-green-600/20 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-green-500 shadow-inner"><Phone size={32}/></div>
             <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">Tu Teléfono</h2>
             <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-8 leading-tight">Para enviarte los datos de pago y confirmar tu reserva</p>
             <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 mb-8 text-2xl font-black text-green-500 tracking-[0.2em] min-h-[64px] flex items-center justify-center shadow-inner">{telefonoInput || <span className="opacity-20 text-slate-600">0000000000</span>}</div>
             <div className="grid grid-cols-3 gap-3 w-full mb-8">
               {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => telefonoInput.length < 10 && setTelefonoInput(telefonoInput + n)} className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700 text-xl font-black hover:bg-slate-700 transition-all active:scale-90">{n}</button>))}
               <button onClick={() => setTelefonoInput("")} className="h-14 rounded-2xl bg-red-900/20 text-red-500 flex items-center justify-center active:scale-90 shadow-sm"><Trash2 size={20}/></button>
               <button onClick={() => telefonoInput.length < 10 && setTelefonoInput(telefonoInput + 0)} className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700 text-xl font-black active:scale-90">0</button>
               <button onClick={() => setTelefonoInput(telefonoInput.slice(0, -1))} className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center active:scale-90"><Minus size={20}/></button>
             </div>
             <button disabled={telefonoInput.length < 10} onClick={() => procesarEnvio(`TEL: ${telefonoInput}`)} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${telefonoInput.length >= 10 ? 'bg-green-600 shadow-lg shadow-green-900/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Enviar Pedido</button>
             <button onClick={() => setVerModalTelefono(false)} className="mt-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-transparent hover:border-slate-500 transition-all">Cancelar</button>
          </div>
        </div>

        {/* BOTON FLOTANTE MÓVIL */}
        {carrito.length > 0 && !verCarrito && !verModalTelefono && (
          <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center no-print"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl active:scale-95 transition-all shadow-orange-950/30"><span className="text-[10px] uppercase font-bold tracking-widest text-white leading-none flex items-center gap-2"><ShoppingCart size={14}/> MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span className="font-black text-xl italic text-white tracking-tighter leading-none">${totalCarrito}</span></button></div>
        )}
      </div>
    );
  }

  return null;
}

export default App;