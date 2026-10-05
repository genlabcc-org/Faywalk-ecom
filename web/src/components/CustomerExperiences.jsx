import React from 'react';
import './CustomerExperiences.css';



// New Review Images
import Rev1 from '../assets/review/review1.png';
import Rev2 from '../assets/review/review2.png';
import Rev3 from '../assets/review/review3.png';
import Rev4 from '../assets/review/review4.png';
import Rev5 from '../assets/review/review5.png';
import Rev6 from '../assets/review/review6.png';
import Rev7 from '../assets/review/review7.png';
import Rev8 from '../assets/review/review8.png';
import Rev9 from '../assets/review/review9.png';
import Rev10 from '../assets/review/review10.png';

const CustomerExperiences = () => {
  // Creating perfect loops of 8 images (4 unique images repeated twice)
  // This ensures the 50% translation animation loops seamlessly.
  const column1 = [Rev1, Rev2, Rev3, Rev4, Rev1, Rev2, Rev3, Rev4];
  const column2 = [Rev5, Rev6, Rev7, Rev8, Rev5, Rev6, Rev7, Rev8];
  const column3 = [Rev9, Rev10, Rev1, Rev2, Rev9, Rev10, Rev1, Rev2];
  const column4 = [Rev3, Rev4, Rev5, Rev6, Rev3, Rev4, Rev5, Rev6];

  return (
    <section className="customer-experiences">
      <div className="experiences-text-content">
        <h2 className="experiences-title">Real Experiences</h2>
        <p className="experiences-subtitle">Hear from our happy customers who've experienced our world-magic.</p>
      </div>

      <div className="experiences-visual-container">
        <div className="experiences-grid">
          {/* Column 1: Scrolling Down */}
          <div className="grid-column scroll-down">
            {column1.map((img, i) => (
              <img key={`c1-${i}`} src={img} alt="Customer Story" className="instagram-post-img" />
            ))}
          </div>

          {/* Column 2: Scrolling Up */}
          <div className="grid-column scroll-up">
            {column2.map((img, i) => (
              <img key={`c2-${i}`} src={img} alt="Customer Story" className="instagram-post-img" />
            ))}
          </div>

          {/* Column 3: Scrolling Down */}
          <div className="grid-column scroll-down">
            {column3.map((img, i) => (
              <img key={`c3-${i}`} src={img} alt="Customer Story" className="instagram-post-img" />
            ))}
          </div>

          {/* Column 4: Scrolling Up */}
          <div className="grid-column scroll-up">
            {column4.map((img, i) => (
              <img key={`c4-${i}`} src={img} alt="Customer Story" className="instagram-post-img" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerExperiences;
