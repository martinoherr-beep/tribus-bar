const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// 1. CONFIGURACIÓN DE SEGURIDAD (CORS) 
// Permitimos '*' para que los celulares de la red puedan conectarse sin errores
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// 2. CONFIGURACIÓN DE MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      
  password: '',      
  database: 'tribus_bar' 
});

db.connect(err => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL - Servidor Central Tribus');
  
  // Asegurar que la tabla historial existe al arrancar
  db.query(`CREATE TABLE IF NOT EXISTS historial_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa VARCHAR(50),
    detalle TEXT,
    total DECIMAL(10,2),
    archivado TINYINT(1) DEFAULT 0,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

// 3. RECIBIR O ACTUALIZAR PEDIDOS
app.post('/api/pedidos', (req, res) => {
  const { mesa, detalle, total } = req.body;
  const buscarSql = "SELECT id, detalle, total FROM pedidos WHERE mesa = ? AND estado = 'pendiente' LIMIT 1";

  db.query(buscarSql, [mesa], (err, results) => {
    if (err) return res.status(500).json(err);

    if (results.length > 0) {
      const pedidoAnterior = results[0];
      const nuevoDetalle = pedidoAnterior.detalle + "\n" + detalle;
      const nuevoTotal = parseFloat(pedidoAnterior.total) + parseFloat(total);
      const updateSql = "UPDATE pedidos SET detalle = ?, total = ? WHERE id = ?";
      db.query(updateSql, [nuevoDetalle, nuevoTotal, pedidoAnterior.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Pedido actualizado" });
      });
    } else {
      const insertSql = "INSERT INTO pedidos (mesa, detalle, total) VALUES (?, ?, ?)";
      db.query(insertSql, [mesa, detalle, total], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Nuevo pedido creado", id: result.insertId });
      });
    }
  });
});

// 4. LEER PEDIDOS PENDIENTES (Para la barra)
app.get('/api/pedidos/pendientes', (req, res) => {
  const sql = "SELECT * FROM pedidos WHERE estado = 'pendiente' ORDER BY fecha DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// 5. MARCAR COMO ENTREGADO
app.put('/api/pedidos/entregar/:id', (req, res) => {
  const { id } = req.params;
  db.query("UPDATE pedidos SET estado = 'entregado' WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ mensaje: "Pedido entregado" });
  });
});

// 6. NUEVA RUTA: GUARDAR EN HISTORIAL (Cuando presionas "Cobrar" en la App)
app.post('/api/historial/guardar', (req, res) => {
  const { mesa, detalle, total } = req.body;
  const sqlInsert = 'INSERT INTO historial_tickets (mesa, detalle, total) VALUES (?, ?, ?)';
  
  db.query(sqlInsert, [mesa, detalle, total], (err) => {
    if (err) return res.status(500).json(err);
    
    // Limpiamos la tabla pedidos para liberar la mesa
    db.query("DELETE FROM pedidos WHERE mesa = ? AND estado = 'entregado'", [mesa], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ mensaje: "Cuenta guardada en caja" });
    });
  });
});

// 7. NUEVA RUTA: VER HISTORIAL DE CAJA
app.get('/api/historial', (req, res) => {
  db.query("SELECT * FROM historial_tickets ORDER BY fecha DESC LIMIT 50", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// 8. NUEVA RUTA: CIERRE DE TURNO
app.put('/api/historial/cierre', (req, res) => {
  db.query("UPDATE historial_tickets SET archivado = 1 WHERE archivado = 0", (err) => {
    if (err) return res.status(500).json(err);
    res.json({ mensaje: "Turno cerrado" });
  });
});

// 9. ARRANCAR EL SERVIDOR
app.listen(3001, '0.0.0.0', () => {
  console.log('🚀 Servidor Tribus corriendo en puerto 3001');
  console.log('📡 Disponible para celulares en la misma red Wi-Fi');
});