import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "./Hero.css";
import { bannerService } from "../services/bannerService";
import { Skeleton } from "./ui/Skeleton";

export default function Hero() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanners() {
      try {
        const data = await bannerService.getBanners();
        if (data && data.length > 0) {
          setBanners(data);
        }
      } catch (err) {
        console.error("Failed to load hero banners:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBanners();
  }, []);

  if (loading) {
    return (
      <section className="hero-section hero-section--loading" aria-busy="true" aria-label="Loading hero banner">
        <div className="hero-skeleton-wrapper">
          <Skeleton className="hero-skeleton" />
        </div>
      </section>
    );
  }

  if (!banners || banners.length === 0) return null;

  return (
    <section className="hero-section">
      <Swiper
        className="hero-swiper"
        modules={[Autoplay, Pagination]}
        slidesPerView={1}
        loop={banners.length > 1}
        autoplay={banners.length > 1 ? { delay: 5000, disableOnInteraction: false } : false}
        pagination={banners.length > 1 ? { clickable: true } : false}
        speed={600}
      >
        {banners.map((b, i) => {
          const img = b.image_url || b.image;
          if (!img) return null;

          return (
            <SwiperSlide key={b.banner_id ?? i}>
              <div
                className="hero-image-wrapper"
                style={{ cursor: b.link_url ? "pointer" : "default" }}
                onClick={() => {
                  if (!b.link_url) return;
                  if (b.link_url.startsWith("/")) navigate(b.link_url);
                  else window.open(b.link_url, "_blank", "noopener");
                }}
              >
                <picture style={{ display: "block", width: "100%", height: "100%" }}>
                  {b.mobile_url && (
                    <source media="(max-width: 640px)" srcSet={b.mobile_url} />
                  )}
                  <img
                    src={img}
                    alt={`Banner ${i + 1}`}
                    className="hero-image"
                    fetchPriority={i === 0 ? "high" : "auto"}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </picture>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}