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

/**
 * Optionally controlled. The selection used to live purely in local state and
 * was never read by anything, so the size a shopper picked was thrown away and
 * the order recorded no size at all. Callers that need the value pass
 * `selectedSize`/`onSelect`; the uncontrolled form is kept for the legacy
 * template components.
 */
export default function SizeSelect({
  sizes: sizeOptions,
  selectedSize: controlledSize,
  onSelect,
}) {
  const [localSize, setLocalSize] = useState("38"); // Default value
  const selectedSize = controlledSize ?? localSize;

  // A product's own sizes when supplied, otherwise the template's list.
  const options =
    sizeOptions?.length
      ? sizeOptions.map((value) => ({
          id: `size-${value}`,
          value: String(value),
          disabled: false,
        }))
      : sizes;

  const handleChange = (value) => {
    setLocalSize(value);
    onSelect?.(value);
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
        {options.map(({ id, value, price, disabled }) => (
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
