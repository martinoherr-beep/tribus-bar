import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { 
 collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, 
 query, where, orderBy, serverTimestamp, writeBatch, increment, setDoc, getDoc 
} from "firebase/firestore";

import { auth } from './firebase';
import { 
 RecaptchaVerifier, 
 signInWithPhoneNumber, 
 onAuthStateChanged,
 signOut 
} from "firebase/auth";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { 
 ShoppingCart, Trash2, X, Plus, Minus, Wifi, 
 UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, 
 CreditCard, Phone, Package, LayoutDashboard, Boxes, PlusCircle, 
 Tag, ExternalLink, Lock, Calendar, History, Camera,
 LogOut 
} from 'lucide-react';


const DATOS_PAGO = "💳 *DATOS DE PAGO*:\nBanco: Bancoppel\nCuenta: 4169 1614 6993 9648\nCLABE: 137162104580151937\nA nombre de: Tribus Bar";
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
 const [nombreUsuarioLogueado, setNombreUsuarioLogueado] = useState("");
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
 const [nombreRegistro, setNombreRegistro] = useState('');
const [usuarioLogueado, setUsuarioLogueado] = useState(null);
const [verModalAuth, setVerModalAuth] = useState(false);
const [historialHoy, setHistorialHoy] = useState([]);
const [pasoAuth, setPasoAuth] = useState('telefono'); // 'telefono' o 'codigo'
const [codigoOTP, setCodigoOTP] = useState("");
const [confirmacionResultado, setConfirmacionResult] = useState(null);
const [password, setPassword] = useState('');
const [areaStaff, setAreaStaff] = useState('TODOS');
const [fechaInicioRep, setFechaInicioRep] = useState("");
const [fechaFinRep, setFechaFinRep] = useState("");
const [reporteFiltrado, setReporteFiltrado] = useState(null);
const [esSuperAdmin, setEsSuperAdmin] = useState(false);
const [eventoInstalacion, setEventoInstalacion] = useState(null);
const [esAppInstalada, setEsAppInstalada] = useState(
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
);

// --- ESTADOS NUEVOS DEL ESCÁNER INTERNO ---
const [verModalEscaner, setVerModalEscaner] = useState(false);
const [mesaEscaneadaInput, setMesaEscaneadaInput] = useState("");
const videoRef = useRef(null);
const streamRef = useRef(null);

const encenderCamara = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    }
  } catch (err) {
    console.warn("No se pudo acceder a la cámara trasera:", err);
  }
};

const apagarCamara = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
};

useEffect(() => {
  if (verModalEscaner) {
    encenderCamara();
  } else {
    apagarCamara();
  }
  return () => apagarCamara();
}, [verModalEscaner]);


const forzarInstalacionApp = async () => {
  if (!eventoInstalacion) {
    alert("En iPhone/iPad: Pulsa el botón 'Compartir' (ios-share) abajo en tu navegador y selecciona 'Agregar a inicio' 📲");
    return;
  }
  eventoInstalacion.prompt();
  const { outcome } = await eventoInstalacion.userChoice;
  if (outcome === 'accepted') {
    setEsAppInstalada(true);
    setEventoInstalacion(null);
  }
};

 const obtenerPlanta = (idMesa) => {
   if (!idMesa) return "EXTERNO";
   const n = parseInt(idMesa);
   if (isNaN(n)) return "EXTERNO";
   if (n >= 1 && n <= 25) return "PLANTA BAJA";
   if (n >= 26 && n <= 50) return "TERRAZA";
   return "EXTERNO";
 };

 const generarReporteVentas = () => {
  if (!fechaInicioRep || !fechaFinRep) {
    return alert("Por favor, selecciona ambas fechas para el reporte.");
  }
  const inicio = new Date(fechaInicioRep + "T00:00:00");
  const fin = new Date(fechaFinRep + "T23:59:59");
  let totalBaja = 0;
  let totalTerraza = 0;
  let totalExterno = 0;
  let ticketsEnRango = 0;

  historialCerrado.forEach(ticket => {
    if (ticket.fecha?.seconds) {
      const fechaTicket = new Date(ticket.fecha.seconds * 1000);
      if (fechaTicket >= inicio && fechaTicket <= fin) {
        ticketsEnRango++;
        const planta = obtenerPlanta(ticket.mesa);
        const monto = Number(ticket.total) || 0;
        if (planta === "PLANTA BAJA") totalBaja += monto;
        else if (planta === "TERRAZA") totalTerraza += monto;
        else totalExterno += monto;
      }
    }
  });

  if (ticketsEnRango === 0) {
    alert("No se encontraron ventas en el rango de fechas seleccionado.");
    setReporteFiltrado(null);
    return;
  }

  setReporteFiltrado({
    inicio: new Date(inicio).toLocaleDateString('es-MX'),
    fin: new Date(fin).toLocaleDateString('es-MX'),
    plantaBaja: totalBaja,
    terraza: totalTerraza,
    externo: totalExterno,
    totalGlobal: totalBaja + totalTerraza + totalExterno,
    cantidadTickets: ticketsEnRango
  });
};

 const [mispedidos, setMisPedidos] = useState([]);
