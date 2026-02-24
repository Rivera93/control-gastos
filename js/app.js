let transacciones = [];
let filtroInicio = null;
let filtroFin = null;
let graficaInstancia = null;

// Cargar transacciones desde Firestore
function cargarTransacciones() {
  db.collection('transacciones')
    .orderBy('fecha', 'desc')
    .onSnapshot(snapshot => {
      transacciones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      actualizarUI();
    });
}

function guardar(transaccion) {
  return db.collection('transacciones').add(transaccion);
}

function agregarTransaccion() {
  const descripcion = document.getElementById('descripcion').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const categoria = document.getElementById('categoria').value;
  const fechaValor = document.getElementById('fecha-transaccion').value;
  const notas = document.getElementById('notas').value.trim();

  if (!descripcion || isNaN(monto) || !categoria || !fechaValor) {
    alert('Por favor completa todos los campos incluyendo la fecha');
    return;
  }

  const [anio, mes, dia] = fechaValor.split('-');
  const fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
  const montoFinal = categoria === 'ingreso' ? Math.abs(monto) : -Math.abs(monto);

  const transaccion = {
    fecha: fecha.getTime(),
    descripcion,
    monto: montoFinal,
    categoria,
    notas
  };

  guardar(transaccion).then(() => {
    document.getElementById('descripcion').value = '';
    document.getElementById('monto').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('notas').value = '';

    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${(hoy.getMonth()+1).toString().padStart(2,'0')}-${hoy.getDate().toString().padStart(2,'0')}`;
    document.getElementById('fecha-transaccion').value = fechaHoy;
  });
}

function eliminarTransaccion(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
  db.collection('transacciones').doc(id).delete();
}

function filtrar() {
  const inicio = document.getElementById('fecha-inicio').value;
  const fin = document.getElementById('fecha-fin').value;

  if (!inicio || !fin) {
    alert('Por favor selecciona ambas fechas');
    return;
  }

  const [anioI, mesI, diaI] = inicio.split('-');
  const [anioF, mesF, diaF] = fin.split('-');

  filtroInicio = new Date(anioI, mesI - 1, diaI, 0, 0, 0);
  filtroFin = new Date(anioF, mesF - 1, diaF, 23, 59, 59);

  actualizarUI();
}

function limpiarFiltro() {
  filtroInicio = null;
  filtroFin = null;
  document.getElementById('fecha-inicio').value = '';
  document.getElementById('fecha-fin').value = '';
  actualizarUI();
}

function autoMonto() {
  const categoria = document.getElementById('categoria').value;
  const montoInput = document.getElementById('monto');

  if (categoria === 'ingreso') {
    montoInput.placeholder = 'Monto (positivo para ingresos)';
    const valor = parseFloat(montoInput.value);
    if (!isNaN(valor) && valor < 0) montoInput.value = Math.abs(valor);
  } else {
    montoInput.placeholder = 'Monto (negativo para gastos)';
    const valor = parseFloat(montoInput.value);
    if (!isNaN(valor) && valor > 0) montoInput.value = -Math.abs(valor);
  }
}

function toggleSeccion(id) {
  const cuerpo = document.getElementById(id);
  const iconos = {
    'grafica-cuerpo': 'icono-grafica',
    'mensual-cuerpo': 'icono-mensual',
    'transacciones-cuerpo': 'icono-transacciones'
  };

  cuerpo.classList.toggle('seccion-oculta');
  const icono = document.getElementById(iconos[id]);
  icono.textContent = cuerpo.classList.contains('seccion-oculta') ? '▶' : '▼';
}

function toggleModoOscuro() {
  document.body.classList.toggle('oscuro');
  const btn = document.getElementById('btn-modo-oscuro');
  const esOscuro = document.body.classList.contains('oscuro');
  btn.textContent = esOscuro ? '☀️' : '🌙';
  localStorage.setItem('modoOscuro', esOscuro);
}

function actualizarResumenMensual() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const resumen = {};

  transacciones.forEach(t => {
    const fecha = new Date(t.fecha);
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;

    if (!resumen[clave]) {
      resumen[clave] = {
        nombre: meses[fecha.getMonth()] + ' ' + fecha.getFullYear(),
        ingresos: 0,
        gastos: 0
      };
    }

    if (t.monto > 0) resumen[clave].ingresos += t.monto;
    else resumen[clave].gastos += Math.abs(t.monto);
  });

  const tabla = document.getElementById('tabla-mensual');

  if (Object.keys(resumen).length === 0) {
    tabla.innerHTML = '<p class="sin-transacciones">Sin datos aún</p>';
    return;
  }

  const claves = Object.keys(resumen).sort().reverse();

  tabla.innerHTML = claves.map(clave => {
    const m = resumen[clave];
    const balance = m.ingresos - m.gastos;
    return `
      <div class="mes-item">
        <span class="mes-nombre">${m.nombre}</span>
        <span class="mes-ingreso">+$${m.ingresos.toFixed(2)}</span>
        <span class="mes-gasto">-$${m.gastos.toFixed(2)}</span>
        <span class="${balance >= 0 ? 'mes-balance-pos' : 'mes-balance-neg'}">
          $${balance.toFixed(2)}
        </span>
      </div>
    `;
  }).join('');
}

function actualizarUI() {
  const lista = document.getElementById('lista-transacciones');
  lista.innerHTML = '';

  let transaccionesFiltradas = transacciones;

  if (filtroInicio && filtroFin) {
    transaccionesFiltradas = transacciones.filter(t => {
      const fecha = new Date(t.fecha);
      const fechaNorm = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      return fechaNorm >= filtroInicio && fechaNorm <= filtroFin;
    });
  }

  if (transaccionesFiltradas.length === 0) {
    lista.innerHTML = '<p class="sin-transacciones">No hay transacciones para mostrar</p>';
    actualizarGrafica([]);
    actualizarResumenMensual();
    return;
  }

  let ingresos = 0;
  let gastos = 0;

  transaccionesFiltradas.forEach(t => {
    if (t.monto > 0) ingresos += t.monto;
    else gastos += Math.abs(t.monto);

    const li = document.createElement('li');
    li.classList.add(t.monto > 0 ? 'li-ingreso' : 'li-gasto');

    const fecha = new Date(t.fecha);
    const fechaFormato = `${fecha.getDate().toString().padStart(2,'0')}/${(fecha.getMonth()+1).toString().padStart(2,'0')}/${fecha.getFullYear()}`;
    const notasHTML = t.notas ? '<br><small class="notas-texto">📝 ' + t.notas + '</small>' : '';

    li.innerHTML = `
      <span>
        ${t.descripcion} <span class="categoria-badge">${t.categoria}</span>
        ${notasHTML}
      </span>
      <span class="fecha-transaccion">${fechaFormato}</span>
      <span class="${t.monto > 0 ? 'monto-ingreso' : 'monto-gasto'}">
        ${t.monto > 0 ? '+' : ''}$${t.monto.toFixed(2)}
      </span>
      <button class="btn-eliminar" onclick="eliminarTransaccion('${t.id}')">✕</button>
    `;
    lista.appendChild(li);
  });

  document.getElementById('total-ingresos').textContent = `$${ingresos.toFixed(2)}`;
  document.getElementById('total-gastos').textContent = `$${gastos.toFixed(2)}`;
  const balance = ingresos - gastos;
  const balanceEl = document.getElementById('balance');
  balanceEl.textContent = `$${balance.toFixed(2)}`;
  balanceEl.style.color = balance < 0 ? '#e74c3c' : '#2ecc71';
  actualizarGrafica(transaccionesFiltradas);
  actualizarResumenMensual();
}

function actualizarGrafica(transaccionesFiltradas) {
  const gastosPorCategoria = {};
  const ingresosPorCategoria = {};

  transaccionesFiltradas.forEach(t => {
    if (t.monto < 0) {
      if (!gastosPorCategoria[t.categoria]) gastosPorCategoria[t.categoria] = 0;
      gastosPorCategoria[t.categoria] += Math.abs(t.monto);
    } else {
      if (!ingresosPorCategoria[t.categoria]) ingresosPorCategoria[t.categoria] = 0;
      ingresosPorCategoria[t.categoria] += t.monto;
    }
  });

  const etiquetas = [
    ...Object.keys(ingresosPorCategoria).map(c => '✅ ' + c),
    ...Object.keys(gastosPorCategoria).map(c => '❌ ' + c)
  ];

  const montos = [
    ...Object.values(ingresosPorCategoria),
    ...Object.values(gastosPorCategoria)
  ];

  const coloresIngresos = ['#2ecc71', '#1abc9c', '#27ae60', '#16a085'];
  const coloresGastos = ['#e74c3c', '#e67e22', '#f39c12', '#9b59b6', '#3498db', '#34495e'];

  const colores = [
    ...Object.keys(ingresosPorCategoria).map((_, i) => coloresIngresos[i % coloresIngresos.length]),
    ...Object.keys(gastosPorCategoria).map((_, i) => coloresGastos[i % coloresGastos.length])
  ];

  if (graficaInstancia) graficaInstancia.destroy();

  const ctx = document.getElementById('grafica').getContext('2d');
  graficaInstancia = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: etiquetas,
      datasets: [{
        data: montos,
        backgroundColor: colores
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Inicializar
if (localStorage.getItem('modoOscuro') === 'true') {
  document.body.classList.add('oscuro');
  document.getElementById('btn-modo-oscuro').textContent = '☀️';
}

document.getElementById('grafica-cuerpo').classList.add('seccion-oculta');
document.getElementById('icono-grafica').textContent = '▶';
document.getElementById('mensual-cuerpo').classList.add('seccion-oculta');
document.getElementById('icono-mensual').textContent = '▶';
document.getElementById('transacciones-cuerpo').classList.add('seccion-oculta');
document.getElementById('icono-transacciones').textContent = '▶';

const hoy = new Date();
const fechaHoy = `${hoy.getFullYear()}-${(hoy.getMonth()+1).toString().padStart(2,'0')}-${hoy.getDate().toString().padStart(2,'0')}`;
document.getElementById('fecha-transaccion').value = fechaHoy;

cargarTransacciones();