import React from 'react';

interface CategorySidebarProps {
    categories: string[];
    activeCategory: string;
    onCategoryClick: (category: string) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
    categories,
    activeCategory,
    onCategoryClick
}) => {
    return (
        <aside className="sidebar-categories">
            {categories.map(cat => (
                <button
                    key={cat}
                    className={`side-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => onCategoryClick(cat)}
                >
                    {cat}
                </button>
            ))}
        </aside>
    );
};

export default CategorySidebar;
