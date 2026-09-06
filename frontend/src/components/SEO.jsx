import { useEffect } from 'react';

const SEO = ({ title, description }) => {
  useEffect(() => {
    const baseTitle = "ACROVIX — Technology, Cybersecurity & Infrastructure Solutions";
    document.title = title ? `${title} | ACROVIX` : baseTitle;

    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [title, description]);

  return null;
};

export default SEO;
