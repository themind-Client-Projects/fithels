import React from "react";
import ProductCard1 from "../productCards/ProductCard1";
import Pagination from "../common/Pagination";

export default function Listview({ products, pagination = true }) {
  return (
    <>
      {/* card product list 1 */}
      {products.map((product, i) => (
        <ProductCard1 product={product} key={i} />
      ))}
      {/* pagination */}
      {pagination ? (
        <ul className="wg-pagination ">
          <Pagination />
        </ul>
      ) : (
        ""
      )}
    </>
  );
}
