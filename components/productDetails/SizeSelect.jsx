"use client";

import { useState } from "react";

const sizes = [
  { id: "size-35", value: "35", price: 79.99, disabled: false },
  { id: "size-36", value: "36", price: 79.99, disabled: false },
  { id: "size-37", value: "37", price: 89.99, disabled: false },
  { id: "size-38", value: "38", price: 89.99, disabled: false },
  { id: "size-39", value: "39", price: 89.99, disabled: false },
  { id: "size-40", value: "40", price: 89.99, disabled: true },
  { id: "size-41", value: "41", price: 89.99, disabled: false },
];

export default function SizeSelect() {
  const [selectedSize, setSelectedSize] = useState("38"); // Default value

  const handleChange = (value) => {
    setSelectedSize(value);
  };
  return (
    <div className="variant-picker-item">
      <div className="d-flex justify-content-between mb_12">
        <div className="variant-picker-label">
          selected size:
          <span className="text-title variant-picker-label-value">
            {selectedSize}
          </span>
        </div>
        <a
          href="#size-guide"
          data-bs-toggle="modal"
          className="size-guide text-title link"
        >
          Size Guide
        </a>
      </div>
      <div className="variant-picker-values gap12">
        {sizes.map(({ id, value, price, disabled }) => (
          <div key={id} onClick={() => handleChange(value)}>
            <input
              type="radio"
              id={id}
              checked={selectedSize === value}
              disabled={disabled}
              readOnly
            />
            <label
              className={`style-text size-btn ${
                disabled ? "type-disable" : ""
              }`}
              htmlFor={id}
              data-value={value}
              data-price={price}
            >
              <span className="text-title">{value}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
