import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const Barcode = ({
  value,
  displayValue = false,
  height = 55,
  width = 2.2,
  fontSize = 14,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    JsBarcode(ref.current, String(value), {
      format: "CODE128",
      width,
      height,
      displayValue,
      fontSize,
      textMargin: 2,
      margin: 0,
    });
    // make it scale to the box instead of overflowing 100mm
    const svg = ref.current;
    const w = svg.getAttribute("width");
    const h = svg.getAttribute("height");
    if (w && h) {
      svg.setAttribute("viewBox", `0 0 ${parseInt(w)} ${parseInt(h)}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
    }
  }, [value, displayValue, height, width, fontSize]);

  if (!value) return null;
  return <svg ref={ref} className="ti-barcode" />;
};

export default Barcode;
export { Barcode };
