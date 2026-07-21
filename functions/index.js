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

const PIN_ADMIN = "2370";
const CATEGORIAS = ["Rockola", "Cerveza", "Bebidas Preparadas", "Snacks", "Botellas", "Comidas"];
const LINK_PRINCIPAL = "http://192.168.5.5/youtube/search"; 
const TEXTO_LINK = "Rockola";

function App() {
  const [view, setView] = useState('welcome');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [tabBarra, setTabBarra] = useState('comandas');
  const [mesa, setMesa] = useState(null);
  const [pedidosBarra, setPedidosBarra] = useState([]);
  const [historialCerrado, setHistorialCerrado] = useState([]);
  const [productosMenu, setProductosMenu] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);

  // ✨ NUEVO: Switch para saber si la orden la está gestionando el mesero desde la barra
  const [esComandaManual, setEsComandaManual] = useState(false);

  // Función para determinar la planta basada en el rango de mesas
  const obtenerPlanta = (idMesa) => {
    const n = parseInt(idMesa);
    if (n >= 26 && n <= 50) return "TERRAZA"; // Rango ajustado para las 50 mesas
    return "PLANTA BAJA";
  };

  const totalCajaHoy = historialCerrado.filter(hc => !hc.archivado).reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesaId = params.get("mesa");
    if (mesaId) setMesa(mesaId);
    if (params.get("view") === 'barra') setView('barra');

    onSnapshot(collection(db, "productos"), (snap) => setProductosMenu(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pendiente")), (snapshot) => setPedidosBarra(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    onSnapshot(query(collection(db, "historial_tickets"), orderBy("fecha", "desc")), (snapshot) => setHistorialCerrado(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, []);

  // --- UNA SOLA VISTA DE BIENVENIDA ---
  if (view === 'welcome') {
    const planta = obtenerPlanta(mesa);
    const nombreVisual = planta === "TERRAZA" ? "TRIBU'S BAR TERRAZA" : "TRIBU'S BAR";

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
        <div className="absolute inset-0 opacity-40">
          <img src="https://res.cloudinary.com/druv9bk0d/image/upload/v1784608643/fondo_odtdm8.jpg" className="w-full h-full object-cover" alt="bg" />
          <div className="absolute inset-0 bg-slate-950/80"></div>
        </div>
        <div className="relative z-10 space-y-12 w-full max-w-lg">
          <div className="space-y-4">
            <div className="flex justify-center items-center gap-2 text-orange-500 animate-pulse">
              <Zap size={18} /> 
              <h1 style={{ fontSize: '1.25rem' }} className="font-black italic uppercase leading-none tracking-tight">
                {nombreVisual}
              </h1>
            </div>
            <div className="space-y-2 uppercase tracking-tight">
              <h2 className="text-3xl font-bold">{mesa ? `¡BIENVENIDO MESA ${mesa}!` : "¡BIENVENIDO!"}</h2>
              <p className="text-orange-500 text-xs font-medium tracking-[0.2em]">{planta}</p>
            </div>
          </div>
          <div className="grid gap-4">
            <button onClick={() => { setEsComandaManual(false); setView('menu'); }} className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 transition-all"><UtensilsCrossed size={28} /><div className="text-left font-bold uppercase text-[10px] text-orange-200"><p>Menú Digital</p><p className="text-lg text-white font-black uppercase tracking-tight leading-none">Ver la carta</p></div></button>
            <button onClick={() => window.open(LINK_PRINCIPAL, '_blank')} className="flex items-center gap-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/30 backdrop-blur-sm shadow-xl active:scale-95 transition-all"><ExternalLink className="text-green-500" size={28} /><div className="text-left font-bold uppercase text-[10px] text-slate-400"><p>Rockola</p><p className="text-lg text-white font-black uppercase">{TEXTO_LINK}</p></div></button>
          </div>
          <button onClick={() => setView('barra')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
        </div>
      </div>
    );
  }

  // --- VISTA BARRA ---
  if (view === 'barra' && isAdmin) {
    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col font-sans">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-6 gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-orange-600 italic uppercase">TRIBU'S BARRA</h1>
            <span className="text-[10px] font-black tracking-widest mt-1 uppercase text-slate-500">ZONA DE MANDO DEL STAFF</span>
          </div>
          <div className="flex gap-3 overflow-x-auto">
            <button onClick={() => setTabBarra('comandas')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${tabBarra === 'comandas' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>Comandas</button>
            {/* ✨ NUEVO BOTÓN TAB MESAS */}
            <button onClick={() => setTabBarra('mesas_fisicas')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${tabBarra === 'mesas_fisicas' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>Control Mesas</button>
            <button onClick={() => setTabBarra('caja')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${tabBarra === 'caja' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>Caja</button>
            <button onClick={() => { setIsAdmin(false); setView('welcome'); }} className="bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-2 rounded-xl text-xs font-black uppercase">Salir</button>
          </div>
        </header>
        
        {/* TAB COMANDAS */}
        {tabBarra === 'comandas' && (
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pedidosBarra.map(p => (
                <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-2xl relative shadow-xl flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-600"></div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase text-white">MESA {p.mesa}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{obtenerPlanta(p.mesa)}</p>
                    <div className="mt-3 bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <p className="text-slate-300 text-sm font-mono whitespace-pre-line">{p.detalle}</p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-800/50 pt-3 flex justify-between items-center">
                    <span className="text-green-500 font-black text-xl">${p.total}</span>
                    <button onClick={async () => {
                      await addDoc(collection(db, "historial_tickets"), { mesa: p.mesa, detalle: p.detalle, total: Number(p.total), fecha: serverTimestamp(), archivado: false });
                      await deleteDoc(doc(db, "pedidos", p.id));
                    }} className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-xl text-xs font-black uppercase">Cobrar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✨ TAB NUEVO: CONTROL DE MESAS FÍSICAS (GRID DE 50 MESAS) */}
        {tabBarra === 'mesas_fisicas' && (
          <div className="flex-1">
            <div className="mb-6 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/40">
               <h2 className="text-sm font-black text-orange-500 uppercase tracking-widest mb-1">🗺️ Mapa de Control Operativo</h2>
               <p className="text-slate-400 text-[10px] uppercase font-bold font-mono">Toca para abrir menú asignado a la mesa o ver su estado actual</p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
               {Array.from({ length: 50 }, (_, i) => {
                  const numMesa = String(i + 1);
                  const comandaActiva = pedidosBarra.find(p => String(p.mesa) === numMesa);
                  
                  return (
                     <button
                        key={numMesa}
                        onClick={() => {
                           setMesa(numMesa);
                           setEsComandaManual(true); // 🛡️ Encendemos la bandera de comanda manual del mesero
                           setView('menu'); // Redirige directamente al menú sin pasar por el welcome
                        }}
                        className={`p-4 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 text-left ${
                           comandaActiva 
                             ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-lg' 
                             : 'bg-[#0c111a] border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                     >
                        <span className="text-lg font-black tracking-tighter leading-none text-white">M-{numMesa}</span>
                        <span className="text-[7px] font-black uppercase mt-1.5 tracking-widest block">
                           {comandaActiva ? `Activa • $${comandaActiva.total}` : 'Libre'}
                        </span>
                     </button>
                  );
               })}
            </div>
          </div>
        )}

        {/* TAB CAJA */}
        {tabBarra === 'caja' && (
          <div className="bg-[#0c111a] p-5 rounded-3xl border border-slate-800 max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-orange-600 uppercase italic mb-4">Caja Hoy</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {historialCerrado.filter(hc => !hc.archivado).map(hc => (
                <div key={hc.id} className="p-3 bg-black/40 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-black text-[11px] text-slate-400 uppercase">Mesa {hc.mesa} - {obtenerPlanta(hc.mesa)}</p>
                    <p className="text-green-500 font-black text-lg">${hc.total}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between font-black">
              <span className="text-slate-500 text-xs uppercase">Total:</span>
              <span className="text-2xl text-green-500">${totalCajaHoy}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA MENÚ DIGITAL ---
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-slate-900 pb-24 text-slate-100 font-sans w-full flex flex-col items-center">
        <header className="bg-slate-950 sticky top-0 z-40 w-full border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="font-black text-xl text-orange-500 italic uppercase tracking-tighter leading-none">
              MESA {mesa || "S/N"}
            </h3>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {esComandaManual ? "⚡ REGISTRO MANUAL STAFF" : obtenerPlanta(mesa)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-3 rounded-full relative">
              <ShoppingCart size={18} />
              {carrito.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {carrito.reduce((a, b) => a + b.cantidad, 0)}
                </span>
              )}
            </button>
            <button onClick={() => {
              // 🔄 Retorno inteligente: Si es comanda manual regresa al control de mesas, si no a welcome
              if (esComandaManual) { setView('barra'); setTabBarra('mesas_fisicas'); } 
              else { setView('welcome'); }
            }} className="bg-slate-800 text-slate-400 p-2 text-xs uppercase font-black rounded-xl">Regresar</button>
          </div>
        </header>

        <main className="p-4 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {productosMenu.map(item => (
            <div key={item.id} className="bg-slate-800/80 rounded-2xl p-4 flex justify-between items-center border border-slate-700/40 shadow-md">
              <div>
                <h4 className="font-black text-white uppercase tracking-tight text-sm">{item.nombre}</h4>
                <p className="font-black text-orange-500 italic text-lg mt-1">${item.precioMesa}</p>
              </div>
              <button onClick={() => {
                const exist = carrito.find(x => x.id === item.id);
                if (exist) setCarrito(carrito.map(x => x.id === item.id ? { ...exist, cantidad: exist.cantidad + 1 } : x));
                else setCarrito([...carrito, { ...item, precio: item.precioMesa, cantidad: 1 }]);
              }} className="bg-orange-600 text-white w-10 h-10 rounded-xl font-black text-xl shadow-lg active:scale-90 transition-transform">+</button>
            </div>
          ))}
        </main>

        {/* MODAL CARRITO INCORPORADO */}
        {verCarrito && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="bg-slate-950 w-[85%] md:w-[400px] h-full p-6 flex flex-col justify-between border-l border-slate-800 text-white">
              <div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                  <h2 className="text-xl font-black italic uppercase text-orange-500">Mesa {mesa}</h2>
                  <X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" />
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[60%]">
                  {carrito.map(item => (
                    <div key={item.id} className="bg-slate-900 p-3 rounded-xl flex justify-between items-center border border-slate-800">
                      <div>
                        <p className="text-xs font-bold uppercase">{item.nombre}</p>
                        <p className="text-orange-500 text-sm font-black mt-1">${item.precio * item.cantidad}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Minus size={14} className="cursor-pointer" onClick={() => {
                          if (item.cantidad === 1) setCarrito(carrito.filter(x => x.id !== item.id));
                          else setCarrito(carrito.map(x => x.id === item.id ? { ...item, cantidad: item.amount - 1 } : x));
                        }}/>
                        <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded-md">{item.cantidad}</span>
                        <Plus size={14} className="cursor-pointer" onClick={() => setCarrito(carrito.map(x => x.id === item.id ? { ...item, cantidad: item.cantidad + 1 } : x))}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-4">
                <div className="flex justify-between font-black text-xl text-orange-500">
                  <span>Total:</span>
                  <span>${carrito.reduce((a, b) => a + (b.precio * b.cantidad), 0)}</span>
                </div>
                <button onClick={async () => {
                  if (carrito.length === 0) return;
                  const detalleTxt = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
                  const totalNum = carrito.reduce((a, b) => a + (b.precio * b.cantidad), 0);
                  
                  await addDoc(collection(db, "pedidos"), {
                    mesa: String(mesa),
                    detalle: detalleTxt,
                    total: totalNum,
                    estado: "pendiente",
                    fecha: serverTimestamp(),
                    origen: esComandaManual ? "mesero_barra" : "cliente_qr"
                  });

                  setCarrito([]);
                  setVerCarrito(false);
                  
                  if (esComandaManual) {
                    setView('barra');
                    setTabBarra('comandas');
                    alert("¡Comanda manual guardada en barra exitosamente!");
                  } else {
                    setView('welcome');
                    alert("¡Tu pedido ha sido enviado a la barra!");
                  }
                }} className="w-full bg-orange-600 py-3.5 rounded-xl font-black uppercase text-sm tracking-wider active:scale-95 transition-all">Enviar Pedido</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- PANTALLA TECLADO PIN DE SEGURIDAD (DEFAULT ACCESO BARRA) ---
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans p-4">
      <Lock size={32} className="text-orange-600 mb-4 animate-pulse" />
      <h2 className="text-xl font-black italic uppercase tracking-tight mb-2">Ingreso Autorizado</h2>
      <div className="flex gap-3 mb-8">
        {[1, 2, 3, 4].map((dot) => (
          <div key={dot} className={`w-3 h-3 rounded-full border border-orange-600 transition-all ${pinInput.length >= dot ? 'bg-orange-600 shadow-md' : 'bg-transparent'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-[260px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => {
            const nuevo = pinInput + n;
            if (nuevo.length <= 4) setPinInput(nuevo);
            if (nuevo === PIN_ADMIN) { setIsAdmin(true); setView('barra'); setTabBarra('mesas_fisicas'); setPinInput(""); }
            else if (nuevo.length === 4) setTimeout(() => setPinInput(""), 300);
          }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90 transition-transform">{n}</button>
        ))}
        <button onClick={() => setView('welcome')} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 text-xs font-bold uppercase">Atrás</button>
        <button onClick={() => {
            const nuevo = pinInput + "0";
            if (nuevo.length <= 4) setPinInput(nuevo);
            if (nuevo === PIN_ADMIN) { setIsAdmin(true); setView('barra'); setTabBarra('mesas_fisicas'); setPinInput(""); }
            else if (nuevo.length === 4) setTimeout(() => setPinInput(""), 300);
        }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">0</button>
        <button onClick={() => setPinInput("")} className="w-16 h-16 rounded-full flex items-center justify-center text-red-500 text-xs font-bold uppercase">Borrar</button>
      </div>
    </div>
  );
}

export default App;