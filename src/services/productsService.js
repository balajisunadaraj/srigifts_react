import { db } from '../firebase';
import { ref, get, set } from 'firebase/database';

const withTimeout = (promise, timeoutMs = 15000) => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
  });

  return Promise.race([promise, timeout]);
};

const normalizeProduct = (product = {}) => {
  const rawTitle = product.title || product.name || product.product_name || product.productTitle || 'Untitled Product';
  const description = product.description || product.details || product.short_description || '';
  const category = product.category || product.product_category || product.type || 'Uncategorized';
  const price = Number(product.price ?? product.cost ?? 0) || 0;
  const inStock = Number(product.inStock ?? product.stock ?? product.in_stock ?? product.available ?? 1) || 0;
  const image = product.image || product.images?.[0] || product.img || product.photo || '';

  // If the product title is identical to its category, try to pick a better title
  let title = rawTitle;
  if (String(rawTitle).trim() === String(category).trim()) {
    const alt = product.name || product.product_name || product.productTitle || product.slug || product.id;
    if (alt && String(alt).trim() && String(alt).trim() !== String(rawTitle).trim()) {
      title = String(alt).trim();
    }
  }

  return {
    ...product,
    id: product.id ?? product.product_id ?? product.slug ?? title,
    title,
    description,
    category,
    price,
    inStock,
    image,
  };
};

const normalizeCategory = (category = {}) => ({
  id: category.id ?? category.name,
  name: category.name || category.label || 'Unknown',
  image: category.image || category.icon || '',
});

const normalizeRecord = (record = {}) => ({
  ...record,
  id: record.id ?? record.uuid ?? record._id ?? record.slug ?? record.name ?? record.title ?? record.email ?? '',
});

const writeRowsToFirebase = async (path, rows) => {
  await set(ref(db, path), {});

  for (const [index, row] of rows.entries()) {
    const key = row.id ?? row.name ?? row.title ?? row.email ?? `${path}-${index}`;
    await set(ref(db, `${path}/${key}`), row);
  }
};


export const fetchFirebaseProducts = async () => {
  const snapshot = await get(ref(db, 'products'));
  const value = snapshot.val();
  if (!value) return [];
  return Object.values(value).map(normalizeProduct);
};

export const fetchFirebaseProductById = async (id) => {
  if (!id) return null;
  const snapshot = await get(ref(db, `products/${id}`));
  const value = snapshot.val();
  if (!value) return null;
  // Firebase product may be stored under key=id; normalize and return
  return normalizeProduct(value);
};

export const fetchFirebaseCategories = async () => {
  const snapshot = await get(ref(db, 'categories'));
  const value = snapshot.val();
  if (!value) return [];
  return Object.values(value).map(normalizeCategory);
};