const [telefonoUsuarioLogueado, setTelefonoUsuarioLogueado] = useState("");

useEffect(() => {
 if (usuarioLogueado) {
   const q = query(collection(db, "pedidos"), where("uid", "==", usuarioLogueado.uid));
   const unsub = onSnapshot(q, (snapshot) => {
     const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     setMisPedidos(docs);
   });
   return () => unsub();
 }
}, [usuarioLogueado]);

useEffect(() => {
  const capturarPrompt = (e) => { e.preventDefault(); setEventoInstalacion(e); };
  window.addEventListener('beforeinstallprompt', capturarPrompt);
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const verificarModo = (e) => { setEsAppInstalada(e.matches); };
  mediaQuery.addEventListener('change', verificarModo);
  return () => {
    window.removeEventListener('beforeinstallprompt', capturarPrompt);
    mediaQuery.removeEventListener('change', verificarModo);
  };
}, []);

 const loginClienteFrecuente = async () => {
   if (!telefonoInput || !password) return alert("Por favor, ingresa tu teléfono y contraseña.");
   try {
     const emailFalso = `${telefonoInput}@tribus.com`;
     const userCredential = await signInWithEmailAndPassword(auth, emailFalso, password);
     setUsuarioLogueado(userCredential.user);
     setView('menu');
     alert("¡Qué bueno verte de nuevo en la Tribu!");
   } catch (error) {
     alert("Teléfono o contraseña incorrectos.");
   }
 };

 const informarPago = async (pedidoId) => {
 try {
   await updateDoc(doc(db, "pedidos", pedidoId), { pagoInformado: true, horaPago: serverTimestamp() });
   alert("¡Gracias! En la barra verificaremos tu depósito ahora mismo.");
 } catch (error) {
   console.error(error);
 }
};

const registrarClienteFrecuente = async () => {
 if (!nombreRegistro || telefonoInput.length < 10 || password.length < 6) {
   return alert("Por favor, completa todos los campos (Mínimo 6 caracteres para contraseña).");
 }
 try {
   const emailFalso = `${telefonoInput}@tribus.com`;
   const userCredential = await createUserWithEmailAndPassword(auth, emailFalso, password);
   const user = userCredential.user;
   await setDoc(doc(db, "clientes", user.uid), {
     nombre: nombreRegistro, telefono: telefonoInput, uid: user.uid, puntos: 0,
     fechaRegistro: serverTimestamp(), ultimaVisita: serverTimestamp()
   });
   setUsuarioLogueado(user); setView('menu'); 
   alert(`¡Bienvenido a la Tribu, ${nombreRegistro}!`);
 } catch (error) {
   alert("Error al registrar: " + error.message);
 }
};

const cerrarSesion = async () => {
 try {
   await signOut(auth); setUsuarioLogueado(null); setView('welcome'); 
   alert("Sesión cerrada. ¡Vuelve pronto a la Tribu!");
 } catch (error) {
   console.error(error);
 }
};

useEffect(() => {
 if (usuarioLogueado) {
   const obtenerDatosCliente = async () => {
     const docRef = doc(db, "clientes", usuarioLogueado.uid);
     const docSnap = await getDoc(docRef);
     if (docSnap.exists() && docSnap.data().nombre) {
       setNombreUsuarioLogueado(docSnap.data().nombre);
       setTelefonoUsuarioLogueado(docSnap.data().telefono);
     } else {
       setNombreUsuarioLogueado("Invitado Tribu");
     }
   };
   obtenerDatosCliente();
 } else {
   setNombreUsuarioLogueado(""); 
 }
}, [usuarioLogueado]);

