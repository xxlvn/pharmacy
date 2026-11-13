// Состояние клиента: сессия (JWT) и корзина. Хранится в localStorage.

const TOKEN_KEY = 'mint.token';
const USER_KEY = 'mint.user';
const CART_KEY = 'mint.cart';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим — работаем без сохранения */
  }
}

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(type) {
  for (const fn of listeners) fn(type);
}

export const auth = {
  token: read(TOKEN_KEY, null),
  user: read(USER_KEY, null),

  get isAuthed() {
    return Boolean(this.token && this.user);
  },
  get isAdmin() {
    return this.user?.role === 'ADMIN';
  },

  set(token, user) {
    this.token = token;
    this.user = user;
    write(TOKEN_KEY, token);
    write(USER_KEY, user);
    emit('auth');
  },

  clear() {
    if (!this.token && !this.user) return;
    this.token = null;
    this.user = null;
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
    emit('auth');
  },
};

// Корзина: { [productId]: { id, name, price, form, dosage, stock, requiresPrescription, qty } }
export const cart = {
  items: read(CART_KEY, {}),

  get list() {
    return Object.values(this.items);
  },
  get count() {
    return this.list.reduce((s, i) => s + i.qty, 0);
  },
  get total() {
    return this.list.reduce((s, i) => s + i.qty * i.price, 0);
  },

  add(product, qty = 1) {
    const current = this.items[product.id]?.qty ?? 0;
    const next = Math.min(current + qty, product.stock, 50);
    this.items[product.id] = {
      id: product.id,
      name: product.name,
      price: product.price,
      form: product.form,
      dosage: product.dosage,
      stock: product.stock,
      requiresPrescription: product.requiresPrescription,
      imageUrl: product.imageUrl ?? null,
      qty: next,
    };
    this.save();
    return next - current;
  },

  setQty(id, qty) {
    const item = this.items[id];
    if (!item) return;
    if (qty <= 0) delete this.items[id];
    else item.qty = Math.min(qty, item.stock, 50);
    this.save();
  },

  remove(id) {
    delete this.items[id];
    this.save();
  },

  clear() {
    this.items = {};
    this.save();
  },

  save() {
    write(CART_KEY, this.items);
    emit('cart');
  },
};
