import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, 
  query, where, orderBy, serverTimestamp, writeBatch, increment 
} from "firebase/firestore";
import { 
  ShoppingCart, Trash2, X, Plus, Minus, Wifi, 
  UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, CreditCard, Phone, Package, LayoutDashboard, Boxes, PlusCircle, Tag, ExternalLink, Lock, Calendar, History
} from 'lucide-react';
import { auth } from './firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged 
} from "firebase/auth";
const DATOS_PAGO = "💳 *DATOS DE PAGO*:\nBanco: Tu Banco\nCuenta: 0000 0000 0000 0000\nCLABE: 000000000000000000\nA nombre de: Tribus Bar";
const PIN_ADMIN = "2370";
const CATEGORIAS = ["Todos", "Cerveza", "Bebidas Preparadas", "Snacks", "Botellas", "Comidas"];
const LINK_PRINCIPAL = "http://192.168.5.5/youtube/search"; 
const TEXTO_LINK = "Rockola";

// --- CONFIGURACIÓN TELEGRAM ---
const TELEGRAM_TOKEN = "8571689799:AAGl_SNWiQXUc1GHXrTjub-Ke0KoDrUt-k4";
const TELEGRAM_CHAT_ID = "8712410394";

// --- ESTILOS DE IMPRESIÓN ---
const estilosImpresion = `
  @media print {
    body * { visibility: hidden; }
    .print-container, .print-container * { visibility: visible; }
    .print-container { 
      position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; border: none !important;
    }
    .no-print { display: none !important; }
  }
`;

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
    nombre: "", precioMesa: "", precioDomicilio: "", stockBaja: "", stockTerraza: "", 
    categoria: "Cerveza", subcategoria: "", imagen: ""
  });
  const [esNuevaSub, setEsNuevaSub] = useState(false);
  const [productosMenu, setProductosMenu] = useState([]);
  const [catSeleccionada, setCatSeleccionada] = useState("Todos");
  const [subCatSeleccionada, setSubCatSeleccionada] = useState("Todas");
  const [pedidosBarra, setPedidosBarra] = useState([]);
  const [historialCerrado, setHistorialCerrado] = useState([]); 
  const [filtroMesa, setFiltroMesa] = useState(""); 
  const [ticketParaReimprimir, setTicketParaReimprimir] = useState(null);

  const obtenerPlanta = (idMesa) => {
    if (!idMesa) return "EXTERNO";
    const n = parseInt(idMesa);
    if (isNaN(n)) return "EXTERNO";
    if (n >= 1 && n <= 25) return "PLANTA BAJA";
    if (n >= 26 && n <= 50) return "TERRAZA";
    return "EXTERNO";
  };
 
// Dentro de tu función App()
const [usuarioLogueado, setUsuarioLogueado] = useState(null);
const [verModalAuth, setVerModalAuth] = useState(false);
const [nombreRegistro, setNombreRegistro] = useState("");
const [pasoAuth, setPasoAuth] = useState('telefono'); // 'telefono' o 'codigo'
const [codigoOTP, setCodigoOTP] = useState("");
const [confirmacionResultado, setConfirmacionResult] = useState(null);

// Escuchar si el usuario ya está logueado al cargar
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) setUsuarioLogueado(user);
  });
  return () => unsub();
}, []);

const enviarCodigoSMS = async () => {
  if (telefonoInput.length !== 10) return alert("Ingresa 10 dígitos");

  // 1. Limpieza total y forzada
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn("Error al limpiar:", e);
    }
  }
  
  const container = document.getElementById('recaptcha-container');
  if (container) container.innerHTML = ''; 

  try {
    // 2. Nueva instancia con el ID de la image_911555.png
    // Asegúrate de que 'auth' esté importado correctamente de tu firebase.js
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      'callback': (response) => {
        console.log("reCAPTCHA resuelto");
      }
    });

    const appVerifier = window.recaptchaVerifier;
    const formatoInternacional = `+52${telefonoInput}`;
    
    // Aquí es donde Vite se quejaba; revisa que no falte una llave '}' arriba de esta función
    const confirmation = await signInWithPhoneNumber(auth, formatoInternacional, appVerifier);
    
    setConfirmacionResult(confirmation);
    setPasoAuth('codigo');
    alert("Código enviado correctamente");

  } catch (error) {
    console.error("Error SMS detallado:", error.code, error.message);
    if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
    
    // Manejo de errores comunes de Moapp
    if (error.code === 'auth/invalid-phone-number') alert("Número inválido");
    else if (error.code === 'auth/too-many-requests') alert("Demasiados intentos, espera un poco");
    else alert("Error: " + error.message);
  }
};

