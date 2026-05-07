import { useState, useRef } from 'react';

export function VideoPlayer({ lang }) {
  const [playing, setPlaying] = useState(false);
  const vid = lang === 'fr' ? '7wytc7ho2Kg' : lang === 'it' ? '5sBpbdoOQmw' : lang === 'en' ? 'Pq2k6KQTPDw' : 'mLQly-5_GuA';
  const thumb = 'https://img.youtube.com/vi/' + vid + '/hqdefault.jpg';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: playing ? 'none' : 'block', position: 'relative', width: '100%', height: 160, cursor: 'pointer', borderRadius: 12, overflow: 'hidden', background: '#000' }} onClick={() => setPlaying(true)}>
        <img src={thumb} alt='Video' style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(212,168,83,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#111' }}>&#9654;</div>
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#fff', fontWeight: 700, fontSize: 12 }}>60 Sek.</div>
      </div>
      <div style={{ display: playing ? 'block' : 'none', position: 'relative', width: '100%', paddingBottom: '177%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        {playing && <iframe src={'https://www.youtube.com/embed/' + vid + '?autoplay=1&rel=0&modestbranding=1'} title='BauAbnahme' frameBorder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />}
        <button type='button' onClick={() => setPlaying(false)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', zIndex: 10 }}>&#10005;</button>
      </div>
    </div>
  );
}
