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
const CATEGORIAS = ["Todos", "Cerveza", "Bebidas Preparadas", "Snacks", "Botellas", "Comidas"];
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

  // Función para determinar la planta basada en el rango de mesas
  const obtenerPlanta = (idMesa) => {
    const n = parseInt(idMesa);
    if (n >= 11 && n <= 20) return "TERRAZA";
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
          <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="bg" />
          <div className="absolute inset-0 bg-slate-950/80"></div>
        </div>
        <div className="relative z-10 space-y-12 w-full max-w-lg">
          <div className="space-y-4">
            <div className="flex justify-center items-center gap-2 text-orange-500 animate-pulse">
              <Zap size={18} /> 
              {/* TAMAÑO PEQUEÑO REAL */}
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
            <button onClick={() => setView('menu')} className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 transition-all"><UtensilsCrossed size={28} /><div className="text-left font-bold uppercase text-[10px] text-orange-200"><p>Menú Digital</p><p className="text-lg text-white font-black uppercase tracking-tight leading-none">Ver la carta</p></div></button>
            <button onClick={() => window.open(LINK_PRINCIPAL, '_blank')} className="flex items-center gap-5 bg-slate-800/60 p-5 rounded-3xl border border-slate-700/30 backdrop-blur-sm shadow-xl active:scale-95 transition-all"><ExternalLink className="text-green-500" size={28} /><div className="text-left font-bold uppercase text-[10px] text-slate-400"><p>Rockola</p><p className="text-lg text-white font-black uppercase">{TEXTO_LINK}</p></div></button>
          </div>
          <button onClick={() => setView('barra')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
        </div>
      </div>
    );
  }

  // --- VISTA BARRA (CAJA CON ETIQUETA DE PLANTA) ---
  if (view === 'barra' && isAdmin) {
    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col font-sans">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-6 gap-4">
          <h1 className="text-4xl font-black text-orange-600 italic uppercase">TRIBU'S BARRA</h1>
          <div className="flex gap-4">
            <button onClick={() => setTabBarra('comandas')} className={`px-4 py-2 rounded-xl text-xs font-black ${tabBarra === 'comandas' ? 'bg-orange-600' : 'bg-slate-900'}`}>Comandas</button>
            <button onClick={() => setTabBarra('caja')} className={`px-4 py-2 rounded-xl text-xs font-black ${tabBarra === 'caja' ? 'bg-orange-600' : 'bg-slate-900'}`}>Caja</button>
          </div>
        </header>
        
        {tabBarra === 'caja' && (
          <div className="bg-[#0c111a] p-5 rounded-3xl border border-slate-800 max-w-md">
            <h2 className="text-lg font-black text-orange-600 uppercase italic mb-4">Caja Hoy</h2>
            <div className="space-y-3">
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
          <button key={n} onClick={() => {
            const nuevo = pinInput + n;
            setPinInput(nuevo);
            if(nuevo === PIN_ADMIN) setIsAdmin(true);
            else if(nuevo.length === 4) setPinInput("");
          }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black">{n}</button>
        ))}
      </div>
    </div>
  );
}

export default App;