import { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

const DEFAULT = {
  title: 'Voxie — Asisten Virtual 3D Interaktif',
  description: 'Upload model VRM 3D dan berinteraksi real-time dengan asisten AI yang merespons dengan suara, ekspresi wajah, dan animasi tubuh.',
  image: '/voxie-hero.png',
  url: 'https://voxie.app',
};

export default function MetaTags({ title, description, image, url, type = 'website' }: MetaTagsProps) {
  const t = title ? `${title} — Voxie` : DEFAULT.title;
  const d = description ?? DEFAULT.description;
  const img = image ?? DEFAULT.image;
  const u = url ?? DEFAULT.url;

  useEffect(() => {
    document.title = t;
    setMeta('description', d);
    setMeta('og:title', t, true);
    setMeta('og:description', d, true);
    setMeta('og:image', img, true);
    setMeta('og:url', u, true);
    setMeta('og:type', type, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', t);
    setMeta('twitter:description', d);
    setMeta('twitter:image', img);
  }, [t, d, img, u, type]);

  return null;
}

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}
