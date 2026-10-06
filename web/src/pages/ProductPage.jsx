import ProductDetails from "../components/ProductDetails";

export default function ProductPage(props) {
  return <ProductDetails onBack={() => window.history.back()} {...props} />;
}
