/*
 * MICHELIS, ALEJANDRO
 * Final – Programación Web
 */

'use strict';

// Atajos para seleccionar elementos del DOM
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/**
 * Crea un elemento HTML con atributos y hijos de forma dinámica.
 * Evita repetir document.createElement + setAttribute en todo el código.
 */
function createElement(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (typeof value === 'function' && key.startsWith('on')) {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  }
  node.append(...children);
  return node;
}

/**
 * Formatea un número como precio en pesos argentinos.
 * Ejemplo: 42050 → "$ 42.050"
 */
const formatPrice = v =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(v);

/**
 * Clase que representa un producto del catálogo.
 * Copia todas las propiedades del objeto JSON al instanciar.
 */
class Product {
  constructor(obj) { Object.assign(this, obj); }
}

/**
 * Clase que maneja el carrito de compras.
 * Usa un Map interno donde la clave es el id del producto
 * y el valor es la cantidad agregada.
 * Se persiste automáticamente en localStorage.
 */
class Cart {
  #items = new Map();

  constructor() { this.load(); }

  /** Agrega un producto al carrito. No supera el stock disponible. */
  add(prod, q = 1) {
    const actual = this.#items.get(prod.id) ?? 0;
    if (actual + q > prod.stock) return;
    this.#items.set(prod.id, actual + q);
    this.save();
  }

  /** Resta una unidad de un producto. Si llega a 0, lo elimina. */
  remove(id, q = 1) {
    const actual = this.#items.get(id);
    if (!actual) return;
    actual - q <= 0 ? this.#items.delete(id) : this.#items.set(id, actual - q);
    this.save();
  }

