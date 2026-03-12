import React from 'react';
import { MenuItem } from '../../types';

interface CartSummaryProps {
    cart: { menuItem: MenuItem; quantity: number }[];
    onPlaceOrder: () => void;
    isOrdering: boolean;
}

const CartSummary: React.FC<CartSummaryProps> = ({
    cart,
    onPlaceOrder,
    isOrdering
}) => {
    if (cart.length === 0) return null;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="cart-footer-v2">
            <div className="cart-stats">
                Total items in cart: {totalItems}
            </div>
            <button className="order-confirm-btn" onClick={onPlaceOrder} disabled={isOrdering}>
                {isOrdering ? 'Ordering...' : 'Confirm Order'}
            </button>
        </div>
    );
};

export default CartSummary;
