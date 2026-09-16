import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import { CATEGORY_OPTIONS } from '../data/categories';

const CategoryGrid = () => {
  const [categories, setCategories] = useState(CATEGORY_OPTIONS);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await get(ref(db, "categories"));

        let dbCats = [];

        if (snapshot.exists()) {
        const data = snapshot.val();

        dbCats = Object.entries(data).map(([id, value]) => ({
          id,
          name: value.name,
          image: value.image || "/Customized gifts.png",
        }));
      }

      const allCats = [...CATEGORY_OPTIONS, ...dbCats];

      const uniqueCats = Array.from(
        new Map(allCats.map((item) => [item.name, item])).values()
      );

      setCategories(uniqueCats);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryName) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section className="container">
      <div className="text-center">
        <h2>Browse by Category</h2>
        <p>Discover our wide range of customized gifts and keepsakes</p>
      </div>
      <div className="categories-grid">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="category-button"
            onClick={() => handleCategoryClick(category.name)}
          >
            <div className="category-image-wrap">
              <img 
                src={category.image} 
                alt={category.name} 
                loading="lazy"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=' + encodeURIComponent(category.name); }}
              />
            </div>  
            <div className="category-label">
              <h3 className="category-name">{category.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
