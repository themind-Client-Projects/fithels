import "../../../public/scss/main.scss";
import "photoswipe/style.css";
import "react-range-slider-input/dist/style.css";
import "../../../public/css/image-compare-viewer.min.css";
import StorefrontProviders from "@/components/StorefrontProviders";

export default function StorefrontLayout({ children }) {
  return (
    <StorefrontProviders>
      {children}
    </StorefrontProviders>
  );
}
