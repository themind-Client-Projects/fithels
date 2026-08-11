"use client";
import { openCartModal } from "@/utlis/openCartModal";
import { openWistlistModal } from "@/utlis/openWishlist";

import React, { useEffect } from "react";
import { useContext, useState } from "react";
const dataContext = React.createContext();
export const useContextElement = () => {
  return useContext(dataContext);
};

export default function Context({ children }) {
  const [cartProducts, setCartProducts] = useState([]);
  const [wishList, setWishList] = useState([1, 2, 3]);
  const [compareItem, setCompareItem] = useState([1, 2, 3]);
  const [quickViewItem, setQuickViewItem] = useState(null);
  const [quickAddItem, setQuickAddItem] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  useEffect(() => {
    const subtotal = cartProducts.reduce((accumulator, product) => {
      const price = Number(product?.price) || 0;
      const quantity = Number(product?.quantity) || 0;
      return accumulator + quantity * price;
    }, 0);
    setTotalPrice(subtotal);
  }, [cartProducts]);

  // A cart line is a product AND its chosen variant. Keying on the product id
  // alone meant "Shirt / M" and "Shirt / L" collapsed into one line — adding the
  // second silently did nothing at all, with no error and no modal.
  const cartLineKey = (id, size, color) =>
    `${id}::${size ?? ""}::${color ?? ""}`;

  /** True when ANY variant of this product is in the cart (drives "Already Added"). */
  const isAddedToCartProducts = (id) => {
    if (cartProducts.filter((elm) => elm.id == id)[0]) {
      return true;
    }
    return false;
  };

  const addProductToCart = (productOrId, qty, isModal = true, variant = {}) => {
    // Accepts either a full product object (database-backed pages) or a bare id
    // (legacy template components that resolve against the static fixture).
    //
    // Passing only an id used to be the single code path, but database products
    // carry a slug as their `id` while the fixture uses numbers — so the lookup
    // returned `undefined` and `{...undefined}` silently pushed a priceless,
    // idless `{quantity: 1}` object into the cart (making totalPrice NaN).
    // Only a real catalogue product can be ordered. The old id form resolved
    // against the 133KB static fixture, which this provider imported on EVERY
    // page — and every fixture product was then rejected by the dbId guard
    // below anyway, so the lookup existed only to fail. Dropping it removes the
    // fixture from the client bundle entirely.
    const isProductObject =
      productOrId !== null && typeof productOrId === "object";

    if (!isProductObject) {
      console.warn(
        "Ignoring add-to-cart called with a bare id — pass the product object.",
        productOrId
      );
      return false;
    }

    const id = productOrId.id;

    // Fall back to the product's only option when there is exactly one, so a
    // single-size product still records what was bought.
    const source0 = productOrId;
    const size =
      variant.size ??
      (source0?.sizes?.length === 1 ? source0.sizes[0] : undefined);
    const color =
      variant.color ??
      (source0?.filterColor?.length === 1 ? source0.filterColor[0] : undefined);

    const lineKey = cartLineKey(id, size, color);
    if (cartProducts.some((elm) => elm.lineKey === lineKey)) return false;

    const source = productOrId;

    // Never add an unresolvable item — a broken entry corrupts the whole cart.
    if (!source) return false;

    // Only real catalogue products can be ordered. Several template leftovers
    // (the search and cart drawers) still render fixture products whose ids
    // exist nowhere in the database; adding one used to sit in the cart looking
    // legitimate and then fail the WHOLE order at checkout with "Product not
    // found", permanently, because the cart is persisted to localStorage.
    if (!source.dbId) {
      console.warn(
        "Ignoring add-to-cart for a product that is not in the catalogue:",
        source.title ?? source.id
      );
      return false;
    }

    const item = {
      ...source,
      quantity: qty ? qty : 1,
      // Checkout reads these; nothing ever wrote them before, so every cart
      // order reached the server with size and colour null and the warehouse
      // shipped an arbitrary variant.
      selectedSize: size ?? null,
      selectedColor: color ?? null,
      lineKey,
    };
    setCartProducts((pre) => [...pre, item]);
    if (isModal) {
      openCartModal();
    }
    return true;
  };

  const updateQuantity = (idOrKey, qty) => {
    // Immutable update. The old version mutated the item object held in state
    // and then reassigned it into a copied array, so the item's identity never
    // changed — memoised rows would not re-render, and it wrote through the
    // previous state snapshot, which is unsafe under concurrent rendering.
    const quantity = Math.max(1, Number(qty) || 1);

    // Match ONE line. The old `|| item.id ==` fallback had no early exit, so a
    // caller passing a product id rewrote every size and colour of that product
    // to the same quantity. Prefer an exact lineKey; otherwise change only the
    // first line for that product.
    setCartProducts((pre) => {
      const exact = pre.findIndex((item) => item.lineKey === idOrKey);
      const index =
        exact !== -1 ? exact : pre.findIndex((item) => item.id == idOrKey);
      if (index === -1) return pre;
      return pre.map((item, i) => (i === index ? { ...item, quantity } : item));
    });
  };

  const addToWishlist = (id) => {
    if (!wishList.includes(id)) {
      setWishList((pre) => [...pre, id]);
      openWistlistModal();
    }
  };

  const removeFromWishlist = (id) => {
    if (wishList.includes(id)) {
      setWishList((pre) => [...pre.filter((elm) => elm != id)]);
    }
  };
  const addToCompareItem = (id) => {
    if (!compareItem.includes(id)) {
      setCompareItem((pre) => [...pre, id]);
    }
  };
  const removeFromCompareItem = (id) => {
    if (compareItem.includes(id)) {
      setCompareItem((pre) => [...pre.filter((elm) => elm != id)]);
    }
  };
  const isAddedtoWishlist = (id) => {
    if (wishList.includes(id)) {
      return true;
    }
    return false;
  };
  const isAddedtoCompareItem = (id) => {
    if (compareItem.includes(id)) {
      return true;
    }
    return false;
  };
  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("cartList"));
    if (items?.length) {
      // Drop entries saved by the older broken add-to-cart path. Those have no
      // id and no price, and would otherwise keep the subtotal at NaN and crash
      // the cart page on `<Image src={undefined}>` forever after.
      const validItems = items.filter(
        (item) =>
          item &&
          item.id !== undefined &&
          item.price !== undefined &&
          // Drop fixture items saved before add-to-cart required a catalogue
          // product. One of these left in storage made every checkout fail.
          item.dbId
      );
      if (validItems.length) {
        setCartProducts(validItems);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cartList", JSON.stringify(cartProducts));
  }, [cartProducts]);
  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("wishlist"));
    if (items?.length) {
      setWishList(items);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishList));
  }, [wishList]);

  const contextElement = {
    cartProducts,
    setCartProducts,
    totalPrice,
    addProductToCart,
    isAddedToCartProducts,
    removeFromWishlist,
    addToWishlist,
    isAddedtoWishlist,
    quickViewItem,
    wishList,
    setQuickViewItem,
    quickAddItem,
    setQuickAddItem,
    addToCompareItem,
    isAddedtoCompareItem,
    removeFromCompareItem,
    compareItem,
    setCompareItem,
    updateQuantity,
  };
  return (
    <dataContext.Provider value={contextElement}>
      {children}
    </dataContext.Provider>
  );
}
