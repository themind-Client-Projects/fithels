"use client";
import { useContextElement } from "@/context/Context";
import Image from "next/image";
import Link from "next/link";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
export default function BannerTabProduct({ product }) {
  const { setQuickViewItem } = useContextElement();
  return (
    <div className="collection-position-2 hover-img">
      <a className="img-style">
        <Image
          className="lazyload"
          alt="banner-cls"
          src={product.imgSrc}
          width={710}
          height={945}
        />
        <div className="on-sale-wrap">
          <span className="on-sale-item">-25%</span>
        </div>
      </a>
      <div className="content cls-content">
        <div className="cls-info">
          <Link
            href={`/product-detail/${product.id}`}
            className="text-title link text-line-clamp-1"
          >
            {product.title}
          </Link>
          <div className="price">
            <span className="old-price"><CurrencyFormatter price={product.oldPrice} /></span>
            <span className="new-price"><CurrencyFormatter price={product.price} /></span>
          </div>
        </div>
        <a
          href="#quickView"
          onClick={() => setQuickViewItem(product)}
          data-bs-toggle="modal"
          className="cls-btn text-btn-uppercase"
        >
          Quick View
        </a>
      </div>
    </div>
  );
}