useEffect(() => {
  const desubscribir = onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
      setUsuarioLogueado(usuario);
      if (usuario.email === 'baja@tribus.com') { setAreaStaff('PLANTA BAJA'); setEsSuperAdmin(false); }
      else if (usuario.email === 'terraza@tribus.com') { setAreaStaff('TERRAZA'); setEsSuperAdmin(false); }
      else if (usuario.email === 'admin@tribus.com') { setAreaStaff('TODOS'); setEsSuperAdmin(true); }
    } else {
      setUsuarioLogueado(null); setEsSuperAdmin(false);
    }
  });
  return () => desubscribir();
}, []);

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

 const moverMesa = async (pedido) => {
   const plantaOrigen = obtenerPlanta(pedido.mesa);
   const nuevaMesa = window.prompt(`Moviendo cuenta de Mesa ${pedido.mesa} (${plantaOrigen}). Ingrese el nuevo número de mesa:`);
   if (!nuevaMesa || nuevaMesa === "" || nuevaMesa === pedido.mesa) return;
   const plantaDestino = obtenerPlanta(nuevaMesa);
   const etiquetaTraslado = `\n--- TRASLADO DE ${plantaOrigen} A ${plantaDestino} ---`;
   try {
     await updateDoc(doc(db, "pedidos", pedido.id), {
       mesa: String(nuevaMesa),
       detalle: pedido.detalle + etiquetaTraslado,
       pideTraslado: false, // Apagamos la alerta si venía de la PWA
       solicitudTraslado: ""
     });
     alert(`Cuenta trasladada a Mesa ${nuevaMesa} (${plantaDestino}) con éxito.`);
   } catch (e) {
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
             method: 'POST', headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `🔔 *EVENTO:* ${rec.titulo}\n⏰ *HORA:* ${rec.hora} HRS`, parse_mode: 'Markdown' })
           });
           if (res.ok) await updateDoc(doc(db, "recordatorios", rec.id), { enviado: true });
         } catch (e) { ultimoMinutoEnviado.current = ""; }
       }
     });
   }, 5000);
   return () => clearInterval(vigilante);
 }, [recordatorios]);

