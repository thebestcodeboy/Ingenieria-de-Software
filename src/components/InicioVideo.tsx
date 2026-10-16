'use client';

import Image from 'next/image';
import styles from './InicioVideo.module.css';

interface InicioVideoProps {
  onIngresar: () => void;
}

export default function InicioVideo({ onIngresar }: InicioVideoProps) {
  return (
    <main className={styles.page}>
      <svg className={styles.logoFilter} aria-hidden="true" focusable="false">
        <filter id="ateneo-logo-cutout" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.2126 -0.7152 -0.0722 0 1"
          />
          <feComponentTransfer>
            <feFuncA type="linear" slope="2" intercept="-0.1" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </svg>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image
            src="/ateneo-emblema-original.png"
            alt=""
            width={346}
            height={185}
            priority
          />
          <span className={styles.wordmark} aria-label="Instituto Ateneo">
            <span>Instituto</span>
            <strong>Ateneo</strong>
          </span>
        </div>
      </header>

      <div className={styles.videoFrame} aria-hidden="true">
        <video
          className={styles.video}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        >
          <source src="/inicio-ateneo.mp4" type="video/mp4" />
        </video>
      </div>

      <section className={styles.intro} aria-labelledby="inicio-titulo">
        <div className={styles.copy}>
          <h1 id="inicio-titulo">Tu próximo paso empieza acá.</h1>
          <p>Ingresá a tu espacio académico en Instituto Ateneo.</p>
        </div>
        <button className={styles.enterButton} type="button" onClick={onIngresar}>
          <span>Ingresar</span>
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16m-6-6 6 6-6 6" />
          </svg>
        </button>
      </section>
    </main>
  );
}