  /** Vacía el carrito por completo. */
  clear() { this.#items.clear(); this.save(); }

  /** Devuelve la cantidad total de artículos en el carrito. */
  count() { return [...this.#items.values()].reduce((a, b) => a + b, 0); }

  /** Calcula el precio total del carrito usando la lista de productos. */
  total(list) {
    return [...this.#items.entries()].reduce((s, [id, q]) => {
      const p = list.find(x => x.id === id);
      return p ? s + p.precio * q : s;
    }, 0);
  }

  /** Devuelve los pares [id, cantidad] del carrito. */
  entries() { return this.#items.entries(); }

  /** Guarda el carrito en localStorage y actualiza el indicador del header. */
  save() {
    localStorage.setItem('cart', JSON.stringify([...this.#items]));
    updateMiniCart();
  }

  /** Recupera el carrito guardado en localStorage al iniciar. */
  load() {
    const raw = localStorage.getItem('cart');
    if (raw) this.#items = new Map(JSON.parse(raw));
  }
}

// Instancia global del carrito
const cart = new Cart();

// Lista global de productos cargados desde el JSON
let products = [];

/**
 * Carga los productos desde el archivo productos.json.
 * Una vez cargados, llena los filtros, renderiza el grid
 * y guarda los productos en localStorage para que pago.js pueda usarlos.
 */
fetch('productos.json')
  .then(r => r.json())
.then(data => {
  const productosBase = data.map(o => new Product(o));
  const productosExtra = JSON.parse(localStorage.getItem('productosExtra') || '[]')
    .map(o => new Product(o));
  products = [...productosBase, ...productosExtra];
  localStorage.setItem('products', JSON.stringify(products));
  fillCategoryFilterOptions();
  renderProductList(products);
  updateMiniCart();
});

/**
 * Llena el select de categorías con los valores únicos
 * encontrados en la lista de productos.
 */
function fillCategoryFilterOptions() {
  const sel = $('#categoryFilter');
  [...new Set(products.map(p => p.categoria))]
    .forEach(cat => sel.append(createElement('option', { value: cat, text: cat })));
}

/**
 * Renderiza la grilla de productos en el DOM.
 * Reemplaza todo el contenido anterior del grid.
 */
function renderProductList(list) {
  const grid = $('#productGrid');
  grid.replaceChildren();
  list.forEach(p => grid.append(createProductCard(p)));
}

/**
 * Crea la card visual de un producto con imagen, nombre,
 * descripción, precio y botón para ver el detalle.
 */
function createProductCard(p) {
  return createElement('article', { class: 'card' },
    createElement('img', {
      src: p.imagen,
      alt: p.nombre,
      onerror: "this.src='https://placehold.co/300x200?text=Sin+imagen';"
    }),
    createElement('div', { class: 'info' },
      createElement('h3', { text: p.nombre }),
      createElement('p', { text: p.descripcion }),
      createElement('span', { class: 'price', text: formatPrice(p.precio) }),
      createElement('button', {
        class: 'btn-primary',
        text: 'Agregar',
        onclick: () => showProductModalDialog(p)
      })
    )
  );
}

/**
 * Abre un modal (dialog nativo) con el detalle completo del producto.
 * Layout horizontal en desktop: imagen a la izquierda, info a la derecha.
 */
function showProductModalDialog(p) {
  const dialog = createElement('dialog', { class: 'modal-dialog modal-product' },
    createElement('div', { class: 'modal-content modal-product-content' },
      createElement('img', { src: p.imagen, alt: p.nombre, class: 'product-image' }),
      createElement('div', { class: 'product-info' },
        createElement('h2', { text: p.nombre }),
        createElement('p', { text: p.descripcion }),
        createElement('p', { text: `📦 Stock: ${p.stock}` }),
        createElement('h3', { text: formatPrice(p.precio) }),
        createElement('div', { class: 'actions' },
          createElement('button', {
            class: 'btn-primary',
            text: 'Agregar al carrito',
            onclick: () => addToCartAndClose(p, dialog)
          }),
          createElement('button', {
            class: 'btn-secondary',
            text: 'Cerrar',
            onclick: () => { dialog.close(); dialog.remove(); }
          })
        )
      )
    )
  );

  document.body.appendChild(dialog);
  dialog.showModal();
  // Evita que Escape cierre el dialog sin control
  dialog.addEventListener('cancel', (e) => e.preventDefault());
}

/**
 * Agrega el producto al carrito y cierra el modal de detalle.
 */
function addToCartAndClose(product, dialog) {
  cart.add(product);
  dialog.close();
  dialog.remove();
}

// Abre el modal del carrito al hacer clic en el botón del header
$('#miniCartBtn').addEventListener('click', showCartModalDialog);

/**
 * Abre un modal con el contenido actual del carrito.
 * Muestra los items, totales y botones de acción.
 * Si el carrito está vacío, muestra un mensaje alternativo.
 */
function showCartModalDialog() {
  const dialog = createElement('dialog', { class: 'modal-dialog cart-dialog' });

  // Header del modal con título y botón para cerrar
  const header = createElement('div', { class: 'modal-header' });
  const titulo = createElement('h2', { text: '🛒 Tu carrito' });
  const btnCerrar = createElement('button', {
    class: 'modal-close-btn',
    text: '✕',
    onclick: () => { dialog.close(); dialog.remove(); }
  });
  header.append(titulo, btnCerrar);

  const box = createElement('div', { class: 'modal-content' });
  box.append(header);

  if (cart.count() === 0) {
    // Carrito vacío
    box.append(
      createElement('p', { text: 'El carrito está vacío', class: 'empty-cart-message' }),
      createElement('button', {
        class: 'btn-primary',
        text: 'Continuar comprando',
        onclick: () => { dialog.close(); dialog.remove(); }
      })
    );
  } else {
    // Lista de items del carrito
    const list = createElement('div', { class: 'cart-items-list' });

    for (const [id, q] of cart.entries()) {
      const p = products.find(x => x.id === id);
      if (!p) continue;

      list.append(createElement('div', { class: 'cartItem' },
        createElement('img', {
          src: p.imagen,
          alt: p.nombre,
          class: 'cart-item-image'
        }),
        createElement('div', { class: 'cart-item-info' },
          createElement('span', { text: `${p.nombre} × ${q}` }),
          createElement('span', { class: 'cart-item-price', text: formatPrice(p.precio * q) })
        ),
        createElement('div', { class: 'cart-item-controls' },
          // Botón para restar una unidad
          createElement('button', {
            class: 'btn-cart-control',
            text: '−',
            onclick: () => {
              removeFromCart(id);
              dialog.close(); dialog.remove();
              showCartModalDialog();
            }
          }),
          // Botón para sumar una unidad
          createElement('button', {
            class: 'btn-cart-control',
            text: '+',
            onclick: () => {
              addToCart(p);
              dialog.close(); dialog.remove();
              showCartModalDialog();
            }
          })
        )
      ));
    }

    box.append(
      list,
      createElement('hr'),
      createElement('p', { text: `📦 Artículos: ${cart.count()}`, class: 'cart-count' }),
      createElement('h3', { text: `💰 Total: ${formatPrice(cart.total(products))}`, class: 'cart-total' }),
      createElement('div', { class: 'actions' },
        createElement('button', {
          class: 'btn-secondary',
          text: 'Vaciar carrito',
          onclick: () => {
            clearCart();
            dialog.close(); dialog.remove();
            showCartModalDialog();
          }
        }),
        createElement('a', {
          class: 'btn-primary',
          href: 'checkout.html',
          text: 'Proceder al pago'
        })
      )
    );
  }

  dialog.appendChild(box);
  document.body.appendChild(dialog);
  dialog.showModal();

  dialog.addEventListener('cancel', (e) => e.preventDefault());
  // Cerrar al hacer clic fuera del modal
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) { dialog.close(); dialog.remove(); }
  });
}

// Escucha cambios en los filtros para re-renderizar el listado
$('#categoryFilter').addEventListener('change', applyProductFilters);
$('#priceOrder').addEventListener('change', applyProductFilters);
$('#rangeBtn').addEventListener('click', applyProductFilters);

/**
 * Aplica los filtros de categoría, rango de precios y orden
 * sobre la lista completa de productos y vuelve a renderizarla.
 */
function applyProductFilters() {
  let list = [...products];

  // Filtro por categoría
  const cat = $('#categoryFilter').value;
  if (cat !== 'all') list = list.filter(p => p.categoria === cat);

  // Filtro por rango de precio
  const min = parseFloat($('#minPrice').value) || 0;
  const max = parseFloat($('#maxPrice').value) || Infinity;
  list = list.filter(p => p.precio >= min && p.precio <= max);

  // Orden por precio
  const ord = $('#priceOrder').value;
  if (ord === 'asc') list.sort((a, b) => a.precio - b.precio);
  else if (ord === 'desc') list.sort((a, b) => b.precio - a.precio);

  renderProductList(list);
}

/* ------------------- Mini-cart del header ------------------- */

/** Actualiza el contador y total visibles en el botón del carrito del header. */
function updateMiniCart() {
  $('#cartCount').textContent = cart.count();
  $('#cartTotal').textContent = formatPrice(cart.total(products));
}

/** Quita una unidad de un producto del carrito. */
function removeFromCart(productId, quantity = 1) {
  cart.remove(productId, quantity);
}

/** Agrega una unidad de un producto al carrito. */
function addToCart(product, quantity = 1) {
  cart.add(product, quantity);
}

/** Vacía el carrito por completo. */
function clearCart() {
  cart.clear();
}

/* ------------------- Menú móvil ------------------- */

/** Alterna la visibilidad del menú de navegación en pantallas pequeñas. */
const menuToggle = $('#menuToggleBtn');
if (menuToggle) {
  menuToggle.addEventListener('click', toggleMainMenu);
}

function toggleMainMenu() {
  const nav = $('.main-nav');
  if (nav) nav.classList.toggle('open');
}

/* ------------------- Countdown del popup ------------------- */

// Fecha límite: 4 días, 18 horas y 34 minutos desde que se carga la página
const deadline = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000 + 34 * 60 * 1000);

/** Actualiza los dígitos del contador regresivo cada 30 segundos. */
function updateCountdown() {
  const diff = deadline - Date.now();
  if (diff <= 0) return;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  document.getElementById('days').textContent    = String(d).padStart(2, '0');
  document.getElementById('hours').textContent   = String(h).padStart(2, '0');
  document.getElementById('minutes').textContent = String(m).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 30000);

/* ------------------- Popup de oferta de bienvenida ------------------- */

/** Oculta el popup de oferta agregando la clase 'hidden'. */
function cerrarPopup() {
  document.getElementById('offerPopup').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  // Botón "IR AL CATÁLOGO" cierra el popup
  document.getElementById('closePopupBtn').addEventListener('click', cerrarPopup);
  // Botón X cierra el popup
  document.getElementById('closePopupX').addEventListener('click', cerrarPopup);
  // Clic fuera del contenido también lo cierra
  document.getElementById('offerPopup').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarPopup();
  });
});
