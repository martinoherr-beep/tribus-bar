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
    nombre: "", precioMesa: "", precioDomicilio: "", stock: "", categoria: "Cerveza", subcategoria: "", descripcion: "", imagen: ""
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

    onSnapshot(collection(db, "productos"), (snap) => {
      setProductosMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pendiente")), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosBarra(data);
      if (mesaId) {
        const pedidoMesa = data.find(p => String(p.mesa) === String(mesaId));
        if (pedidoMesa && pedidoMesa.pinMesa) {
            setPinCorrectoMesa(pedidoMesa.pinMesa);
            const items = pedidoMesa.detalle.split('\n').map(linea => {
                const parts = linea.match(/(\d+)x (.*) \(\$(\d+)\)/);
                if (parts) return { cantidad: parseInt(parts[1]), nombre: parts[2], precio: parseInt(parts[3]) / parseInt(parts[1]) };
                return null;
            }).filter(i => i !== null);
            setConsumoAcumulado(items);
        } else { setMesaValidada(true); setConsumoAcumulado([]); }
      }
    });

    onSnapshot(query(collection(db, "historial_tickets"), orderBy("fecha", "desc")), (snapshot) => {
      setHistorialCerrado(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    onSnapshot(query(collection(db, "recordatorios"), orderBy("fecha", "asc")), (snap) => {
      setRecordatorios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [mesa]);

  const manejarPinMesa = (num) => {
    if (pinMesaInput.length < 4) {
      const nuevoPin = pinMesaInput + num;
      setPinMesaInput(nuevoPin);
      if (nuevoPin === String(pinCorrectoMesa)) setMesaValidada(true);
      else if (nuevoPin.length === 4) setTimeout(() => setPinMesaInput(""), 500);
    }
  };

  const agregarAlCarrito = (item) => {
    const p = obtenerPrecioItem(item);
    const itemStock = productosMenu.find(x => x.id === item.id);
    const ex = carrito.find(x => x.id === item.id);
    if (itemStock && itemStock.stock <= (ex ? ex.cantidad : 0)) return alert("Sin stock.");
    if (ex) setCarrito(carrito.map(x => x.id === item.id ? { ...ex, cantidad: ex.cantidad + 1 } : x));
    else setCarrito([...carrito, { ...item, precio: p, cantidad: 1 }]);
  };

  const restarDelCarrito = (id) => {
    const ex = carrito.find(x => x.id === id);
    if (!ex) return;
    if (ex.cantidad === 1) setCarrito(carrito.filter(x => x.id !== id));
    else setCarrito(carrito.map(x => x.id === id ? { ...ex, cantidad: ex.cantidad - 1 } : x));
  };

  const intentarEnviar = () => {
    if (carrito.length === 0) return;
    mesa ? procesarEnvio(mesa) : setVerModalTelefono(true);
  };

  const procesarEnvio = async (idDestino) => {
    const batch = writeBatch(db);
    const detalleNuevo = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
    try {
      carrito.forEach((item) => batch.update(doc(db, "productos", item.id), { stock: increment(-item.cantidad) }));
      const existente = pedidosBarra.find(p => String(p.mesa) === String(idDestino));
      if (existente) {
        batch.update(doc(db, "pedidos", existente.id), { detalle: existente.detalle + "\n" + detalleNuevo, total: Number(existente.total) + Number(totalCarrito), fecha: serverTimestamp() });
      } else {
        const pinAleatorio = Math.floor(1000 + Math.random() * 9000);
        batch.set(doc(collection(db, "pedidos")), { mesa: String(idDestino), detalle: detalleNuevo, total: Number(totalCarrito), estado: "pendiente", fecha: serverTimestamp(), archivado: false, pinMesa: mesa ? pinAleatorio : null });
      }
      await batch.commit();
      if (!mesa) window.open(`https://wa.me/526278897648?text=${encodeURIComponent(`Pedido:\n${detalleNuevo}\nTotal: $${totalCarrito}\n${DATOS_PAGO}`)}`, '_blank');
      setView('success'); setCarrito([]); setVerCarrito(false); setVerModalTelefono(false);
    } catch (e) { console.error(e); }
  };

  const cobrarCuenta = async (p) => {
    await addDoc(collection(db, "historial_tickets"), { mesa: p.mesa, detalle: p.detalle, total: p.total, fecha: serverTimestamp(), archivado: false });
    await deleteDoc(doc(db, "pedidos", p.id));
    setTicketParaReimprimir(p);
    if (String(p.mesa) === String(mesa)) { setMesaValidada(false); setConsumoAcumulado([]); setView('welcome'); }
  };

  const eliminarArticuloComanda = async (p, idx) => {
    const lineas = p.detalle.split('\n');
    const match = lineas[idx].match(/(\d+)x (.*?) \(\$(\d+)\)/);
    if (match) {
      const batch = writeBatch(db);
      const prodEnc = productosMenu.find(pr => pr.nombre === match[2].trim());
      if (prodEnc) batch.update(doc(db, "productos", prodEnc.id), { stock: increment(parseInt(match[1])) });
      const nuevasLineas = lineas.filter((_, i) => i !== idx);
      if (nuevasLineas.length === 0) batch.delete(doc(db, "pedidos", p.id));
      else batch.update(doc(db, "pedidos", p.id), { detalle: nuevasLineas.join('\n'), total: Math.max(0, Number(p.total) - Number(match[3]))});
      await batch.commit();
    }
  };

  const realizarCierreTurno = async () => {
    if (window.confirm(`¿Cerrar con $${totalCajaHoy}?`)) {
      const batch = writeBatch(db);
      historialCerrado.forEach(t => { if (!t.archivado) batch.update(doc(db, "historial_tickets", t.id), { archivado: true }); });
      await batch.commit();
    }
  };

  const guardarEvento = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "recordatorios"), { ...nuevoEvento, enviado: false, createdAt: serverTimestamp() });
    setVerModalNuevoEvento(false);
    setNuevoEvento({ titulo: "", fecha: "", hora: "" });
  };

  // --- RENDERS PRIORITARIOS (SEGURIDAD) ---

  if (mesa && !mesaValidada && pinCorrectoMesa) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
        <Lock size={48} className="text-orange-600 mb-6 animate-pulse" /><h2 className="text-2xl font-black italic uppercase text-center tracking-tighter">Mesa con Cuenta Abierta</h2>
        <div className="flex gap-4 my-8">{[1, 2, 3, 4].map((dot) => (<div key={dot} className={`w-4 h-4 rounded-full border-2 border-orange-600 ${pinMesaInput.length >= dot ? 'bg-orange-600 shadow-lg' : 'bg-transparent'}`} />))}</div>
        <div className="grid grid-cols-3 gap-4 max-w-[280px]">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => manejarPinMesa(n)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">{n}</button>)}<div /><button onClick={() => manejarPinMesa(0)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">0</button></div>
      </div>
    );
  }

  if (view === 'barra' && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="mb-8 text-center"><Zap size={32} className="text-orange-600 mx-auto mb-4" /><h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Acceso Barra</h2></div>
        <div className="flex gap-4 mb-12">{[1, 2, 3, 4].map((dot) => (<div key={dot} className={`w-4 h-4 rounded-full border-2 border-orange-600 transition-all ${pinInput.length >= dot ? 'bg-orange-600' : 'bg-transparent'}`} />))}</div>
        <div className="grid grid-cols-3 gap-4 max-w-[280px]">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => { const nuevo = pinInput + n; setPinInput(nuevo); if(nuevo === PIN_ADMIN) setIsAdmin(true); else if(nuevo.length === 4) setTimeout(() => setPinInput(""), 500); }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90 transition-all">{n}</button>)}<div /><button onClick={() => { const nuevo = pinInput + "0"; setPinInput(nuevo); if(nuevo === PIN_ADMIN) setIsAdmin(true); else if(nuevo.length === 4) setTimeout(() => setPinInput(""), 500); }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90 transition-all">0</button><button onClick={() => setView('welcome')} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors"><X size={24} /></button></div>
      </div>
    );
  }

  if (view === 'success') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white font-sans"><CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" /><h1 className="text-4xl font-black italic mb-4 uppercase tracking-tighter">¡RECIBIDO!</h1><button onClick={() => setView('menu')} className="text-orange-500 font-bold border-b border-orange-500 uppercase tracking-widest">Seguir Consumiendo</button></div>
  );

  if (view === 'barra') {
    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col font-sans">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-6 gap-4 no-print">
            <div className="w-full md:w-auto"><h1 className="text-4xl font-black text-orange-600 italic uppercase tracking-tighter leading-none">TRIBU'S BARRA</h1><div className="flex gap-4 mt-4">
                <button onClick={() => setTabBarra('comandas')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'comandas' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}><LayoutDashboard size={16}/> Comandas</button>
                <button onClick={() => setTabBarra('inventario')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'inventario' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}><Boxes size={16}/> Inventario</button>
                <button onClick={() => setTabBarra('eventos')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-xs transition-all ${tabBarra === 'eventos' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}><Calendar size={16}/> Eventos</button></div></div>
            <div className="flex items-center gap-4">{tabBarra === 'inventario' && <button onClick={() => setVerModalNuevoProd(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all shadow-lg"><PlusCircle size={16}/> Nuevo Item</button>}<div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold animate-pulse uppercase tracking-widest">● En Vivo</div></div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {tabBarra === 'comandas' && (
            <div className="flex-1 no-print">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pedidosBarra.filter(p => String(p.mesa).toLowerCase().includes(filtroMesa.toLowerCase())).map(p => (
                  <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl relative shadow-xl flex flex-col justify-between group transition-all">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${String(p.mesa).startsWith("TEL:") ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
                    <div><div className="flex justify-between items-start"><h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{String(p.mesa).startsWith("TEL:") ? "📦 EXTERNO" : `MESA ${p.mesa}`}</h3>
                    <button onClick={async () => { if(window.confirm("¿Devolver productos?")) { const batch = writeBatch(db); p.detalle.split('\n').forEach(linea => { const m = linea.match(/(\d+)x (.*?) \(\$/); if (m) { const prod = productosMenu.find(pr => pr.nombre === m[2].trim()); if (prod) batch.update(doc(db, "productos", prod.id), { stock: increment(parseInt(m[1])) }); } }); batch.delete(doc(db, "pedidos", p.id)); await batch.commit(); } }} className="p-1 text-slate-700 hover:text-red-500"><Trash2 size={18}/></button></div>
                    {p.pinMesa && (<div className="bg-orange-600/10 border border-orange-600/20 rounded-lg p-2 mt-3 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-orange-500">PIN:</span><span className="text-xl font-black text-white">{p.pinMesa}</span></div>)}
                    <div className="mt-4 space-y-1">{p.detalle.split('\n').map((linea, idx) => (<div key={idx} className="group/item flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5"><span className="text-lg text-slate-300 leading-tight">{linea}</span><button onClick={() => eliminarArticuloComanda(p, idx)} className="opacity-0 group-hover/item:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"><X size={16}/></button></div>))}</div></div>
                    <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-4 rounded-xl font-black text-lg mt-6 active:scale-95 uppercase tracking-tighter shadow-lg">Cobrar ${p.total}</button></div>
                ))}
              </div>
            </div>
          )}

          {tabBarra === 'inventario' && (
            <div className="flex-1 no-print">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productosMenu.map(prod => (
                  <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4"><div className="flex gap-3"><div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex-shrink-0"><img src={prod.imagen} className="w-full h-full object-cover opacity-80" /></div><div><h4 className="font-black text-white uppercase tracking-tighter text-sm leading-tight">{prod.nombre}</h4><p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{prod.categoria}</p></div></div><div className={`px-3 py-1 rounded-lg font-black text-xl ${prod.stock <= 5 ? 'bg-red-900/20 text-red-500' : 'bg-green-900/20 text-green-500'}`}>{prod.stock}</div></div>
                    <div className="grid grid-cols-2 gap-2 mt-auto"><button onClick={() => updateDoc(doc(db, "productos", prod.id), { stock: increment(12) })} className="bg-slate-900 border border-slate-800 py-2 rounded-xl text-[10px] font-black uppercase">+12</button><button onClick={() => { const ex = window.prompt("Nueva cantidad:"); if(ex) updateDoc(doc(db, "productos", prod.id), { stock: Number(ex) }); }} className="bg-orange-600/10 text-orange-500 border border-orange-500/20 py-2 rounded-xl text-[10px] font-black uppercase">Editar</button>
                    <button onClick={async () => { if(window.confirm(`Eliminar ${prod.nombre}?`)) await deleteDoc(doc(db, "productos", prod.id)); }} className="bg-red-900/10 text-red-500 border border-red-900/20 py-2 rounded-xl flex items-center justify-center col-span-2 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button></div></div>
                ))}
              </div>
            </div>
          )}

          {tabBarra === 'eventos' && (<div className="flex-1 no-print p-4"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase text-orange-600 italic">Recordatorios</h2><button onClick={() => setVerModalNuevoEvento(true)} className="bg-orange-600 px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg"><PlusCircle size={16}/> Agendar</button></div><div className="grid gap-4">{recordatorios.map(rec => (<div key={rec.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl flex justify-between items-center shadow-xl"><div><p className="text-white font-bold uppercase tracking-tight">{rec.titulo}</p><p className="text-orange-500 text-[10px] font-black mt-1 uppercase tracking-widest">{rec.fecha} | {rec.hora} HRS</p></div><button onClick={() => deleteDoc(doc(db, "recordatorios", rec.id))} className="text-red-500/30 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></div>))}</div></div>)}

          <div className="w-full lg:w-[350px] space-y-4 no-print">
            <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800 shadow-xl"><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-600" size={16}/><input type="text" placeholder="Mesa, Tel o Fecha" value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl pl-10 py-2 text-sm text-white focus:border-orange-500 font-bold shadow-inner" /></div></div>
            <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-orange-900/10 shadow-2xl">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-black text-orange-600 uppercase italic flex items-center gap-2"><ReceiptText size={20}/> {filtroMesa === "" ? "Caja Hoy" : "Resultados"}</h2><button onClick={realizarCierreTurno} className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg uppercase hover:bg-red-600 transition-all">Cierre</button></div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto no-scrollbar mb-4">
                {historialCerrado.filter(hc => {
                    const mesaStr = String(hc.mesa || "").toLowerCase();
                    const busqueda = filtroMesa.toLowerCase();
                    if (filtroMesa === "") return !hc.archivado && !mesaStr.startsWith("tel:");
                    const fT = hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toISOString().split('T')[0] : "";
                    const fL = hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleDateString('es-MX') : "";
                    return mesaStr.includes(busqueda) || fT.includes(busqueda) || fL.includes(busqueda);
                  }).map((hc) => (
                    <div key={hc.id} onClick={() => setTicketParaReimprimir(hc)} className="group p-3 bg-[#05070a] rounded-xl border border-slate-700 flex items-center justify-between hover:border-orange-500 transition-all shadow-sm cursor-pointer">
                      <div className="flex-1"><div className="flex justify-between font-black text-[11px] uppercase tracking-tighter"><span className={String(hc.mesa || "").startsWith("TEL:") ? "text-blue-400" : "text-slate-400"}>{hc.mesa}</span><span className="text-green-500">${hc.total}</span></div>
                      <div className="flex justify-between items-center mt-1"><p className="text-[8px] text-slate-500 uppercase font-bold">{hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : 'Reciente'}</p><p className="text-[11px] text-slate-400 font-black uppercase italic tracking-tighter">{hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleDateString('es-MX') : ''}</p></div></div>
                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm("¿Borrar?")) deleteDoc(doc(db, "historial_tickets", hc.id)); }} className="ml-2 p-1.5 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button></div>
                  ))}
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between font-black"><span className="text-slate-500 text-[10px] uppercase italic tracking-widest">Total:</span><span className="text-2xl text-green-500 tracking-tighter">${historialCerrado.filter(hc => {
                const mesaStr = String(hc.mesa || "").toLowerCase();
                if (filtroMesa === "") return !hc.archivado && !mesaStr.startsWith("tel:");
                const busqueda = filtroMesa.toLowerCase();
                const fT = hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toISOString().split('T')[0] : "";
                const fL = hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleDateString('es-MX') : "";
                return mesaStr.includes(busqueda) || fT.includes(busqueda) || fL.includes(busqueda);
              }).reduce((a, b) => a + (Number(b.total) || 0), 0)}</span></div></div></div>
        </div>

        {/* MODAL NUEVO ITEM - RESTAURADO DENTRO DE BARRA */}
        {verModalNuevoProd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-[400px] rounded-[2.5rem] p-8 shadow-2xl relative">
              <button onClick={() => setVerModalNuevoProd(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-orange-600 mb-6 flex items-center gap-2"><PlusCircle/> Nuevo Item</h2>
              <form onSubmit={async (e) => { e.preventDefault(); await addDoc(collection(db, "productos"), { ...nuevoProd, stock: Number(nuevoProd.stock), precioMesa: Number(nuevoProd.precioMesa), precioDomicilio: Number(nuevoProd.precioDomicilio) }); setVerModalNuevoProd(false); }} className="space-y-4">
                <input required placeholder="Nombre" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-orange-500" />
                <div className="grid grid-cols-2 gap-4"><input required type="number" placeholder="Precio Mesa" value={nuevoProd.precioMesa} onChange={e => setNuevoProd({...nuevoProd, precioMesa: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm" /><input required type="number" placeholder="Precio Domicilio" value={nuevoProd.precioDomicilio} onChange={e => setNuevoProd({...nuevoProd, precioDomicilio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm" /></div>
                <div className="grid grid-cols-2 gap-4"><input required type="number" placeholder="Stock Inicial" value={nuevoProd.stock} onChange={e => setNuevoProd({...nuevoProd, stock: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-orange-500" />
                  <select value={nuevoProd.categoria} onChange={e => setNuevoProd({...nuevoProd, categoria: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-400">{CATEGORIAS.filter(c => c !== "Todos").map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="relative"><Tag className="absolute left-3 top-3 text-slate-600" size={16}/><input placeholder="Subcategoría (Opcional)" value={nuevoProd.subcategoria} onChange={e => setNuevoProd({...nuevoProd, subcategoria: e.target.value})} className="w-full bg-slate-950 border border-slate-800 pl-10 p-3 rounded-xl text-sm focus:border-orange-500" /></div>
                <input placeholder="URL Imagen" value={nuevoProd.imagen} onChange={e => setNuevoProd({...nuevoProd, imagen: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm" />
                <button type="submit" className="w-full bg-orange-600 py-4 rounded-2xl font-black uppercase text-white shadow-xl active:scale-95 transition-all">Guardar</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NUEVO EVENTO - RESTAURADO DENTRO DE BARRA */}
        {verModalNuevoEvento && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-[350px] rounded-[2.5rem] p-8 shadow-2xl relative">
              <button onClick={() => setVerModalNuevoEvento(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-orange-600 mb-6 flex items-center gap-2"><Calendar/> Nuevo Evento</h2>
              <form onSubmit={guardarEvento} className="space-y-4">
                <input required placeholder="Título" value={nuevoEvento.titulo} onChange={e => setNuevoEvento({...nuevoEvento, titulo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm" />
                <input required type="date" value={nuevoEvento.fecha} onChange={e => setNuevoEvento({...nuevoEvento, fecha: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-400" />
                <input required type="time" value={nuevoEvento.hora} onChange={e => setNuevoEvento({...nuevoEvento, hora: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-400" />
                <button type="submit" className="w-full bg-orange-600 py-4 rounded-2xl font-black uppercase text-white shadow-xl active:scale-95">Guardar</button>
              </form>
            </div>
          </div>
        )}

        {/* TICKET CON FRASE Y FECHA */}
        {ticketParaReimprimir && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md print:static print:bg-white print:p-0">
            <div className="bg-white text-black w-full max-w-[280px] p-6 font-mono shadow-2xl relative print-container border-2 border-black">
              <button onClick={() => setTicketParaReimprimir(null)} className="absolute -top-12 right-0 text-white no-print"><X size={32}/></button>
              <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4"><h2 className="font-black text-xl italic uppercase leading-none tracking-tighter">TRIBUS BAR</h2><p className="text-[9px] uppercase font-bold mt-1 text-gray-500 tracking-widest">Nota de Venta</p></div>
              <div className="space-y-1 mb-4"><div className="flex justify-between text-[11px] font-black uppercase tracking-tighter"><span>{String(ticketParaReimprimir.mesa).startsWith("TEL:") ? "CLIENTE:" : "MESA:"}</span><span>{ticketParaReimprimir.mesa}</span></div><div className="flex justify-between text-[10px] text-gray-700 font-bold uppercase"><span>FECHA:</span><span>{ticketParaReimprimir.fecha?.seconds ? new Date(ticketParaReimprimir.fecha.seconds * 1000).toLocaleString('es-MX') : new Date().toLocaleString('es-MX')}</span></div></div>
              <div className="text-[11px] whitespace-pre-line leading-tight mb-6 border-t border-dashed border-gray-300 pt-4">{ticketParaReimprimir.detalle}</div>
              <div className="flex justify-between font-black text-2xl border-t-2 border-dashed border-black pt-4 mb-6"><span>TOTAL:</span><span>${ticketParaReimprimir.total}</span></div>
              <div className="text-center border-t border-gray-200 pt-6 pb-2"><p className="text-[11px] font-black italic uppercase tracking-tighter mb-1">"La vida es mejor compartida en la Tribu"</p><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">¡Gracias por tu visita!</p></div>
              <button onClick={() => window.print()} className="mt-8 w-full bg-black text-white py-4 rounded-xl font-black no-print flex items-center justify-center gap-2 active:scale-95 shadow-xl transition-all"><Printer size={18}/> Imprimir</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTAS CLIENTE ---

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

  if (view === 'menu') {
    const menuFiltrado = productosMenu.filter(p => (catSeleccionada === "Todos" || p.categoria === catSeleccionada) && (subCatSeleccionada === "Todas" || p.subcategoria === subCatSeleccionada));
    const subcategoriasDisponibles = Array.from(new Set(productosMenu.filter(p => p.categoria === catSeleccionada && p.subcategoria && p.subcategoria !== "Todas").map(p => p.subcategoria)));
    return (
      <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans">
        <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter leading-none">TRIBU'S BAR</div>
              <div className="flex gap-2">
                {consumoAcumulado.length > 0 && (
                  <div className="bg-green-600/10 px-3 py-2 rounded-xl border border-green-500/20 flex items-center gap-2">
                    <History size={14} className="text-green-500" /><span className="text-[10px] font-black text-green-500 leading-none">${totalAcumulado}</span>
                  </div>
                )}
                <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative border-none outline-none"><ShoppingCart size={20} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] px-1.5 rounded-full font-bold shadow-lg">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
              {CATEGORIAS.map(c => (<button key={c} onClick={() => { setCatSeleccionada(c); setSubCatSeleccionada("Todas"); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all ${catSeleccionada === c ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400'}`}>{c}</button>))}
            </div>
            {subcategoriasDisponibles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/50">
                <button onClick={() => setSubCatSeleccionada("Todas")} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase border-none outline-none ${subCatSeleccionada === "Todas" ? 'text-sky-400 bg-sky-900/20' : 'text-slate-500'}`}>Todas</button>
                {subcategoriasDisponibles.map(sc => (<button key={sc} onClick={() => setSubCatSeleccionada(sc)} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase border-none outline-none ${subCatSeleccionada === sc ? 'text-sky-400 bg-sky-900/20 shadow-lg' : 'text-slate-500'}`}>{sc}</button>))}
              </div>
            )}
          </div>
        </header>
        <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{menuFiltrado.map(item => (<div key={item.id} className={`bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30 group shadow-lg transition-all ${item.stock <= 0 ? 'opacity-50 grayscale' : ''}`}><div className="w-24 h-24 rounded-2xl overflow-hidden shadow-inner flex-shrink-0 relative"><img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="p" />{item.stock <= 5 && item.stock > 0 && <span className="absolute bottom-0 left-0 right-0 bg-red-600 text-[8px] font-black text-center uppercase py-0.5 shadow-lg tracking-widest animate-pulse">Últimas {item.stock}</span>}</div><div className="flex-1 flex flex-col justify-between"><div><h3 className="font-bold text-white uppercase leading-tight">{item.nombre}</h3><p className="text-slate-500 text-xs mt-1 line-clamp-2 italic">{item.descripcion}</p></div><div className="flex justify-between items-center mt-3"><span className="font-black text-xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button disabled={item.stock <= 0} onClick={() => agregarAlCarrito(item)} className={`${item.stock <= 0 ? 'bg-slate-700' : 'bg-orange-600 active:scale-90 shadow-orange-950/20'} text-white w-10 h-10 rounded-xl font-bold transition-all shadow-lg`}>{item.stock <= 0 ? <Package size={16} className="mx-auto" /> : '+'}</button></div></div></div>))} </main>
        
        <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible opacity-100' : 'invisible opacity-0'}`}><div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} /><div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}><div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl tracking-tighter leading-none"><h2>Mi Cuenta</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div><div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">{carrito.length > 0 && (<div><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={12}/> Por pedir ahora:</p><div className="space-y-3">{carrito.map(item => (<div key={item.id} className="bg-orange-600/5 p-3 rounded-2xl flex flex-col gap-2 border border-orange-600/20 shadow-sm"><div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight leading-none"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600 hover:text-red-500"/></button></div><div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1 shadow-inner"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div></div>))}</div></div>)}{consumoAcumulado.length > 0 && (<div><p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={12}/> Ya consumido:</p><div className="space-y-2">{consumoAcumulado.map((item, idx) => (<div key={idx} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center border border-slate-800 opacity-60"><span className="text-[11px] font-bold text-slate-300 uppercase">{item.cantidad}x {item.nombre}</span><span className="text-[11px] font-black text-white">${item.precio * item.cantidad}</span></div>))}</div></div>)}</div><div className="pt-4 border-t border-slate-800 space-y-4"><div className="flex justify-between font-black text-2xl text-orange-500 italic"><span>Total Cuenta</span><span>${totalCarrito + totalAcumulado}</span></div><button disabled={carrito.length === 0} onClick={intentarEnviar} className="w-full py-4 rounded-2xl font-black text-white bg-orange-600 active:scale-95 transition-all shadow-xl uppercase tracking-widest">Confirmar Pedido</button></div></div></div>
        
        {verModalTelefono && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <div className="relative bg-slate-900 border border-slate-800 w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl text-center flex flex-col items-center"><div className="bg-green-600/20 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-green-500 shadow-inner"><Phone size={32}/></div><h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">Tu Teléfono</h2><p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-8 leading-tight">Para confirmar tu reserva</p><div className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 mb-8 text-2xl font-black text-green-500 tracking-[0.2em] min-h-[64px] flex items-center justify-center shadow-inner">{telefonoInput || <span className="opacity-20 text-slate-600">0000000000</span>}</div><div className="grid grid-cols-3 gap-3 w-full mb-8">{[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => telefonoInput.length < 10 && setTelefonoInput(telefonoInput + n)} className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700 text-xl font-black hover:bg-slate-700 active:scale-90">{n}</button>))}<button onClick={() => setTelefonoInput("")} className="h-14 rounded-2xl bg-red-900/20 text-red-500 flex items-center justify-center active:scale-90 shadow-sm"><Trash2 size={20}/></button><button onClick={() => setTelefonoInput(telefonoInput + 0)} className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700 text-xl font-black active:scale-90">0</button><button onClick={() => setTelefonoInput(telefonoInput.slice(0, -1))} className="h-14 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center active:scale-90"><Minus size={20}/></button></div><button disabled={telefonoInput.length < 10} onClick={() => procesarEnvio(`TEL: ${telefonoInput}`)} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${telefonoInput.length >= 10 ? 'bg-green-600 shadow-lg shadow-green-900/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Enviar Pedido</button><button onClick={() => setVerModalTelefono(false)} className="mt-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-transparent hover:border-slate-500 transition-all">Cancelar</button></div>
          </div>
        )}
        {carrito.length > 0 && !verCarrito && !verModalTelefono && (<div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center no-print"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl active:scale-95 transition-all shadow-orange-950/30"><span className="text-[10px] uppercase font-bold tracking-widest text-white leading-none flex items-center gap-2"><ShoppingCart size={14}/> MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span className="font-black text-xl italic text-white tracking-tighter leading-none">${totalCarrito}</span></button></div>)}
      </div>
    );
  }

  return null;
}

export default App;