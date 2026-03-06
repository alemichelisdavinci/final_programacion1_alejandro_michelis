'use strict';

// El carrito se guarda como [[id, cantidad], [id, cantidad], ...]
const cartRaw = JSON.parse(localStorage.getItem('cart')) || [];
const cartMap = new Map(cartRaw);

// Productos guardados desde index (necesitamos los datos completos)
const products = JSON.parse(localStorage.getItem('products')) || [];

const paymentCart   = document.getElementById('paymentCart');
const paymentTotal  = document.getElementById('paymentTotal');
const payBtn        = document.getElementById('payBtn');
const paymentStatus = document.getElementById('paymentStatus');
const paymentMethod = document.getElementById('paymentMethod');

// Método de pago desde URL
const params      = new URLSearchParams(window.location.search);
const metodoPago  = params.get('pago');
paymentMethod.textContent = metodoPago || 'No especificado';

const formatPrice = v =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(v);

function renderCart() {
  if (cartMap.size === 0) {
    paymentCart.innerHTML = '<p>No hay productos en el carrito.</p>';
    paymentTotal.textContent = formatPrice(0);
    return;
  }

  paymentCart.innerHTML = '';
  let total = 0;

  for (const [id, qty] of cartMap) {
    const p = products.find(x => x.id === id);
    if (!p) continue;

    const subtotal = p.precio * qty;
    total += subtotal;

    const item = document.createElement('div');
    item.className = 'checkout-cart-item';
    item.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}"
           onerror="this.src='https://placehold.co/64x48?text=?'">
      <span class="item-name">${p.nombre} × ${qty}</span>
      <span class="item-subtotal">${formatPrice(subtotal)}</span>
    `;
    paymentCart.appendChild(item);
  }

  paymentTotal.textContent = formatPrice(total);
}

renderCart();

// Simular pago
payBtn.addEventListener('click', () => {
  payBtn.disabled = true;
  paymentStatus.textContent = 'Procesando pago...';
  paymentStatus.className = 'payment-status';

  setTimeout(() => {
    paymentStatus.textContent = '✅ ¡Pago realizado con éxito!';
    paymentStatus.className = 'payment-status success';
    localStorage.removeItem('cart');

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }, 2000);
});