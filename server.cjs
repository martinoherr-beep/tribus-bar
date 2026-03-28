const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// 1. CONFIGURACIÓN DE SEGURIDAD (CORS)
app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT'], // Agregamos PUT para actualizar estados
  credentials: true
}));

// 2. PERMITIR RECIBIR DATOS (JSON)
app.use(express.json());

// 3. CONFIGURACIÓN DE TU BASE DE DATOS MySQL
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
  console.log('✅ Conectado a MySQL - Tribus Bar');
});

// 4. RUTA PARA RECIBIR O ACTUALIZAR PEDIDOS (POST)
app.post('/api/pedidos', (req, res) => {
  const { mesa, detalle, total } = req.body;

  // Primero buscamos si esa mesa ya tiene un pedido 'pendiente'
  const buscarSql = "SELECT id, detalle, total FROM pedidos WHERE mesa = ? AND estado = 'pendiente' LIMIT 1";

  db.query(buscarSql, [mesa], (err, results) => {
    if (err) return res.status(500).json(err);

    if (results.length > 0) {
      // SI YA EXISTE: Combinamos los textos y sumamos los totales
      const pedidoAnterior = results[0];
      const nuevoDetalle = pedidoAnterior.detalle + "\n" + detalle;
      const nuevoTotal = parseFloat(pedidoAnterior.total) + parseFloat(total);

      const updateSql = "UPDATE pedidos SET detalle = ?, total = ? WHERE id = ?";
      db.query(updateSql, [nuevoDetalle, nuevoTotal, pedidoAnterior.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Pedido actualizado en mesa " + mesa });
      });
    } else {
      // SI NO EXISTE: Creamos uno nuevo desde cero
      const insertSql = "INSERT INTO pedidos (mesa, detalle, total) VALUES (?, ?, ?)";
      db.query(insertSql, [mesa, detalle, total], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: "Nuevo pedido creado", id: result.insertId });
      });
    }
  });
});

// 5. RUTA PARA LEER PEDIDOS DESDE LA BARRA (GET)
app.get('/api/pedidos/pendientes', (req, res) => {
  const sql = "SELECT * FROM pedidos WHERE estado = 'pendiente' ORDER BY fecha DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// 6. RUTA PARA MARCAR COMO ENTREGADO (PUT)
app.put('/api/pedidos/entregar/:id', (req, res) => {
  const { id } = req.params;
  const sql = "UPDATE pedidos SET estado = 'entregado' WHERE id = ?";
  
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ mensaje: "Pedido entregado con éxito" });
  });
});

// 7. ARRANCAR EL SERVIDOR
app.listen(3001, () => {
  console.log('🚀 Servidor de Tribus Bar corriendo en http://localhost:3001');
});