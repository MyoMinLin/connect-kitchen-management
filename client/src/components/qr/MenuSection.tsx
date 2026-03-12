import React from 'react';
import { MenuItem } from '../../types';

interface MenuSectionProps {
    categories: string[];
    menuItems: MenuItem[];
    categoryRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
    onItemClick: (item: MenuItem) => void;
}

const MenuSection: React.FC<MenuSectionProps> = ({
    categories,
    menuItems,
    categoryRefs,
    onItemClick
}) => {
    return (
        <main className="menu-items-scroll">
            {categories.map(cat => (
                <section
                    key={cat}
                    className="menu-category-v2"
                    ref={el => { if (el) categoryRefs.current[cat] = el as HTMLDivElement; }}
                >
                    <h2 className="cat-title">{cat}</h2>
                    <div className="items-list-v2">
                        {menuItems.filter(item => item.category === cat).map(item => (
                            <div
                                key={item._id}
                                className="item-card-v2"
                                onClick={() => onItemClick(item)}
                            >
                                <div className="item-img-wrap">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} />
                                    ) : (
                                        <div className="img-placeholder">🍽️</div>
                                    )}
                                </div>
                                <div className="item-content-v2">
                                    <h3 className="item-name-v2">{item.name}</h3>
                                    <div className="item-footer-v2">
                                        <span className="item-price-v2">¥{item.price.toLocaleString()}</span>
                                        <button className="add-plus-btn">+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </main>
    );
};

export default MenuSection;
