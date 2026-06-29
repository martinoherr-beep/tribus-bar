import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { 
 collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, 
 query, where, orderBy, serverTimestamp, writeBatch, increment, setDoc, getDoc, getDocs, deleteField 
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
 Tag, ExternalLink, Lock, Calendar, History,
 LogOut 
} from 'lucide-react';


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
`
// 🗓️ CONFIGURACIÓN DE APERTURA: 0=Domingo, 4=Jueves, 5=Viernes, 6=Sábado
const DIAS_APERTURA_TERRAZA = [0, 4, 5, 6]; 
const LINK_RESERVACIONES_WA = "https://wa.me/521234567890?text=Hola!%20Me%20gustar%C3%ADa%20hacer%20una%20reservaci%C3%B3n%20para%20la%20Terraza%20de%20Tribus%20Bar.";
;

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
 // 💡 NUEVO ESTADO AGREGADO PARA SEPARAR EL INVENTARIO DEL BUSCADOR DE COMANDAS
 const [filtroInventario, setFiltroInventario] = useState(""); 
 const [filtroPisoFisico, setFiltroPisoFisico] = useState("");
 const [mostrarSeleccionPiso, setMostrarSeleccionPiso] = useState(false);
 const [ticketParaReimprimir, setTicketParaReimprimir] = useState(null);
 const [nombreRegistro, setNombreRegistro] = useState('');
 const [usuarioLogueado, setUsuarioLogueado] = useState(null);
 const [verModalAuth, setVerModalAuth] = useState(false);
 const [historialHoy, setHistorialHoy] = useState([]);
 const [pasoAuth, setPasoAuth] = useState('telefono'); // 'telefono' o 'codigo'
 const [codigoOTP, setCodigoOTP] = useState("");
 const [verModalBeneficios, setVerModalBeneficios] = useState(false);
 const [confirmacionResultado, setConfirmacionResult] = useState(null);
 const [password, setPassword] = useState('');
 const [areaStaff, setAreaStaff] = useState('TODOS');
 const [fechaInicioRep, setFechaInicioRep] = useState("");
 const [fechaFinRep, setFechaFinRep] = useState("");
 const [reporteFiltrado, setReporteFiltrado] = useState(null);
 const [esSuperAdmin, setEsSuperAdmin] = useState(false);
 const [esStaff, setEsStaff] = useState(false);
 const [eventoInstalacion, setEventoInstalacion] = useState(null);
 // 🔥 NUEVA BANDERA DE CONTROL: Evita que el limpiador borre las mesas nuevas del QR
  const limpiezaInicialHecha = useRef(false);
 const [verModalEscaner, setVerModalEscaner] = useState(false);
 const html5QrCodeRef = useRef(null);

 // 🔥 CONFIGURACIÓN INTEGRADA: Switch especial para comandos manuales de mesero
 const [esComandaManual, setEsComandaManual] = useState(false);

 // --- LECTOR DE QR NATIVO OPTIMIZADO CON HTML5-QRCODE ---
 const encenderCamaraPWA = () => {
   setVerModalEscaner(true);

   setTimeout(() => {
       const contenedor = document.getElementById("lector-qr-tribu");
       if (!contenedor) return;

       if (window.Html5Qrcode) {
         const html5QrCode = new window.Html5Qrcode("lector-qr-tribu");
         html5QrCodeRef.current = html5QrCode;

         html5QrCode.start(
           { facingMode: "environment" }, 
           {
             fps: 10,
             qrbox: { width: 220, height: 220 }
           },
          (decodedText) => {
             console.log("¡QR Detectado!", decodedText);
             procesarEscaneoMesa(decodedText.trim());
             
             setTimeout(() => {
               apagarCamaraPWA();
               setVerModalEscaner(false);
             }, 100);
           },
           (errorMessage) => { /* Silenciar escaneos vacíos */ }
         ).catch((err) => {
           console.warn("Fallo cámara en vivo, usando modo archivo de respaldo:", err);
         });
       }
   }, 600);
 };

 const apagarCamaraPWA = () => {
   if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
     html5QrCodeRef.current.stop().then(() => {
       html5QrCodeRef.current.clear();
       html5QrCodeRef.current = null;
     }).catch(err => console.log("Error al detener escáner:", err));
   }
 };

 useEffect(() => {
   if (!verModalEscaner) {
     apagarCamaraPWA();
   }
 }, [verModalEscaner]);


 const [errorCamara, setErrorCamara] = useState(false);
 const [mesaEscaneadaInput, setMesaEscaneadaInput] = useState(""); // Teclado de respaldo
 const [esAppInstalada, setEsAppInstalada] = useState(
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
 );

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
    let idMesaLimpia = String(nuevaMesa).trim();
    if (!idMesaLimpia || idMesaLimpia === "") return;

    console.log("🔍 Texto bruto recibido en el procesador:", idMesaLimpia);

    const mapaMesas = {
     "o3pvdzac": "1", "1hs61le7": "2", "6uri5fma": "3", "3l12b2ip": "4",
     "0p0rvh65": "5", "e4jbnq9e": "6", "ht3zdvne": "7", "sv5ee5id": "8",
     "y7q3j49y": "9", "cn97d9e2": "10", "splcfc9c": "11", "oskwo4hm": "12",
     "h9pve9vo": "13", "exl0zpz0": "14", "xirj4tak": "15", "ppotpg8p": "16",
     "ffaad9lu": "17", "qnsuk3nx": "18", "gpb7s9yx": "19", "isbwypqb": "20",
     "qe0wn8oh": "21", "4ewlnlrh": "22", "i4smmljs": "23", "gmyfc6km": "24",
     "jj8j9hli": "25", "choaq8tg": "26", "dwqzrz76": "27", "j5q3kyy7": "28",
     "rsvnbj86": "29", "jp02r7cz": "30", "zh23ozpf": "31", "7yloueec": "32",
     "7bf03w7j": "33", "gtae074f": "34", "3f8vyhom": "35", "awnud16d": "36",
     "ckyjst7f": "37", "vhjzokg9": "38", "xphki5a6": "39", "rhk7lp7a": "40",
     "f47j11md": "41", "i0j9kt4s": "42", "03hn45yd": "43", "r88o1mbk": "44",
     "ru50unaf": "45", "7rqdxilz": "46", "1qtcsszs": "47", "y0yrnzm8": "48",
     "eb0db9e2": "49", "low0c63e": "50"
    };

    if (idMesaLimpia.includes("me-qr.com/")) {
       const partes = idMesaLimpia.split("me-qr.com/");
       idMesaLimpia = partes[partes.length - 1].replace("/", "").trim(); 
    }

    if (mapaMesas[idMesaLimpia]) {
       idMesaLimpia = mapaMesas[idMesaLimpia];
    }

    if (window.history.replaceState) {
       window.history.replaceState(null, '', window.location.pathname);
    }

    const comandaIdGuardada = localStorage.getItem("tribu_comanda_id");
    const comandaExisteEnBarra = pedidosBarra.some(p => p.id === comandaIdGuardada);

    if (comandaIdGuardada && comandaExisteEnBarra) {
       if (String(mesa) === idMesaLimpia) {
           setVerModalEscaner(false);
           return;
       }

       try {
           await updateDoc(doc(db, "pedidos", comandaIdGuardada), {
              solicitudTraslado: idMesaLimpia,
              pideTraslado: true
           });
           
           setVerModalEscaner(false);
           alert(`⏳ Solicitud enviada. La barra está trasladando tu cuenta de la Mesa ${mesa} a la Mesa ${idMesaLimpia}.`);
           return;
       } catch (e) {
           console.error("Error al inyectar traslado:", e);
           alert("Error de traslado.");
           return;
       }
    }

    localStorage.removeItem("tribu_comanda_id");
    localStorage.setItem("tribu_mesa", idMesaLimpia);
    setMesa(idMesaLimpia);
    setVerModalEscaner(false);

    if (consumoAcumulado.length === 0 && carrito.length === 0) {
       alert(`📍 Te has ubicado en la Mesa ${idMesaLimpia} (${obtenerPlanta(idMesaLimpia)})`);
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

        if (planta === "PLANTA BAJA") {
          totalBaja += monto;
        } else if (planta === "TERRAZA") {
          totalTerraza += monto;
        } else {
          totalExterno += monto;
        }
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
    amountTickets: ticketsEnRango 
  });
};

const [mispedidos, setMisPedidos] = useState([]);
const [telefonoUsuarioLogueado, setTelefonoUsuarioLogueado] = useState("");

useEffect(() => {
 if (usuarioLogueado) {
    const q = query(
      collection(db, "pedidos"),
      where("uid", "==", usuarioLogueado.uid) 
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMisPedidos(docs);
    });
    return () => unsub();
 }
}, [usuarioLogueado]);

useEffect(() => {
  const capturarPrompt = (e) => {
    e.preventDefault();
    setEventoInstalacion(e);
  };

  window.addEventListener('beforeinstallprompt', capturarPrompt);
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const verificarModo = (e) => {
    setEsAppInstalada(e.matches);
  };

  mediaQuery.addEventListener('change', verificarModo);

  return () => {
    window.removeEventListener('beforeinstallprompt', capturarPrompt);
    mediaQuery.removeEventListener('change', verificarModo);
  };
}, []);

 const loginClienteFrecuente = async () => {
    if (!telefonoInput || !password) {
      return alert("Por favor, ingresa tu teléfono y contraseña.");
    }

    try {
      const emailFalso = `${telefonoInput}@tribus.com`;
      const userCredential = await signInWithEmailAndPassword(auth, emailFalso, password);
      localStorage.removeItem("tribu_comanda_id"); 
      setUsuarioLogueado(userCredential.user);
      setView('menu');
      alert("¡Qué bueno verte de nuevo en la Tribu!");
    } catch (error) {
      console.error("Error al entrar:", error.code);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert("Teléfono o contraseña incorrectos.");
      } else {
        alert("Error al iniciar sesión: " + error.message);
      }
    }
 };

 const informarPago = async (pedidoId) => {
 sniper:
 try {
   const pedidoRef = doc(db, "pedidos", pedidoId);
   await updateDoc(pedidoRef, {
     pagoInformado: true,
     horaPago: serverTimestamp()
   });
   alert("¡Gracias! En la barra verificaremos tu depósito ahora mismo.");
 } catch (error) {
   console.error("Error al informar pago:", error);
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
     nombre: nombreRegistro,
     telefono: telefonoInput,
     uid: user.uid,
     puntos: 0,
     fechaRegistro: serverTimestamp(),
     ultimaVisita: serverTimestamp()
   });

   localStorage.removeItem("tribu_comanda_id"); 
   setUsuarioLogueado(user);
   setView('menu'); 
   alert(`¡Bienvenido a la Tribu, ${nombreRegistro}!`);
 } catch (error) {
   console.error("Error en el registro:", error.code);
   if (error.code === 'auth/email-already-in-use') {
     alert("Este teléfono ya está registrado. Intenta iniciar sesión.");
   } else {
     alert("Error al registrar: " + error.message);
   }
 }
};

const cerrarSesion = async () => {
 try {
   await signOut(auth); 
   setUsuarioLogueado(null); 
   setView('welcome'); 
   alert("Sesión cerrada. ¡Vuelve pronto a la Tribu!");
 } catch (error) {
   console.error("Error al salir:", error);
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
      
      const correosStaff = ['baja@tribus.com', 'terraza@tribus.com', 'admin@tribus.com'];
      if (correosStaff.includes(usuario.email)) {
          setEsStaff(true); 
      } else {
          setEsStaff(false); 
      }
      
      if (usuario.email === 'baja@tribus.com') {
        setAreaStaff('PLANTA BAJA');
        setEsSuperAdmin(false);
      } else if (usuario.email === 'terraza@tribus.com') {
        setAreaStaff('TERRAZA');
        setEsSuperAdmin(false);
      } else if (usuario.email === 'admin@tribus.com') {
        setAreaStaff('TODOS');
        setEsSuperAdmin(true);  
      }
    } else {
      setUsuarioLogueado(null);
      setEsSuperAdmin(false);
      setEsStaff(false); 
    }
  });
  return () => desubscribir();
}, []);

const enviarCodigoSMS = async () => {
 if (telefonoInput.length !== 10) return alert("Ingresa 10 dígitos");

 if (window.recaptchaVerifier) {
    try {
        window.recaptchaVerifier.clear(); 
        window.recaptchaVerifier = null;
    } catch (e) {
        console.warn("Recaptcha ya no existía");
    }
}
  
 const container = document.getElementById('recaptcha-container');
 if (container) container.innerHTML = ''; 

 try {
   window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
     size: 'invisible',
     'callback': (response) => {
       console.log("reCAPTCHA resuelto");
     }
   });

   const appVerifier = window.recaptchaVerifier;
   const formatoInternacional = `+52${telefonoInput}`;
   
   const confirmation = await signInWithPhoneNumber(auth, formatoInternacional, appVerifier);
   
   setConfirmacionResult(confirmation);
   setPasoAuth('codigo');
   alert("Código enviado correctamente");

 } catch (error) {
   console.error("Error SMS detallado:", error.code, error.message);
   if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
   
   if (error.code === 'auth/invalid-phone-number') alert("Número inválido");
   else if (error.code === 'auth/too-many-requests') alert("Demasiados intentos, espera un poco");
   else alert("Error: " + error.message);
 }
};

const verificarCodigo = async () => {
 if (!confirmacionResultado) {
   alert("La sesión ha expirado. Por favor, solicita un nuevo código.");
   return;
 }

 try {
   const result = await confirmacionResultado.confirm(codigoOTP);
   const user = result.user;

   await setDoc(doc(db, "clientes", user.uid), {
     nombre: nombreRegistro || "Cliente Nuevo",
     telefono: telefonoInput,
     uid: user.uid,
     fechaRegistro: serverTimestamp()
   });

   setUsuarioLogueado(user);
   setVerModalAuth(false);
   alert(`¡Bienvenido a la Tribu, ${nombreRegistro}!`);

 } catch (error) {
   console.error("Error en confirmación:", error.code);
   alert("Error de verificación. Por favor, intenta de nuevo.");
   setConfirmacionResult(null);
 }
};

// 🌟 CABECERA DINÁMICA CORREGIDA (Sin espacios en el nombre)
const plantaActualCabecera = () => {
  if (!mesa) return "EXTERNO";
  const mStr = String(mesa).toUpperCase().trim();
  if (mStr === "T" || (parseInt(mStr, 10) >= 26 && parseInt(mStr, 10) <= 50)) return "TERRAZA";
  return "PLANTA BAJA";
};

const nombreBarDinamico = plantaActualCabecera() === "TERRAZA" ? "TRIBU'S BAR TERRAZA" : "TRIBU'S BAR";

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
    let nuevaMesa = "";

    if (pedido.pideTraslado && pedido.solicitudTraslado) {
      const confirmarTrasladoAuto = window.confirm(
        `🚨 El cliente solicita moverse de la Mesa ${pedido.mesa} a la Mesa ${pedido.solicitudTraslado}.\n\n¿Aceptar y trasladar cuenta ahora mismo?`
      );
      if (!confirmarTrasladoAuto) return;
      nuevaMesa = String(pedido.solicitudTraslado).trim();
    } else {
      nuevaMesa = window.prompt(`Moviendo cuenta de Mesa ${pedido.mesa} (${plantaOrigen}). Ingrese el nuevo número de mesa:`);
      if (!nuevaMesa || nuevaMesa === "" || nuevaMesa === pedido.mesa) return;
    }

    const plantaDestino = obtenerPlanta(nuevaMesa);
    const etiquetaTraslado = `\n--- TRASLADO DE ${plantaOrigen} A ${plantaDestino} ---`;

    try {
      const pedidoRef = doc(db, "pedidos", pedido.id);
      
      await updateDoc(pedidoRef, {
        mesa: String(nuevaMesa),
        detalle: pedido.detalle + etiquetaTraslado,
        pideTraslado: false,                   
        solicitudTraslado: deleteField()       
      });

      alert(`✅ Cuenta trasladada con éxito a la Mesa ${nuevaMesa} (${plantaDestino}).`);
    } catch (e) {
      console.error("Error al mover mesa:", e);
      alert("No se pudo procesar el traslado de mesa.");
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
  const q = query(collection(db, "rockola_pendientes"), where("estado", "==", "pendiente"));

  const unsub = onSnapshot(q, async (snapshot) => {
    for (const cambio of snapshot.docChanges()) {
      if (cambio.type === "added") {
        const dataRockola = cambio.doc.data();
        const mesaRockola = String(dataRockola.mesa);
        const totalCreditos = Number(dataRockola.total) || 0;
        const detalleCreditos = dataRockola.detalle || "Créditos Rockola";
        const rockolaDocId = cambio.doc.id;

        try {
          const qPedido = query(
            collection(db, "pedidos"),
            where("mesa", "==", "pendiente")
          );
          
          const pedidoSnapshot = await getDocs(qPedido); 
          const batch = writeBatch(db);

          if (!pedidoSnapshot.empty) {
            const pedidoDoc = pedidoSnapshot.docs[0];
            const datosPedidoActual = pedidoDoc.data();

            const detalleActualizado = datosPedidoActual.detalle 
              ? `${datosPedidoActual.detalle}\n${detalleCreditos}`
              : detalleCreditos;

            const totalActualizado = (Number(datosPedidoActual.total) || 0) + totalCreditos;

            batch.update(doc(db, "pedidos", pedidoDoc.id), {
              detalle: detalleActualizado,
              total: totalActualizado
            });
            
          } else {
            const nuevoPedidoRef = doc(collection(db, "pedidos"));
            batch.set(nuevoPedidoRef, {
              mesa: mesaRockola,
              detalle: detalleCreditos,
              total: totalCreditos,
              estado: "pendiente",
              fecha: serverTimestamp(),
              archivado: false,
              cliente: "Cliente Rockola"
            });
          }

          const rockolaRef = doc(db, "rockola_pendientes", rockolaDocId);
          batch.delete(rockolaRef);
          await batch.commit();

        } catch (error) {
          console.error("Error crítico:", error);
        }
      }
    }
  });

  return () => unsub();
 }, []);

 useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let mesaId = params.get("mesa");
    
    const mapaMesas = {
      "o3pvdzac": "1", "1hs61le7": "2", "6uri5fma": "3", "3l12b2ip": "4",
      "0p0rvh65": "5", "e4jbnq9e": "6", "ht3zdvne": "7", "sv5ee5id": "8",
      "y7q3j49y": "9", "cn97d9e2": "10", "splcfc9c": "11", "oskwo4hm": "12",
      "h9pve9vo": "13", "exl0zpz0": "14", "xirj4tak": "15", "ppotpg8p": "16",
      "ffaad9lu": "17", "qnsuk3nx": "18", "gpb7s9yx": "19", "isbwypqb": "20",
      "qe0wn8oh": "21", "4ewlnlrh": "22", "i4smmljs": "23", "gmyfc6km": "24",
      "jj8j9hli": "25", "choaq8tg": "26", "dwqzrz76": "27", "j5q3kyy7": "28",
      "rsvnbj86": "29", "jp02r7cz": "30", "zh23ozpf": "31", "7yloueec": "32",
      "7bf03w7j": "33", "gtae074f": "34", "3f8vyhom": "35", "awnud16d": "36",
      "ckyjst7f": "37", "vhjzokg9": "38", "xphki5a6": "39", "rhk7lp7a": "40",
      "f47j11md": "41", "i0j9kt4s": "42", "03hn45yd": "43", "r88o1mbk": "44",
      "ru50unaf": "45", "7rqdxilz": "46", "1qtcsszs": "47", "y0yrnzm8": "48",
      "eb0db9e2": "49", "low0c63e": "50",
    };

    const traducirTextoQR = (texto) => {
      if (!texto) return null;
      let limpio = String(texto).trim();
      
      if (limpio.includes("me-qr.com/")) {
        const partes = limpio.split("me-qr.com/");
        limpio = partes[partes.length - 1].replace("/", "").trim();
      }
      
      return mapaMesas[limpio] ? mapaMesas[limpio] : limpio;
    };

    if (mesaId) {
      mesaId = traducirTextoQR(mesaId);
      localStorage.setItem("tribu_mesa", mesaId);
      localStorage.removeItem("tribu_comanda_id"); 
      
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      const guardada = localStorage.getItem("tribu_mesa");
      mesaId = traducirTextoQR(guardada);
      if (mesaId !== guardada && mesaId) {
        localStorage.setItem("tribu_mesa", mesaId);
      }
    }
    
    if (mesaId && mesaId !== "null" && mesaId !== "undefined") {
      setMesa(mesaId);
    }
    if (params.get("view") === 'barra') setView('barra');
    if (window.location.pathname === '/equipo/barra') {
      setView('login_staff');
    }
    
    onSnapshot(collection(db, "productos"), (snap) => setProductosMenu(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubPedidos = onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pendiente")), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidosBarra(data);
      
      const comandaIdGuardada = localStorage.getItem("tribu_comanda_id");
      let pedidoMesa = null;

  // 🌟 ESCUCHA DE COMANDAS ACTIVAS DESDE FIREBASE
      if (comandaIdGuardada) {
        pedidoMesa = data.find(p => p.id === comandaIdGuardada);
        
        if (mesaId && pedidoMesa && String(pedidoMesa.mesa) !== String(mesaId) && !pedidoMesa.pideTraslado) {
          console.log(`✅ Traslado completado por el staff. Nueva Mesa: ${pedidoMesa.mesa}`);
          localStorage.setItem("tribu_mesa", pedidoMesa.mesa);
          setMesa(pedidoMesa.mesa);
          mesaId = pedidoMesa.mesa;
        }
      } else if (mesaId) {
        pedidoMesa = data.find(p => String(p.mesa) === String(mesaId));
        if (pedidoMesa) {
          localStorage.setItem("tribu_comanda_id", pedidoMesa.id);
        }
      }

      // 🔥 REGLA DE CAJA EN TIEMPO REAL: Si el cliente tenía una comanda activa con consumo 
      // y la barra la cobró, se limpia la pantalla y regresa a EXTERNO de inmediato.
      if (mesaId && !pedidoMesa && consumoAcumulado.length > 0) {
        console.log("♻️ Cuenta cobrada en barra. Restableciendo a EXTERNO.");
        localStorage.removeItem("tribu_comanda_id");
        localStorage.removeItem("tribu_mesa");
        setMesa(null);
        setConsumoAcumulado([]);
        setMesaValidada(false);
        setPinCorrectoMesa(null);
        return;
      }

      // 🔥 LIMPIADOR DE INICIO (CORRE SOLO UNA VEZ AL CARGAR): 
      // Si abren la app con una mesa vieja en memoria que ya no tiene cuenta activa en barra, 
      // la borramos para que inicien como EXTERNO limpios, pero NO afecta a los QR nuevos escaneados.
      if (mesaId && !pedidoMesa && !limpiezaInicialHecha.current) {
        console.log("♻️ Limpieza de arranque: Mesa vieja sin comanda detectada. Reseteando a EXTERNO.");
        localStorage.removeItem("tribu_comanda_id");
        localStorage.removeItem("tribu_mesa");
        setMesa(null);
        setConsumoAcumulado([]);
        setMesaValidada(false);
        setPinCorrectoMesa(null);
        limpiezaInicialHecha.current = true; // Marcamos que la revisión inicial ya se ejecutó
        return;
      }

      // Si pasa la revisión inicial sin disparar el limpiador, desactivamos la bandera para proteger los QR futuros
      if (!limpiezaInicialHecha.current) {
        limpiezaInicialHecha.current = true;
      }

      // ─── TU PROCESADOR DE TEXTO ORIGINAL (MANTENIDO SEGURO) ───
      if (pedidoMesa && pedidoMesa.pinMesa) {
          setPinCorrectoMesa(pedidoMesa.pinMesa);
          const items = pedidoMesa.detalle.split('\n').map(linea => {
              const parts = linea.match(/(\d+)x (.*) \(\$(\d+)\)/);
              if (parts) return { cantidad: parseInt(parts[1]), nombre: parts[2].trim(), precio: parseInt(parts[3]) / parseInt(parts[1]) };
              return null;
          }).filter(i => i !== null);
          setConsumoAcumulado(items);
      } else if (pedidoMesa) { 
          setMesaValidada(true); 
          const items = pedidoMesa.detalle.split('\n').map(linea => {
              const parts = linea.match(/(\d+)x (.*) \(\$(\d+)\)/);
              if (parts) return { cantidad: parseInt(parts[1]), nombre: parts[2].trim(), precio: parseInt(parts[3]) / parseInt(parts[1]) };
              return null;
          }).filter(i => i !== null);
          setConsumoAcumulado(items);
          setPinCorrectoMesa(null);
      } else {
          setMesaValidada(true); 
          setConsumoAcumulado([]); 
          setPinCorrectoMesa(null);
      }
    });

   onSnapshot(query(collection(db, "historial_tickets"), orderBy("fecha", "desc")), (snapshot) => setHistorialCerrado(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    onSnapshot(query(collection(db, "recordatorios"), orderBy("fecha", "asc")), (snap) => setRecordatorios(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => unsubPedidos();
  }, [mesa, usuarioLogueado]);

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
   else setCarrito([...carrito, { ...item, precio: p, carrot: 1, cantidad: 1 }]);
 };

 const restarDelCarrito = (id) => {
   const ex = carrito.find(x => x.id === id);
   if (!ex) return;
   if (ex.cantidad === 1) setCarrito(carrito.filter(x => x.id !== id)); 
   else setCarrito(carrito.map(x => x.id === id ? { ...ex, cantidad: ex.cantidad - 1 } : x));
 };

 const intentarEnviar = () => {
 if (carrito.length === 0) return;
 if (mesa || usuarioLogueado) {
     procesarEnvio(mesa || null);
 } else {
     setVerModalTelefono(true);
 }
};

const obtenerAlertaCliente = async (telefonoCliente, uidCliente) => {
     if (!uidCliente || !telefonoCliente || telefonoCliente === "N/A") {
        return "morada"; 
     }

     try {
        const q = query(collection(db, "historial_tickets"), where("uid", "==", uidCliente));
        const querySnapshot = await getDocs(q);
        const totalPedidos = querySnapshot.size;

        if (totalPedidos >= 5) return "verde"; 
        else if (totalPedidos >= 2) return "amarilla"; 
        else return "morada";
     } catch (error) {
        console.error("Error al clasificas cliente registrado:", error);
        return "morada";
     }
};

const procesarEnvio = async (idDestino) => {
 const batch = writeBatch(db);
 const telFinal = telefonoUsuarioLogueado || usuarioLogueado?.phoneNumber || telefonoInput || "S/N";
 const idFinal = idDestino ? idDestino : `TEL:${telFinal}`;
 const detalleNuevo = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n');
  
 try {
   const uidFinal = usuarioLogueado?.uid || null;
   
   let colorAlerta = "morada";
   if (uidFinal) {
      colorAlerta = await obtenerAlertaCliente(telFinal, uidFinal);
   }

   const existente = pedidosBarra.find(p => String(p.mesa) === String(idFinal));
   let idComandaActual = ""; 
   
   if (existente) {
     idComandaActual = existente.id; 
     batch.update(doc(db, "pedidos", existente.id), { 
       detalle: existente.detalle + "\n" + detalleNuevo, 
       total: Number(existente.total) + Number(totalCarrito), 
       fecha: serverTimestamp(),
       cliente: nombreUsuarioLogueado || existente.cliente || (esComandaManual ? "Comanda Manual" : "Cliente"),
       uid: uidFinal || existente.uid || null,
       alertaPrioridad: colorAlerta 
     });
   } else {
     const nuevoPedidoRef = doc(collection(db, "pedidos"));
     idComandaActual = nuevoPedidoRef.id; 
     
     const datosNuevoPedido = { 
       mesa: String(idFinal), 
       detalle: detalleNuevo, 
       total: Number(totalCarrito), 
       estado: "pendiente", 
       fecha: serverTimestamp(), 
       archivado: false,
       cliente: nombreUsuarioLogueado || (esComandaManual ? "Comanda Manual" : "Cliente"),
       telefono: telFinal,
       uid: uidFinal,
       alertaPrioridad: colorAlerta 
     };

     if (idDestino && !String(idDestino).startsWith("TEL:")) {
        datosNuevoPedido.pinMesa = Math.floor(1000 + Math.random() * 9000);
     }
     batch.set(nuevoPedidoRef, datosNuevoPedido);
   }

   localStorage.setItem("tribu_comanda_id", idComandaActual);

   await batch.commit();

   if (esComandaManual) {
      setView('barra');
      setTabBarra('comandas');
      setCarrito([]); 
      setVerCarrito(false); 
      alert("¡Artículos añadidos a la comanda correctamente!");
   } else {
      setView('success'); 
      setCarrito([]); 
      setVerCarrito(false); 
      setVerModalTelefono(false);
   }
 } catch (e) { 
   console.error("Error crítico en Firebase:", e);
   alert("Error al procesar el pedido.");
 }
};

const cobrarCuenta = async (p) => {
   const batch = writeBatch(db);
   
   // 1. Creamos la referencia del ticket en el historial como ya lo hacías
   const ticketRef = doc(collection(db, "historial_tickets"));
   batch.set(ticketRef, { 
      mesa: p.mesa, 
      detalle: p.detalle, 
      total: Number(p.total), 
      fecha: serverTimestamp(), 
      archivado: false,
      cliente: p.cliente || "Cliente General",
      telefono: p.telefono || "N/A",
      uid: p.uid || null 
   });

   // 2. 📊 ANALIZADOR DE VENTAS DE BÁSCULA: Escanea el ticket buscando Vasos o Litros vendidos
   const lineas = p.detalle.split('\n');
   lineas.forEach(linea => {
     // Buscamos patrones como: "2x Trago Ejemplo (VASO)" o "1x Trago Ejemplo (LITRO)"
     const matchCantidad = linea.match(/^(\d+)x/);
     if (matchCantidad) {
       const cantidadVendida = parseInt(matchCantidad[1], 10);
       const textoLinea = linea.toUpperCase();
       
       // Determinamos si es un vaso o un litro analizando la subcategoría/formato en el texto
       let campoFirebase = null;
       if (textoLinea.includes("(VASO)") || textoLinea.includes("VASO")) {
         campoFirebase = "totalVasosVendidos";
       } else if (textoLinea.includes("(LITRO)") || textoLinea.includes("LITRO")) {
         campoFirebase = "totalLitrosVendidos";
       }
       
       if (campoFirebase) {
         // Buscamos el producto base en tus productos para saber a cuál sumarle la venta
         const nombreProducto = linea.replace(/^\d+x\s+/, "").split("(")[0].trim().toUpperCase();
         const prodOriginal = productosMenu.find(prod => prod.nombre.toUpperCase().trim() === nombreProducto);
         
         if (prodOriginal) {
           // Le sumamos las cantidades vendidas directamente al contador histórico del producto
           batch.update(doc(db, "productos", prodOriginal.id), {
             [campoFirebase]: increment(cantidadVendida)
           });
         }
       }
     }
   });

   // 3. Borramos la comanda activa de la barra
   batch.delete(doc(db, "pedidos", p.id));

   // 4. Ejecutamos todos los cambios juntos de forma segura
   await batch.commit();

   localStorage.removeItem("tribu_comanda_id");
   localStorage.removeItem("tribu_mesa");
   setMesa(null);
   setConsumoAcumulado([]);
   setMesaValidada(false);

   setTicketParaReimprimir(p);
};

useEffect(() => {
 const q = query(collection(db, "historial_tickets"), where("archivado", "==", false));
 const unsub = onSnapshot(q, (snapshot) => {
   const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
   setHistorialHoy(docs);
 });
 return () => unsub();
}, []);

const ingresosDelDia = historialHoy.reduce((acc, t) => acc + (Number(t.total) || 0), 0);

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

 return (
   <>
     {/* --- PWA: OBLIGAR A AGREGAR A INICIO --- */}
     {!esAppInstalada && view !== 'barra' && view !== 'login_staff' && !esStaff && !esComandaManual && (
       <div className="fixed inset-0 z-[300] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none">
         <div className="max-w-sm space-y-6 animate-fade-in">
           <div className="w-20 h-20 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-orange-600/20 transform rotate-12">
             <span className="text-3xl font-black italic tracking-tighter text-black -rotate-12">TB</span>
           </div>
           <div className="space-y-2">
             <h2 className="text-2xl font-black uppercase tracking-tight italic">🔒 Acceso Secure al Menú</h2>
             <p className="text-xs text-slate-400 font-medium px-4 leading-relaxed">
               Para garantizar que tus pedidos se envíen de forma correcta a la barra de tu planta, es necesario agregar la app a tu pantalla de inicio.
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
  
           <button 
             onClick={() => setView('login_staff')} 
             className="mt-3 text-[10px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-widest underline transition-colors"
           >
             Ingresar como Staff de Barra
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
               <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase ${p.state === 'pendiente' ? 'bg-amber-500/10 text-amber-500' : p.state === 'preparando' ? 'bg-sky-500/10 text-sky-500' : 'bg-green-500/10 text-green-500'}`}>{p.state}</span>
             </div>
             <p className="text-[11px] text-gray-400 whitespace-pre-line mb-3">{p.detalle}</p>
             <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
               <span className="text-xs font-bold text-gray-500 italic">Total</span>
               <span className="text-lg font-black text-white">${p.total}</span>
               {p.mesa.includes('TEL') && p.state !== 'entregado' && (
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
         const email = e.target.email.value;
         const password = e.target.password.value;
         try {
           const credenciales = await signInWithEmailAndPassword(auth, email, password);
           if (credenciales.user.email === 'baja@tribus.com') setAreaStaff('PLANTA BAJA');
           else if (credenciales.user.email === 'terraza@tribus.com') setAreaStaff('TERRAZA');
           else setAreaStaff('TODOS');
           setView('barra');
         } catch (error) {
           alert("Acceso denegado: Verifica el correo o la contraseña del staff.");
         }
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

{mesa && !mesaValidada && pinCorrectoMesa && !esComandaManual && (
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
     
     {/* ─── CABECERA DE LA BARRA ─── */}
     <header className="flex flex-col mb-6 border-b border-slate-800 pb-6 gap-4 no-print">
        <div className="flex justify-between items-center w-full flex-wrap gap-2">
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-black text-orange-600 italic uppercase tracking-tighter leading-none">
              TRIBU'S BARRA
            </h1>
            <span className="text-[10px] font-black tracking-widest mt-1 uppercase text-slate-400">
              ZONA: <span className={areaStaff === 'TERRAZA' ? 'text-sky-400' : areaStaff === 'PLANTA BAJA' ? 'text-orange-500' : 'text-green-500'}>
                {areaStaff === 'TODOS' ? 'Control General (Todo)' : areaStaff}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {usuarioLogueado?.email === 'admin@tribus.com' && (
              <select 
                value={areaStaff} 
                onChange={(e) => setAreaStaff(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-[10px] font-black uppercase rounded-lg px-2 py-1 text-slate-300 outline-none cursor-pointer"
              >
                <option value="TODOS">Ver Todo</option>
                <option value="PLANTA BAJA">Planta Baja</option>
                <option value="TERRAZA">Terraza</option>
              </select>
            )}

            <div className="bg-slate-900 px-3 py-1 rounded-xl text-green-500 text-[10px] font-bold animate-pulse uppercase tracking-widest border border-green-500/10 whitespace-nowrap">
              ● En Vivo
            </div>

            <button 
              onClick={async () => {
                try {
                  await signOut(auth);    
                  setEsSuperAdmin(false); 
                  setUsuarioLogueado(null); 
                  setView('welcome');     
                  alert("Sesión de administración cerrada con seguridad.");
                } catch (error) {
                  console.error("Error al salir de la barra:", error);
                  setView('welcome');
                  setEsSuperAdmin(false);
                }
              }} 
              className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1 font-black text-[9px] uppercase tracking-wider"
              title="Salir de Barra"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* MENÚ DE PESTAÑAS */}
        <div className="w-full overflow-x-auto no-scrollbar flex justify-between items-center gap-4 flex-wrap border-t border-slate-900 pt-4">
          <div className="flex gap-3">
            <button 
              onClick={() => setTabBarra('comandas')} 
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${tabBarra === 'comandas' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}
            >
              <LayoutDashboard size={14}/> Comandas
            </button>
            <button 
              onClick={() => setTabBarra('mesas_fisicas')} 
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${tabBarra === 'mesas_fisicas' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}
            >
              <UtensilsCrossed size={14}/> Control Mesas
            </button>
            <button 
              onClick={() => setTabBarra('inventario')} 
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${tabBarra === 'inventario' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}
            >
              <Boxes size={14}/> Inventario
            </button>
            <button 
              onClick={() => setTabBarra('eventos')} 
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all ${tabBarra === 'eventos' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}
            >
              <Calendar size={14}/> Eventos
            </button>
          </div>

          <div className="flex gap-2">
            {tabBarra === 'inventario' && (
              <button 
                onClick={() => setVerModalNuevoProd(true)} 
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-lg"
              >
                <PlusCircle size={14}/> Producto
              </button>
            )}
            {tabBarra === 'eventos' && (
              <button 
                onClick={() => setVerModalNuevoEvento(true)} 
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all shadow-lg"
              >
                <PlusCircle size={14}/> Agendar
              </button>
            )}
          </div>
        </div>
     </header>

     {/* ─── ESTRUCTURA DE DOS COLUMNAS REORDENADA ─── */}
     <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
        
        {/* PANEL IZQUIERDO: CONTENIDOS DINÁMICOS */}
        <div className="flex-1 w-full">
          
          {/* TAB: COMANDAS */}
          {tabBarra === 'comandas' && (
            <div className="no-print">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pedidosBarra.filter(p => String(p.mesa).toLowerCase().includes(filtroMesa.toLowerCase())).filter(p => {
                  if (areaStaff === 'TODOS') return true;
                  return obtenerPlanta(p.mesa) === areaStaff; 
                }).map(p => {
                  const esExterno = String(p.mesa).startsWith("TEL:");
                  const numTel = esExterno ? p.mesa.replace("TEL:", "") : "";
                  const mensajeWA = `Hola! Te escribimos de Tribu's Bar. Tu pedido está listo.\n\n*Total a pagar: $${p.total}*\n\n*Detalle del pedido:*\n${p.detalle}\n\n${DATOS_PAGO}`;
                  
                  const colorCintillo = 
                  p.alertaPrioridad === 'verde' ? 'bg-emerald-500' : 
                  p.alertaPrioridad === 'amarilla' ? 'bg-amber-500' : 
                  p.alertaPrioridad === 'morada' ? 'bg-purple-500' : 
                  (esExterno ? 'bg-blue-600' : 'bg-purple-500');

                  return (
                    <div key={p.id} className="bg-[#0c111a] border border-slate-800 p-3.5 rounded-xl relative shadow-lg flex flex-col justify-between group transition-all text-left">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${colorCintillo}`}></div>
                      
                      {p.pagoInformado && (
                        <div className="bg-blue-600 text-white text-[9px] font-black p-2 rounded-lg mb-2.5 flex items-center justify-center gap-1.5 animate-pulse shadow-md border border-blue-400/20">
                          <CheckCircle size={12} /> PAGO INFORMADO - VERIFICAR CAJA
                        </div>
                      )}
                      {p.pideTraslado && (
                        <div className="bg-red-600 text-white text-[9px] font-black p-2 rounded-lg mb-2.5 flex flex-col items-center justify-center gap-1 animate-pulse shadow-md border border-red-400/20 text-center uppercase">
                          <span>⚠️ CLIENTE SOLICITA TRASLADO</span>
                          <span className="text-xs font-black bg-black/40 px-2 py-0.5 rounded mt-0.5">MOVER A MESA {p.solicitudTraslado}</span>
                        </div>
                      )}
                      <div>
                        {p.alertaPrioridad && (
                          <div className="mb-2">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                              p.alertaPrioridad === 'verde' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              p.alertaPrioridad === 'amarilla' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}>
                              {p.alertaPrioridad === 'verde' ? '👑 Cliente VIP' :
                               p.alertaPrioridad === 'amarilla' ? '🍺 Regular' :
                               '⚡ Esporádico'}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-start">
                          <div className="flex flex-col leading-tight">
                            <h3 className="text-lg font-black italic uppercase tracking-tight text-white">
                              {esExterno ? `📦 ${numTel}` : `MESA ${p.mesa}`}
                            </h3>
                            {p.cliente && (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Atendiendo a: <span className="text-orange-500">{p.cliente}</span>
                              </span>
                            )}
                            <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-slate-400">
                              ZONA: <span className={obtenerPlanta(p.mesa) === 'TERRAZA' ? 'text-sky-400' : 'text-orange-400'}>
                                {obtenerPlanta(p.mesa)}
                              </span>
                            </span>
                          </div>
                          
                          <div className="flex gap-1.5">
                            <button onClick={() => moverMesa(p)} className="p-1 text-slate-500 hover:text-sky-400 transition-colors" title="Mover Mesa">
                              <ExternalLink size={15}/>
                            </button>
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
                            }} className="p-1 text-slate-700 hover:text-red-500 transition-colors">
                              <Trash2 size={15}/>
                            </button>
                          </div>
                        </div>

                        {p.pinMesa && (
                          <div className="bg-orange-600/5 border border-orange-600/10 rounded-md p-1.5 mt-2 flex justify-between items-center">
                            <span className="text-[8px] font-black uppercase text-orange-500 tracking-wider">PIN SEGURIDAD:</span>
                            <span className="text-sm font-black text-white tracking-widest">{p.pinMesa}</span>
                          </div>
                        )}

                        <div className="mt-3 space-y-1 max-h-[150px] overflow-y-auto no-scrollbar">
                          {p.detalle.split('\n').map((linea, idx) => {
                            const esProducto = /^\d+x/.test(linea.trim());
                            return (
                              <div key={idx} className="group/item flex justify-between items-center bg-black/20 p-1.5 rounded-md border border-white/5">
                                <span className={`text-sm tracking-tight leading-none ${!esProducto ? 'text-orange-500 font-bold text-[10px]' : 'text-slate-300'}`}>
                                  {linea}
                                </span>
                                {esProducto && (
                                  <button onClick={() => eliminarArticuloComanda(p, idx)} className="opacity-0 group-hover/item:opacity-100 p-0.5 text-red-500/50 hover:text-red-500 transition-all">
                                    <X size={12}/>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {esExterno && (
                          <button onClick={() => window.open(`https://wa.me/${numTel}?text=${encodeURIComponent(mensajeWA)}`, '_blank')} className="flex items-center justify-center gap-1.5 bg-green-600/10 border border-green-600/20 text-green-500 w-full py-2 rounded-lg font-black uppercase text-[10px] mt-2.5 hover:bg-green-600 hover:text-white transition-all">
                            <Phone size={12}/> Enviar Datos Bancarios
                          </button>
                        )}
                      </div>
                      
                      <button onClick={() => cobrarCuenta(p)} className="bg-orange-600 w-full py-2.5 rounded-xl font-black text-sm mt-4 active:scale-95 uppercase tracking-tight shadow-md transition-all">
                        Cobrar ${p.total}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {tabBarra === 'mesas_fisicas' && (
            <div className="no-print w-full space-y-4">
              <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-orange-500 font-black italic tracking-widest uppercase text-xs mb-1">
                      🗺️ Tablero de Control Físico
                    </h2>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">
                      Toca una mesa libre para abrir comanda o una ocupada para añadir artículos
                    </p>
                  </div>

                  <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                    {[
                      { id: "TODOS", label: "Ver Todo (1-50)" },
                      { id: "BAJA", label: "Planta Baja (1-25)" },
                      { id: "TERRAZA", label: "Terraza (26-50)" }
                    ].map(piso => (
                      <button
                        key={piso.id}
                        type="button"
                        onClick={() => setFiltroPisoFisico(piso.id === "TODOS" ? "" : piso.id)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${
                          (filtroPisoFisico === piso.id || (filtroPisoFisico === "" && piso.id === "TODOS"))
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white bg-transparent'
                        }`}
                      >
                        {piso.label}
                      </button>
                    ))}
                  </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7 gap-2.5">
                  {Array.from({ length: 50 }, (_, i) => i + 1)
                   .filter(num => {
                     if (filtroPisoFisico === "BAJA") return num >= 1 && num <= 25;
                     if (filtroPisoFisico === "TERRAZA") return num >= 26 && num <= 50;
                     return true;
                   })
                   .map(num => {
                    const numMesa = String(num);
                    const comandaActiva = pedidosBarra.find(p => String(p.mesa) === numMesa);
                    
                    return (
                       <button
                          key={numMesa}
                          type="button"
                          onClick={() => {
                             if (comandaActiva) {
                                localStorage.setItem("tribu_comanda_id", comandaActiva.id);
                                setMesa(numMesa);
                                setMesaValidada(true);
                                setEsComandaManual(true);
                                setView('menu');
                             } else {
                                localStorage.removeItem("tribu_comanda_id");
                                setMesa(numMesa);
                                setMesaValidada(true);
                                setEsComandaManual(true);
                                setView('menu');
                             }
                          }}
                          className={`p-3.5 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 ${
                              comandaActiva 
                               ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-md' 
                               : 'bg-[#0c111a] border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                       >
                          <span className="text-base font-black tracking-tighter leading-none text-white">M-{numMesa}</span>
                          <span className="text-[7px] font-black uppercase mt-1 tracking-widest block text-center truncate w-full">
                             {comandaActiva ? `$${comandaActiva.total}` : 'Libre'}
                          </span>
                       </button>
                    );
                   })}
              </div>
            </div>
          )}
{/* TAB: INVENTARIO */}
          {tabBarra === 'inventario' && (
            <div className="no-print space-y-6 animate-fade-in font-sans">
              
              <div className="flex gap-2 overflow-x-auto no-scrollbar bg-[#0c111a] p-2 rounded-2xl border border-slate-800">
                {["TODOS", "CERVEZA", "BOTELLAS", "BEBIDAS PREPARADAS", "SNACKS", "COMIDAS"].map(filtroInv => (
                  <button 
                    key={filtroInv}
                    onClick={() => setFiltroInventario(filtroInv === "TODOS" ? "" : filtroInv)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex-shrink-0 ${
                      (filtroInventario === filtroInv || (filtroInv === "TODOS" && filtroInventario === ""))
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {filtroInv}
                  </button>
                ))}
              </div>

              {(filtroInventario === "" || filtroInventario === "BEBIDAS PREPARADAS") && (
                <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
                    <div>
                      <h2 className="text-sky-400 font-black italic tracking-widest uppercase text-xs flex items-center gap-2">
                        <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div> 🍾 BÁSCULA: TRAGOS Y BEBIDAS EN USO
                      </h2>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Control de peso milimétrico para bebidas preparadas</p>
                    </div>
                    
                   {/* ─── BUSCA ESTE BOTÓN EXACTO EN TU INVENTARIO Y REEMPLÁZALO COMPLETITO ─── */}
<button 
  type="button"
  onClick={() => {
    const botellasCerradas = productosMenu.filter(p => p.categoria?.toLowerCase().trim() === "botellas" && p.stock > 0);
    if(botellasCerradas.length === 0) {
      alert("No hay cajas de botellas cerradas con stock disponible para descorchar.");
      return;
    }
    
    // 1. Armamos la lista de botellas para el prompt
    const listaTexto = botellasCerradas.map((b, idx) => `${idx + 1}. ${b.nombre} (${b.ubicacion} - Quedan: ${b.stock} pz)`).join("\n");
    
    // 2. Abrimos la ventana. El cursor se posiciona solo. El barman puede disparar el lector aquí directo.
    const entradaUsuario = window.prompt(`🍾 DESCORCHE DE BOTELLAS\n\nOpción 1: Escribe el número de la opción.\nOpción 2: Deja el cursor aquí y dispara el LECTOR FIJO.\n\n${listaTexto}`);
    
   // ... dentro del onClick de Descorchar para Barra
    if (entradaUsuario) {
      // Forzamos la limpieza absoluta eliminando saltos de línea (\n, \r) que meten los lectores físicos
      const valorLimpio = entradaUsuario.replace(/[\n\r]/g, "").trim();
      let botellaElegida = null;

      // 🌟 REGLA SEGURA: Si mide más de 2 caracteres, es un código QR/Marbete del Lector Fijo
      if (valorLimpio.length > 2) {
        botellaElegida = botellasCerradas.find(b => String(b.codigoQR).trim() === valorLimpio);
        
        if (!botellaElegida) {
          alert(`El código leído [${valorLimpio}] no coincide con ninguna botella cerrada en stock.`);
          return;
        }
      } else {
        // Si ingresaron 1 o 2 dígitos, es una opción numérica del menú manual
        const indice = Number(valorLimpio);
        if (!isNaN(indice) && indice <= botellasCerradas.length && indice > 0) {
          botellaElegida = botellasCerradas[indice - 1];
        } else {
          alert("Número de opción inválido.");
          return;
        }
      }

      // 3. Flujo normal de asignación de área (Se queda igual)
      const pisoDestino = window.prompt(`Botella identificada: ${botellaElegida.nombre}\n¿En qué barra se va a abrir?\n1. PLANTA BAJA\n2. TERRAZA`, "1");
      if (!pisoDestino) return;
      const ubicacionFinal = pisoDestino === "2" ? "TERRAZA" : "PLANTA BAJA";

      const tragoRelacionado = productosMenu.find(p => p.categoria?.toLowerCase().trim() === "bebidas preparadas" && p.botellaOriginalId === botellaElegida.id);

      const batch = writeBatch(db);
      batch.update(doc(db, "productos", botellaElegida.id), { stock: increment(-1) });
      
      if (tragoRelacion0ado) {
        batch.update(doc(db, "productos", tragoRelacionado.id), { 
          pesoActualGramos: Number(botellaElegida.pesoBotellaLleno || 1200),
          ubicacion: ubicacionFinal
        });
      }
      
      batch.commit().then(() => alert(`¡Listo! Descontada 1 unidad de ${botellaElegida.nombre} y enviada a la báscula de ${ubicacionFinal}.`));
    }
  }}
  className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
>
  🍾 Descorchar para Barra
</button>
                  </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {productosMenu.filter(p => p.categoria?.toLowerCase().trim() === "bebidas preparadas" && p.esInsumoPeso).map(trago => {
    // ─── CÁLCULO DE STOCK CONSIDERANDO LA MERMA PERMITIDA ───
    const gramosLiquidosTotales = Math.max(0, (trago.pesoActualGramos || 0) - (trago.pesoBotellaVacio || 0));
    const mermaConfigurada = Number(trago.mermaPermitidaGramos || 0);

    // Restamos la merma para obtener el líquido neto efectivo que se puede vender
    const gramosLiquidosActuales = Math.max(0, gramosLiquidosTotales - mermaConfigurada);

    const vasosDisponibles = trago.gramosPorVaso > 0 ? Math.floor(gramosLiquidosActuales / trago.gramosPorVaso) : 0;
    const litrosDisponibles = trago.gramosPorLitro > 0 ? Math.floor(gramosLiquidosActuales / trago.gramosPorLitro) : 0;
    
    return (
      <div key={trago.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between hover:border-sky-500/30 transition-all">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h4 className="font-black text-white uppercase text-sm">{trago.nombre}</h4>
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wider mt-0.5"> Barra: {trago.ubicacion} | Vaso: {trago.gramosPorVaso}g - Litro: {trago.gramosPorLitro}g</p>
          </div>
          <button type="button" onClick={async () => { if(window.confirm(`¿Eliminar trago preparado ${trago.nombre}?`)) await deleteDoc(doc(db, "productos", trago.id)); }} className="text-slate-700 hover:text-red-500 p-1 flex-shrink-0 transition-colors">
            <Trash2 size={14}/>
          </button>
        </div>

        {/* ─── 1. SECCIÓN DE CONTADORES CON ALERTAS INTEGRADAS ─── */}
        <div className="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-center my-2">
          <div>
            <p className="text-[7px] font-black text-slate-500 uppercase">Báscula</p>
            <p className="text-xs font-black text-white">{trago.pesoActualGramos || 0}g</p>
          </div>
          
          {/* Alerta roja si quedan 5 vasos o menos */}
          <div className={`p-1 rounded-lg transition-all ${vasosDisponibles <= 5 ? 'bg-red-500/10 border border-red-500/30 animate-pulse' : ''}`}>
            <p className={`text-[7px] font-black uppercase ${vasosDisponibles <= 5 ? 'text-red-500' : 'text-orange-500'}`}>
              {vasosDisponibles <= 5 ? '⚠️ Vasos' : 'Vasos'}
            </p>
            <p className={`text-xs font-black ${vasosDisponibles <= 5 ? 'text-red-400 text-sm' : 'text-orange-400'}`}>
              {vasosDisponibles} u.
            </p>
          </div>
          
          {/* Alerta roja si quedan 3 litros o menos */}
          <div className={`p-1 rounded-lg transition-all ${litrosDisponibles <= 3 ? 'bg-red-500/10 border border-red-500/30 animate-pulse' : ''}`}>
            <p className={`text-[7px] font-black uppercase ${litrosDisponibles <= 3 ? 'text-red-500' : 'text-teal-500'}`}>
              {litrosDisponibles <= 3 ? '⚠️ Litros' : 'Litros'}
            </p>
            <p className={`text-xs font-black ${litrosDisponibles <= 3 ? 'text-red-400 text-sm' : 'text-teal-400'}`}>
              {litrosDisponibles} u.
            </p>
          </div>
        </div>

        {/* Letrero rápido de aviso si el stock es crítico */}
        {(vasosDisponibles <= 5 || litrosDisponibles <= 3) && (
          <p className="text-[9px] text-red-500 font-black uppercase tracking-wider text-center bg-red-950/30 py-1 rounded-md border border-red-900/20 mb-2">
            🚨 ¡Stock Crítico! Preparar descorche
          </p>
        )}

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-800 mt-1">
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-slate-400 font-bold uppercase">
              Neto Físico: <span className="text-white font-black">{gramosLiquidosTotales}g</span>
            </span>
            {/* 📉 Muestra la merma autorizada si se configuró una */}
            {mermaConfigurada > 0 && (
              <span className="text-[8px] text-red-400 font-medium uppercase tracking-tight">
                📉 Merma Tol: -{mermaConfigurada}g
              </span>
            )}
          </div>
          
          {/* ─── 2. REPORTE HISTÓRICO DE VASOS Y LITROS VENDIDOS ─── */}
          <div className="text-right text-[8px] font-black uppercase text-slate-500 tracking-tight">
            <span>Vendidos: </span>
            <span className="text-orange-400">{trago.totalVasosVendidos || 0} V</span>
            <span className="text-slate-600"> | </span>
            <span className="text-teal-400">{trago.totalLitrosVendidos || 0} L</span>
          </div>

          <div className="flex gap-1.5">
            {/* 🌟 BOTÓN 1: Ajustar la Merma Permitida */}
            <button 
              type="button"
              onClick={() => {
                const merma = window.prompt(`📉 CONFIGURAR MERMA - ${trago.nombre}\n\nIngresa los gramos de tolerancia por merma (se restarán del cálculo de vasos y litros):`, trago.mermaPermitidaGramos || "0");
                if (merma !== null && merma !== "") {
                  updateDoc(doc(db, "productos", trago.id), { mermaPermitidaGramos: Number(merma) });
                }
              }}
              className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all"
            >
              📉 Merma
            </button>

            {/* ⚖️ BOTÓN 2: Pesar Botella */}
            <button 
              type="button"
              onClick={() => {
                const nuevoPeso = window.prompt(`⚖️ PESAR BOTELLA - ${trago.nombre}\n\nIngresa el peso actual de la báscula en gramos:`, trago.pesoActualGramos);
                if (nuevoPeso !== null && nuevoPeso !== "") {
                  updateDoc(doc(db, "productos", trago.id), { pesoActualGramos: Number(nuevoPeso) });
                }
              }}
              className="bg-sky-600/10 hover:bg-sky-600 text-sky-400 hover:text-white px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all"
            >
              ⚖️ Peso
            </button>
          </div>
        </div>
      </div>
    );
  })}
</div>
                </div>
              )}

              {(filtroInventario === "" || filtroInventario === "SNACKS" || filtroInventario === "COMIDAS") && (
                <div>
                  <h2 className="text-amber-500 font-black italic tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div> 🍳 DESPACHO DE COCINA (SNACKS & PLATILLOS)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {productosMenu.filter(p => ["snacks", "comidas"].includes(p.categoria?.toLowerCase().trim())).map(prod => (
                      <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 truncate">
                          <img src={prod.imagen} className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-800 flex-shrink-0" alt=""/>
                          <div className="truncate">
                            <h4 className="font-black text-white uppercase tracking-tight text-sm truncate leading-tight">{prod.nombre}</h4>
                            <span className="text-[7px] font-black bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded uppercase border border-orange-500/10 mt-1 inline-block">
                              {prod.subcategoria || 'INDIVIDUAL'} | {prod.departamento || 'COCINA'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500">M: <span className="text-white">${prod.precioMesa}</span></p>
                            <p className="text-[10px] font-black text-slate-500">D: <span className="text-white">${prod.precioDomicilio}</span></p>
                          </div>
                          <button type="button" onClick={() => { const ex = window.prompt("Actualizar Stock:", prod.stock); if(ex) updateDoc(doc(db, "productos", prod.id), { stock: Number(ex) }); }} className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg font-black text-sm text-orange-500 hover:border-orange-600 transition-colors">
                            {prod.stock}
                          </button>
                          <button type="button" onClick={async () => { if(window.confirm(`¿Eliminar ${prod.nombre}?`)) await deleteDoc(doc(db, "productos", prod.id)); }} className="text-slate-700 hover:text-red-500 p-1 transition-colors">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(filtroInventario === "" || filtroInventario === "CERVEZA" || filtroInventario === "BOTELLAS") && (
                <div className="pt-2">
                  <h2 className="text-orange-500 font-black italic tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div> 🍺 HIELERA PLANTA BAJA
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {productosMenu
                      .filter(p => ["cerveza", "botellas"].includes(p.categoria?.toLowerCase().trim()) && p.ubicacion === "PLANTA BAJA" && !p.esInsumoPeso)
                      .filter(p => filtroInventario === "" || p.categoria?.toUpperCase().trim() === filtroInventario.toUpperCase())
                      .map(prod => (
                        <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 truncate">
                              <img src={prod.imagen} className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-800 flex-shrink-0" alt=""/>
                              <div className="truncate">
                                <h4 className="font-black text-white uppercase tracking-tight text-sm truncate leading-tight">{prod.nombre}</h4>
                                <span className="text-[7px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                                  {prod.categoria} | {prod.subcategoria || 'PIEZA CERRADA'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500">M: <span className="text-white">${prod.precioMesa}</span></p>
                              </div>
                              <button type="button" onClick={() => { const ex = window.prompt("Ajustar Stock Planta Baja:", prod.stock); if(ex) updateDoc(doc(db, "productos", prod.id), { stock: Number(ex) }); }} className={`px-2.5 py-1 rounded-lg font-black text-sm transition-colors ${prod.stock <= 5 ? 'bg-red-950 text-red-500 border border-red-900' : 'bg-slate-950 text-green-500 border border-slate-800'}`}>
                                {prod.stock} pz
                              </button>
                              <button type="button" onClick={async () => { if(window.confirm(`¿Eliminar ${prod.nombre} de Planta Baja?`)) await deleteDoc(doc(db, "productos", prod.id)); }} className="text-slate-700 hover:text-red-500 p-1 transition-colors">
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </div>

                          {prod.categoria?.toLowerCase().trim() === "botellas" && (
                            <div className="mt-1 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                              <p className="text-[8px] font-black text-sky-400 uppercase tracking-wider">📐 Báscula: {prod.pesoBotellaLleno ? `${prod.pesoBotellaLleno}g / ${prod.pesoBotellaVacio}g` : 'Sin calibrar'}</p>
                              <button 
                                type="button"
                                onClick={() => {
                                  const lleno = window.prompt(`⚖️ CALIBRAR BOTELLA LLENA (g) - ${prod.nombre}:`, prod.pesoBotellaLleno || "1350");
                                  const vacio = window.prompt(`⚖️ CALIBRAR TARA VACÍA (g) - ${prod.nombre}:`, prod.pesoBotellaVacio || "600");
                                  const vaso = window.prompt(`⚖️ GRAMOS POR VASO (g):`, prod.gramosPorVaso || "45");
                                  const litro = window.prompt(`⚖️ GRAMOS POR LITRO (g):`, prod.gramosPorLitro || "90");

                                  if(lleno && vacio && vaso && litro) {
                                    updateDoc(doc(db, "productos", prod.id), {
                                      pesoBotellaLleno: Number(lleno),
                                      pesoBotellaVacio: Number(vacio),
                                      gramosPorVaso: Number(vaso),
                                      gramosPorLitro: Number(litro)
                                    });
                                    alert("¡Configuración guardada en Planta Baja!");
                                  }
                                }}
                                className="text-[8px] font-black bg-slate-900 text-slate-300 border border-slate-800 hover:border-sky-500 px-2 py-1 rounded-md uppercase tracking-tight transition-all"
                              >
                                ⚙️ Configurar Gramos
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {(filtroInventario === "" || filtroInventario === "CERVEZA" || filtroInventario === "BOTELLAS") && (
                <div className="pt-2">
                  <h2 className="text-sky-400 font-black italic tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-sky-400 rounded-full"></div> ❄️ HIELERA TERRAZA
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {productosMenu
                      .filter(p => ["cerveza", "botellas"].includes(p.categoria?.toLowerCase().trim()) && p.ubicacion === "TERRAZA" && !p.esInsumoPeso)
                      .filter(p => filtroInventario === "" || p.categoria?.toUpperCase().trim() === filtroInventario.toUpperCase())
                      .map(prod => (
                        <div key={prod.id} className="bg-[#0c111a] border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 truncate">
                              <img src={prod.imagen} className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-800 flex-shrink-0" alt=""/>
                              <div className="truncate">
                                <h4 className="font-black text-white uppercase tracking-tight text-sm truncate leading-tight">{prod.nombre}</h4>
                                <span className="text-[7px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                                  {prod.categoria} | {prod.subcategoria || 'PIEZA CERRADA'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500">M: <span className="text-white">${prod.precioMesa}</span></p>
                              </div>
                              <button type="button" onClick={() => { const ex = window.prompt("Ajustar Stock Terraza:", prod.stock); if(ex) updateDoc(doc(db, "productos", prod.id), { stock: Number(ex) }); }} className={`px-2.5 py-1 rounded-lg font-black text-sm transition-colors ${prod.stock <= 5 ? 'bg-red-950 text-red-500 border border-red-900' : 'bg-slate-950 text-green-500 border border-slate-800'}`}>
                                {prod.stock} pz
                              </button>
                              <button type="button" onClick={async () => { if(window.confirm(`¿Eliminar ${prod.nombre} de Terraza?`)) await deleteDoc(doc(db, "productos", prod.id)); }} className="text-slate-700 hover:text-red-500 p-1 transition-colors">
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </div>

                          {prod.categoria?.toLowerCase().trim() === "botellas" && (
                            <div className="mt-1 pt-2 border-t border-slate-800 flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                              <p className="text-[8px] font-black text-sky-400 uppercase tracking-wider">📐 Báscula: {prod.pesoBotellaLleno ? `${prod.pesoBotellaLleno}g / ${prod.pesoBotellaVacio}g` : 'Sin calibrar'}</p>
                              <button 
                                type="button"
                                onClick={() => {
                                  const lleno = window.prompt(`⚖️ CALIBRAR BOTELLA LLENA (g) - ${prod.nombre}:`, prod.pesoBotellaLleno || "1350");
                                  const vacio = window.prompt(`⚖️ CALIBRAR TARA VACÍA (g) - ${prod.nombre}:`, prod.pesoBotellaVacio || "600");
                                  const vaso = window.prompt(`⚖️ GRAMOS POR VASO (g):`, prod.gramosPorVaso || "45");
                                  const litro = window.prompt(`⚖️ GRAMOS POR LITRO (g):`, prod.gramosPorLitro || "90");

                                  if(lleno && vacio && vaso && litro) {
                                    updateDoc(doc(db, "productos", prod.id), {
                                      pesoBotellaLleno: Number(lleno),
                                      pesoBotellaVacio: Number(vacio),
                                      gramosPorVaso: Number(vaso),
                                      gramosPorLitro: Number(litro)
                                    });
                                    alert("¡Configuración guardada en Terraza!");
                                  }
                                }}
                                className="text-[8px] font-black bg-slate-900 text-slate-300 border border-slate-800 hover:border-sky-500 px-2 py-1 rounded-md uppercase tracking-tight transition-all"
                              >
                                ⚙️ Configurar Gramos
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {tabBarra === 'eventos' && (
            <div className="no-print">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recordatorios.map(rec => (
                  <div key={rec.id} className="bg-[#0c111a] border border-slate-800 p-5 rounded-2xl flex justify-between items-center shadow-xl">
                    <div>
                      <p className="text-white font-bold uppercase tracking-tight">{rec.titulo}</p>
                      <p className="text-orange-500 text-[10px] font-black mt-1 uppercase tracking-widest">{rec.fecha} | {rec.hora} HRS</p>
                    </div>
                    <button onClick={() => deleteDoc(doc(db, "recordatorios", rec.id))} className="text-red-500/30 hover:text-red-500 transition-colors">
                      <Trash2 size={20}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div> {/* ─── FIN PANEL IZQUIERDO ─── */}

        {/* ─── PANEL DERECHO: CONTROL FINANCIERO Y BUSCADOR ─── */}

        {/* ─── PANEL DERECHO: CONTROL FINANCIERO Y BUSCADOR ─── */}
        <div className="w-full lg:w-[350px] space-y-4 no-print flex-shrink-0">
          
          <div className="bg-[#0c111a] p-4 rounded-3xl border border-slate-800 shadow-xl">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-600" size={16}/>
              <input type="text" placeholder="Mesa, Tel o Fecha" value={filtroMesa} onChange={(e) => setFiltroMesa(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl pl-10 py-2 text-sm text-white focus:border-orange-500 font-bold shadow-inner" />
            </div>
          </div>

          {esSuperAdmin && (
            <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-slate-800 shadow-2xl">
              <h2 className="text-sm font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">📊 Reporte de Ventas</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fecha Inicio</label>
                  <input type="date" value={fechaInicioRep} onChange={(e) => setFechaInicioRep(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-bold" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fecha Fin</label>
                  <input type="date" value={fechaFinRep} onChange={(e) => setFechaFinRep(e.target.value)} className="w-full bg-[#05070a] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-bold" />
                </div>
                <button onClick={generarReporteVentas} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95 mt-2">Generar Reporte</button>
              </div>
            </div>
          )}

          <div className="bg-[#0c111a] p-5 rounded-[2rem] border border-orange-900/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-orange-600 uppercase italic flex items-center gap-2"><ReceiptText size={20}/> Caja Hoy</h2>
              <button onClick={realizarCierreTurno} className="text-[9px] font-black text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg uppercase hover:bg-red-600 transition-all">Cierre</button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar mb-4">
              {historialFiltradoParaCaja.map((hc) => (
                <div key={hc.id} onClick={() => setTicketParaReimprimir(hc)} className="group p-3 bg-[#05070a] rounded-xl border border-slate-700 flex items-center justify-between hover:border-orange-500 transition-all shadow-sm cursor-pointer">
                  <div className="flex-1">
                    <div className="flex justify-between font-black text-[11px] uppercase tracking-tighter">
                      <span className="text-slate-400">Mesa {hc.mesa} - {obtenerPlanta(hc.mesa)}</span>
                      <span className="text-green-500">${hc.total}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[8px] text-slate-500 uppercase font-bold">{hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) : 'Reciente'}</p>
                      <p className="text-[11px] text-slate-400 font-black uppercase italic tracking-tighter">{hc.fecha?.seconds ? new Date(hc.fecha.seconds * 1000).toLocaleDateString('es-MX') : ''}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); if(window.confirm("¿Borrar?")) deleteDoc(doc(db, "historial_tickets", hc.id)); }} className="ml-2 p-1.5 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between font-black">
              <span className="text-slate-500 text-[10px] uppercase italic tracking-widest">Total:</span>
              <span className="text-2xl text-green-500 tracking-tighter">${totalCajaHoy}</span>
            </div>
          </div>

        </div>
     </div>

{verModalNuevoProd && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-[450px] rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto no-scrollbar">
            <button onClick={() => { setVerModalNuevoProd(false); setEsNuevaSub(false); }} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>
            
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-orange-600 mb-5 flex items-center gap-2">
              <PlusCircle size={22}/> Nuevo Producto / Insumo
            </h2>
            
            <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const batch = writeBatch(db);
                
                const esBotellaCompleta = nuevoProd.categoria?.toLowerCase().trim() === "botellas";
                const esBebidaPreparada = nuevoProd.categoria?.toLowerCase().trim() === "bebidas preparadas";
                const esComidaOSnack = ["snacks", "comidas"].includes(nuevoProd.categoria?.toLowerCase().trim());
                
                const deptoBase = (esBebidaPreparada || esComidaOSnack) ? e.target.modalidadPreparacion.value : "";
                const porcionOFormat = esBebidaPreparada ? e.target.modalidadPorcion.value : nuevoProd.subcategoria;

                let datosBasculaAut = {};
                if (esBebidaPreparada && e.target.botellaEnlaceId?.value) {
                  const botellaSeleccionada = productosMenu.find(p => p.id === e.target.botellaEnlaceId.value);
                  if (botellaSeleccionada) {
                    datosBasculaAut = {
                      esInsumoPeso: true,
                      botellaOriginalId: botellaSeleccionada.id,
                      pesoBotellaLleno: Number(botellaSeleccionada.pesoBotellaLleno || 1200),
                      pesoBotellaVacio: Number(botellaSeleccionada.pesoBotellaVacio || 500),
                      gramosPorVaso: Number(botellaSeleccionada.gramosPorVaso || 45),
                      gramosPorLitro: Number(botellaSeleccionada.gramosPorLitro || 90),
                      pesoActualGramos: Number(botellaSeleccionada.pesoActualGramos || botellaSeleccionada.pesoBotellaLleno || 1200)
                    };
                  }
                }

                // ─── BUSCA ESTA SECCIÓN DENTRO DEL FORMULARIO DE NUEVO PRODUCTO Y REEMPLÁZALA ───

if (Number(nuevoProd.stockBaja) > 0 || esBebidaPreparada || esComidaOSnack) {
  const refBaja = doc(collection(db, "productos"));
  batch.set(refBaja, {
    nombre: nuevoProd.nombre,
    stock: Number(nuevoProd.stockBaja) || 0,
    ubicacion: "PLANTA BAJA",
    departamento: deptoBase,
    precioMesa: Number(nuevoProd.precioMesa),
    precioDomicilio: Number(nuevoProd.precioDomicilio),
    categoria: nuevoProd.categoria,
    subcategoria: porcionOFormat,
    imagen: nuevoProd.imagen || "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=200",
    
    // 🌟 ENLACE DE QR PARA PLANTA BAJA
    codigoQR: nuevoProd.codigoQR || "", 
    
    ...datosBasculaAut
  });
}

if (Number(nuevoProd.stockTerraza) > 0 && !esBebidaPreparada && !esComidaOSnack) {
  const refTerraza = doc(collection(db, "productos"));
  batch.set(refTerraza, {
    nombre: nuevoProd.nombre,
    stock: Number(nuevoProd.stockTerraza),
    ubicacion: "TERRAZA",
    departamento: deptoBase,
    precioMesa: Number(nuevoProd.precioMesa),
    precioDomicilio: Number(nuevoProd.precioDomicilio),
    categoria: nuevoProd.categoria,
    subcategoria: nuevoProd.subcategoria,
    imagen: nuevoProd.imagen || "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=200",
    
    // 🌟 ENLACE DE QR PARA TERRAZA
    codigoQR: nuevoProd.codigoQR || "", 
    
    ...datosBasculaAut
  });
}

await batch.commit();
setVerModalNuevoProd(false);
// 🌟 LIMPIAMOS EL ESTADO INCLUYENDO EL QR
setNuevoProd({ nombre: "", precioMesa: "", precioDomicilio: "", stockBaja: "", stockTerraza: "", categoria: "Cerveza", subcategoria: "", imagen: "", codigoQR: "" });
            }} className="space-y-4 font-sans">
              
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">Categoría del Producto</label>
                <select 
                  value={nuevoProd.categoria} 
                  onChange={e => setNuevoProd({...nuevoProd, categoria: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-300 font-bold outline-none focus:border-orange-500 shadow-inner"
                >
                  {CATEGORIAS.filter(c => c !== "Todos").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">Nombre (Ej: Corona Familiar, Papas Fritas)</label>
                <input required placeholder="Nombre descriptivo" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-orange-500 outline-none text-white font-medium shadow-inner" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">Precio Mesa / Local</label>
                  <input required type="number" placeholder="$ Local" value={nuevoProd.precioMesa} onChange={e => setNuevoProd({...nuevoProd, precioMesa: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none text-orange-500 font-bold shadow-inner" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">Precio Domicilio</label>
                  <input required type="number" placeholder="$ Delivery" value={nuevoProd.precioDomicilio} onChange={e => setNuevoProd({...nuevoProd, precioDomicilio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none text-orange-500 font-bold shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                <div>
                  <label className="text-[9px] font-black text-emerald-500 uppercase block mb-1">Stock Planta Baja</label>
                  <input type="number" placeholder="Cantidad u." value={nuevoProd.stockBaja} onChange={e => setNuevoProd({...nuevoProd, stockBaja: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-sky-400 uppercase block mb-1">Stock Terraza</label>
                  <input type="number" placeholder="Cantidad u." value={nuevoProd.stockTerraza} onChange={e => setNuevoProd({...nuevoProd, stockTerraza: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-sky-500" />
                </div>
              </div>

              {nuevoProd.categoria?.toLowerCase().trim() === "bebidas preparadas" ? (
                <div className="space-y-3 bg-orange-600/5 p-4 rounded-2xl border border-orange-500/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">🍳 Centro</label>
                      <select name="modalidadPreparacion" className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white font-bold outline-none">
                        <option value="BARRA">Barra / Cantina</option>
                        <option value="COCINA">Cocina</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">🥛 Servir en</label>
                      <select name="modalidadPorcion" className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white font-bold outline-none">
                        <option value="VASO">Vaso</option>
                        <option value="LITRO">Litro</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="text-[9px] font-black text-sky-400 uppercase block mb-1">🍾 Botella Base para la Báscula</label>
                    <select name="botellaEnlaceId" required className="w-full bg-slate-950 border border-sky-900/40 p-2.5 rounded-xl text-xs text-white font-bold outline-none focus:border-sky-500">
                      <option value="">-- Seleccionar Botella Insumo --</option>
                      {productosMenu
                        .filter(p => p.categoria?.toLowerCase().trim() === "botellas")
                        .filter((v, i, a) => a.findIndex(t => t.nombre === v.nombre) === i)
                        .map(botella => (
                          <option key={botella.id} value={botella.id}>{botella.nombre}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              ) : ["snacks", "comidas"].includes(nuevoProd.categoria?.toLowerCase().trim()) ? (
                <div className="bg-orange-600/5 p-4 rounded-2xl border border-orange-500/10 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">🍳 Centro Preparación</label>
                      <select name="modalidadPreparacion" className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white font-bold outline-none">
                        <option value="COCINA">Cocina Caliente</option>
                        <option value="BARRA">Barra / Fríos</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-orange-500 uppercase block mb-1">🥛 Porción</label>
                      <select name="modalidadPorcion" className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white font-bold outline-none">
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="COMPARTIR">Para Compartir</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">Formato / Subcategoría</label>
                  <input placeholder="Ej: Latón, Media, Servicio Cerrado" value={nuevoProd.subcategoria} onChange={e => setNuevoProd({...nuevoProd, subcategoria: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white outline-none focus:border-orange-500" />
                </div>
              )}

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">Imagen del Producto (URL)</label>
                <input placeholder="https://ejemplo.com/foto.jpg" value={nuevoProd.imagen} onChange={e => setNuevoProd({...nuevoProd, imagen: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none text-white shadow-inner focus:border-orange-500" />
              </div>
            {/* 📦 NUEVO CAMPO: CÓDIGO QR / MARBETE CON LECTOR FIJO */}
<div>
  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">📦 Código QR / Marbete (Lector Fijo)</label>
  <input 
    placeholder="Haz click aquí y pasa la botella por el escáner..." 
    value={nuevoProd.codigoQR || ""} 
    onChange={e => setNuevoProd({...nuevoProd, codigoQR: e.target.value.trim()})} 
    
    // 🌟 PARCHE DE SEGURIDAD: Bloquea el autoguardado del lector de barras
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Evita que el 'Enter' del escáner dispare el submit del formulario
      }
    }}
    
    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none text-white shadow-inner focus:border-purple-500 font-bold transition-all" 
  />
</div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-xl active:scale-95 transition-all mt-2">
                ✨ Registrar Producto
              </button>
            </form>
          </div>
        </div>
      )}

      {verModalNuevoEvento && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-[350px] rounded-[2.5rem] p-8 shadow-2xl relative text-left">
            <button onClick={() => setVerModalNuevoEvento(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white">✕</button>
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
                  <span className="bg-black text-white px-2 uppercase">{ticketParaReimprimir.mesa?.replace("TEL:", "EXT-")}</span>
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
)}

{view === 'welcome' && (
   <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
     <div className="absolute inset-0 opacity-40">
       <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000" className="w-full h-full object-cover" alt="fondo" />
       <div className="absolute inset-0 bg-slate-950/80"></div>
     </div>

     <div className="relative z-10 space-y-12 w-full max-w-lg">
       
       <div className="space-y-4 flex flex-col items-center">
         <div className="flex justify-center items-center gap-2 animate-fade-in">
           <img 
             src="https://res.cloudinary.com/druv9bk0d/image/upload/q_auto/f_auto/v1781915505/tribus_logo-removebg-preview_jzqqpj.png" 
             alt="Tribu's Bar Logo" 
             className="h-24 md:h-28 w-auto object-contain drop-shadow-[0_4px_12px_rgba(234,88,12,0.35)] transition-transform duration-300 hover:scale-105"
           />
         </div>
         <div className="space-y-2 uppercase tracking-tight text-center">
           <h2 className="text-3xl font-bold">{mesa ? `¡BIENVENIDO MESA ${mesa}!` : "¡BIENVENIDO!"}</h2>
           <p className="text-orange-500 text-sm font-medium tracking-[0.2em]">{obtenerPlanta(mesa)}</p>
         </div>
       </div>

       <div className="grid gap-4">
         <button onClick={() => { navigator.clipboard.writeText("tribus2026"); alert("Wi-Fi Copiada"); }} className="flex items-center gap-5 bg-slate-800/40 p-5 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl active:scale-95 hover:bg-slate-700/60 transition-all duration-300 group">
           <Wifi className="text-sky-400" size={28} />
           <div className="text-left font-bold uppercase text-[10px] text-slate-400">
             <p>Wi-Fi Gratis</p>
             <p className="text-lg text-white font-black">tribu´s Bar</p>
           </div>
         </button>

      <button 
            onClick={() => { 
              setEsComandaManual(false); 
              if (mesa) {
                // Si ya escaneó QR de mesa, pasa directo al menú de su piso
                setView('menu'); 
              } else {
                // Si es externo, le preguntamos a qué piso va
                setMostrarSeleccionPiso(true);
              }
            }} 
            className="flex items-center gap-5 bg-orange-600 p-6 rounded-3xl shadow-2xl active:scale-95 hover:bg-orange-500 transition-all duration-300 group w-full"
          >
            <UtensilsCrossed className="text-white" size={28} />
            <div className="text-left font-bold uppercase text-[10px] text-orange-200">
              <p>Menú Digital</p>
              <p className="text-lg text-white font-black uppercase tracking-tight leading-none">Ver la carta</p>
            </div>
          </button>
         {/* ✨ BOTÓN NUEVO: BENEFICIOS DE LA TRIBU */}
        <button 
          onClick={() => setVerModalBeneficios(true)} 
          className="flex items-center gap-5 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-orange-500/30 p-5 rounded-3xl backdrop-blur-sm active:scale-95 hover:border-orange-500 transition-all duration-300 group shadow-lg shadow-orange-950/10"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30 group-hover:scale-105 transition-transform">
            <Tag className="text-black font-black animate-pulse" size={22} />
          </div>
          <div className="text-left flex-1">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">👑 Beneficios Exclusivos</p>
            <p className="text-lg text-white font-black uppercase tracking-tight leading-none mt-0.5">¿Por qué registrarse?</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Descubre lo que ganas al unirte a la Tribu</p>
          </div>
        </button>

         {!usuarioLogueado ? (
           <button onClick={() => setView('registro')} className="flex items-center gap-5 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-sm active:scale-95 hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300 group">
             <div className="w-10 h-10 rounded-2xl bg-orange-600/20 flex items-center justify-center group-hover:bg-orange-600 transition-colors">
               <Zap className="text-orange-600 group-hover:text-white" size={20} />
             </div>
             <div className="text-left">
               <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">¿Cliente frecuente?</p>
               <p className="text-sm text-white font-bold opacity-80 italic">Únete a la Tribu y obtén benefits</p>
             </div>
           </button>
         ) : (
           <div className="flex items-center gap-4 bg-green-950/20 border border-green-500/30 p-4 rounded-[30px] backdrop-blur-sm">
             <div className="bg-green-600 p-3 rounded-2xl shadow-lg shadow-green-900/20">
               <CheckCircle size={24} className="text-white" />
             </div>
             <div className="flex flex-col text-left">
               <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] leading-none mb-1">Sesión Iniciada</span>
               <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
                 {nombreUsuarioLogueado ? nombreUsuarioLogueado.split(" ")[0] : "Miembro de la Tribu"}
               </h2>
             </div>
           </div>
         )}

         <button onClick={() => window.open(LINK_PRINCIPAL, '_blank')} className="flex items-center gap-5 bg-slate-800/40 p-5 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl active:scale-95 hover:bg-slate-700/60 transition-all duration-300 group">
           <ExternalLink className="text-green-500" size={28} />
           <div className="text-left font-bold uppercase text-[10px] text-slate-400">
             <p>Rockola</p>
             <p className="text-lg text-white font-black">{TEXTO_LINK}</p>
           </div>
         </button>
       </div>

       <button onClick={() => setView('login_staff')} className="opacity-10 text-[10px] uppercase font-bold tracking-widest hover:opacity-100 transition-opacity">Acceso Barra</button>
     </div>
   </div>
)}

{view === 'registro' && (
   <div className="flex items-center justify-center min-h-screen bg-black p-4">
     <div className="bg-[#0f172a] text-white rounded-[40px] shadow-2xl w-full max-w-sm flex flex-col items-center p-8 border border-gray-800 relative">
       <button onClick={() => setView('welcome')} className="absolute top-6 right-8 text-gray-500 hover:text-white">✕</button>
       <div className="bg-[#2d1b14] p-4 rounded-full mb-6"><div className="text-[#ff4d00] text-3xl italic font-black">⚡</div></div>
       <h2 className="text-3xl font-black italic uppercase mb-1 tracking-wider text-center">Únete a la Tribu</h2>
       <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-8 font-bold text-center">Registra tu visita y obtén beneficios</p>
       <div className="w-full space-y-5">
         <div>
           <label className="text-[9px] font-black text-gray-500 uppercase ml-1 mb-1 block">¿Cómo te llamas?</label>
           <input type="text" placeholder="Nombre" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-2xl outline-none focus:border-orange-600 transition-colors" onChange={(e) => setNombreRegistro(e.target.value)} />
         </div>
         <div>
           <label className="text-[9px] font-black text-gray-500 uppercase ml-1 mb-1 block">Tu WhatsApp</label>
           <input type="tel" placeholder="10 dígitos" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-2xl outline-none focus:border-orange-600 transition-colors" onChange={(e) => setTelefonoInput(e.target.value)} />
         </div>
         <div>
           <label className="text-[9px] font-black text-gray-500 uppercase ml-1 mb-1 block">Crea tu contraseña</label>
           <input type="password" placeholder="Mínimo 6 caracteres" className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-2xl outline-none focus:border-orange-600 transition-colors" onChange={(e) => setPassword(e.target.value)} />
         </div>
         <button onClick={registrarClienteFrecuente} className="w-full bg-[#ff4d00] hover:bg-[#e64500] py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">Registrarme</button>
         <button onClick={() => setView('login')} className="w-full text-gray-500 text-[10px] font-bold uppercase tracking-widest">Ya tengo cuenta</button>
       </div>
     </div>
   </div>
)}

{view === 'login' && (
   <div className="flex items-center justify-center min-h-screen bg-black p-4 font-sans">
     <div className="bg-[#0f172a] text-white rounded-[40px] shadow-2xl w-full max-w-sm flex flex-col items-center p-8 border border-gray-800 relative">
       <button type="button" onClick={() => setView('welcome')} className="absolute top-6 right-8 text-gray-500 hover:text-white">✕</button>
       <div className="bg-[#2d1b14] p-4 rounded-full mb-6"><div className="text-[#ff4d00] text-3xl italic font-black">⚡</div></div>
       
       <h2 className="text-3xl font-black italic uppercase mb-1 tracking-wider text-center">Bienvenido de nuevo</h2>
       <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-8 font-bold text-center">Ingresa tus datos para continuar</p>
       
       <form onSubmit={(e) => {
         e.preventDefault();
         loginClienteFrecuente();
       }} className="w-full space-y-5">
         
         <div>
           <label className="text-[9px] font-black text-gray-500 uppercase ml-1 mb-1 block">Tu WhatsApp</label>
           <input 
             type="tel" 
             required
             placeholder="10 dígitos" 
             value={telefonoInput}
             className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-2xl outline-none focus:border-orange-600 transition-colors" 
             onChange={(e) => setTelefonoInput(e.target.value)} 
           />
         </div>
         
         <div>
           <label className="text-[9px] font-black text-gray-500 uppercase ml-1 mb-1 block">Tu contraseña</label>
           <input 
             type="password" 
             required
             placeholder="Ingresa tu clave" 
             value={password}
             className="w-full bg-[#050a15] border border-gray-800 p-4 rounded-2xl outline-none focus:border-orange-600 transition-colors" 
             onChange={(e) => setPassword(e.target.value)} 
           />
         </div>
         
         <button type="submit" className="w-full bg-[#ff4d00] hover:bg-[#e64500] py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
           Entrar
         </button>
         
         <button type="button" onClick={() => setView('registro')} className="w-full text-gray-500 text-[10px] font-bold uppercase tracking-widest block text-center mt-2">
           No tengo cuenta, quiero registrarme
         </button>
       </form>
     </div>
   </div>
)}

{view === 'menu' && (() => {
   // 🌟 LOGICA MEJORADA: Entiende "B", "T", números de mesa o externos reales
   const obtenerPlantaMejorado = (valorMesa) => {
     if (!valorMesa) return "EXTERNO";
     const mesaStr = String(valorMesa).toUpperCase().trim();
     
     if (mesaStr === "T" || mesaStr.includes("TERRAZA")) return "TERRAZA";
     if (mesaStr === "B" || mesaStr.includes("BAJA") || mesaStr.includes("PLANTA")) return "PLANTA BAJA";
     
     const numMesa = parseInt(valorMesa, 10);
     if (!isNaN(numMesa)) {
       return (numMesa >= 26 && numMesa <= 50) ? "TERRAZA" : "PLANTA BAJA";
     }
     return "EXTERNO";
   };

   const ubicacionActual = obtenerPlantaMejorado(mesa);
   
   // 🌟 SEPARACIÓN ESTRICTA DE HIERLERAS/BARRAS
   const menuPorPlanta = productosMenu.filter(p => {
     const catLimpia = (p.categoria || "").toUpperCase().trim();
     if (catLimpia === "SNACKS" || catLimpia === "COMIDAS") return true; // Cocina pasa libre siempre
     
     const prodUbicacion = (p.ubicacion || "").toUpperCase().trim();
     
     if (ubicacionActual === "EXTERNO") return true;
     if (!prodUbicacion || prodUbicacion === "") return true;
     
     return prodUbicacion === ubicacionActual;
   });

   // 🌟 FILTRO DE CATEGORÍA (Se mantiene igual)
   const menuFiltrado = menuPorPlanta.filter(p => {
     const coincideCategoria = catSeleccionada === "Todos" || 
       (p.categoria || "").toUpperCase().trim() === catSeleccionada.toUpperCase().trim();
       
     const coincideSubcategoria = subCatSeleccionada === "Todas" || 
       p.subcategoria === subCatSeleccionada;

     return coincideCategoria && coincideSubcategoria;
   });

   // 🌟 3. ACTUALIZACIÓN DE SUBCATEGORÍAS DISPONIBLES
   const subcategoriasDisponibles = Array.from(new Set(
     menuPorPlanta
       .filter(p => (p.categoria || "").toUpperCase().trim() === catSeleccionada.toUpperCase().trim() && p.subcategoria)
       .map(p => p.subcategoria)
   ));

   return (
     <div className="min-h-screen bg-slate-900 pb-32 text-slate-100 flex flex-col items-center font-sans w-full">
       <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 w-full border-b border-slate-800 px-4 py-3">
         <div className="max-w-6xl mx-auto flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 w-full">
              
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                <div onClick={() => { if(esComandaManual) { setView('barra'); setTabBarra('mesas_fisicas'); } else { setView('welcome'); } }} className="cursor-pointer font-black text-xl text-orange-500 italic uppercase tracking-tighter leading-none whitespace-nowrap">
                  {nombreBarDinamico}
                </div>
               {/* 🌟 CORRECCIÓN VISUAL: Solo dice 'Mesa X' si es un número, de lo contrario muestra el nombre del área */}
<button 
  onClick={() => { setMesaEscaneadaInput(""); encenderCamaraPWA(); }}
  className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-lg shadow-orange-600/10 active:scale-95 transition-transform"
>
  📷 {mesa && mesa !== "B" && mesa !== "T" ? `Mesa ${mesa}` : "Escanear QR / Mesa"}
</button>

              </div>

              <div className="flex items-center justify-end gap-3 w-full sm:w-auto border-t border-slate-800/50 pt-2 sm:pt-0 sm:border-none">
                
<div className="flex items-center justify-between w-full gap-2 sm:w-auto">
  
  <div className="flex items-center gap-1.5">
    <button onClick={() => setVerCarrito(true)} className="bg-slate-800 p-2.5 rounded-full relative border-none outline-none active:scale-95">
      <ShoppingCart size={18} />
      {carrito.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-orange-600 text-[8px] px-1.5 py-0.5 rounded-full font-bold">
          {carrito.reduce((a, b) => a + b.cantidad, 0)}
        </span>
      )}
    </button>

    {pinCorrectoMesa && (
      <div className="bg-orange-600/10 px-2 py-1.5 rounded-xl border border-orange-500/20 flex flex-col items-center justify-center min-w-[38px]">
        <span className="text-[5px] font-black text-orange-500 uppercase tracking-tighter leading-none mb-0.5">PIN</span>
        <span className="text-[9px] font-black text-white leading-none tracking-widest">{pinCorrectoMesa}</span>
      </div>
    )}
    
    {consumoAcumulado.length > 0 && (
      <div className="bg-green-600/10 px-2 py-1.5 rounded-xl border border-green-500/20 flex items-center gap-1 h-[26px]">
        <History size={10} className="text-green-500" />
        <span className="text-[9px] font-black text-green-500 leading-none">${totalAcumulado}</span>
      </div>
    )}
  </div>

  <div className="flex items-center gap-2">
    <select 
      onChange={(e) => {
        if (e.target.value === 'mis_pedidos') setView('mis_pedidos');
        if (e.target.value === 'cerrar_sesion') cerrarSesion();
        e.target.value = 'default'; 
      }}
      className="bg-slate-900 border border-slate-800 text-[10px] font-black uppercase rounded-xl px-2.5 py-2 text-slate-300 outline-none cursor-pointer max-w-[130px]"
    >
      <option value="default">
        👤 {usuarioLogueado ? (nombreUsuarioLogueado ? nombreUsuarioLogueado.split(" ")[0] : "Mi Cuenta") : "Invitado"} 
      </option>
      
      {usuarioLogueado && (
        <>
          <option value="mis_pedidos">📋 Ver mis órdenes</option>
          <option value="cerrar_sesion" className="text-red-500">❌ Cerrar Sesión</option>
        </>
      )}
    </select>
    
    <button 
      onClick={() => {
        if (esComandaManual) {
          setView('barra');
          setTabBarra('mesas_fisicas');
        } else {
          setView('welcome');
        }
      }} 
      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-all shadow-md active:scale-95"
    >
      Atrás
    </button>
  </div>
</div>

              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">{CATEGORIAS.map(c => (<button key={c} onClick={() => { setCatSeleccionada(c); setSubCatSeleccionada("Todas"); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all ${catSeleccionada === c ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400'}`}>{c}</button>))}</div>
            {subcategoriasDisponibles.length > 0 && (<div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/50"><button onClick={() => setSubCatSeleccionada("Todas")} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase border-none outline-none ${subCatSeleccionada === "Todas" ? 'text-sky-400 bg-sky-900/20' : 'text-slate-500'}`}>Todas</button>{subcategoriasDisponibles.map(sc => (<button key={sc} onClick={() => setSubCatSeleccionada(sc)} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase border-none outline-none ${subCatSeleccionada === sc ? 'text-sky-400 bg-sky-900/20 shadow-lg' : 'text-slate-500'}`}>{sc}</button>))}</div>)}
         </div>
       </header>
       <main className="p-4 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {menuFiltrado.map(item => (
           <div key={item.id} className={`bg-slate-800/60 rounded-3xl p-4 flex gap-4 border border-slate-700/30 group shadow-lg transition-all ${item.stock <= 0 ? 'opacity-50 grayscale' : ''}`}>
             <div className="w-24 h-24 rounded-2xl border border-slate-700 bg-slate-900 flex-shrink-0 overflow-hidden relative shadow-inner">
               <img src={item.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="p" />
               {item.stock <= 5 && item.stock > 0 && <span className="absolute bottom-0 left-0 right-0 bg-red-600 text-[8px] font-black text-center uppercase py-0.5 shadow-lg tracking-widest animate-pulse">Últimas {item.stock}</span>}
             </div>
             <div className="flex-1 flex flex-col justify-between">
               <div>
                 <h3 className="font-bold text-white uppercase leading-tight">{item.nombre}</h3>
                 <p className="text-slate-500 text-xs mt-1 italic leading-tight">{item.subcategoria}</p>
               </div>
               <div className="flex justify-between items-center mt-3"><span className="font-black text-xl text-orange-500 italic tracking-tighter">${obtenerPrecioItem(item)}</span><button disabled={item.stock <= 0} onClick={() => agregarAlCarrito(item)} className={`${item.stock <= 0 ? 'bg-slate-700' : 'bg-orange-600 active:scale-90 shadow-orange-950/20'} text-white w-10 h-10 rounded-xl font-bold transition-all shadow-lg`}>{item.stock <= 0 ? <Package size={16} className="mx-auto" /> : '+'}</button></div>
             </div>
           </div>
         ))} 
       </main>
       {carrito.length > 0 && !verCarrito && (<div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center no-print"><button onClick={() => setVerCarrito(true)} className="w-full max-w-lg bg-orange-600 text-white py-4 rounded-2xl font-black flex justify-between px-8 shadow-2xl active:scale-95 transition-all shadow-orange-950/30"><span className="text-[10px] uppercase font-bold tracking-widest text-white leading-none flex items-center gap-2"><ShoppingCart size={14}/> MI PEDIDO ({carrito.reduce((a,b)=>a+b.cantidad,0)})</span><span className="font-black text-xl italic text-white tracking-tighter leading-none">${totalCarrito}</span></button></div>)}
       <div className={`fixed inset-0 z-[60] transition-all ${verCarrito ? 'visible opacity-100' : 'invisible opacity-0'}`}><div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setVerCarrito(false)} /><div className={`absolute right-0 top-0 h-full w-[85%] md:w-[400px] bg-slate-950 p-6 flex flex-col transition-transform duration-300 ${verCarrito ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-800 shadow-2xl`}><div className="flex justify-between items-center border-b border-slate-800 pb-4 font-black text-white italic uppercase text-xl tracking-tighter leading-none"><h2>Mi Cuenta</h2><X onClick={() => setVerCarrito(false)} className="text-slate-500 cursor-pointer" /></div><div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">{carrito.length > 0 && (<div><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={12}/> Por pedir ahora:</p><div className="space-y-3">{carrito.map(item => (<div key={item.id} className="bg-orange-600/5 p-3 rounded-2xl flex flex-col gap-2 border border-orange-600/20 shadow-sm"><div className="flex justify-between font-bold text-xs text-white uppercase tracking-tight leading-none"><span>{item.nombre}</span><button onClick={() => setCarrito(carrito.filter(x => x.id !== item.id))}><Trash2 size={14} className="text-slate-600 hover:text-red-500 transition-colors"/></button></div><div className="flex justify-between items-center"><span className="text-orange-500 font-bold italic tracking-tighter">${item.total * item.cantidad || item.precio * item.cantidad}</span><div className="flex items-center gap-3 bg-slate-800 rounded-full px-3 py-1 shadow-inner"><Minus onClick={() => restarDelCarrito(item.id)} size={12} className="cursor-pointer"/><span className="text-xs font-bold text-white">{item.cantidad}</span><Plus onClick={() => agregarAlCarrito(item)} size={12} className="cursor-pointer"/></div></div></div>))}</div></div>)}{consumoAcumulado.length > 0 && (<div><p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={12}/> Ya consumido:</p><div className="space-y-2">{consumoAcumulado.map((item, idx) => (<div key={idx} className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center border border-slate-800 opacity-60"><span className="text-[11px] font-bold text-slate-300 uppercase">{item.amount || item.cantidad}x {item.nombre}</span><span className="text-[11px] font-black text-white">${item.precio * (item.amount || item.cantidad)}</span></div>))}</div></div>)}</div><div className="pt-4 border-t border-slate-800 space-y-4"><div className="flex justify-between font-black text-2xl text-orange-500 italic"><span>Total Cuenta</span><span>${totalCarrito + totalAcumulado}</span></div><button disabled={carrito.length === 0} onClick={intentarEnviar} className="w-full py-4 rounded-2xl font-black text-white bg-orange-600 active:scale-95 transition-all shadow-xl uppercase tracking-widest">Confirmar Pedido</button></div></div></div>
       <div className={`fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans ${verModalTelefono ? 'visible' : 'hidden'}`}>
            <div className="mb-8 text-center"><Phone size={48} className="text-orange-600 mx-auto mb-4" /><h2 className="text-3xl font-black italic uppercase tracking-tighter">¿Tu Teléfono?</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Para identificar tu pedido externo</p></div>
            <div className="w-full max-w-[300px] mb-8"><div className="bg-slate-900 border-2 border-orange-600/50 rounded-2xl p-6 text-center shadow-2xl"><span className="text-4xl font-black tracking-widest text-white">{telefonoInput || "----------"}</span></div></div>
            <div className="grid grid-cols-3 gap-4 max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (<button key={n} onClick={() => telefonoInput.length < 10 && setTelefonoInput(telefonoInput + n)} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black active:scale-90">{n}</button>))}
                <button onClick={() => setTelefonoInput("")} className="w-16 h-16 rounded-full flex items-center justify-center text-red-500 bg-red-500/10 border border-red-500/20"><Trash2 size={24}/></button>
                <button onClick={() => telefonoInput.length < 10 && setTelefonoInput(telefonoInput + "0")} className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-2xl font-black">0</button>
                <button onClick={() => setVerModalTelefono(false)} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 border border-slate-800"><X size={24}/></button>
            </div>
            {telefonoInput.length >= 10 && (<button onClick={() => procesarEnvio()} className="mt-12 bg-orange-600 w-full max-w-[280px] py-5 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-orange-600/20 animate-pulse">Confirmar Pedido</button>)}
       </div>

       {verModalEscaner && (
         <div className="fixed inset-0 z-[250] bg-slate-950/95 backdrop-blur-md text-white flex flex-col items-center justify-start p-4 font-sans overflow-y-auto w-full">
           <div className="w-full max-w-sm space-y-4 text-center my-auto py-4">
             
             <div className="flex justify-between items-center border-b border-slate-800 pb-3">
               <div className="text-left">
                 <h3 className="text-lg font-black italic uppercase text-orange-500 tracking-tight">Escanear o Cambiar Mesa</h3>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Control de ubicación de la Tribu</p>
               </div>
               <button onClick={() => setVerModalEscaner(false)} className="bg-slate-900 p-2 rounded-full border border-slate-800 text-slate-400 hover:text-white"><X size={16}/></button>
             </div>

             <div className="relative w-full overflow-hidden bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl min-h-[200px]">
               <div id="lector-qr-tribu" className="w-full min-h-[200px] bg-slate-950 text-white text-xs font-bold rounded-2xl"></div>
               
               <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-left space-y-1">
                 <span className="text-[8px] text-slate-500 uppercase font-black block">¿No lee en vivo? Usa la cámara del cel:</span>
                 <input 
                   type="file" 
                   accept="image/*" 
                   capture="environment"
                   onChange={async (e) => {
                     if (e.target.files && e.target.files[0] && window.Html5Qrcode) {
                       const archivo = e.target.files[0];
                       const localReader = new window.Html5Qrcode("lector-qr-tribu");
                        try {
                          const resultado = await localReader.scanFile(archivo, true);
                          setVerModalEscaner(false);
                          procesarEscaneoMesa(resultado.trim());
                        } catch (err) {
                           alert("No se encontró un código QR claro. ¡Intenta tomarla más de cerca!");
                        }
                     }
                   }}
                   className="block w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-orange-600 file:text-white hover:file:bg-orange-500 cursor-pointer"
                 />
               </div>
             </div>

             <div className="bg-[#0c111a] border border-slate-800 rounded-2xl p-3 text-left space-y-1">
               <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest">⚠️ Estado de Cuenta:</p>
               <p className="text-[11px] font-semibold text-slate-300 leading-tight">
                 {consumoAcumulado.length > 0 
                   ? `Te encuentras en la Mesa ${mesa}. Si cambias de mesa, tu cuenta de $${totalAcumulado} solicitará traslado.`
                   : "Tu cuenta está limpia ($0). Puedes asignarte a cualquier mesa libre."
                 }
               </p>
             </div>

             <div className="space-y-3 bg-black/30 p-3 rounded-2xl border border-slate-900 shadow-inner">
               <div className="slate-900 border-2 border-orange-500/30 rounded-xl py-1.5 px-4 text-center">
                 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block mb-0.5">Mesa Seleccionada</span>
                 <span className="text-3xl font-black tracking-widest text-white">{mesaEscaneadaInput || "---"}</span>
               </div>

               <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                   <button key={n} type="button" onClick={() => mesaEscaneadaInput.length < 2 && setMesaEscaneadaInput(mesaEscaneadaInput + n)} className="w-full h-12 rounded-xl bg-slate-900 border border-slate-800 text-lg font-black active:scale-90 transition-all">{n}</button>
                 ))}
                 <button type="button" onClick={() => setMesaEscaneadaInput("")} className="w-full h-12 rounded-xl flex items-center justify-center text-red-500 bg-red-500/10 border border-slate-800"><Trash2 size={16}/></button>
                 <button type="button" onClick={() => mesaEscaneadaInput.length < 2 && setMesaEscaneadaInput(mesaEscaneadaInput + "0")} className="w-full h-12 rounded-xl bg-slate-900 border border-slate-800 text-lg font-black">0</button>
                 <button 
                   type="button"
                   disabled={!mesaEscaneadaInput}
                   onClick={() => {
                     procesarEscaneoMesa(mesaEscaneadaInput);
                     setMesaEscaneadaInput(""); 
                   }} 
                   className={`w-full h-12 rounded-xl flex items-center justify-center transition-all ${mesaEscaneadaInput ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-900 text-slate-700 border border-slate-800'}`}
                 >
                   <CheckCircle size={18}/>
                 </button>
               </div>
             </div>

             <p className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider">Tribu's Bar • Sincronización Interna</p>
           </div>
         </div>
       )}

     </div>
   );
 })()}

 {view !== 'welcome' && view !== 'registro' && view !== 'login' && view !== 'menu' && view !== 'barra' && view !== 'login_staff' && view !== 'mis_pedidos' && view !== 'success' && (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white animate-pulse font-black italic uppercase tracking-widest">Cargando Tribu's Bar...</p>
      </div>
 )}
{/* ─── MODAL INTERMEDIO: SELECCIÓN DE PISO PARA EXTERNOS ─── */}
       {mostrarSeleccionPiso && (() => {
         const diaHoy = new Date().getDay(); // 0-6
         const terrazaAbiertaHoy = DIAS_APERTURA_TERRAZA.includes(diaHoy);

         return (
           <div className="fixed inset-0 z-[220] bg-slate-950/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 font-sans animate-fade-in">
             <div className="w-full max-w-sm space-y-6 relative text-center">
               
               {/* Encabezado */}
               <div className="space-y-2">
                 <div className="w-14 h-14 bg-orange-600/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                   <Boxes className="text-orange-500" size={26} />
                 </div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">¿Dónde te ubicarás?</h3>
                 <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Selecciona tu área para mostrarte el menú correcto</p>
               </div>

               {/* Opciones de Piso */}
               <div className="space-y-4 pt-2">
                 
              {/* Opción 1: Planta Baja */}
<button
  onClick={() => {
    localStorage.removeItem("tribu_mesa"); // Limpiamos mesa vieja
    setMesa("B"); // 🌟 Asignamos la variable fija de Planta Baja
    setMostrarSeleccionPiso(false);
    setView('menu');
  }}
  className="w-full bg-[#0c111a] border border-slate-800 hover:border-orange-500 p-5 rounded-3xl text-left transition-all active:scale-95 flex items-center justify-between group shadow-xl"
>
                   <div className="space-y-0.5">
                     <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block">Planta Baja</span>
                     <span className="text-lg font-black uppercase text-white leading-tight">🍻 Barra Principal</span>
                     <span className="text-[11px] text-slate-400 block mt-1 font-medium">Abierto hoy con servicio completo</span>
                   </div>
                   <span className="text-xl font-bold text-slate-700 group-hover:text-orange-500 transition-colors">➔</span>
                 </button>

                 {/* Opción 2: Terraza (Planta Alta) Dinámica */}
                 <div className="space-y-2">
                   <button
  disabled={!terrazaAbiertaHoy}
  onClick={() => {
    localStorage.removeItem("tribu_mesa"); // Limpiamos mesa vieja
    setMesa("T"); // 🌟 Asignamos la variable fija de Terraza (Adios al '26' automático)
    setMostrarSeleccionPiso(false);
    setView('menu');
  }}
  className={`w-full p-5 rounded-3xl text-left border flex items-center justify-between transition-all shadow-xl ${
    terrazaAbiertaHoy 
      ? 'bg-[#0c111a] border-slate-800 hover:border-sky-400 active:scale-95 group' 
      : 'bg-slate-900/40 border-slate-950 opacity-40 cursor-not-allowed'
  }`}
>
                     <div className="space-y-0.5">
                       <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest block">Planta Alta</span>
                       <span className="text-lg font-black uppercase text-white leading-tight">❄️ Terraza Tribus</span>
                       <span className="text-[11px] text-slate-400 block mt-1 font-medium">
                         {terrazaAbiertaHoy ? "Zona activa al aire libre" : "Cerrado el día de hoy"}
                       </span>
                     </div>
                     {terrazaAbiertaHoy && <span className="text-xl font-bold text-slate-700 group-hover:text-sky-400 transition-colors">➔</span>}
                   </button>

                   {/* Botón de Reservas Exclusivo si la terraza está cerrada hoy */}
                   {!terrazaAbiertaHoy && (
                     <button
                       type="button"
                       onClick={() => window.open(LINK_RESERVACIONES_WA, '_blank')}
                       className="w-full bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 text-purple-400 hover:text-white font-black py-3 rounded-2xl uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 animate-fade-in shadow-lg"
                     >
                       📅 Reservar Mesa para el fin de semana
                     </button>
                   )}
                 </div>

               </div>

               {/* Botón Atrás */}
               <div className="pt-4">
                 <button 
                   onClick={() => setMostrarSeleccionPiso(false)} 
                   className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-300 tracking-widest underline transition-colors"
                 >
                   Volver Atrás
                 </button>
               </div>

             </div>
           </div>
         );
       })()}
{/* ─── MODAL VISUAL DE BENEFICIOS TRIBU ─── */}
       {verModalBeneficios && (
         <div className="fixed inset-0 z-[250] bg-slate-950/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-4 font-sans animate-fade-in">
           <div className="w-full max-w-md space-y-6 relative max-h-[90vh] overflow-y-auto no-scrollbar py-6 px-2">
             
             {/* Botón Cerrar */}
             <button 
               onClick={() => setVerModalBeneficios(false)} 
               className="absolute top-0 right-2 bg-slate-900 border border-slate-800 p-2 rounded-full text-slate-400 hover:text-white transition-colors shadow-xl"
             >
               <X size={20}/>
             </button>

             {/* Encabezado */}
             <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-orange-600/10 transform rotate-6">
                 <Zap className="text-black -rotate-6" size={32} />
               </div>
               <h3 className="text-3xl font-black italic uppercase text-orange-500 tracking-tighter pt-2">BENEFICIOS DE LA TRIBU</h3>
               <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">El registro toma 30 segundos • 100% Gratis</p>
             </div>

             {/* Contenedor de Tarjetas (Grid Visual) */}
             <div className="space-y-3.5">
               
               {/* Tarjeta 1 */}
               <div className="bg-[#0c111a] border border-slate-800/80 p-4 rounded-2xl flex gap-4 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                 <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                   <CheckCircle size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="font-black text-sm uppercase tracking-tight text-white flex items-center gap-2">
                     Prioridad VIP en Barra
                   </h4>
                   <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                     El sistema te asigna un cintillo de color en la pantalla de la barra (Regular o VIP). Los encargados priorizan la preparación de tus tragos y snacks automáticamente.
                   </p>
                 </div>
               </div>

               {/* Tarjeta 2 */}
               <div className="bg-[#0c111a] border border-slate-800/80 p-4 rounded-2xl flex gap-4 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                 <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                   <Lock size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="font-black text-sm uppercase tracking-tight text-white">Cuenta Totalmente Blindada</h4>
                   <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                     ¿Te cambiaste de mesa en la terraza o Planta Baja? ¿Tu cel se quedó sin batería? Tu cuenta no se pierde. Todo se queda guardado bajo tu contraseña de forma segura.
                   </p>
                 </div>
               </div>

               {/* Tarjeta 3 */}
               <div className="bg-[#0c111a] border border-slate-800/80 p-4 rounded-2xl flex gap-4 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
                 <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
                   <History size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="font-black text-sm uppercase tracking-tight text-white">Historial de Órdenes</h4>
                   <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                     Accede a un panel exclusivo para ver tus comandas activas en tiempo real, revisar qué pediste anteriormente y validar tus comprobantes bancarios al instante.
                   </p>
                 </div>
               </div>

               {/* Tarjeta 4 */}
               <div className="bg-[#0c111a] border border-slate-800/80 p-4 rounded-2xl flex gap-4 shadow-xl relative overflow-hidden group opacity-75">
                 <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                 <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                   <Zap size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="font-black text-sm uppercase tracking-tight text-slate-300 flex items-center gap-2">
                     Sistema de Puntos Tribu <span className="text-[7px] font-black bg-purple-500 text-white px-1 rounded uppercase tracking-wider">Próximamente</span>
                   </h4>
                   <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                     Cada bebida o platillo que ordenes acumulará puntos directo en tu perfil. Podrás canjearlos después por souvenirs oficiales del bar o bebidas de cortesía.
                   </p>
                 </div>
               </div>

             </div>

             {/* Botón de Acción Directo al Registro */}
             <div className="pt-2">
               <button 
                 onClick={() => { setVerModalBeneficios(false); setView('registro'); }} 
                 className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-orange-600/10 active:scale-95"
               >
                 ✨ Crear mi Cuenta Gratis Ahora
               </button>
             </div>

             <p className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider text-center">Tribu's Bar • Comunidad & Fidelización</p>
           </div>
         </div>
       )}

      <div id="recaptcha-container"></div>
   </>
 );
}

export default App;