// --- ESCUCHA DE ROCKOLA INTERCEPTADA ---
useEffect(() => {
  const q = query(collection(db, "rockola_pendientes"), where("estado", "==", "pendiente"));
  const unsub = onSnapshot(q, async (snapshot) => {
    for (const cambio of snapshot.docChanges()) {
      if (cambio.type === "added") {
        const dataRockola = cambio.doc.data();
        const batch = writeBatch(db);
        const nuevoPedidoRef = doc(collection(db, "pedidos"));
        batch.set(nuevoPedidoRef, {
          mesa: String(dataRockola.mesa), detalle: dataRockola.detalle || "Créditos Rockola",
          total: Number(dataRockola.total) || 0, estado: "pendiente", fecha: serverTimestamp(),
          archivado: false, cliente: "Cliente Rockola"
        });
        batch.delete(doc(db, "rockola_pendientes", cambio.doc.id));
        await batch.commit();
      }
    }
  });
  return () => unsub();
}, []);

 useEffect(() => {
   const params = new URLSearchParams(window.location.search);
   let mesaId = params.get("mesa");
   if (mesaId) {
     localStorage.setItem("tribu_mesa", mesaId);
   } else {
     mesaId = localStorage.getItem("tribu_mesa");
   }
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

 // --- LOGICA DE TRASLADO PWA INTELIGENTE ---
 const procesarCambioMesaPWA = async (nuevaMesaId) => {
  const idLimpio = String(nuevaMesaId).trim();
  if (!idLimpio) return;

  // Si no hay consumo previo, asignamos directo
  if (consumoAcumulado.length === 0) {
    localStorage.setItem("tribu_mesa", idLimpio);
    setMesa(idLimpio);
    setVerModalEscaner(false);
    alert(`📍 Ubicado en Mesa ${idLimpio}`);
    return;
  }

  // Si tiene cuenta activa, levanta alerta a la barra
  const pedidoActual = pedidosBarra.find(p => String(p.mesa) === String(mesa));
  if (pedidoActual) {
    try {
      await updateDoc(doc(db, "pedidos", pedidoActual.id), {
        solicitudTraslado: idLimpio,
        pideTraslado: true
      });
      setVerModalEscaner(false);
      alert(`⏳ Solicitud enviada. Avisa al personal de barra para autorizar el traslado de tu cuenta a la Mesa ${idLimpio}.`);
    } catch (err) {
      alert("No se pudo procesar la solicitud.");
    }
  }
};

 const manejarPinMesa = (num) => {
   if (pinMesaInput.length < 4) {
     const nuevoPin = pinMesaInput + num; setPinMesaInput(nuevoPin);
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
   const ex = carrito.find(x => x.id === id); if (!ex) return;
   if (ex.cantidad === 1) setCarrito(carrito.filter(x => x.id !== id));
   else setCarrito(carrito.map(x => x.id === id ? { ...ex, cantidad: ex.cantidad - 1 } : x));
 };

const intentarEnviar = () => {
 if (carrito.length === 0) return;
 if (mesa || usuarioLogueado) procesarEnvio(mesa || null);
 else setVerModalTelefono(true);
};

const procesarEnvio = async (idDestino) => {
 const batch = writeBatch(db);
 const telFinal = telefonoUsuarioLogueado || usuarioLogueado?.phoneNumber || telefonoInput || "S/N";
 const idFinal = idDestino ? idDestino : `TEL:${telFinal}`;
 const detalleNuevo = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
  
 try {
   const existente = pedidosBarra.find(p => String(p.mesa) === String(idFinal));
   if (existente) {
     batch.update(doc(db, "pedidos", existente.id), { 
       detalle: existente.detalle + "\n" + detalleNuevo, 
       total: Number(existente.total) + Number(totalCarrito), 
       fecha: serverTimestamp(),
       cliente: nombreUsuarioLogueado || existente.cliente || "Cliente"
     });
   } else {
     const nuevoPedidoRef = doc(collection(db, "pedidos"));
     const datosNuevoPedido = { 
       mesa: String(idFinal), detalle: detalleNuevo, total: Number(totalCarrito), 
       estado: "pendiente", fecha: serverTimestamp(), archivado: false,
       cliente: nombreUsuarioLogueado || "Cliente", telefono: telFinal, uid: usuarioLogueado?.uid || null 
     };
     if (idDestino && !String(idDestino).startsWith("TEL:")) {
       datosNuevoPedido.pinMesa = Math.floor(1000 + Math.random() * 9000);
     }
     batch.set(nuevoPedidoRef, datosNuevoPedido);
   }
   await batch.commit(); setView('success'); setCarrito([]); setVerCarrito(false); setVerModalTelefono(false);
 } catch (e) { alert("Error al procesar el pedido."); }
};

const cobrarCuenta = async (p) => {
   await addDoc(collection(db, "historial_tickets"), { 
       mesa: p.mesa, detalle: p.detalle, total: Number(p.total), fecha: serverTimestamp(), 
       archivado: false, cliente: p.cliente || "Cliente General", telefono: p.telefono || "N/A"
   });
   await deleteDoc(doc(db, "pedidos", p.id)); setTicketParaReimprimir(p);
};

useEffect(() => {
 const q = query(collection(db, "historial_tickets"), where("archivado", "==", false));
 onSnapshot(q, (snapshot) => setHistorialHoy(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
}, []);

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
   setVerModalNuevoEvento(false); setNuevoEvento({ titulo: "", fecha: "", hora: "" });
 };

  return (
    <>
      {/* --- PWA: OBLIGAR A AGREGAR A INICIO (SOLO PARA CLIENTES) --- */}
      {!esAppInstalada && view !== 'barra' && view !== 'login_staff' && (
        <div className="fixed inset-0 z-[300] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none">
          <div className="max-w-sm space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-orange-600/20 transform rotate-12">
              <span className="text-3xl font-black italic tracking-tighter text-black -rotate-12">TB</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">🔒 Acceso Seguro al Menú</h2>
              <p className="text-xs text-slate-400 font-medium px-4 leading-relaxed">
                Para garantizar que tus pedidos se envíen de forma correcta a la barra de tu planta, es necesario añadir la app a tu pantalla de inicio.
              </p>
            </div>
            <div className="bg-[#0c111a] border border-slate-800 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-200"><span className="text-orange-500 font-black">✓</span> Evita que tu mesa se desconfigure.</div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-200"><span className="text-orange-500 font-black">✓</span> Navegación más rápida sin barras molestas.</div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-200"><span className="text-orange-500 font-black">✓</span> Pide directo a tu mesa en Planta Baja o Terraza.</div>
            </div>
            <button onClick={forzarInstalacionApp} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95">
              ✨ Agregar a Pantalla de Inicio
            </button>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tribu's Bar • Sistema de Seguridad de Mesas</p>
          </div>
        </div>
      )}

{view === 'success' && (
 <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white font-sans">
   <CheckCircle size={80} className="text-green-500 mb-6 animate-bounce" />
   <h1 className="text-4xl font-black italic mb-4 uppercase tracking-tighter">¡PEDIDO RECIBIDO!</h1>
   {!mesa && (
     <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 mb-8 max-w-sm">
       <p className="text-orange-500 font-black uppercase text-[10px] tracking-widest mb-4">Instrucciones de Pago</p>
       <pre className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">{DATOS_PAGO}</pre>
     </div>
   )}
   <button onClick={() => setView('menu')} className="text-orange-500 font-bold border-b border-orange-500 uppercase tracking-widest">Seguir Consumiendo</button>
 </div>
)}

{view === 'mis_pedidos' && (
   <div className="min-h-screen bg-black p-6 font-sans text-white">
     <div className="flex justify-between items-center mb-8">
       <h2 className="text-2xl font-black italic uppercase tracking-tighter">Mis Órdenes</h2>
       <button onClick={() => setView('menu')} className="bg-slate-800 p-2 rounded-full"><X size={20}/></button>
     </div>
     <div className="space-y-4">
       {mispedidos.length === 0 ? (
         <p className="text-gray-500 text-center text-xs uppercase tracking-widest mt-20">No tienes pedidos activos</p>
       ) : (
         mispedidos.map((p) => (
           <div key={p.id} className="bg-[#0f172a] border border-gray-800 p-5 rounded-[30px]">
             <div className="flex justify-between items-start mb-3">
               <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{p.mesa.includes('TEL') ? 'Para Llevar' : `Mesa ${p.mesa}`}</span>
               <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase ${p.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-500' : p.estado === 'preparando' ? 'bg-sky-500/10 text-sky-500' : 'bg-green-500/10 text-green-500'}`}>{p.estado}</span>
             </div>
             <p className="text-[11px] text-gray-400 whitespace-pre-line mb-3">{p.detalle}</p>
             <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
               <span className="text-xs font-bold text-gray-500 italic">Total</span>
               <span className="text-lg font-black text-white">${p.total}</span>
               {p.mesa.includes('TEL') && p.estado !== 'entregado' && (
                 <button onClick={() => informarPago(p.id)} className={`w-full mt-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${p.pagoInformado ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-blue-600 text-white animate-pulse'}`} disabled={p.pagoInformado}>{p.pagoInformado ? 'Pago en Verificación' : 'Ya deposité / Informar Pago'}</button>
               )}
             </div>
           </div>
         ))
       )}
     </div>
   </div>
)}

{view === 'login_staff' && (
   <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 text-white font-sans relative overflow-hidden">
     <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-orange-600/10 rounded-full blur-[120px]"></div>
     <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[120px]"></div>
     <div className="bg-[#0c111a] border border-slate-800/80 p-8 rounded-[24px] w-full max-w-md shadow-2xl relative z-10 backend-card">
       <div className="text-center mb-8">
         <h2 className="text-4xl font-black text-orange-600 italic uppercase tracking-tighter leading-none mb-2">TRIBU'S STAFF</h2>
         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Control de Áreas y Comandas</p>
       </div>
       <form onSubmit={async (e) => {
         e.preventDefault();
         const email = e.target.email.value; const password = e.target.password.value;
         try {
           const credenciales = await signInWithEmailAndPassword(auth, email, password);
           if (credenciales.user.email === 'baja@tribus.com') setAreaStaff('PLANTA BAJA');
           else if (credenciales.user.email === 'terraza@tribus.com') setAreaStaff('TERRAZA');
           else setAreaStaff('TODOS');
           setView('barra');
         } catch (error) { alert("Acceso denegado."); }
       }} className="space-y-5">
         <div>
           <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Correo del Encargado</label>
           <input type="email" name="email" required className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-orange-600 transition-all text-sm font-medium" placeholder="ej: baja@tribus.com" />
         </div>
         <div>
           <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Contraseña</label>
           <input type="password" name="password" required className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:border-orange-600 transition-all text-sm tracking-widest" placeholder="••••••••" />
         </div>
         <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] transition-all shadow-lg mt-4">Ingresar a Sistema</button>
       </form>
       <button onClick={() => setView('welcome')} className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-slate-400 transition-colors mt-6 uppercase tracking-wider">Volver al Menú</button>
     </div>
   </div>
)}

{mesa && !mesaValidada && pinCorrectoMesa && (
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
)}

{view === 'barra' && (
   <div className="min-h-screen bg-[#05070a] p-4 md:p-6 text-white flex flex-col font-sans">
     <style>{estilosImpresion}</style>
     <header className="flex flex-col mb-6 border-b border-slate-800 pb-6 gap-4 no-print">
        <div className="flex justify-between items-center w-full flex-wrap gap-2">
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-black text-orange-600 italic uppercase tracking-tighter leading-none">TRIBU'S BARRA</h1>
            <span className="text-[10px] font-black tracking-widest mt-1 uppercase text-slate-400">
              ZONA: <span className={areaStaff === 'TERRAZA' ? 'text-sky-400' : areaStaff === 'PLANTA BAJA' ? 'text-orange-500' : 'text-green-500'}>
                {areaStaff === 'TODOS' ? 'Control General (Todo)' : areaStaff}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {usuarioLogueado?.email === 'admin@tribus.com' && (
              <select value={areaStaff} onChange={(e) => setAreaStaff(e.target.value)} className="bg-slate-900 border border-slate-800 text-[10px] font-black uppercase rounded-lg px-2 py-1 text-slate-300 outline-none cursor-pointer">
                <option value="TODOS">Ver Todo</option>
                <option value="PLANTA BAJA">Planta Baja</option>
                <option value="TERRAZA">Terraza</option>
              </select>
            )}
            <div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold animate-pulse uppercase tracking-widest border border-green-500/10 whitespace-nowrap">● En Vivo</div>
            <button onClick={async () => { await signOut(auth); setEsSuperAdmin(false); setUsuarioLogueado(null); setView('welcome'); }} className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white p-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider"><LogOut size={14} /> Salir</button>
          </div>
        </div>
        <div className="w-full overflow-x-auto no-scrollbar flex gap-3 pb-2">
          <button onClick={() => setTabBarra('comandas')} className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] ${tabBarra === 'comandas' ? 'bg-orange-600' : 'bg-slate-900'}`}><LayoutDashboard size={14}/> Comandas</button>
          <button onClick={() => setTabBarra('inventario')} className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] ${tabBarra === 'inventario' ? 'bg-orange-600' : 'bg-slate-900'}`}><Boxes size={14}/> Inventario</button>
          <button onClick={() => setTabBarra('eventos')} className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] ${tabBarra === 'eventos' ? 'bg-orange-600' : 'bg-slate-900'}`}><Calendar size={14}/> Eventos</button>
        </div>
        <div className="flex gap-3">{tabBarra === 'inventario' && <button onClick={() => setVerModalNuevoProd(true)} className="bg-green-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2"><PlusCircle size={16}/> Producto</button>}{tabBarra === 'eventos' && <button onClick={() => setVerModalNuevoEvento(true)} className="bg-orange-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2"><PlusCircle size={16}/> Agendar</button>}</div>
     </header>

     <div className="flex flex-col lg:flex-row gap-6">
       {tabBarra === 'comandas' && (
         <div className="flex-1 no-print">
           <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
             {pedidosBarra.filter(p => String(p.mesa).toLowerCase().includes(filtroMesa.toLowerCase())).filter(p => areaStaff === 'TODOS' || obtenerPlanta(p.mesa) === areaStaff).map(p => {
               const esExterno = String(p.mesa).startsWith("TEL:"); const numTel = esExterno ? p.mesa.replace("TEL:", "") : "";
               return (
                 <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-3.5 rounded-xl relative shadow-lg flex flex-col justify-between text-left">
                   <div className={`absolute top-0 left-0 w-1 h-full ${esExterno ? 'bg-blue-600' : 'bg-orange-600'}`}></div>
                   
                   {p.pagoInformado && <div className="bg-blue-600 text-white text-[9px] font-black p-2 rounded-lg mb-2 flex items-center justify-center animate-pulse">PAGO INFORMADO</div>}
                   
                   {/* 🔥 ALERTA VISUAL DE TRASLADO AUTOMÁTICO DESDE LA PWA */}
                   {p.pideTraslado && (
                     <div className="bg-red-600 text-white text-[10px] font-black p-2 rounded-lg mb-2.5 flex flex-col items-center justify-center animate-pulse shadow-lg border border-red-400/30">
                       <span>⚠️ SOLICITUD DE MOVIMIENTO</span>
                       <span className="text-xs bg-black/40 px-2 rounded mt-0.5 font-bold">MOVER A MESA {p.solicitudTraslado}</span>
                     </div>
                   )}

                   <div>
                     <div className="flex justify-between items-start">
                       <div>
                         <h3 className="text-lg font-black uppercase text-white">{esExterno ? `📦 ${numTel}` : `MESA ${p.mesa}`}</h3>
                         {p.cliente && <span className="text-[9px] text-slate-400">Atendiendo: <span className="text-orange-500 font-bold">{p.cliente}</span></span>}
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => moverMesa(p)} className="text-slate-500 hover:text-sky-400" title="Mover / Autorizar"><ExternalLink size={15}/></button>
                         <button onClick={async () => { if(window.confirm("¿Cancelar?")) { await deleteDoc(doc(db, "pedidos", p.id)); } }} className="text-slate-700 hover:text-red-500"><Trash2 size={15}/></button>
                       </div>
                     </div>
                     <div className="mt-3 space-y-1 max-h-[150px] overflow-y-auto no-scrollbar">
                       {p.detalle.split('\n').map((linea, idx) => (<div key={idx} className="flex justify-between bg-black/20 p-1.5 rounded text-xs text-slate-300"><span>{linea}</span><button onClick={() => eliminarArticuloComanda(p, idx)} className="text-red-500/50 hover:text-red-500"><X size={12}/></button></div>))}
                     </div>
                   </div>
                   <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-2 rounded-xl font-black text-sm mt-4">Cobrar ${p.total}</button>
                 </div>
               );
             })}
           </div>
         </div>
       )}

       {tabBarra === 'inventario' && (
         <div className="flex-1 no-print space-y-8">
           <div>
             <h2 className="text-orange-500 font-black text-xs mb-4">● HIELERA PLANTA BAJA</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {productosMenu.filter(p => p.ubicacion === "PLANTA BAJA" || !p.ubicacion).map(prod => (
                 <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                   <div className="flex justify-between mb-2"><div><h4 className="font-black text-white text-sm">{prod.nombre}</h4><p className="text-[10px] text-slate-500">{prod.categoria}</p></div><div className="text-xl font-black text-green-500">{prod.stock}</div></div>
                   <div className="grid grid-cols-2 gap-2"><button onClick={() => updateDoc(doc(db, "productos", prod.id), { stock: increment(12) })} className="bg-slate-900 text-[10px] py-1 rounded">+12</button><button onClick={async () => { await deleteDoc(doc(db, "productos", prod.id)); }} className="text-red-500"><Trash2 size={14} className="mx-auto"/></button></div>
                 </div>
               ))}
             </div>
           </div>
         </div>
       )}
       
       <div className="w-full lg:w-[350px] space-y-4">
         <input type="text" placeholder="Buscar mesa..." value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#0c111a] border border-slate-800 rounded-xl px-4 py-2 text-white" />
         <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800">
           <h2 className="text-md font-black text-orange-600 mb-4">Caja Hoy</h2>
           <div className="space-y-2">{historialFiltradoParaCaja.map(hc => (<div key={hc.id} className="flex justify-between text-xs border-b border-slate-900 pb-2"><span>Mesa {hc.mesa}</span><span className="text-green-500 font-bold">${hc.total}</span></div>))}</div>
           <div className="pt-2 mt-2 border-t border-slate-800 flex justify-between font-black text-xl text-green-500"><span>Total:</span><span>${totalCajaHoy}</span></div>
         </div>
       </div>
     </div>
   </div>
)}

{view === 'welcome' && (
   <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
     <div className="absolute inset-0 opacity-40"><img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-slate-950/80"></div></div>
     <div className="relative z-10 space-y-12 w-full max-w-lg">
       <div className="space-y-4">
         <h1 className="text-6xl font-black italic uppercase tracking-tighter text-orange-500 animate-pulse">{nombreBarDinamico}</h1>
         <h2 className="text-2xl font-bold">{mesa ? `¡BIENVENIDO MESA ${mesa}!` : "¡BIENVENIDO!"}</h2>
         <p className="text-orange-500 text-xs tracking-widest">{obtenerPlanta(mesa)}</p>
       </div>
       <div className="grid gap-4">
         <button onClick={() => setView('menu')} className="bg-orange-600 p-5 rounded-3xl font-black text-lg uppercase flex items-center justify-center gap-4 shadow-xl"><UtensilsCrossed/> Ver la carta / Ordenar</button>
         <button onClick={() => window.open(LINK_PRINCIPAL, '_blank')} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center justify-center gap-3"><ExternalLink size={18}/> Pedir Música ({TEXTO_LINK})</button>
       </div>
       <button onClick={() => setView('login_staff')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest">Acceso Staff</button>
     </div>
   </div>
)}

{view === 'menu' && (() => {
   const ubicacionActual = mesa ? obtenerPlanta(mesa) : "EXTERNO";
   const menuPorPlanta = productosMenu.filter(p => (ubicacionActual === "EXTERNO" || !p.ubicacion || p.ubicacion === "" || p.ubicacion === ubicacionActual));
   const menuFiltrado = menuPorPlanta.filter(p => (catSeleccionada === "Todos" || p.categoria === catSeleccionada) && (subCatSeleccionada === "Todas" || p.subcategoria === subCatSeleccionada));
   const subcategoriasDisponibles = Array.from(new Set(menuPorPlanta.filter(p => p.categoria === catSeleccionada && p.subcategoria).map(p => p.subcategoria)));

   return (
     <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans w-full">
       <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3">
         <div className="max-w-6xl mx-auto flex flex-col gap-3">
           <div className="flex justify-between items-center w-full">
             
             {/* --- CABECERA DINÁMICA CON BOTÓN DE CÁMARA INCORPORADO --- */}
             <div className="flex items-center gap-3">
               <div onClick={() => setView('welcome')} className="cursor-pointer font-black text-lg text-orange-500 italic uppercase leading-none">{nombreBarDinamico}</div>
               <button 
                 onClick={() => { setMesaEscaneadaInput(""); setVerModalEscaner(true); }} 
                 className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-600/10 active:scale-95 transition-transform"
               >
                 <Camera size={13} />
                 <span>{mesa ? `Mesa: ${mesa}` : "Escanear QR"}</span>
               </button>
             </div>

             <div className="flex gap-2 items-center">
               {pinCorrectoMesa && <div className="bg-orange-600/10 px-2 py-1 rounded-lg text-xs font-mono text-white tracking-widest">PIN:{pinCorrectoMesa}</div>}
               {consumoAcumulado.length > 0 && <div className="bg-green-600/10 px-2 py-1 rounded-lg text-xs text-green-500 font-bold">${totalAcumulado}</div>}
               <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2 rounded-full relative"><ShoppingCart size={18} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[9px] px-1 rounded-full font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
             </div>
           </div>
           <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">{CATEGORIAS.map(c => (<button key={c} onClick={() => setCatSeleccionada(c)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${catSeleccionada === c ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400'}`}>{c}</button>))}</div>
         </div>
       </header>

       <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4">
         {menuFiltrado.map(item => (
           <div key={item.id} className="bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30">
             <div className="w-20 h-20 rounded-2xl bg-slate-900 overflow-hidden"><img src={item.imagen} className="w-full h-full object-cover" alt="" /></div>
             <div className="flex-1 flex flex-col justify-between">
               <div><h3 className="font-bold text-white text-sm uppercase leading-tight">{item.nombre}</h3><p className="text-slate-500 text-[11px] italic">{item.subcategoria}</p></div>
               <div className="flex justify-between items-center"><span className="font-black text-md text-orange-500">${obtenerPrecioItem(item)}</span><button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-8 h-8 rounded-lg font-bold">+</button></div>
             </div>
           </div>
         ))} 
       </main>

       {/* --- MODAL ELEGANTE DE ESCANER INTERNO CON CÁMARA Y RESPALDO --- */}
       {verModalEscaner && (
         <div className="fixed inset-0 z-[250] bg-slate-950/98 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-white text-center">
           <div className="w-full max-w-sm space-y-5">
             
             <div className="flex justify-between items-center border-b border-slate-800 pb-3">
               <div className="text-left">
                 <h3 className="text-xl font-black italic uppercase text-orange-500">Asignar / Cambiar Mesa</h3>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cámara en vivo PWA standalone</p>
               </div>
               <button onClick={() => setVerModalEscaner(false)} className="bg-slate-900 p-2 rounded-full text-slate-400"><X size={18}/></button>
             </div>

             {/* Recuadro de la Cámara de Video Nativa */}
             <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
               <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-1" />
               <div className="absolute inset-0 border-2 border-orange-500/30 rounded-2xl pointer-events-none flex items-center justify-center">
                 <div className="w-32 h-32 border border-dashed border-orange-500 rounded-xl opacity-60 animate-pulse"></div>
               </div>
               <span className="absolute bottom-2 left-0 right-0 mx-auto text-[9px] font-bold uppercase tracking-widest bg-black/60 w-max px-3 py-1 rounded-full text-orange-400">Apunta al código de la mesa</span>
             </div>

             {/* Teclado Numérico de Respaldo por si no lee */}
             <div className="space-y-3">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">O Digita el Número de Mesa</span>
                 <span className="text-3xl font-black tracking-widest text-white">{mesaEscaneadaInput || "--"}</span>
               </div>

               <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                   <button key={n} onClick={() => mesaEscaneadaInput.length < 2 && setMesaEscaneadaInput(mesaEscaneadaInput + n)} className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800/80 text-lg font-black active:scale-90">{n}</button>
                 ))}
                 <button onClick={() => setMesaEscaneadaInput("")} className="w-12 h-12 rounded-full text-red-500 font-bold text-xs bg-red-900/10">BORRAR</button>
                 <button onClick={() => mesaEscaneadaInput.length < 2 && setMesaEscaneadaInput(mesaEscaneadaInput + "0")} className="w-12 h-12 rounded-full bg-slate-900 text-lg font-black">0</button>
                 <button 
                   disabled={!mesaEscaneadaInput}
                   onClick={() => {
                     procesarCambioMesaPWA(mesaEscaneadaInput);
                   }} 
                   className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${mesaEscaneadaInput ? 'bg-green-600 text-white' : 'bg-slate-900 text-slate-700'}`}
                 >
                   <CheckCircle size={20}/>
                 </button>
               </div>
             </div>

           </div>
         </div>
       )}

       {carrito.length > 0 && !verCarrito && (<div className="fixed bottom-6 left-0 right-0 px-6 z-40 flex justify-center"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl"><span>MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span className="font-black">${totalCarrito}</span></button></div>)}
       <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible opacity-100' : 'invisible opacity-0'}`}><div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} /><div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}><div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl"><h2>Mi Cuenta</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div><div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">{carrito.length > 0 && (<div><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={12}/> Por pedir ahora:</p><div className="space-y-3">{carrito.map(item => (<div key={item.id} className="bg-orange-600/5 p-3 rounded-2xl flex flex-col gap-2 border border-orange-600/20 shadow-sm"><div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight leading-none"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600 hover:text-red-500 transition-colors"/></button></div><div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic tracking-tighter">${item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1 shadow-inner"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div></div>))}</div></div>)}{consumoAcumulado.length > 0 && (<div><p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={12}/> Ya consumido:</p><div className="space-y-2">{consumoAcumulado.map((item, idx) => (<div key={idx} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center border border-slate-800 opacity-60"><span className="text-[11px] font-bold text-slate-300 uppercase">{item.cantidad}x {item.nombre}</span><span className="text-[11px] font-black text-white">${item.precio * item.cantidad}</span></div>))}</div></div>)}</div><div className="pt-4 border-t border-slate-800 space-y-4"><div className="flex justify-between font-black text-2xl text-orange-500 italic"><span>Total Cuenta</span><span>${totalCarrito + totalAcumulado}</span></div><button disabled={carrito.length === 0} onClick={intentarEnviar} className="w-full py-4 rounded-2xl font-black text-white bg-orange-600 active:scale-95 transition-all shadow-xl uppercase tracking-widest">Confirmar Pedido</button></div></div></div>
     </div>
   );
 })()}

      {view !== 'welcome' && view !== 'registro' && view !== 'login' && view !== 'menu' && view !== 'barra' && view !== 'login_staff' && view !== 'mis_pedidos' && (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <p className="text-white animate-pulse font-black italic uppercase tracking-widest">Cargando Tribu's Bar...</p>
        </div>
      )}
      <div id="recaptcha-container"></div>
    </>
  );
}

export default App;