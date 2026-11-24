const TELEFONO_WHATSAPP = '593969504030';
let productosGlobal = [];

// Estado centralizado de filtros
const estado = {
  categoria: 'todos',
  busqueda: ''
};

// Referencias al DOM
const gridContainer = document.getElementById('catalogo-grid');
const filtrosContainer = document.getElementById('filtros-container');
const buscadorInput = document.getElementById('buscador-input');
const modal = document.getElementById('producto-modal');
const modalContenido = document.getElementById('modal-contenido');

async function cargarProductos() {
  try {
    const respuesta = await fetch('./js/productos.json');
    if (!respuesta.ok) throw new Error('Error al leer productos.json');
    productosGlobal = await respuesta.json();
    aplicarFiltros();
  } catch (error) {
    console.error(error);
    gridContainer.innerHTML = `<p class="col-span-full text-center text-red-400 py-8">Error cargando catálogo. Abre con Live Server.</p>`;
  }
}
// Convierte "Análisis Técnico" -> "analisis tecnico"
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con tilde
    .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
    .trim();
}

function aplicarFiltros() {
  const terminoLimpio = normalizarTexto(estado.busqueda);

  const filtrados = productosGlobal.filter(prod => {
    // 1. Filtro por pestaña de categoría
    const coincideCategoria = estado.categoria === 'todos' || prod.categoria === estado.categoria;
    if (!coincideCategoria) return false;

    // Si el buscador está vacío, pasa directo
    if (!terminoLimpio) return true;

    // 2. Unimos toda la información del producto en un solo texto normalizado
    const textoCompletoProducto = normalizarTexto([
      prod.titulo,
      prod.descripcion,
      prod.etiqueta,
      ...(prod.keywords || [])
    ].join(' '));

    // Coincidencia directa sin tildes (ej: "analisis" encuentra "Análisis")
    if (textoCompletoProducto.includes(terminoLimpio)) return true;

    // 3. Búsqueda difusa palabra por palabra (si escribió apurado, ej: "targeta" o "limpipipas")
    const palabrasBusqueda = terminoLimpio.split(/\s+/);
    const palabrasProducto = textoCompletoProducto.split(/\s+/);

    return palabrasBusqueda.every(palabraBuscada => {
      // Solo aplicamos tolerancia a errores en palabras de 4 o más letras
      if (palabraBuscada.length < 4) {
        return textoCompletoProducto.includes(palabraBuscada);
      }
      const tolerancia = palabraBuscada.length >= 7 ? 2 : 1; // 1 error en palabras cortas, 2 en largas
      return palabrasProducto.some(palabraProd => 
        palabraProd.includes(palabraBuscada) || 
        distanciaLevenshtein(palabraBuscada, palabraProd) <= tolerancia
      );
    });
  });

  renderizarProductos(filtrados);
}
// Calcula cuántos cambios de letras hay entre palabra A y palabra B
function distanciaLevenshtein(a, b) {
  const matriz = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,      // Eliminación
        matriz[i][j - 1] + 1,      // Inserción
        matriz[i - 1][j - 1] + costo // Sustitución
      );
    }
  }
  return matriz[a.length][b.length];
}
function obtenerTextoPrecio(prod) {
  return (prod.categoria === 'desarrollo' || prod.categoria === 'datos')
    ? `Desde $${prod.precio.toFixed(2)}`
    : `$${prod.precio.toFixed(2)}`;
}