const verificarCodigo = async () => {
  try {
    const result = await confirmacionResult.confirm(codigoOTP);
    const user = result.user;

    // ESTO ES LO QUE SIGUE: Guardar al cliente en tu colección
    await setDoc(doc(db, "clientes", user.uid), {
      nombre: nombreRegistro,
      telefono: telefonoInput,
      uid: user.uid,
      fechaRegistro: serverTimestamp(),
      puntos: 0, 
      ultimaVisita: serverTimestamp()
    });

    setUsuarioLogueado(user);
    setVerModalAuth(false);
    alert(`¡Bienvenido, ${nombreRegistro}!`);
  } catch (error) {
    alert("Código incorrecto.");
  }
};

  const plantaActual = mesa ? obtenerPlanta(mesa) : "EXTERNO";
  const nombreBarDinamico = plantaActual === "TERRAZA" ? "TRIBU'S BAR TERRAZA" : "TRIBU'S BAR";

  const obtenerPrecioItem = (item) => mesa ? item.precioMesa : item.precioDomicilio;
  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const totalAcumulado = consumoAcumulado.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const historialFiltradoParaCaja = historialCerrado.filter(hc => {
    const busqueda = filtroMesa.toLowerCase().trim();
    const mesaOriginal = String(hc.mesa || "").toLowerCase().trim();
    const plantaMesa = obtenerPlanta(hc.mesa).toLowerCase();
    if (busqueda === "") return !hc.archivado && !mesaOriginal.startsWith("tel:");
    if (["externo", "terraza", "planta baja", "baja"].some(zona => busqueda.includes(zona))) return plantaMesa.includes(busqueda);
    if (!isNaN(busqueda)) {
      if (busqueda.length <= 2) return mesaOriginal === busqueda;
      else return mesaOriginal.includes(busqueda);
    }
    const fechaTicket = hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleDateString('es-MX') : "";
    return fechaTicket.includes(busqueda);
  });

  const totalCajaHoy = historialFiltradoParaCaja.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const ultimoMinutoEnviado = useRef("");

  // --- FUNCIÓN MOVER MESA (CORREGIDA FUERA DE USEEFFECT) ---
  const moverMesa = async (pedido) => {
    const plantaOrigen = obtenerPlanta(pedido.mesa);
    const nuevaMesa = window.prompt(`Moviendo cuenta de Mesa ${pedido.mesa} (${plantaOrigen}). Ingrese el nuevo número de mesa:`);
    
    if (!nuevaMesa || nuevaMesa === "" || nuevaMesa === pedido.mesa) return;

    const plantaDestino = obtenerPlanta(nuevaMesa);
    const etiquetaTraslado = `\n--- TRASLADO DE ${plantaOrigen} A ${plantaDestino} ---`;

    try {
      const pedidoRef = doc(db, "pedidos", pedido.id);
      await updateDoc(pedidoRef, {
        mesa: String(nuevaMesa),
        detalle: pedido.detalle + etiquetaTraslado
      });
      alert(`Cuenta trasladada a Mesa ${nuevaMesa} (${plantaDestino}) con éxito.`);
    } catch (e) {
      console.error("Error al mover mesa:", e);
      alert("No se pudo mover la mesa.");
    }
  };

  useEffect(() => {
    const vigilante = setInterval(() => {
      const ahora = new Date();
      const f = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
      const h = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
      
      recordatorios.forEach(async (rec) => {
        const llaveVigilante = `${rec.id}_${h}`;
        if (rec.fecha === f && rec.hora === h && !rec.enviado && ultimoMinutoEnviado.current !== llaveVigilante) {
          ultimoMinutoEnviado.current = llaveVigilante;
          try {
            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `🔔 *EVENTO:* ${rec.titulo}\n⏰ *HORA:* ${rec.hora} HRS`, parse_mode: 'Markdown' })
            });
            if (res.ok) {
              await updateDoc(doc(db, "recordatorios", rec.id), { enviado: true });
              console.log("✅ Mensaje único enviado con éxito");
            }
          } catch (e) {
            ultimoMinutoEnviado.current = "";
            console.error("❌ Error:", e);
          }
        }
      });
    }, 5000);

    return () => clearInterval(vigilante);
  }, [recordatorios]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesaId = params.get("mesa");
    if (mesaId) setMesa(mesaId);
    if (params.get("view") === 'barra') setView('barra');

    onSnapshot(collection(db, "productos"), (snap) => setProductosMenu(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pendiente")), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosBarra(data);
      if (mesaId) {
        const pedidoMesa = data.find(p => String(p.mesa) === String(mesaId));
        if (pedidoMesa && pedidoMesa.pinMesa) {
            setPinCorrectoMesa(pedidoMesa.pinMesa);
            const items = pedidoMesa.detalle.split('\n').map(linea => {
                const parts = linea.match(/(\d+)x (.*) \(\$(\d+)\)/);
                if (parts) return { cantidad: parseInt(parts[1]), nombre: parts[2].trim(), precio: parseInt(parts[3]) / parseInt(parts[1]) };
                return null;
            }).filter(i => i !== null);
            setConsumoAcumulado(items);
        } else { setMesaValidada(true); setConsumoAcumulado([]); }
      }
    });
    onSnapshot(query(collection(db, "historial_tickets"), orderBy("fecha", "desc")), (snapshot) => setHistorialCerrado(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    onSnapshot(query(collection(db, "recordatorios"), orderBy("fecha", "asc")), (snap) => setRecordatorios(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
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
    const idFinal = mesa ? idDestino : `TEL:${telefonoInput}`;
    const detalleNuevo = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
    try {
      carrito.forEach((item) => { batch.update(doc(db, "productos", item.id), { stock: increment(-item.cantidad) }); });
      const existente = pedidosBarra.find(p => String(p.mesa) === String(idFinal));
      if (existente) {
        batch.update(doc(db, "pedidos", existente.id), { detalle: existente.detalle + "\n" + detalleNuevo, total: Number(existente.total) + Number(totalCarrito), fecha: serverTimestamp() });
      } else {
        const pinAleatorio = Math.floor(1000 + Math.random() * 9000);
        batch.set(doc(collection(db, "pedidos")), { mesa: String(idFinal), detalle: detalleNuevo, total: Number(totalCarrito), estado: "pendiente", fecha: serverTimestamp(), archivado: false, pinMesa: mesa ? pinAleatorio : null });
      }
      await batch.commit();

      if (!mesa) {
        const mensajeWA = `Hola! Te escribimos de Tribu's Bar. Tu pedido está registrado.\n\n*Total a pagar: $${totalCarrito}*\n\n*Detalle del pedido:*\n${detalleNuevo}\n\n${DATOS_PAGO}`;
        window.open(`https://wa.me/${telefonoInput}?text=${encodeURIComponent(mensajeWA)}`, '_blank');
      }

      setView('success'); setCarrito([]); setVerCarrito(false); setVerModalTelefono(false); setTelefonoInput("");
    } catch (e) { console.error(e); }
  };

  const cobrarCuenta = async (p) => {
    await addDoc(collection(db, "historial_tickets"), { 
        mesa: p.mesa, 
        detalle: p.detalle, 
        total: p.total, 
        fecha: serverTimestamp(), 
        archivado: false,
        // USAMOS LOS DATOS QUE VIENEN EN EL OBJETO 'p'
        cliente: p.cliente || "Cliente General",
        telefono: p.telefono || "N/A",
        uid: p.uidCliente || null
    });

    await deleteDoc(doc(db, "pedidos", p.id));
    setTicketParaReimprimir(p);
    
    // ... resto del código
};

  const eliminarArticuloComanda = async (p, idx) => {
    const lineas = p.detalle.split('\n');
    const match = lineas[idx].match(/(\d+)x (.*?) \(\$(\d+)\)/);
    if (match) {
      const batch = writeBatch(db);
      const nombreLimpio = match[2].trim();
      const prodEnc = productosMenu.find(pr => pr.nombre.trim() === nombreLimpio);
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

  if (view === 'success') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white font-sans">
      <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
      <h1 className="text-4xl font-black italic mb-4 uppercase tracking-tighter">¡RECIBIDO!</h1>
      <button onClick={() => setView('menu')} className="text-orange-500 font-bold border-b border-orange-500 uppercase tracking-widest">Seguir Consumiendo</button>
    </div>
  );

  if (mesa && !mesaValidada && pinCorrectoMesa) return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
      <Lock size={48} className="text-orange-600 mb-6 animate-pulse" />
      <h2 className="text-2xl font-black italic uppercase text-center tracking-tighter">Mesa con Cuenta Abierta</h2>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">Ingresa el PIN de seguridad</p>
      <div className="flex gap-4 mb-12">
        {[1, 2, 3, 4].map((dot) => (
          <div key={dot} className={`w-4 h-4 rounded-full border-2 border-orange-600 transition-all ${pinMesaInput.length >= dot ? 'bg-orange-600 shadow-lg shadow-orange-600/40' : 'bg-transparent'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => manejarPinMesa(n)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90 transition-all">{n}</button>
        ))}
        <div />
        <button onClick={() => manejarPinMesa(0)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">0</button>
      </div>
    </div>
  );

  if (view === 'barra' && !isAdmin) return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
      <div className="mb-8 text-center"><Zap size={32} className="text-orange-600 mx-auto mb-4" /><h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Acceso Barra</h2></div>
      <div className="flex gap-4 mb-12">{[1, 2, 3, 4].map((dot) => (<div key={dot} className={`w-4 h-4 rounded-full border-2 border-orange-600 transition-all ${pinInput.length >= dot ? 'bg-orange-600' : 'bg-transparent'}`} />))}</div>
      <div className="grid grid-cols-3 gap-4 max-w-[280px]">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => { const nuevo = pinInput + n; setPinInput(nuevo); if(nuevo === PIN_ADMIN) setIsAdmin(true); else if(nuevo.length === 4) setPinInput(""); }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90 transition-all">{n}</button>)}<div /><button onClick={() => { const nuevo = pinInput + "0"; setPinInput(nuevo); if(nuevo === PIN_ADMIN) setIsAdmin(true); else if(nuevo.length === 4) setPinInput(""); }} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90 transition-all">0</button><button onClick={() => setView('welcome')} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors"><X size={24} /></button></div>
    </div>
  );

  if (view === 'barra') {
    const subcatsExistentes = Array.from(new Set(productosMenu.map(p => p.subcategoria).filter(s => s && s !== "")));
    return (
      <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col font-sans">
        <style>{estilosImpresion}</style>
      <header className="flex flex-col mb-6 border-b border-slate-800 pb-6 gap-4 no-print">
  {/* Fila Superior: Título y Status */}
  <div className="flex justify-between items-center w-full">
    <h1 className="text-3xl md:text-4xl font-black text-orange-600 italic uppercase tracking-tighter leading-none">
      TRIBU'S BARRA
    </h1>
    <div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold animate-pulse uppercase tracking-widest border border-green-500/10">
      ● En Vivo
    </div>
  </div>

  {/* Fila Media: Navegación con Scroll Horizontal (Solución al desplazamiento lateral) */}
  <div className="w-full overflow-x-auto no-scrollbar flex gap-3 pb-2">
    <button onClick={() => setTabBarra('comandas')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${tabBarra === 'comandas' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>
      <LayoutDashboard size={14}/> Comandas
    </button>
    <button onClick={() => setTabBarra('inventario')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${tabBarra === 'inventario' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>
      <Boxes size={14}/> Inventario
    </button>
    <button onClick={() => setTabBarra('eventos')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${tabBarra === 'eventos' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>
      <Calendar size={14}/> Eventos
    </button>
  </div>

  {/* Fila Inferior: Botones de Acción (Se adaptan al ancho disponible) */}
  <div className="flex flex-wrap items-center gap-3">
    {tabBarra === 'inventario' && (
      <button onClick={() => setVerModalNuevoProd(true)} className="flex-1 md:flex-none justify-center bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-lg">
        <PlusCircle size={16}/>Producto
      </button>
    )}
    {tabBarra === 'eventos' && (
      <button onClick={() => setVerModalNuevoEvento(true)} className="flex-1 md:flex-none justify-center bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-lg">
        <PlusCircle size={16}/> Agendar
      </button>
    )}
  </div>
</header>

        <div className="flex flex-col lg:flex-row gap-6">
          {tabBarra === 'comandas' && (
            <div className="flex-1 no-print">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pedidosBarra.filter(p => String(p.mesa).toLowerCase().includes(filtroMesa.toLowerCase())).map(p => {
                  const esExterno = String(p.mesa).startsWith("TEL:");
                  const numTel = esExterno ? p.mesa.replace("TEL:", "") : "";
                  const mensajeWA = `Hola! Te escribimos de Tribu's Bar. Tu pedido está listo.\n\n*Total a pagar: $${p.total}*\n\n*Detalle del pedido:*\n${p.detalle}\n\n${DATOS_PAGO}`;
                  return (
                    <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl relative shadow-xl flex flex-col justify-between group transition-all">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${esExterno ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
                      <div><div className="flex justify-between items-start">
                          <div className="flex flex-col"><h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{esExterno ? `📦 ${numTel}` : `MESA ${p.mesa}`}</h3><span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${obtenerPlanta(p.mesa) === 'TERRAZA' ? 'text-sky-400' : 'text-orange-400'}`}>{obtenerPlanta(p.mesa)}</span></div>
                          <div className="flex gap-2">
                            <button onClick={() => moverMesa(p)} className="p-1 text-slate-500 hover:text-sky-400 transition-colors" title="Mover Mesa"><ExternalLink size={18}/></button>
                            <button onClick={async () => { 
                              if(window.confirm("¿Cancelar pedido? El stock regresará.")) { 
                                const batch = writeBatch(db); 
                                p.detalle.split('\n').forEach(linea => { 
                                  const m = linea.match(/(\d+)x (.*) \(\$/); 
                                  if (m) { 
                                    const prodEnc = productosMenu.find(pr => pr.nombre.trim() === m[2].trim()); 
                                    if (prodEnc) batch.update(doc(db, "productos", prodEnc.id), { stock: increment(parseInt(m[1])) }); 
                                  } 
                                }); 
                                batch.delete(doc(db, "pedidos", p.id)); 
                                await batch.commit(); 
                              } 
                            }} className="p-1 text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                          </div>
                      </div>
                      {p.pinMesa && (
                        <div className="bg-orange-600/10 border border-orange-600/20 rounded-lg p-2 mt-3 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">PIN SEGURIDAD:</span>
                          <span className="text-xl font-black text-white">{p.pinMesa}</span>
                        </div>
                      )}
                      <div className="mt-4 space-y-1">
  {p.detalle.split('\n').map((linea, idx) => {
    // Verificamos si la línea es un producto (empieza con un número)
    const esProducto = /^\d+x/.test(linea.trim());

    return (
      <div key={idx} className="group/item flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
        <span className={`text-lg leading-tight ${!esProducto ? 'text-orange-500 font-bold text-xs' : 'text-slate-300'}`}>
          {linea}
        </span>
        
        {/* Solo mostramos el botón de borrar si es un producto real */}
        {esProducto && (
          <button 
            onClick={() => eliminarArticuloComanda(p, idx)} 
            className="opacity-0 group-hover/item:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"
          >
            <X size={16}/>
          </button>
        )}
      </div>
    );
  })}
</div>
                      {esExterno && (
                        <button onClick={() => window.open(`https://wa.me/${numTel}?text=${encodeURIComponent(mensajeWA)}`, '_blank')} className="flex items-center justify-center gap-2 bg-green-600/10 border border-green-600/20 text-green-500 w-full py-3 rounded-xl font-black uppercase text-xs mt-4 hover:bg-green-600 hover:text-white transition-all"><Phone size={14}/> Enviar Cuenta</button>
                      )}
                      </div>
                      <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-4 rounded-xl font-black text-lg mt-6 active:scale-95 uppercase tracking-tighter shadow-lg">Cobrar ${p.total}</button></div>
                  );
                })}
              </div>
            </div>
          )}

          {tabBarra === 'inventario' && (
            <div className="flex-1 no-print space-y-8">
              <div><h2 className="text-orange-500 font-black italic tracking-widest uppercase text-xs mb-4 flex items-center gap-2"><div className="w-2 h-2 bg-orange-500 rounded-full"></div> HIELERA PLANTA BAJA</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productosMenu.filter(p => p.ubicacion === "PLANTA BAJA" || !p.ubicacion || p.ubicacion === "HIELERA BAJA").map(prod => (
                    <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between transition-all hover:border-slate-600">
                      <div className="flex justify-between items-start mb-4"><div className="flex gap-3"><div className="w-16 h-16 rounded-xl border border-slate-800 bg-slate-900 flex-shrink-0 overflow-hidden"><img src={prod.imagen} className="w-full h-full object-cover opacity-80" alt=""/></div><div><h4 className="font-black text-white uppercase tracking-tighter text-sm leading-tight">{prod.nombre}</h4><p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{prod.categoria} | {prod.subcategoria}</p></div></div><div className={`px-3 py-1 rounded-lg font-black text-xl ${prod.stock <= 5 ? 'bg-red-900/20 text-red-500 border border-red-800' : 'bg-green-900/20 text-green-500 border border-green-800'}`}>{prod.stock}</div></div>
                      <div className="grid grid-cols-2 gap-2 mt-auto"><button onClick={() => updateDoc(doc(db, "productos", prod.id), { stock: increment(12) })} className="bg-slate-900 border border-slate-800 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all">+12</button><button onClick={() => { const ex = window.prompt("Nueva cantidad:"); if(ex) updateDoc(doc(db, "productos", prod.id), { stock: Number(ex) }); }} className="bg-orange-600/10 text-orange-500 border border-orange-500/20 py-2 rounded-xl text-[10px] font-black uppercase">Editar</button>
                      <button onClick={async () => { if(window.confirm(`Eliminar ${prod.nombre}?`)) await deleteDoc(doc(db, "productos", prod.id)); }} className="bg-red-900/10 text-red-500 border border-red-900/20 py-2 rounded-xl flex items-center justify-center col-span-2 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button></div></div>
                  ))}
                </div>
              </div>
              <div><h2 className="text-sky-400 font-black italic tracking-widest uppercase text-xs mb-4 flex items-center gap-2"><div className="w-2 h-2 bg-sky-400 rounded-full"></div> HIELERA TERRAZA</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productosMenu.filter(p => p.ubicacion === "TERRAZA").map(prod => (
                    <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between transition-all hover:border-slate-600">
                      <div className="flex justify-between items-start mb-4"><div className="flex gap-3"><div className="w-16 h-16 rounded-xl border border-slate-800 bg-slate-900 flex-shrink-0 overflow-hidden"><img src={prod.imagen} className="w-full h-full object-cover opacity-80" alt=""/></div><div><h4 className="font-black text-white uppercase tracking-tighter text-sm leading-tight">{prod.nombre}</h4><p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{prod.categoria} | {prod.subcategoria}</p></div></div><div className={`px-3 py-1 rounded-lg font-black text-xl ${prod.stock <= 5 ? 'bg-red-900/20 text-red-500 border border-red-800' : 'bg-green-900/20 text-green-500 border border-green-800'}`}>{prod.stock}</div></div>
                      <div className="grid grid-cols-2 gap-2 mt-auto"><button onClick={() => updateDoc(doc(db, "productos", prod.id), { stock: increment(12) })} className="bg-slate-900 border border-slate-800 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all">+12</button><button onClick={() => { const ex = window.prompt("Nueva cantidad:"); if(ex) updateDoc(doc(db, "productos", prod.id), { stock: Number(ex) }); }} className="bg-orange-600/10 text-orange-500 border border-orange-500/20 py-2 rounded-xl text-[10px] font-black uppercase">Editar</button>
                      <button onClick={async () => { if(window.confirm(`Eliminar ${prod.nombre}?`)) await deleteDoc(doc(db, "productos", prod.id)); }} className="bg-red-900/10 text-red-500 border border-red-900/20 py-2 rounded-xl flex items-center justify-center col-span-2 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button></div></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tabBarra === 'eventos' && (
            <div className="flex-1 no-print p-4">
              <div className="grid gap-4">{recordatorios.map(rec => (<div key={rec.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl flex justify-between items-center shadow-xl"><div><p className="text-white font-bold uppercase tracking-tight">{rec.titulo}</p><p className="text-orange-500 text-[10px] font-black mt-1 uppercase tracking-widest">{rec.fecha} | {rec.hora} HRS</p></div><button onClick={() => deleteDoc(doc(db, "recordatorios", rec.id))} className="text-red-500/30 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></div>))}</div>
            </div>
          )}

          <div className="w-full lg:w-[350px] space-y-4 no-print">
            <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800 shadow-xl"><div className="relative"><Search className="absolute left-3 top-2.5 text-slate-600" size={16}/><input type="text" placeholder="Mesa, Tel o Fecha" value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl pl-10 py-2 text-sm text-white focus:border-orange-500 font-bold shadow-inner" /></div></div>
            <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-orange-900/10 shadow-2xl">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-black text-orange-600 uppercase italic flex items-center gap-2"><ReceiptText size={20}/> Caja Hoy</h2><button onClick={realizarCierreTurno} className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg uppercase hover:bg-red-600 transition-all">Cierre</button></div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto no-scrollbar mb-4">
                {historialFiltradoParaCaja.map((hc) => (
                    <div key={hc.id} onClick={() => setTicketParaReimprimir(hc)} className="group p-3 bg-[#05070a] rounded-xl border border-slate-700 flex items-center justify-between hover:border-orange-500 transition-all shadow-sm cursor-pointer"><div className="flex-1"><div className="flex justify-between font-black text-[11px] uppercase tracking-tighter"><span className="text-slate-400">Mesa {hc.mesa} - {obtenerPlanta(hc.mesa)}</span><span className="text-green-500">${hc.total}</span></div><div className="flex justify-between items-center mt-1"><p className="text-[8px] text-slate-500 uppercase font-bold">{hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : 'Reciente'}</p><p className="text-[11px] text-slate-400 font-black uppercase italic tracking-tighter">{hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleDateString('es-MX') : ''}</p></div></div><button onClick={(e) => { e.stopPropagation(); if(window.confirm("¿Borrar?")) deleteDoc(doc(db, "historial_tickets", hc.id)); }} className="ml-2 p-1.5 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button></div>
                  ))}
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between font-black"><span className="text-slate-500 text-[10px] uppercase italic tracking-widest">Total:</span><span className="text-2xl text-green-500 tracking-tighter">${totalCajaHoy}</span></div></div>
          </div>
        </div>

        {/* --- MODAL NUEVO PROD (CONECTADO) --- */}
        {verModalNuevoProd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-[420px] rounded-[2.5rem] p-8 shadow-2xl relative">
              <button onClick={() => { setVerModalNuevoProd(false); setEsNuevaSub(false); }} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X/></button>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-orange-600 mb-6 flex items-center gap-2"><PlusCircle/> Agregar Producto</h2>
              
              <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  const batch = writeBatch(db);
                  
                  if (nuevoProd.stockBaja > 0) {
                    const refBaja = doc(collection(db, "productos"));
                    batch.set(refBaja, {
                      nombre: nuevoProd.nombre,
                      stock: Number(nuevoProd.stockBaja),
                      ubicacion: "PLANTA BAJA",
                      precioMesa: Number(nuevoProd.precioMesa),
                      precioDomicilio: Number(nuevoProd.precioDomicilio),
                      categoria: nuevoProd.categoria,
                      subcategoria: nuevoProd.subcategoria,
                      imagen: nuevoProd.imagen
                    });
                  }

                  if (nuevoProd.stockTerraza > 0) {
                    const refTerraza = doc(collection(db, "productos"));
                    batch.set(refTerraza, {
                      nombre: nuevoProd.nombre,
                      stock: Number(nuevoProd.stockTerraza),
                      ubicacion: "TERRAZA",
                      precioMesa: Number(nuevoProd.precioMesa),
                      precioDomicilio: Number(nuevoProd.precioDomicilio),
                      categoria: nuevoProd.categoria,
                      subcategoria: nuevoProd.subcategoria,
                      imagen: nuevoProd.imagen
                    });
                  }

                  await batch.commit();
                  setVerModalNuevoProd(false);
                  setNuevoProd({ nombre: "", precioMesa: "", precioDomicilio: "", stockBaja: "", stockTerraza: "", categoria: "Cerveza", subcategoria: "", imagen: "" });
                }} className="space-y-4">
                
                <input required placeholder="Nombre del Producto" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-orange-500 outline-none text-white shadow-inner" />
                
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" placeholder="Precio Mesa" value={nuevoProd.precioMesa} onChange={e => setNuevoProd({...nuevoProd, precioMesa: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none text-white shadow-inner" />
                  <input required type="number" placeholder="Precio Domicilio" value={nuevoProd.precioDomicilio} onChange={e => setNuevoProd({...nuevoProd, precioDomicilio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none text-white shadow-inner" />
                </div>

                <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-orange-500 uppercase px-1">Stock P. Baja</label>
                    <input type="number" placeholder="0" value={nuevoProd.stockBaja} onChange={e => setNuevoProd({...nuevoProd, stockBaja: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-orange-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-sky-400 uppercase px-1">Stock Terraza</label>
                    <input type="number" placeholder="0" value={nuevoProd.stockTerraza} onChange={e => setNuevoProd({...nuevoProd, stockTerraza: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:border-sky-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-1"><Tag size={12}/> Categoría y Subcategoría</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={nuevoProd.categoria} onChange={e => setNuevoProd({...nuevoProd, categoria: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-400 outline-none shadow-inner">
                      {CATEGORIAS.filter(c => c !== "Todos").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input placeholder="Subcat (Media, etc)" value={nuevoProd.subcategoria} onChange={e => setNuevoProd({...nuevoProd, subcategoria: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white" />
                  </div>
                </div>

                <input placeholder="URL Imagen" value={nuevoProd.imagen} onChange={e => setNuevoProd({...nuevoProd, imagen: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none text-white shadow-inner" />
                
                <button type="submit" className="w-full bg-orange-600 py-4 rounded-2xl font-black uppercase text-white shadow-xl active:scale-95 transition-all">Crear Producto(s)</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NUEVO EVENTO */}
        {verModalNuevoEvento && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-[350px] rounded-[2.5rem] p-8 shadow-2xl relative">
              <button onClick={() => setVerModalNuevoEvento(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-orange-600 mb-6 flex items-center gap-2"><Calendar/> Nuevo Evento</h2>
              <form onSubmit={guardarEvento} className="space-y-4">
                <input required placeholder="Título" value={nuevoEvento.titulo} onChange={e => setNuevoEvento({...nuevoEvento, titulo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-orange-500 outline-none text-white shadow-inner" />
                <input required type="date" value={nuevoEvento.fecha} onChange={e => setNuevoEvento({...nuevoEvento, fecha: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-400 outline-none shadow-inner" />
                <input required type="time" value={nuevoEvento.hora} onChange={e => setNuevoEvento({...nuevoEvento, hora: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-400 outline-none shadow-inner" />
                <button type="submit" className="w-full bg-orange-600 py-4 rounded-2xl font-black uppercase text-white shadow-xl active:scale-95">Guardar</button>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL TICKET --- */}
        {ticketParaReimprimir && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md print:static print:bg-white print:p-0">
            <div className="bg-white text-black w-full max-w-[300px] p-8 font-mono shadow-2xl relative print-container border-t-[12px] border-orange-600 print:border-none">
              <button onClick={() => setTicketParaReimprimir(null)} className="absolute -top-12 right-0 text-white no-print"><X size={32}/></button>

              <div className="text-center mb-6">
                <h2 className="font-black text-3xl italic uppercase leading-none tracking-tighter mb-1">TRIBU'S BAR</h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Nota de Venta</p>
                <div className="border-y-2 border-black py-2 my-2 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>MESA:</span>
                    <span className="bg-black text-white px-2 uppercase">{ticketParaReimprimir.mesa.replace("TEL:", "EXT-")}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-600">
                    <span>FECHA:</span>
                    <span>{ticketParaReimprimir.fecha?.seconds ? new Date(ticketParaReimprimir.fecha.seconds * 1000).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('es-MX')}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] mb-6">
                <div className="flex justify-between font-black border-b border-black pb-1 mb-2">
                  <span>DESCRIPCIÓN</span>
                  <span>IMPORTE</span>
                </div>
                <div className="space-y-3 whitespace-pre-line leading-tight italic">
                  {ticketParaReimprimir.detalle}
                </div>
              </div>

              <div className="border-t-4 border-double border-black pt-4 mb-8">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-sm">TOTAL:</span>
                  <span className="font-black text-4xl tracking-tighter leading-none">${ticketParaReimprimir.total}</span>
                </div>
              </div>
              
              <button onClick={() => window.print()} className="mt-8 w-full bg-black text-white py-4 rounded-xl font-black no-print flex items-center justify-center gap-2 shadow-xl hover:bg-orange-600 transition-colors">
                <Printer size={20}/> CONFIRMAR IMPRESIÓN
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

if (view === 'welcome') return (
  <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
    {/* Imagen de fondo */}
    <div className="absolute inset-0 opacity-40">
      <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="fondo" />
      <div className="absolute inset-0 bg-slate-950/80"></div>
    </div>

    <div className="relative z-10 space-y-12 w-full max-w-lg">
      <div className="space-y-4">
        <div className="flex justify-center items-center gap-2 text-orange-500 animate-pulse">
          <h1 className="text-7xl font-black italic uppercase leading-none">{nombreBarDinamico}</h1>
        </div>
        <div className="space-y-2 uppercase tracking-tight">
          <h2 className="text-3xl font-bold">{mesa ? `¡BIENVENIDO MESA ${mesa}!` : "¡BIENVENIDO!"}</h2>
          <p className="text-orange-500 text-sm font-medium tracking-[0.2em]">{obtenerPlanta(mesa)}</p>
        </div>
      </div>

     <div className="grid gap-4">
  {/* Botón Wi-Fi */}
  <button 
    onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} 
    className="flex items-center gap-5 bg-slate-800/40 p-5 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl active:scale-95 hover:bg-slate-700/60 hover:border-white/10 hover:shadow-sky-500/5 transition-all duration-300 group"
  >
    <Wifi className="text-sky-400 group-hover:scale-110 transition-transform" size={28} />
    <div className="text-left font-bold uppercase text-[10px] text-slate-400">
      <p>Wi-Fi Gratis</p>
      <p className="text-lg text-white font-black">tribu´s Bar</p>
    </div>
  </button>

  {/* Botón Menú Digital */}
  <button 
    onClick={() => setView('menu')} 
    className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 hover:bg-orange-500 hover:shadow-orange-600/20 transition-all duration-300 group"
  >
    <UtensilsCrossed className="text-white group-hover:rotate-12 transition-transform" size={28} />
    <div className="text-left font-bold uppercase text-[10px] text-orange-200">
      <p>Menú Digital</p>
      <p className="text-lg text-white font-black uppercase tracking-tight leading-none">Ver la carta</p>
    </div>
  </button>

  {/* Botón de Registro / Estado de Sesión */}
  {!usuarioLogueado ? (
    <button 
      onClick={() => setVerModalAuth(true)} 
      className="flex items-center gap-5 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-sm active:scale-95 hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300 group"
    >
      <div className="w-10 h-10 rounded-2xl bg-orange-600/20 flex items-center justify-center group-hover:bg-orange-600 transition-colors">
        <Zap className="text-orange-600 group-hover:text-white" size={20} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">¿Cliente frecuente?</p>
        <p className="text-sm text-white font-bold opacity-80 italic">Únete a la Tribu y obtén beneficios</p>
      </div>
    </button>
  ) : (
    <div className="bg-green-600/10 border border-green-600/20 p-4 rounded-3xl flex items-center gap-4 animate-in fade-in zoom-in duration-500">
      <div className="w-10 h-10 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/20">
        <CheckCircle className="text-white" size={20} />
      </div>
      <div className="text-left">
        <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Sesión Iniciada</p>
        <p className="text-sm text-white font-black italic uppercase leading-none">{usuarioLogueado.phoneNumber}</p>
      </div>
    </div>
  )}

  {/* Botón Rockola */}
  <button 
    onClick={() => window.open(LINK_PRINCIPAL, '_blank')} 
    className="flex items-center gap-5 bg-slate-800/40 p-5 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl active:scale-95 hover:bg-slate-700/60 hover:border-green-500/30 hover:shadow-green-500/5 transition-all duration-300 group"
  >
    <ExternalLink className="text-green-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={28} />
    <div className="text-left font-bold uppercase text-[10px] text-slate-400">
      <p>Rockola</p>
      <p className="text-lg text-white font-black">{TEXTO_LINK}</p>
    </div>
  </button>
</div>

      <button onClick={() => setView('barra')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
    </div>

    {/* MODAL DE AUTENTICACIÓN (Dentro del mismo return de welcome) */}
    {verModalAuth && (
      <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-[380px] rounded-[2.5rem] p-8 shadow-2xl relative">
          <button onClick={() => setVerModalAuth(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X/></button>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="text-orange-600" size={32}/>
            </div>
            <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Únete a la Tribu</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Registra tu visita y obtén beneficios</p>
          </div>

          {pasoAuth === 'telefono' ? (
            <div className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2">¿Cómo te llamas?</label>
                <input placeholder="Nombre" value={nombreRegistro} onChange={e => setNombreRegistro(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Tu WhatsApp</label>
                <input placeholder="10 dígitos" type="tel" value={telefonoInput} onChange={e => setTelefonoInput(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" />
              </div>
              <div id="recaptcha-container"></div>
              <button onClick={enviarCodigoSMS} className="w-full bg-orange-600 py-4 rounded-2xl font-black text-white uppercase shadow-xl active:scale-95 transition-all">Enviar Código</button>
              
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest text-center">Ingresa el código enviado</p>
              <input maxLength={6} placeholder="000000" value={codigoOTP} onChange={e => setCodigoOTP(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white text-center text-3xl font-black tracking-[0.3em] outline-none" />
              <button onClick={verificarCodigo} className="w-full bg-green-600 py-4 rounded-2xl font-black text-white uppercase shadow-xl active:scale-95 transition-all">Verificar</button>
              <button onClick={() => setPasoAuth('telefono')} className="w-full text-slate-500 text-[10px] font-black uppercase text-center">Corregir número</button>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

  if (view === 'menu') {
    const ubicacionActual = mesa ? obtenerPlanta(mesa) : "EXTERNO";
    const menuPorPlanta = productosMenu.filter(p => (ubicacionActual === "EXTERNO" || !p.ubicacion || p.ubicacion === "" || p.ubicacion === ubicacionActual));
    const menuFiltrado = menuPorPlanta.filter(p => (catSeleccionada === "Todos" || p.categoria === catSeleccionada) && (subCatSeleccionada === "Todas" || p.subcategoria === subCatSeleccionada));
    const subcategoriasDisponibles = Array.from(new Set(menuPorPlanta.filter(p => p.categoria === catSeleccionada && p.subcategoria).map(p => p.subcategoria)));

    return (
      <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans">
        <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3"><div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center"><div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter leading-none">{nombreBarDinamico}</div>
            <div className="flex gap-2">
              {/* PIN de Seguridad Discreto */}
  {pinCorrectoMesa && (
    <div className="bg-orange-600/10 px-3 py-2 rounded-xl border border-orange-500/20 flex flex-col items-center justify-center">
      <span className="text-[7px] font-black text-orange-500 uppercase tracking-tighter leading-none mb-0.5">PIN</span>
      <span className="text-[11px] font-black text-white leading-none tracking-widest">{pinCorrectoMesa}</span>
    </div>
  )}

  {consumoAcumulado.length > 0 && (
    <div className="bg-green-600/10 px-3 py-2 rounded-xl border border-green-500/20 flex items-center gap-2">
      <History size={14} className="text-green-500" />
      <span className="text-[10px] font-black text-green-500 leading-none">${totalAcumulado}</span>
    </div>
  )}

  <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative border-none outline-none">
    <ShoppingCart size={20} />
    {carrito.length > 0 && (
      <span className="absolute -top-1 -right-1 bg-orange-600 text-[10px] px-1.5 rounded-full font-bold shadow-lg">
        {carrito.reduce((a, b) => a + b.cantidad, 0)}
      </span>
    )}
  </button>
            </div></div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">{CATEGORIAS.map(c => (<button key={c} onClick={() => { setCatSeleccionada(c); setSubCatSeleccionada("Todas"); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all ${catSeleccionada === c ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400'}`}>{c}</button>))}</div>
          {subcategoriasDisponibles.length > 0 && (<div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/50"><button onClick={() => setSubCatSeleccionada("Todas")} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase border-none outline-none ${subCatSeleccionada === "Todas" ? 'text-sky-400 bg-sky-900/20' : 'text-slate-500'}`}>Todas</button>{subcategoriasDisponibles.map(sc => (<button key={sc} onClick={() => setSubCatSeleccionada(sc)} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase border-none outline-none ${subCatSeleccionada === sc ? 'text-sky-400 bg-sky-900/20 shadow-lg' : 'text-slate-500'}`}>{sc}</button>))}</div>)}
        </div></header>
        <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{menuFiltrado.map(item => (<div key={item.id} className={`bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30 group shadow-lg transition-all ${item.stock <= 0 ? 'opacity-50 grayscale' : ''}`}><div className="w-24 h-24 rounded-2xl border border-slate-700 bg-slate-900 flex-shrink-0 overflow-hidden relative shadow-inner"><img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="p" />{item.stock <= 5 && item.stock > 0 && <span className="absolute bottom-0 left-0 right-0 bg-red-600 text-[8px] font-black text-center uppercase py-0.5 shadow-lg tracking-widest animate-pulse">Últimas {item.stock}</span>}</div><div className="flex-1 flex flex-col justify-between"><div><h3 className="font-bold text-white uppercase leading-tight">{item.nombre}</h3><p className="text-slate-500 text-xs mt-1 italic leading-tight">{item.subcategoria}</p></div><div className="flex justify-between items-center mt-3"><span className="font-black text-xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button disabled={item.stock <= 0} onClick={() => agregarAlCarrito(item)} className={`${item.stock <= 0 ? 'bg-slate-700' : 'bg-orange-600 active:scale-90 shadow-orange-950/20'} text-white w-10 h-10 rounded-xl font-bold transition-all shadow-lg`}>{item.stock <= 0 ? <Package size={16} className="mx-auto" /> : '+'}</button></div></div></div>))} </main>
        {carrito.length > 0 && !verCarrito && (<div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center no-print"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl active:scale-95 transition-all shadow-orange-950/30"><span className="text-[10px] uppercase font-bold tracking-widest text-white leading-none flex items-center gap-2"><ShoppingCart size={14}/> MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span className="font-black text-xl italic text-white tracking-tighter leading-none">${totalCarrito}</span></button></div>)}
        <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible opacity-100' : 'invisible opacity-0'}`}><div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} /><div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}><div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl tracking-tighter leading-none"><h2>Mi Cuenta</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div><div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">{carrito.length > 0 && (<div><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={12}/> Por pedir ahora:</p><div className="space-y-3">{carrito.map(item => (<div key={item.id} className="bg-orange-600/5 p-3 rounded-2xl flex flex-col gap-2 border border-orange-600/20 shadow-sm"><div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight leading-none"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600 hover:text-red-500 transition-colors"/></button></div><div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic tracking-tighter">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1 shadow-inner"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div></div>))}</div></div>)}{consumoAcumulado.length > 0 && (<div><p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={12}/> Ya consumido:</p><div className="space-y-2">{consumoAcumulado.map((item, idx) => (<div key={idx} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center border border-slate-800 opacity-60"><span className="text-[11px] font-bold text-slate-300 uppercase">{item.cantidad}x {item.nombre}</span><span className="text-[11px] font-black text-white">${item.precio * item.cantidad}</span></div>))}</div></div>)}</div><div className="pt-4 border-t border-slate-800 space-y-4"><div className="flex justify-between font-black text-2xl text-orange-500 italic"><span>Total Cuenta</span><span>${totalCarrito + totalAcumulado}</span></div><button disabled={carrito.length === 0} onClick={intentarEnviar} className="w-full py-4 rounded-2xl font-black text-white bg-orange-600 active:scale-95 transition-all shadow-xl uppercase tracking-widest">Confirmar Pedido</button></div></div></div>
        {verModalTelefono && (
          <div className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
             <div className="mb-8 text-center"><Phone size={48} className="text-orange-600 mx-auto mb-4 animate-bounce" /><h2 className="text-3xl font-black italic uppercase tracking-tighter">¿Tu Teléfono?</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Para identificar tu pedido externo</p></div>
             <div className="w-full max-w-[300px] mb-8"><div className="bg-slate-900 border-2 border-orange-600/50 rounded-2xl p-6 text-center shadow-2xl"><span className="text-4xl font-black tracking-widest text-white">{telefonoInput || "----------"}</span></div></div>
             <div className="grid grid-cols-3 gap-4 max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (<button key={n} onClick={() => telefonoInput.length < 10 && setTelefonoInput(telefonoInput + n)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">{n}</button>))}
                <button onClick={() => setTelefonoInput("")} className="w-16 h-16 rounded-full flex items-center justify-center text-red-500 bg-red-500/10 border border-red-500/20"><Trash2 size={24}/></button>
                <button onClick={() => telefonoInput.length < 10 && setTelefonoInput(telefonoInput + "0")} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black">0</button>
                <button onClick={() => setVerModalTelefono(false)} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 border border-slate-800"><X size={24}/></button>
             </div>
             {telefonoInput.length >= 10 && (<button onClick={() => procesarEnvio()} className="mt-12 bg-orange-600 w-full max-w-[280px] py-5 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-orange-600/20 animate-pulse">Confirmar Pedido</button>)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
       <p className="text-white animate-pulse font-black italic uppercase tracking-widest">TRIBU'S BAR</p>
    </div>
  );
}

export default App;