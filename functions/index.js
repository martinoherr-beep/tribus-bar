import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, 
  query, where, orderBy, serverTimestamp, writeBatch, increment 
} from "firebase/firestore";
import { 
  ShoppingCart, Trash2, X, Plus, Minus, Wifi, 
  UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, CreditCard, Phone, Package, LayoutDashboard, Boxes, PlusCircle, Tag, ExternalLink, Lock, Calendar, History
} from 'lucide-react';

const DATOS_PAGO = "💳 *DATOS DE PAGO*:\nBanco: Tu Banco\nCuenta: 0000 0000 0000 0000\nCLABE: 000000000000000000\nA nombre de: Tribus Bar";
const PIN_ADMIN = "2370";
const CATEGORIAS = ["Todos", "Cerveza", "Bebidas Preparadas", "Snacks", "Botellas", "Comidas"];
const LINK_PRINCIPAL = "http://192.168.5.5/youtube/search"; 
const TEXTO_LINK = "Rockola";

function App() {
  const [view, setView] = useState('welcome');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [tabBarra, setTabBarra] = useState('comandas');
  
  const [mesaValidada, setMesaValidada] = useState(false);
  const [pinMesaInput, setPinMesaInput] = useState("");
  const [pinCorrectoMesa, setPinCorrectoMesa] = useState(null);

  const [carrito, setCarrito] = useState([]);
  const [consumoAcumulado, setConsumoAcumulado] = useState([]); 
  const [mesa, setMesa] = useState(null);
  const [verCarrito, setVerCarrito] = useState(false);
  const [verModalTelefono, setVerModalTelefono] = useState(false);
  const [telefonoInput, setTelefonoInput] = useState("");
  
  const [recordatorios, setRecordatorios] = useState([]);
  const [verModalNuevoEvento, setVerModalNuevoEvento] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: "", fecha: "", hora: "" });

  const [verModalNuevoProd, setVerModalNuevoProd] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({
    nombre: "", precioMesa: "", precioDomicilio: "", stock: "", categoria: "Cerveza", subcategoria: "Todas", descripcion: "", imagen: ""
  });

  const [productosMenu, setProductosMenu] = useState([]);
  const [catSeleccionada, setCatSeleccionada] = useState("Todos");
  const [subCatSeleccionada, setSubCatSeleccionada] = useState("Todas");
  const [pedidosBarra, setPedidosBarra] = useState([]);
  const [historialCerrado, setHistorialCerrado] = useState([]); 
  const [filtroMesa, setFiltroMesa] = useState(""); 
  const [ticketParaReimprimir, setTicketParaReimprimir] = useState(null);

  const obtenerPrecioItem = (item) => mesa ? item.precioMesa : item.precioDomicilio;
  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const totalAcumulado = consumoAcumulado.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const totalCajaHoy = historialCerrado.filter(hc => !hc.archivado).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesaId = params.get("mesa");
    if (mesaId) setMesa(mesaId);
    if (params.get("view") === 'barra') setView('barra');

    const unsubProd = onSnapshot(collection(db, "productos"), (snap) => {
      setProductosMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPedidos = onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pendiente")), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosBarra(data);
      if (mesaId) {
        const pedidoMesa = data.find(p => String(p.mesa) === String(mesaId));
        if (pedidoMesa) {
            if (pedidoMesa.pinMesa) setPinCorrectoMesa(pedidoMesa.pinMesa);
            const items = pedidoMesa.detalle.split('\n').map(linea => {
                const parts = linea.match(/(\d+)x (.*) \(\$(\d+)\)/);
                if (parts) return { cantidad: parseInt(parts[1]), nombre: parts[2], precio: parseInt(parts[3]) / parseInt(parts[1]) };
                return null;
            }).filter(i => i !== null);
            setConsumoAcumulado(items);
        } else {
          setMesaValidada(true);
          setConsumoAcumulado([]); 
        }
      }
    });

    const unsubHistorial = onSnapshot(query(collection(db, "historial_tickets"), orderBy("fecha", "desc")), (snapshot) => {
      setHistorialCerrado(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRec = onSnapshot(query(collection(db, "recordatorios"), orderBy("fecha", "asc")), (snap) => {
      setRecordatorios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubProd(); unsubPedidos(); unsubHistorial(); unsubRec(); };
  }, [mesa]);

  const agregarAlCarrito = (item) => {
    const p = obtenerPrecioItem(item);
    const itemStock = productosMenu.find(x => x.id === item.id);
    const ex = carrito.find(x => x.id === item.id);
    const cantEnCarrito = ex ? ex.cantidad : 0;
    if (itemStock && itemStock.stock <= cantEnCarrito) {
      alert("No queda más stock disponible."); return;
    }
    if (ex) setCarrito(carrito.map(x => x.id === item.id ? { ...ex, cantidad: ex.cantidad + 1 } : x));
    else setCarrito([...carrito, { ...item, precio: p, cantidad: 1 }]);
  };

  const restarDelCarrito = (id) => {
    const ex = carrito.find(x => x.id === id);
    if (!ex) return;
    if (ex.cantidad === 1) setCarrito(carrito.filter(x => x.id !== id));
    else setCarrito(carrito.map(x => x.id === id ? { ...ex, cantidad: ex.cantidad - 1 } : x));
  };

  const procesarEnvio = async (idDestino) => {
    const batch = writeBatch(db);
    const detalleNuevo = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
    const pinAleatorio = Math.floor(1000 + Math.random() * 9000);
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
          estado: "pendiente", fecha: serverTimestamp(), archivado: false, pinMesa: mesa ? pinAleatorio : null
        });
      }
      await batch.commit();
      setView('success'); 
      setCarrito([]); 
    } catch (e) { console.error(e); }
  };

  const cobrarCuenta = async (p) => {
    try {
      await addDoc(collection(db, "historial_tickets"), { mesa: p.mesa, detalle: p.detalle, total: p.total, fecha: serverTimestamp(), archivado: false });
      await deleteDoc(doc(db, "pedidos", p.id));
      setTicketParaReimprimir(p);
      if(String(p.mesa) === String(mesa)) {
          setMesaValidada(false);
          setConsumoAcumulado([]);
          setView('welcome');
      }
    } catch (e) { console.error(e); }
  };

  const intentarEnviar = () => {
    if (carrito.length === 0) return;
    if (mesa) procesarEnvio(mesa);
    else setVerModalTelefono(true);
  };

  // --- RENDER LOGIC ---

  if (mesa && !mesaValidada && pinCorrectoMesa) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
        <Lock size={48} className="text-orange-600 mb-6 animate-pulse" /><h2 className="text-2xl font-black italic uppercase text-center tracking-tighter">Mesa con Cuenta Abierta</h2>
        <p className="text-slate-500 text-xs mt-2 mb-8 uppercase font-bold tracking-widest text-center">Ingresa el PIN de tu comanda</p>
        <div className="flex gap-4 mb-12">{[1, 2, 3, 4].map((dot) => (<div key={dot} className={`w-4 h-4 rounded-full border-2 border-orange-600 ${pinMesaInput.length >= dot ? 'bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.8)]' : 'bg-transparent'}`} />))}</div>
        <div className="grid grid-cols-3 gap-4 max-w-[280px]">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => { if (pinMesaInput.length < 4) { const nuevoPin = pinMesaInput + n; setPinMesaInput(nuevoPin); if (nuevoPin === String(pinCorrectoMesa)) setMesaValidada(true); else if (nuevoPin.length === 4) setTimeout(() => setPinMesaInput(""), 500); } }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">{n}</button>)}<div /><button onClick={() => { if (pinMesaInput.length < 4) { const nuevoPin = pinMesaInput + "0"; setPinMesaInput(nuevoPin); if (nuevoPin === String(pinCorrectoMesa)) setMesaValidada(true); else if (nuevoPin.length === 4) setTimeout(() => setPinMesaInput(""), 500); } }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">0</button></div>
      </div>
    );
  }

  if (view === 'success') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
      <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
      <h1 className="text-4xl font-black italic mb-4 uppercase tracking-tighter">¡PEDIDO ENVIADO!</h1>
      <p className="text-slate-400 text-sm mb-8 uppercase font-bold tracking-widest">Lo estamos preparando</p>
      <button onClick={() => setView('menu')} className="bg-orange-600 px-8 py-4 rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-orange-900/40 active:scale-95">Ver mi cuenta / Pedir más</button>
    </div>
  );

  if (view === 'welcome') return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans"><div className="absolute inset-0 opacity-40"><img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="f" /><div className="absolute inset-0 bg-slate-950/80"></div></div>
      <div className="relative z-10 space-y-12 w-full max-w-lg"><div className="space-y-4"><div className="flex justify-center items-center gap-2 text-orange-500 animate-pulse"><Zap size={48} /><h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none tracking-tighter">TRIBU'S BAR</h1></div><div className="space-y-2 uppercase tracking-tight"><h2 className="text-3xl font-bold">{mesa ? `¡BIENVENIDO MESA ${mesa}!` : "¡BIENVENIDO!"}</h2><p className="text-orange-500 text-sm font-medium tracking-[0.2em]">{mesa ? "Tu pedido va directo a la barra" : "Pide para llevar o reserva"}</p></div></div>
        <div className="grid gap-4">
          <button onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} className="flex items-center gap-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/30 backdrop-blur-sm shadow-xl active:scale-95 transition-all"><Wifi className="text-sky-400" size={28} /><div className="text-left font-bold uppercase text-[10px] text-slate-400"><p>Wi-Fi Gratis</p><p className="text-lg text-white font-black">tribus2026</p></div></button>
          <button onClick={() => setView('menu')} className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 transition-all"><UtensilsCrossed size={28} /><div className="text-left font-bold uppercase text-[10px] text-orange-200"><p>Menú Digital</p><p className="text-lg text-white font-black uppercase tracking-tight leading-none">Ver la carta</p></div></button>
          <button onClick={() => window.open(LINK_PRINCIPAL, '_blank')} className="flex items-center gap-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/30 backdrop-blur-sm shadow-xl active:scale-95 transition-all"><ExternalLink className="text-green-500" size={28} /><div className="text-left font-bold uppercase text-[10px] text-slate-400"><p>Costo por canción $2 pesos</p><p className="text-lg text-white font-black">{TEXTO_LINK}</p></div></button>
        </div><button onClick={() => setView('barra')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
      </div>
    </div>
  );

  if (view === 'barra') {
    const filtradosPendientes = pedidosBarra.filter(p => String(p.mesa).toLowerCase().includes(filtroMesa.toLowerCase()));
    const historialParaMostrar = historialCerrado.filter(hc => {
        const mesaStr = String(hc.mesa || "").toLowerCase();
        return filtroMesa === "" ? !hc.archivado : mesaStr.includes(filtroMesa.toLowerCase());
    });
    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col font-sans">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-6 gap-4">
            <div className="w-full md:w-auto"><h1 className="text-4xl font-black text-orange-600 italic uppercase tracking-tighter leading-none">TRIBU'S BARRA</h1><div className="flex gap-4 mt-4">
                    <button onClick={() => setTabBarra('comandas')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'comandas' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}><LayoutDashboard size={16}/> Comandas</button>
                    <button onClick={() => setTabBarra('inventario')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'inventario' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}><Boxes size={16}/> Inventario</button>
                    <button onClick={() => setTabBarra('eventos')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'eventos' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}><Calendar size={16}/> Eventos</button></div></div>
        </header>
        <div className="flex flex-col lg:flex-row gap-6">
            {tabBarra === 'comandas' && (<div className="flex-1"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filtradosPendientes.map(p => (<div key={p.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl relative shadow-xl flex flex-col justify-between group transition-all">
                <div className="flex justify-between items-start"><h3 className="text-2xl font-black italic uppercase tracking-tighter">{`MESA ${p.mesa}`}</h3><button onClick={async () => { if(window.confirm("¿Borrar cuenta completa?")) await deleteDoc(doc(db, "pedidos", p.id)); }} className="text-red-500"><Trash2 size={18}/></button></div>
                {p.pinMesa && (<div className="bg-orange-600/10 border border-orange-600/20 rounded-lg p-2 mt-3 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-orange-500">PIN:</span><span className="text-xl font-black text-white">{p.pinMesa}</span></div>)}
                <div className="mt-4 space-y-1">{p.detalle.split('\n').map((linea, idx) => (<div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg"><span className="text-sm text-slate-300">{linea}</span></div>))}</div>
                <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-4 rounded-xl font-black text-lg mt-6 active:scale-95 uppercase tracking-tighter shadow-lg shadow-orange-900/20">Cobrar ${p.total}</button></div>))}</div></div>)}
            
            {tabBarra === 'eventos' && (
              <div className="flex-1 p-4"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase text-orange-600 italic">Recordatorios</h2><button onClick={() => setVerModalNuevoEvento(true)} className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg"><PlusCircle size={16}/> Agendar</button></div>
                <div className="grid gap-4">{recordatorios.map(rec => (<div key={rec.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl flex justify-between items-center shadow-xl"><div><p className="text-white font-bold uppercase tracking-tight">{rec.titulo}</p><p className="text-orange-500 text-[10px] font-black mt-1 uppercase tracking-widest">{rec.fecha} | {rec.hora} HRS</p></div><button onClick={() => deleteDoc(doc(db, "recordatorios", rec.id))} className="text-red-500/30 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></div>))}</div></div>
            )}
        </div>
      </div>
    );
  }

  if (view === 'menu') {
    const menuFiltrado = productosMenu.filter(p => (catSeleccionada === "Todos" || p.categoria === catSeleccionada) && (subCatSeleccionada === "Todas" || p.subcategoria === subCatSeleccionada));
    return (
      <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans">
        <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3"><div className="max-w-6xl mx-auto flex flex-col gap-3"><div className="flex justify-between items-center"><div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase">TRIBU'S BAR</div>
              <div className="flex gap-2">
                {consumoAcumulado.length > 0 && (
                  <div className="bg-green-600/10 px-3 py-2 rounded-xl border border-green-500/20 flex items-center gap-2">
                    <History size={14} className="text-green-500" /><span className="text-[10px] font-black text-green-500 tracking-tighter leading-none">${totalAcumulado}</span>
                  </div>
                )}
                <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative border-none outline-none"><ShoppingCart size={20} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] px-1.5 rounded-full font-bold shadow-lg">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
              </div>
            </div><div className="flex gap-2 overflow-x-auto no-scrollbar">{CATEGORIAS.map(c => (<button key={c} onClick={() => { setCatSeleccionada(c); setSubCatSeleccionada("Todas"); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border-none outline-none ${catSeleccionada === c ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400'}`}>{c}</button>))}</div></div></header>
        <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{menuFiltrado.map(item => (<div key={item.id} className="bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30 group shadow-lg transition-all"><div className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-inner"><img src={item.imagen} className="w-full h-full object-cover" alt="p" /></div><div className="flex-1 flex flex-col justify-between"><div><h3 className="font-bold text-white uppercase text-sm">{item.nombre}</h3><p className="text-slate-500 text-[10px] mt-1 italic">{item.descripcion}</p></div><div className="flex justify-between items-center mt-3"><span className="font-black text-xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button disabled={item.stock <= 0} onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-10 h-10 rounded-xl font-bold transition-all shadow-lg active:scale-90">+</button></div></div></div>))} </main>
        
        {/* CARRITO CON HISTORIAL */}
        <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible' : 'invisible'}`}><div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} /><div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl tracking-tighter"><h2>Mi Cuenta</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div>
                <div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
                    {carrito.length > 0 && (
                        <div><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={12}/> Por pedir ahora:</p>
                            <div className="space-y-3">{carrito.map(item => (<div key={item.id} className="bg-orange-600/5 p-3 rounded-2xl flex flex-col gap-2 border border-orange-600/20 shadow-sm"><div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600"/></button></div><div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic tracking-tighter">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1 shadow-inner"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div></div>))}</div>
                        </div>
                    )}
                    {consumoAcumulado.length > 0 && (
                        <div><p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={12}/> Ya consumido:</p>
                            <div className="space-y-2">{consumoAcumulado.map((item, idx) => (<div key={idx} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center border border-slate-800 opacity-60"><span className="text-[11px] font-bold text-slate-300 uppercase">{item.cantidad}x {item.nombre}</span><span className="text-[11px] font-black text-white">${item.precio * item.cantidad}</span></div>))}</div>
                        </div>
                    )}
                </div>
                <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between font-black text-2xl text-orange-500 italic uppercase tracking-tighter"><span>Total Cuenta</span><span>${totalCarrito + totalAcumulado}</span></div>
                    <button disabled={carrito.length === 0} onClick={intentarEnviar} className="w-full py-4 rounded-2xl font-black text-white bg-orange-600 active:scale-95 transition-all shadow-xl shadow-orange-950/20 uppercase tracking-widest">Confirmar Pedido</button>
                </div>
            </div>
        </div>

        {carrito.length > 0 && !verCarrito && (<div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl active:scale-95 transition-all shadow-orange-950/30"><span className="text-[10px] uppercase font-bold tracking-widest text-white leading-none flex items-center gap-2"><ShoppingCart size={14}/> MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span className="font-black text-xl italic text-white tracking-tighter leading-none">${totalCarrito}</span></button></div>)}
      </div>
    );
  }
  return null;
}

export default App;