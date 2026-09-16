import { supabase } from '../supabase';
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

export const fetchSupabaseProducts = async () => {
  const { data, error } = await withTimeout(
    supabase.from('products').select('*').order('id', { ascending: false })
  );

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeProduct);
};

export const fetchSupabaseCategories = async () => {
  const { data, error } = await withTimeout(
    supabase.from('categories').select('name, image, id')
  );

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeCategory);
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

export const fetchSupabaseProductById = async (id) => {
  if (!id) return null;
  const { data, error } = await withTimeout(
    supabase.from('products').select('*').eq('id', id).single()
  );
  if (error) return null;
  return normalizeProduct(data || {});
};

export const syncSupabaseProductsToFirebase = async () => {
  const products = await fetchSupabaseProducts();
  const productsMap = toFirebaseMap(products, 'id');
  await set(ref(db, 'products'), productsMap);
  return products;
};

export const syncSupabaseCategoriesToFirebase = async () => {
  const categories = await fetchSupabaseCategories();
  const categoriesMap = toFirebaseMap(categories, 'id');
  await set(ref(db, 'categories'), categoriesMap);
  return categories;
};

export const syncSupabaseTablesToFirebase = async () => {
  const tableConfigs = [
    { table: 'products', path: 'products', normalize: normalizeProduct },
    { table: 'categories', path: 'categories', normalize: normalizeCategory },
    { table: 'offers', path: 'offers', normalize: normalizeRecord },
    { table: 'orders', path: 'orders', normalize: normalizeRecord },
    { table: 'users', path: 'users', normalize: normalizeRecord },
    { table: 'wishlist', path: 'wishlist', normalize: normalizeRecord },
    { table: 'reviews', path: 'reviews', normalize: normalizeRecord },
  ];

  const results = [];

  for (const { table, path, normalize } of tableConfigs) {
    const { data, error } = await withTimeout(supabase.from(table).select('*'));

    if (error) {
      results.push({ table, path, count: 0, error });
      continue;
    }

    const normalizedRows = (data || []).map(normalize || normalizeRecord);
    await writeRowsToFirebase(path, normalizedRows);
    results.push({ table, path, count: normalizedRows.length });
  }

  return results;
};

export const syncSupabaseProductsAndCategoriesToFirebase = async () => {
  const products = await syncSupabaseProductsToFirebase();
  const categories = await syncSupabaseCategoriesToFirebase();
  return { products, categories };
};
