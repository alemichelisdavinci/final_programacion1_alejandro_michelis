/*
 * Checkout Script
 * Maneja la funcionalidad del carrito en la página de checkout
 */

'use strict';

const $ = sel => document.querySelector(sel);

const SHIPPING_COSTS = {
  retiro: 0,
  normal: 150,
  express: 350
};

let products = [];
let cart = new Map();
let cartTotal = 0;

// Cargar productos combinando productos.json con los agregados manualmente
fetch('productos.json')
  .then(r => r.json())
  .then(data => {
    const productosExtra = JSON.parse(localStorage.getItem('productosExtra') || '[]');
    products = [...data, ...productosExtra];
    loadCartFromStorage();
    renderCheckoutCart();
    setupEventListeners();
  });

function loadCartFromStorage() {
  const raw = localStorage.getItem('cart');
  if (raw) {
    cart = new Map(JSON.parse(raw));
  }
}

function renderCheckoutCart() {
  const container = $('#checkoutCart');

  if (cart.size === 0) {
    container.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío. <a href="index.html">Volver a la tienda</a></p>';
    disableCheckoutForm();
    return;
  }

  let subtotal = 0;
  let html = '';

  for (const [productId, quantity] of cart.entries()) {
    const product = products.find(p => p.id === productId);
    if (!product) continue;

    const itemTotal = product.precio * quantity;
    subtotal += itemTotal;

    html += `
      <div class="checkout-cart-item">
        <div class="checkout-item-image">
          <img src="${product.imagen}" alt="${product.nombre}"
               onerror="this.src='https://placehold.co/80x60?text=Imagen';">
        </div>
        <div class="checkout-item-details">
          <h4>${product.nombre}</h4>
          <p>${quantity} × <strong>${formatPrice(product.precio)}</strong></p>
        </div>
        <div class="checkout-item-subtotal">
          <strong>${formatPrice(itemTotal)}</strong>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  cartTotal = subtotal;
  updateCheckoutTotals();
}

function updateCheckoutTotals() {
  const shippingSelect = $('#envio');
  const shipping = SHIPPING_COSTS[shippingSelect?.value] || 0;
  const total = cartTotal + shipping;

  $('#subtotal').textContent      = formatPrice(cartTotal);
  $('#shippingCost').textContent  = formatPrice(shipping);
  $('#totalCheckout').textContent = formatPrice(total);
}

function setupEventListeners() {
  const shippingSelect = $('#envio');
  if (shippingSelect) {
    shippingSelect.addEventListener('change', updateCheckoutTotals);
  }

  const checkoutForm = $('#checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }
}

function handleCheckoutSubmit(e) {
  e.preventDefault();

  const nombre    = $('#nombre').value.trim();
  const email     = $('#email').value.trim();
  const direccion = $('#direccion').value.trim();
  const envio     = $('#envio').value;
  const pago      = $('#pago').value;

  if (!nombre || !email || !direccion || !envio || !pago) {
    alert('Por favor completá todos los campos requeridos.');
    return;
  }

  // Guardar datos del checkout en localStorage para que pago.js los lea
  const checkoutData = {
    nombre,
    email,
    direccion,
    envio,
    pago,
    cart: [...cart.entries()],
    subtotal: cartTotal,
    shipping: SHIPPING_COSTS[envio],
    total: cartTotal + SHIPPING_COSTS[envio],
    timestamp: new Date().toISOString()
  };

  localStorage.setItem('checkoutData', JSON.stringify(checkoutData));

  // Pasar el método de pago por URL para que pago.js lo muestre
  window.location.href = `pago.html?pago=${encodeURIComponent(pago)}`;
}

function disableCheckoutForm() {
  const form = $('#checkoutForm');
  if (form) {
    form.querySelectorAll('input, select, textarea, button[type="submit"]')
        .forEach(el => el.disabled = true);
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(value);
}
