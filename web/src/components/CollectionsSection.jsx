import './CollectionsSection.css';

import Pro1 from '../assets/pro1.webp';
import Pro2 from '../assets/pro2.webp';
import Pro3 from '../assets/pro3.webp';

export default function CollectionsSection() {
  return (
    <section className="collections-section">

      <h2 className="collections-title">Anika Collections</h2>

      <div className="collections-wrapper">

        <div className="collection-card">
          <img src={Pro1} alt="collection" loading="lazy" />
        </div>

        <div className="collection-card">
          <img src={Pro2} alt="collection" loading="lazy" />
        </div>

        <div className="collection-card">
          <img src={Pro3} alt="collection" loading="lazy" />
        </div>

      </div>

    </section>
  );
}