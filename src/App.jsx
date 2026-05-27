import { signInWithEmailAndPassword, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from "firebase/auth";
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy, serverTimestamp, writeBatch, increment, setDoc, getDoc, getDocs } from "firebase/firestore";
import { ShoppingCart, Trash2, X, Plus, Minus, Wifi, UtensilsCrossed, Zap, CheckCircle, ReceiptText, Printer, Search, CreditCard, Phone, Package, LayoutDashboard, Boxes, PlusCircle, Tag, ExternalLink, Lock, Calendar, History, LogOut } from 'lucide-react';

const DATOS_PAGO = "💳 *DATOS DE PAGO*:\nBanco: Bancoppel\nCuenta: 4169 1614 6993 9648\nCLABE: 137162104580151937\nA nombre de: Tribus Bar";
const PIN_ADMIN = "2370";
const CATEGORIAS = ["Todos", "Cerveza", "Bebidas Preparadas", "Snacks", "Botellas", "Comidas"];
const LINK_PRINCIPAL = "http://192.168.5.5/youtube/search"; 
const TEXTO_LINK = "Rockola";

// --- CONFIGURACIÓN TELEGRAM ---
const TELEGRAM_TOKEN = "8571689799:AAGl_SNWiQXUc1GHXrTjub-Ke0KoDrUt-k4";
const TELEGRAM_CHAT_ID = "8781675036";

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
 const [verModalNuevoEvent, setVerModalNuevoEvento] = useState(false);
 const [nuevoEvento, setNuevoEvento] = useState({ titulo: "", fecha: "", hora: "" });
 const [verModalNuevoProd, setVerModalNuevoProd] = useState(false);
 const [nuevoProd, setNuevoProd] = useState({
   nombre: "", precioMesa: "", precioDomicilio: "", stockBaja: "", stockTerraza: "", 
   categoria: "Cerveza", subcategoria: "", imagen: ""
 });
 const [productosMenu, setProductosMenu] = useState([]);
 const [catSeleccionada, setCatSeleccionada] = useState("Todos");
 const [subCatSeleccionada, setSubCatSeleccionada] = useState("Todas");
 const [pedidosBarra, setPedidosBarra] = useState([]);
 const [historialCerrado, setHistorialCerrado] = useState([]); 
 const [filtroMesa, setFiltroMesa] = useState(""); 
 const [ticketParaReimprimir, setTicketParaReimprimir] = useState(null);
 const [nombreRegistro, setNombreRegistro] = useState('');
 const [usuarioLogueado, setUsuarioLogueado] = useState(null);
 const [historialHoy, setHistorialHoy] = useState([]);
 const [password, setPassword] = useState('');
 const [areaStaff, setAreaStaff] = useState('TODOS');
 const [fechaInicioRep, setFechaInicioRep] = useState("");
 const [fechaFinRep, setFechaFinRep] = useState("");
 const [reporteFiltrado, setReporteFiltrado] = useState(null);
 const [esSuperAdmin, setEsSuperAdmin] = useState(false);
 const [eventoInstalacion, setEventoInstalacion] = useState(null);
 const [verModalEscaner, setVerModalEscaner] = useState(false);
 const videoRef = useRef(null);
 const streamRef = useRef(null);
 const intervalorRef = useRef(null);
 const [mesaEscaneadaInput, setMesaEscaneadaInput] = useState(""); 
 const [esAppInstalada, setEsAppInstalada] = useState(
   window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
 );

 // --- LECTOR DE QR NATIVO EN TIEMPO REAL ---
 const encenderCamaraPWA = async () => {
    alert("¡LA FUNCIÓN ENCENDER CAMARA SE ESTÁ EJECUTANDO!");
    alert("¿ZXing está vivo?: " + (window.ZXing ? "SÍ" : "NO, ESTÁ NULL"));  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        streamRef.current = stream;

        if (window.ZXing) {
          const codeReader = new window.ZXing.BrowserQRCodeReader();
          console.log("Motor Zxing activo de forma manual.");

          intervalorRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_CURRENT_DATA) {
              try {
                const result = await codeReader.decodeFromVideoElement(videoRef.current);
                if (result) {
                  const urlDetectada = result.text;
                  console.log("¡QR Detectado!", urlDetectada);
                  
                  clearInterval(intervalorRef.current);
                  codeReader.reset();
                  apagarCamaraPWA();

                  try {
                    const urlObj = new URL(urlDetectada);
                    const mesaIdUrl = urlObj.searchParams.get("mesa");
                    procesarEscaneoMesa(mesaIdUrl ? mesaIdUrl : urlDetectada.trim());
                  } catch (e) {
                    procesarEscaneoMesa(urlDetectada.trim());
                  }
                }
              } catch (err) { /* Ignorar errores de tracking cuadro x cuadro */ }
            }
          }, 400);
        }
      }
    } catch (err) { console.warn("Error de inicialización:", err); }
 };

 const apagarCamaraPWA = () => {
    if (intervalorRef.current) { clearInterval(intervalorRef.current); intervalorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
 };

 useEffect(() => {
    if (verModalEscaner) { encenderCamaraPWA(); } else { apagarCamaraPWA(); }
    return () => apagarCamaraPWA();
 }, [verModalEscaner]);

 const forzarInstalacionApp = async () => {
   if (!eventoInstalacion) {
     alert("En iPhone/iPad: Pulsa el botón 'Compartir' abajo en tu navegador y selecciona 'Agregar a inicio' 📲");
     return;
   }
   eventoInstalacion.prompt();
   const { outcome } = await eventoInstalacion.userChoice;
   if (outcome === 'accepted') {
     setEsAppInstalada(true);
     setEventoInstalacion(null);
   }
 };

 const procesarEscaneoMesa = async (nuevaMesa) => {
   const idMesaLimpia = String(nuevaMesa).trim();
   if (!idMesaLimpia || idMesaLimpia === "") return;

   if (consumoAcumulado.length === 0 && carrito.length === 0) {
     localStorage.setItem("tribu_mesa", idMesaLimpia);
     setMesa(idMesaLimpia);
     setVerModalEscaner(false);
     alert(`📍 Te has ubicado en la Mesa ${idMesaLimpia} (${obtenerPlanta(idMesaLimpia)})`);
     return;
   }

   if (String(mesa) === idMesaLimpia) {
     setVerModalEscaner(false);
     return;
   }

   const pedidoActivo = pedidosBarra.find(p => String(p.mesa) === String(mesa));
   if (pedidoActivo) {
     try {
       await updateDoc(doc(db, "pedidos", pedidoActivo.id), {
         solicitudTraslado: idMesaLimpia,
         pideTraslado: true
       });
       setVerModalEscaner(false);
       alert(`⏳ Solicitud enviada. La barra está trasladando tu cuenta de la Mesa ${mesa} a la Mesa ${idMesaLimpia}.`);
     } catch (e) {
       console.error(e);
       alert("Error al solicitar traslado.");
     }
   } else {
     localStorage.setItem("tribu_mesa", idMesaLimpia);
     setMesa(idMesaLimpia);
     setVerModalEscaner(false);
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
  let totalBaja = 0, totalTerraza = 0, totalExterno = 0, ticketsEnRango = 0;

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
    capacityTickets: ticketsEnRango
  });
 };

 const [mispedidos, setMisPedidos] = useState([]);
 const [telefonoUsuarioLogueado, setTelefonoUsuarioLogueado] = useState("");

 useEffect(() => {
  if (usuarioLogueado) {
    const q = query(collection(db, "pedidos"), where("uid", "==", usuarioLogueado.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setMisPedidos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }
 }, [usuarioLogueado]);

 useEffect(() => {
   const capturarPrompt = (e) => { e.preventDefault(); setEventoInstalacion(e); };
   window.addEventListener('beforeinstallprompt', capturarPrompt);
   const mediaQuery = window.matchMedia('(display-mode: standalone)');
   const verificarModo = (e) => setEsAppInstalada(e.matches);
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
   } catch (error) { console.error(error); }
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
      nombre: nombreRegistro,
      telefono: telefonoInput,
      uid: user.uid,
      puntos: 0,
      fechaRegistro: serverTimestamp(),
      ultimaVisita: serverTimestamp()
    });

    setUsuarioLogueado(user);
    setView('menu'); 
    alert(`¡Bienvenido a la Tribu, ${nombreRegistro}!`);
  } catch (error) { alert("Error al registrar: " + error.message); }
 };

 const cerrarSesion = async () => {
  try {
    await signOut(auth); 
    setUsuarioLogueado(null); 
    setView('welcome'); 
    alert("Sesión cerrada. ¡Vuelve pronto a la Tribu!");
  } catch (error) { console.error(error); }
 };

 useEffect(() => {
  if (usuarioLogueado) {
    const obtenerDatosCliente = async () => {
      const docSnap = await getDoc(doc(db, "clientes", usuarioLogueado.uid));
      if (docSnap.exists() && docSnap.data().nombre) {
        setNombreUsuarioLogueado(docSnap.data().nombre);
        setTelefonoUsuarioLogueado(docSnap.data().telefono);
      } else {
        setNombreUsuarioLogueado("Invitado Tribu");
      }
    };
    obtenerDatosCliente();
  } else { setNombreUsuarioLogueado(""); }
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
      return mesaOriginal.includes(busqueda);
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
      await updateDoc(doc(db, "pedidos", pedido.id), { mesa: String(nuevaMesa), detalle: pedido.detalle + etiquetaTraslado });
      alert(`Cuenta trasladada a Mesa ${nuevaMesa} (${plantaDestino}) con éxito.`);
    } catch (e) { alert("No se pudo mover la mesa."); }
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
            if (res.ok) await updateDoc(doc(db, "recordatorios", rec.id), { enviado: true });
          } catch (e) { ultimoMinutoEnviado.current = ""; }
        }
      });
    }, 5000);
    return () => clearInterval(vigilante);
 }, [recordatorios]);

 useEffect(() => {
  const q = query(collection(db, "rockola_pendientes"), where("estado", "==", "pendiente"));
  const unsub = onSnapshot(q, async (snapshot) => {
    for (const cambio of snapshot.docChanges()) {
      if (cambio.type === "added") {
        const dataRockola = cambio.doc.data();
        const mesaRockola = String(dataRockola.mesa);
        const totalCreditos = Number(dataRockola.total) || 0;
        const detalleCreditos = dataRockola.detalle || "Créditos Rockola";
        try {
          const qPedido = query(collection(db, "pedidos"), where("mesa", "==", "pendiente"));
          const pedidoSnapshot = await getDocs(qPedido);
          const batch = writeBatch(db);

          if (!pedidoSnapshot.empty) {
            const pedidoDoc = pedidoSnapshot.docs[0];
            const datosPedidoActual = pedidoDoc.data();
            batch.update(doc(db, "pedidos", pedidoDoc.id), {
              detalle: datosPedidoActual.detalle ? `${datosPedidoActual.detalle}\n${detalleCreditos}` : detalleCreditos,
              total: (Number(datosPedidoActual.total) || 0) + totalCreditos
            });
          } else {
            batch.set(doc(collection(db, "pedidos")), {
              mesa: mesaRockola, detalle: detalleCreditos, total: totalCreditos, estado: "pendiente", fecha: serverTimestamp(), archivado: false, cliente: "Cliente Rockola"
            });
          }
          batch.delete(doc(db, "rockola_pendientes", cambio.doc.id));
          await batch.commit();
        } catch (error) { console.error(error); }
      }
    }
  });
  return () => unsub();
 }, []);

 useEffect(() => {
   const params = new URLSearchParams(window.location.search);
   let mesaId = params.get("mesa") || localStorage.getItem("tribu_mesa");
   if (params.get("mesa")) localStorage.setItem("tribu_mesa", params.get("mesa"));
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
           setConsumoAcumulado(pedidoMesa.detalle.split('\n').map(linea => {
             const parts = linea.match(/(\d+)x (.*) \(\$(\d+)\)/);
             if (parts) return { cantidad: parseInt(parts[1]), nombre: parts[2].trim(), precio: parseInt(parts[3]) / parseInt(parts[1]) };
             return null;
           }).filter(i => i !== null));
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
         cliente: nombreUsuarioLogueado || existente.cliente || "Cliente",
         uid: usuarioLogueado?.uid || existente.uid || null
       });
     } else {
       const nuevoPedidoRef = doc(collection(db, "pedidos"));
       const datosNuevoPedido = { 
         mesa: String(idFinal), detalle: detalleNuevo, total: Number(totalCarrito), estado: "pendiente", fecha: serverTimestamp(), archivado: false,
         cliente: nombreUsuarioLogueado || "Cliente", telefono: telFinal, uid: usuarioLogueado?.uid || null 
       };
       if (idDestino && !String(idDestino).startsWith("TEL:")) {
         datosNuevoPedido.pinMesa = Math.floor(1000 + Math.random() * 9000);
       }
       batch.set(nuevoPedidoRef, datosNuevoPedido);
     }
     await batch.commit();
     setView('success'); setCarrito([]); setVerCarrito(false); setVerModalTelefono(false);
   } catch (e) { alert("Error al procesar el pedido."); }
 };

 const cobrarCuenta = async (p) => {
     await addDoc(collection(db, "historial_tickets"), { 
         mesa: p.mesa, detalle: p.detalle, total: Number(p.total), fecha: serverTimestamp(), archivado: false,
         cliente: p.cliente || "Cliente General", telefono: p.telefono || "N/A", uid: p.uidCliente || null
     });
     await deleteDoc(doc(db, "pedidos", p.id));
     setTicketParaReimprimir(p);
 };

 useEffect(() => {
   const unsub = onSnapshot(query(collection(db, "historial_tickets"), where("archivado", "==", false)), (snapshot) => {
     setHistorialHoy(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
   });
   return () => unsub();
 }, []);

 const eliminarArticuloComanda = async (p, idx) => {
    const lineas = p.detalle.split('\n');
    const match = lineas[idx].match(/(\d+)x (.*?) \(\$(\d+)\)/);
    if (match) {
      const batch = writeBatch(db);
      const prodEnc = productosMenu.find(pr => pr.nombre.trim() === match[2].trim());
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

 return (
    <>
      <style>{estilosImpresion}</style>
      
      {/* --- PWA OBLIGAR A INSTALAR --- */}
      {!esAppInstalada && view !== 'barra' && view !== 'login_staff' && (
        <div className="fixed inset-0 z-[300] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-sm space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl transform rotate-12">
              <span className="text-3xl font-black italic tracking-tighter text-black -rotate-12">TB</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight italic">🔒 Acceso Seguro</h2>
              <p className="text-xs text-slate-400 font-medium px-4 leading-relaxed">Añade la app a tu pantalla de inicio para fijar tu mesa y pedir de forma estable.</p>
            </div>
            <button onClick={forzarInstalacionApp} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-xl">
              ✨ Agregar a Pantalla de Inicio
            </button>
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
                    <span className="text-[9px] font-bold px-3 py-1 rounded-full uppercase bg-amber-500/10 text-amber-500">{p.estado}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 whitespace-pre-line mb-3">{p.detalle}</p>
                  <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                    <span className="text-lg font-black text-white">${p.total}</span>
                    {p.mesa.includes('TEL') && p.estado !== 'entregado' && (
                      <button onClick={() => informarPago(p.id)} className="bg-blue-600 text-white text-[10px] uppercase font-black px-4 py-2 rounded-xl" disabled={p.pagoInformado}>{p.pagoInformado ? 'Verificando' : 'Informar Pago'}</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {view === 'login_staff' && (
        <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 text-white font-sans">
          <div className="bg-[#0c111a] border border-slate-800 p-8 rounded-[24px] w-full max-w-md shadow-2xl">
            <h2 className="text-4xl font-black text-orange-600 text-center mb-6">TRIBU'S STAFF</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const creds = await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
                if (creds.user.email === 'baja@tribus.com') setAreaStaff('PLANTA BAJA');
                else if (creds.user.email === 'terraza@tribus.com') setAreaStaff('TERRAZA');
                else setAreaStaff('TODOS');
                setView('barra');
              } catch (err) { alert("Acceso denegado."); }
            }} className="space-y-4">
              <input type="email" name="email" required className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3" placeholder="Staff Email" />
              <input type="password" name="password" required className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-3" placeholder="••••••••" />
              <button type="submit" className="w-full bg-orange-600 py-3 rounded-xl font-black">INGRESAR</button>
            </form>
          </div>
        </div>
      )}

      {mesa && !mesaValidada && pinCorrectoMesa && (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
          <Lock size={48} className="text-orange-600 mb-6" />
          <h2 className="text-2xl font-black uppercase mb-8">Cuenta Abierta / PIN</h2>
          <div className="grid grid-cols-3 gap-4 max-w-[280px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => manejarPinMesa(n)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-xl font-black">{n}</button>
            ))}
            <div/><button onClick={() => manejarPinMesa(0)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-xl font-black">0</button>
          </div>
        </div>
      )}

      {view === 'barra' && (
        <div className="min-h-screen bg-[#05070a] p-6 text-white font-sans flex flex-col">
          <header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 no-print">
            <div>
              <h1 className="text-3xl font-black text-orange-600 italic">TRIBU'S BARRA</h1>
              <p className="text-xs text-slate-400">Panel en Vivo - {areaStaff}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTabBarra('comandas')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase ${tabBarra === 'comandas' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Comandas</button>
              <button onClick={() => setTabBarra('inventario')} className={`px-4 py-2 rounded-xl font-black text-xs uppercase ${tabBarra === 'inventario' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Inventario</button>
              <button onClick={() => { signOut(auth); setView('welcome'); }} className="bg-red-600 text-white text-xs font-black px-4 py-2 rounded-xl">Salir</button>
            </div>
          </header>

          {tabBarra === 'comandas' && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 no-print">
              {pedidosBarra.filter(p => {
                if (areaStaff === 'TODOS') return true;
                return obtenerPlanta(p.mesa) === areaStaff;
              }).map(p => (
                <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-black tracking-tight text-white">{p.mesa.startsWith('TEL:') ? `📦 EXT` : `MESA ${p.mesa}`}</h3>
                      <button onClick={() => moverMesa(p)} className="text-slate-500 hover:text-sky-400"><ExternalLink size={16}/></button>
                    </div>
                    {p.pideTraslado && <div className="bg-red-600 text-white font-black text-[9px] p-2 rounded-lg mb-2 text-center">TRASLADAR A MESA {p.solicitudTraslado}</div>}
                    <div className="space-y-1 text-sm text-slate-300 whitespace-pre-line bg-black/20 p-2 rounded-xl">{p.detalle}</div>
                  </div>
                  <button onClick={() => cobrarCuenta(p)} className="w-full bg-orange-600 py-2.5 rounded-xl font-black text-sm mt-4 uppercase">Cobrar ${p.total}</button>
                </div>
              ))}
            </div>
          )}

          {tabBarra === 'inventario' && (
            <div className="space-y-6 no-print">
              <button onClick={() => setVerModalNuevoProd(true)} className="bg-green-600 px-4 py-2 rounded-xl font-black text-xs uppercase">+ Nuevo Producto</button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {productosMenu.map(prod => (
                  <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-white uppercase text-sm">{prod.nombre}</h4>
                      <p className="text-[10px] text-slate-500 uppercase">{prod.ubicacion} | Stock: {prod.stock}</p>
                    </div>
                    <button onClick={() => updateDoc(doc(db, "productos", prod.id), { stock: increment(12) })} className="bg-slate-800 text-[10px] px-3 py-1 rounded-lg font-black">+12</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'welcome' && (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
          <div className="absolute inset-0 opacity-40">
            <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="bg" />
            <div className="absolute inset-0 bg-slate-950/80"></div>
          </div>
          <div className="relative z-10 space-y-10 w-full max-w-sm">
            <h1 className="text-5xl font-black italic uppercase text-orange-500 tracking-tighter leading-none">{nombreBarDinamico}</h1>
            <h2 className="text-xl font-bold uppercase">{mesa ? `Mesa Asignada: ${mesa}` : "Menú Digital Abierto"}</h2>
            <div className="grid gap-3">
              <button onClick={() => setView('menu')} className="w-full bg-orange-600 py-4 rounded-2xl font-black uppercase tracking-wider text-sm shadow-xl active:scale-95 transition-transform">📖 Ver la Carta</button>
              <button onClick={() => setView('login')} className="w-full bg-slate-900 border border-slate-800 py-4 rounded-2xl font-bold text-sm">👤 Entrar como Cliente Frecuente</button>
              <button onClick={() => setView('registro')} className="w-full text-xs text-slate-500 font-bold uppercase tracking-widest underline">Crear Cuenta Nueva</button>
            </div>
            <button onClick={() => setView('login_staff')} className="opacity-10 text-[9px] uppercase tracking-widest block mx-auto mt-8">Acceso Staff</button>
          </div>
        </div>
      )}

      {view === 'registro' && (
        <div className="flex items-center justify-center min-h-screen bg-black p-4 font-sans">
          <div className="bg-[#0f172a] text-white rounded-[35px] border border-gray-800 p-8 w-full max-w-sm text-center">
            <h2 className="text-2xl font-black uppercase mb-6">Regístrate</h2>
            <div className="space-y-4 text-left">
              <input type="text" placeholder="Nombre" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-xl text-white outline-none" onChange={(e) => setNombreRegistro(e.target.value)} />
              <input type="tel" placeholder="WhatsApp (10 dígitos)" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-xl text-white outline-none" onChange={(e) => setTelefonoInput(e.target.value)} />
              <input type="password" placeholder="Contraseña (6+ caracteres)" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-xl text-white outline-none" onChange={(e) => setPassword(e.target.value)} />
              <button onClick={registrarClienteFrecuente} className="w-full bg-[#ff4d00] py-4 rounded-xl font-black uppercase text-sm mt-2">Registrarme</button>
              <button onClick={() => setView('login')} className="w-full text-center text-xs text-gray-500 font-bold uppercase mt-2">Ya tengo cuenta</button>
            </div>
          </div>
        </div>
      )}

      {view === 'login' && (
        <div className="flex items-center justify-center min-h-screen bg-black p-4 font-sans">
          <div className="bg-[#0f172a] text-white rounded-[35px] border border-gray-800 p-8 w-full max-w-sm text-center">
            <h2 className="text-2xl font-black uppercase mb-6">Iniciar Sesión</h2>
            <div className="space-y-4 text-left">
              <input type="tel" placeholder="WhatsApp (10 dígitos)" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-xl text-white outline-none" onChange={(e) => setTelefonoInput(e.target.value)} />
              <input type="password" placeholder="Contraseña" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-xl text-white outline-none" onChange={(e) => setPassword(e.target.value)} />
              <button onClick={loginClienteFrecuente} className="w-full bg-[#ff4d00] py-4 rounded-xl font-black uppercase text-sm mt-2">Entrar</button>
              <button onClick={() => setView('registro')} className="w-full text-center text-xs text-gray-500 font-bold uppercase mt-2">No tengo cuenta</button>
            </div>
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 w-full">
                  <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                    <div onClick={() => setView('welcome')} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter whitespace-nowrap">{nombreBarDinamico}</div>
                    <button onClick={() => { setMesaEscaneadaInput(""); setVerModalEscaner(true); }} className="bg-orange-600 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl">📷 {mesa ? `Mesa ${mesa}` : "Escanear QR"}</button>
                  </div>
                  <div className="flex items-center justify-end gap-3 w-full sm:w-auto border-t border-slate-800/50 pt-2 sm:pt-0 sm:border-none">
                    <div className="flex sm:hidden items-center justify-between w-full">
                      <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative"><ShoppingCart size={18} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[8px] px-1.5 py-0.5 rounded-full font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
                      <select onChange={(e) => { if (e.target.value === 'mis_pedidos') setView('mis_pedidos'); if (e.target.value === 'cerrar_sesion') cerrarSesion(); e.target.value = 'default'; }} className="bg-slate-900 border border-slate-800 text-[10px] font-black uppercase rounded-xl px-3 py-2 text-slate-300">
                        <option value="default">👤 {usuarioLogueado ? (nombreUsuarioLogueado ? nombreUsuarioLogueado.split(" ")[0] : "Mi Cuenta") : "Invitado"} {consumoAcumulado.length > 0 ? ` ($${totalAcumulado})` : ''}</option>
                        {usuarioLogueado && <option value="mis_pedidos">📋 Ver mis órdenes</option>}
                        {usuarioLogueado && <option value="cerrar_sesion">❌ Cerrar Sesión</option>}
                      </select>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      {consumoAcumulado.length > 0 && <div className="bg-green-600/10 px-2 py-1 rounded-xl border border-green-500/20 text-green-500 text-[10px] font-black">${totalAcumulado}</div>}
                      <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2 rounded-full relative"><ShoppingCart size={16} />{carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-[8px] px-1 rounded-full font-bold">{carrito.reduce((a,b)=>a+b.cantidad,0)}</span>}</button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">{CATEGORIAS.map(c => (<button key={c} onClick={() => { setCatSeleccionada(c); setSubCatSeleccionada("Todas"); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${catSeleccionada === c ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400'}`}>{c}</button>))}</div>
              </div>
            </header>

            <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuFiltrado.map(item => (
                <div key={item.id} className="bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30">
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 overflow-hidden border border-slate-700"><img src={item.imagen} className="w-full h-full object-cover" alt="p"/></div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div><h3 className="font-bold text-white uppercase text-sm">{item.nombre}</h3><p className="text-slate-500 text-xs">{item.subcategoria}</p></div>
                    <div className="flex justify-between items-center"><span className="font-black text-xl text-orange-500">${obtenerPrecioItem(item)}</span><button onClick={() => agregarAlCarrito(item)} className="bg-orange-600 text-white w-10 h-10 rounded-xl font-bold">+</button></div>
                  </div>
                </div>
              ))}
            </main>

            {carrito.length > 0 && !verCarrito && (
              <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8"><span>🛒 MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span>${totalCarrito}</span></button></div>
            )}

            <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible opacity-100' : 'invisible opacity-0'}`}>
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} />
              <div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 text-white font-black uppercase text-xl"><h2>Mi Cuenta</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div>
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {carrito.map(item => (
                    <div key={item.id} className="bg-orange-600/5 p-3 rounded-2xl flex justify-between items-center border border-orange-600/20">
                      <div><p className="text-white font-bold text-xs uppercase">{item.nombre}</p><p className="text-orange-500 font-black text-sm">${item.precio * item.cantidad}</p></div>
                      <div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1"><Minus onClick={() => restarDelCarrito(item.id)} size={12}/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12}/></div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-800 space-y-4"><div className="flex justify-between font-black text-2xl text-orange-500"><span>Total Cuenta</span><span>${totalCarrito + totalAcumulado}</span></div><button onClick={intentarEnviar} className="w-full py-4 rounded-2xl font-black text-white bg-orange-600 uppercase tracking-widest text-sm">Confirmar Pedido</button></div>
              </div>
            </div>

            {/* --- MODAL DE ESCANEO REAL / SIN PARSEOS ROTOS --- */}
            {verModalEscaner && (
              <div className="fixed inset-0 z-[250] bg-slate-950/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div className="text-left"><h3 className="text-xl font-black italic uppercase text-orange-500">Escanear o Cambiar Mesa</h3><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Control de la Tribu</p></div>
                    <button onClick={() => setVerModalEscaner(false)} className="bg-slate-900 p-2 rounded-full border border-slate-800 text-slate-400"><X size={18}/></button>
                  </div>
                  <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-orange-500/20 rounded-2xl pointer-events-none flex items-center justify-center"><div className="w-28 h-28 border border-dashed border-orange-500 rounded-xl opacity-40 animate-pulse"></div></div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-slate-900 border-2 border-orange-500/30 rounded-2xl p-4 text-center">
                      <span className="text-xs font-black uppercase text-slate-500 block mb-1">Mesa Seleccionada</span>
                      <span className="text-4xl font-black tracking-widest text-white">{mesaEscaneadaInput || "---"}</span>
                    </div>
                    <button type="button" onClick={() => { alert("¿ZXing cargado?: " + (window.ZXing ? "SÍ, TODO BIEN" : "NO, ESTÁ NULL")); alert("¿Cámara activa?: " + (streamRef.current ? "SÍ" : "NO")); }} className="bg-blue-600 text-white text-[10px] p-2 rounded-xl w-full font-bold">⚙️ Probar Lector Tras Bambalinas</button>
                    <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (<button key={n} type="button" onClick={() => mesaEscaneadaInput.length < 2 && setMesaEscaneadaInput(mesaEscaneadaInput + n)} className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 text-xl font-black">{n}</button>))}
                      <button type="button" onClick={() => setMesaEscaneadaInput("")} className="w-14 h-14 rounded-full flex items-center justify-center text-red-500 bg-red-500/10 border border-slate-800"><Trash2 size={18}/></button>
                      <button type="button" onClick={() => mesaEscaneadaInput.length < 2 && setMesaEscaneadaInput(mesaEscaneadaInput + "0")} className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 text-xl font-black">0</button>
                      <button type="button" disabled={!mesaEscaneadaInput} onClick={() => procesarEscaneoMesa(mesaEscaneadaInput)} className={`w-14 h-14 rounded-full flex items-center justify-center ${mesaEscaneadaInput ? 'bg-green-600 text-white' : 'bg-slate-900 text-slate-700'}`}><CheckCircle size={22}/></button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div id="recaptcha-container"></div>
    </>
 );
}

export default App;