function renderizarProductos(lista) {
  gridContainer.innerHTML = '';

  if (lista.length === 0) {
    gridContainer.innerHTML = `<p class="col-span-full text-center text-neutral-500 py-10">No se encontraron resultados para tu búsqueda.</p>`;
    return;
  }

  lista.forEach(prod => {
    const textoPrecio = obtenerTextoPrecio(prod);
    const urlWhatsApp = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(`Hola JS, me interesa: *${prod.titulo}* (${textoPrecio}).`)}`;

    const card = document.createElement('article');
    card.className = 'bg-neutral-900/70 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-orange-500/50 transition duration-300';

    card.innerHTML = `
      <div class="cursor-pointer btn-detalle" data-id="${prod.id}">
        <div class="aspect-video bg-neutral-800 overflow-hidden relative">
          <img src="${prod.imagen}" alt="${prod.titulo}" 
               onerror="this.src='https://placehold.co/600x400/171717/f97316?text=JS+Tech'"
               class="w-full h-full object-cover hover:scale-105 transition duration-500" />
          <span class="absolute top-3 right-3 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-neutral-950/80 text-orange-400 border border-orange-500/30">
            ${prod.etiqueta || prod.categoria}
          </span>
        </div>
        <div class="p-5">
          <h2 class="text-lg font-bold text-white mb-2 group-hover:text-orange-400">${prod.titulo}</h2>
          <p class="text-sm text-neutral-400 line-clamp-2">${prod.descripcion}</p>
          <span class="inline-block mt-3 text-xs font-semibold text-orange-400 hover:underline">Ver especificaciones →</span>
        </div>
      </div>

      <div class="px-5 pb-5 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
        <span class="text-xl font-extrabold text-orange-400">${textoPrecio}</span>
        <a href="${urlWhatsApp}" target="_blank" rel="noopener noreferrer"
           class="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-950 font-bold text-sm transition">
          Pedir
        </a>
      </div>
    `;

    gridContainer.appendChild(card);
  });
}

// Abrir modal con detalles del producto
function abrirModal(idProducto) {
  const prod = productosGlobal.find(p => p.id === idProducto);
  if (!prod) return;

  const textoPrecio = obtenerTextoPrecio(prod);
  const urlWhatsApp = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(`Hola JS, quiero solicitar: *${prod.titulo}* (${textoPrecio}).`)}`;
  
  const listaDetalles = (prod.detalles || [prod.descripcion])
    .map(item => `<li class="flex items-start gap-2 text-sm text-neutral-300"><span class="text-orange-500 font-bold">✓</span><span>${item}</span></li>`)
    .join('');

  modalContenido.innerHTML = `
    <div class="relative">
      <img src="${prod.imagen}" onerror="this.src='https://placehold.co/600x400/171717/f97316?text=JS+Tech'" class="w-full h-48 object-cover" />
      <button id="cerrar-modal" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-neutral-950/80 text-white hover:bg-orange-500 hover:text-black font-bold transition">✕</button>
    </div>
    <div class="p-6">
      <span class="text-xs font-bold uppercase text-orange-400">${prod.etiqueta || prod.categoria}</span>
      <h3 class="text-2xl font-extrabold text-white mt-1 mb-3">${prod.titulo}</h3>
      <p class="text-sm text-neutral-400 mb-4">${prod.descripcion}</p>
      
      <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">¿Qué incluye?</h4>
      <ul class="space-y-2 mb-6">${listaDetalles}</ul>

      <div class="flex items-center justify-between pt-4 border-t border-neutral-800">
        <div>
          <span class="block text-xs text-neutral-500">Inversión</span>
          <span class="text-2xl font-black text-orange-400">${textoPrecio}</span>
        </div>
        <a href="${urlWhatsApp}" target="_blank" rel="noopener noreferrer"
           class="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-950 font-bold text-sm transition">
          Solicitar por WhatsApp
        </a>
      </div>
    </div>
  `;

  modal.showModal();
  document.getElementById('cerrar-modal').addEventListener('click', () => modal.close());
}

// Eventos
filtrosContainer.addEventListener('click', (e) => {
  const boton = e.target.closest('.filtro-btn');
  if (!boton) return;

  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.classList.remove('bg-orange-500', 'text-neutral-950');
    btn.classList.add('bg-neutral-900', 'text-neutral-300');
  });
  boton.classList.remove('bg-neutral-900', 'text-neutral-300');
  boton.classList.add('bg-orange-500', 'text-neutral-950');

  estado.categoria = boton.dataset.categoria;
  aplicarFiltros();
});

buscadorInput.addEventListener('input', (e) => {
  estado.busqueda = e.target.value;
  aplicarFiltros();
});

gridContainer.addEventListener('click', (e) => {
  const tarjeta = e.target.closest('.btn-detalle');
  if (tarjeta) abrirModal(tarjeta.dataset.id);
});

// Cerrar modal al hacer clic fuera de la caja
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

cargarProductos();