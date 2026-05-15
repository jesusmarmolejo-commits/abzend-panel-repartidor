/**
 * ABZEND — Demo Tour Component
 * ─────────────────────────────────────────────────────────────────
 * Tour guiado paso a paso para clientes potenciales.
 * Sin dependencias externas — vanilla JS puro.
 *
 * INSTALACIÓN EN NEXT.JS:
 *   1. Copia este archivo a: /public/demo-tour.js
 *   2. En tu layout.tsx o _app.tsx, agrega al <head>:
 *      <script src="/demo-tour.js" defer></script>
 *   3. Agrega los atributos data-tour="paso-N" a los elementos
 *      que quieres destacar en cada panel.
 *
 * USO PROGRAMÁTICO:
 *   window.AbzendTour.start('cliente')     // inicia tour del cliente
 *   window.AbzendTour.start('admin')       // inicia tour del admin
 *   window.AbzendTour.start('repartidor')  // inicia tour del repartidor
 *   window.AbzendTour.stop()               // cierra el tour
 *
 * ACTIVACIÓN AUTOMÁTICA:
 *   Agrega ?tour=1 a la URL para auto-iniciar.
 *   Ej: https://abzend-panel-admin.vercel.app?tour=1
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ─── TOURS POR PANEL ───────────────────────────────────────────

  const TOURS = {
    cliente: [
      {
        title: '👋 Bienvenido al Panel Cliente',
        content: 'Aquí es donde tus clientes rastrean sus pedidos en tiempo real. Este tour te guiará por las funciones principales.',
        target: null,
        position: 'center'
      },
      {
        title: '📦 Tus órdenes activas',
        content: 'Aquí aparecen todos los pedidos en curso. El cliente ve el estado actualizado al instante cuando el repartidor avanza.',
        target: '[data-tour="orders-list"]',
        position: 'bottom'
      },
      {
        title: '📍 Rastreo en tiempo real',
        content: 'Este mapa muestra la ubicación exacta del repartidor. Se actualiza automáticamente cada segundo vía Supabase Realtime.',
        target: '[data-tour="tracking-map"]',
        position: 'left'
      },
      {
        title: '📊 Estado del pedido',
        content: 'La línea de progreso muestra en qué etapa está la orden: Confirmado → Recogido → En camino → Entregado.',
        target: '[data-tour="order-status"]',
        position: 'top'
      },
      {
        title: '🔔 Historial',
        content: 'El cliente puede ver todos sus pedidos anteriores, incluyendo fechas, montos y repartidores.',
        target: '[data-tour="order-history"]',
        position: 'right'
      },
      {
        title: '✅ ¡Eso es el Panel Cliente!',
        content: 'Simple, limpio y en tiempo real. ¿Quieres ver el Panel Admin para entender cómo se gestiona todo desde atrás?',
        target: null,
        position: 'center',
        cta: { text: 'Ver Panel Admin →', url: 'https://abzend-panel-admin.vercel.app?tour=1' }
      }
    ],

    admin: [
      {
        title: '🛠️ Panel de Administración',
        content: 'Centro de control total de ABZEND. Desde aquí gestionas todo: órdenes, repartidores, pagos y configuración.',
        target: null,
        position: 'center'
      },
      {
        title: '📋 Dashboard de órdenes',
        content: 'Vista en tiempo real de todas las órdenes activas. Puedes filtrar por estado, fecha, repartidor o zona.',
        target: '[data-tour="admin-orders"]',
        position: 'bottom'
      },
      {
        title: '🗺️ Mapa en vivo',
        content: 'Cada punto en el mapa es un repartidor activo. Su posición GPS se actualiza segundo a segundo.',
        target: '[data-tour="live-map"]',
        position: 'left'
      },
      {
        title: '👤 Asignación de repartidores',
        content: 'Con un clic asignas la orden al repartidor disponible más cercano. En el Release 2 esto se hace automáticamente con IA.',
        target: '[data-tour="assign-driver"]',
        position: 'right'
      },
      {
        title: '💳 Control de pagos',
        content: 'Integrado con Stripe. Ves el estado de cada cobro, procesas reembolsos y exportas reportes.',
        target: '[data-tour="payments"]',
        position: 'top'
      },
      {
        title: '📊 Métricas del negocio',
        content: 'Órdenes del día, ingreso total, tiempo promedio de entrega y tasa de éxito. Todo en un vistazo.',
        target: '[data-tour="metrics"]',
        position: 'bottom'
      },
      {
        title: '✅ ¡Eso es el Panel Admin!',
        content: 'Control total desde un solo lugar. ¿Quieres experimentar el flujo del repartidor?',
        target: null,
        position: 'center',
        cta: { text: 'Ver Panel Repartidor →', url: 'https://abzend-panel-repartidor.vercel.app?tour=1' }
      }
    ],

    repartidor: [
      {
        title: '🛵 Panel del Repartidor',
        content: 'La interfaz que usa el mensajero en su teléfono. Diseñada para ser rápida, clara y funcionar offline.',
        target: null,
        position: 'center'
      },
      {
        title: '🟢 Estado Online/Offline',
        content: 'El repartidor activa su turno con un toque. Solo recibe órdenes cuando está "En línea".',
        target: '[data-tour="driver-status"]',
        position: 'bottom'
      },
      {
        title: '📋 Mis órdenes del día',
        content: 'Lista de todas las entregas asignadas, ordenadas por prioridad y proximidad geográfica.',
        target: '[data-tour="driver-orders"]',
        position: 'bottom'
      },
      {
        title: '📍 Navegación integrada',
        content: 'Un toque abre Google Maps o Waze con la dirección preconfigurada. Sin copiar ni pegar.',
        target: '[data-tour="driver-nav"]',
        position: 'top'
      },
      {
        title: '✅ Actualizar estado',
        content: 'Al llegar al punto de entrega, el repartidor confirma con un toque. El cliente recibe notificación inmediata.',
        target: '[data-tour="driver-confirm"]',
        position: 'top'
      },
      {
        title: '📈 Mis entregas del mes',
        content: 'El repartidor ve su historial completo: entregas, ganancias y calificaciones de clientes.',
        target: '[data-tour="driver-history"]',
        position: 'right'
      },
      {
        title: '✅ ¡Tour completo!',
        content: '¿Te convenció ABZEND? Contáctanos para hablar sobre cómo adaptarlo a tu operación.',
        target: null,
        position: 'center',
        cta: { text: '📧 Contactar', url: 'mailto:jesusmarmolejo@gmail.com?subject=Interés en ABZEND' }
      }
    ]
  };

  // ─── ESTILOS ───────────────────────────────────────────────────

  const CSS = `
    .abzend-tour-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      z-index: 99990; pointer-events: none;
      animation: abzendFadeIn .3s ease;
    }
    .abzend-tour-spotlight {
      position: fixed; z-index: 99991; pointer-events: none;
      border-radius: 8px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.65);
      transition: all .4s cubic-bezier(.4,0,.2,1);
    }
    .abzend-tour-bubble {
      position: fixed; z-index: 99992;
      background: #111318; color: #f1f5f9;
      border: 1px solid #1e2330; border-radius: 16px;
      padding: 1.5rem; max-width: 340px; min-width: 280px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      animation: abzendSlideIn .3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    .abzend-tour-bubble::before {
      content: ''; position: absolute;
      border: 8px solid transparent;
    }
    .abzend-tour-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: .75rem;
    }
    .abzend-tour-title {
      font-size: 1rem; font-weight: 700; line-height: 1.3;
    }
    .abzend-tour-close {
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,0.07); border: none;
      color: #94a3b8; font-size: 1rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    .abzend-tour-close:hover { background: rgba(255,255,255,0.15); }
    .abzend-tour-content {
      font-size: .875rem; color: #94a3b8; line-height: 1.65; margin-bottom: 1.25rem;
    }
    .abzend-tour-footer {
      display: flex; align-items: center; justify-content: space-between; gap: .75rem;
    }
    .abzend-tour-progress {
      display: flex; gap: 4px; align-items: center;
    }
    .abzend-tour-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.15); transition: background .2s;
    }
    .abzend-tour-dot.active { background: #f97316; width: 18px; border-radius: 3px; }
    .abzend-tour-dot.done { background: rgba(249,115,22,0.4); }
    .abzend-tour-btns { display: flex; gap: .5rem; }
    .abzend-tour-btn {
      padding: .45rem 1rem; border-radius: 8px; font-size: .8rem; font-weight: 600;
      cursor: pointer; border: none; transition: all .15s;
    }
    .abzend-tour-btn-secondary {
      background: rgba(255,255,255,0.07); color: #94a3b8;
    }
    .abzend-tour-btn-secondary:hover { background: rgba(255,255,255,0.12); }
    .abzend-tour-btn-primary {
      background: #f97316; color: #fff;
    }
    .abzend-tour-btn-primary:hover { background: #fb923c; }
    .abzend-tour-cta {
      display: block; width: 100%; text-align: center;
      background: linear-gradient(135deg,#f97316,#fbbf24); color: #fff;
      padding: .6rem 1rem; border-radius: 8px; font-size: .85rem; font-weight: 700;
      text-decoration: none; margin-top: .5rem; transition: opacity .2s;
    }
    .abzend-tour-cta:hover { opacity: .9; }
    .abzend-tour-badge {
      position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 99980;
      background: #111318; border: 1px solid rgba(249,115,22,.4);
      color: #f97316; padding: .6rem 1.1rem; border-radius: 999px;
      font-size: .8rem; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,.4);
      display: flex; align-items: center; gap: .4rem;
      animation: abzendBounce 2s ease infinite;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    .abzend-tour-badge:hover { background: rgba(249,115,22,.1); }
    @keyframes abzendFadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes abzendSlideIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes abzendBounce {
      0%,100% { transform: translateY(0) }
      50% { transform: translateY(-5px) }
    }
  `;

  // ─── ESTADO ────────────────────────────────────────────────────

  let currentTour = null;
  let currentStep = 0;
  let elements = {};

  // ─── HELPERS ───────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('abzend-tour-styles')) return;
    const style = document.createElement('style');
    style.id = 'abzend-tour-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function getRect(selector) {
    if (!selector) return null;
    const el = document.querySelector(selector);
    if (!el) return null;
    return el.getBoundingClientRect();
  }

  function detectPanel() {
    const host = window.location.hostname;
    if (host.includes('cliente')) return 'cliente';
    if (host.includes('admin')) return 'admin';
    if (host.includes('repartidor')) return 'repartidor';
    // fallback: intentar detectar por elementos en la página
    if (document.querySelector('[data-panel="admin"]')) return 'admin';
    if (document.querySelector('[data-panel="repartidor"]')) return 'repartidor';
    return 'cliente';
  }

  // ─── RENDER ────────────────────────────────────────────────────

  function renderStep(steps, index) {
    cleanup();

    const step = steps[index];
    const rect = getRect(step.target);
    const total = steps.length;
    const isLast = index === total - 1;
    const isFirst = index === 0;

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'abzend-tour-overlay';
    overlay.id = 'abzend-tour-overlay';
    document.body.appendChild(overlay);

    // Spotlight (si hay target)
    if (rect) {
      const spot = document.createElement('div');
      spot.className = 'abzend-tour-spotlight';
      spot.id = 'abzend-tour-spotlight';
      const pad = 8;
      spot.style.cssText = `
        left:${rect.left - pad}px; top:${rect.top - pad}px;
        width:${rect.width + pad * 2}px; height:${rect.height + pad * 2}px;
      `;
      document.body.appendChild(spot);
    }

    // Dots de progreso
    const dots = Array.from({ length: total }, (_, i) => {
      const cls = i === index ? 'active' : i < index ? 'done' : '';
      return `<div class="abzend-tour-dot ${cls}"></div>`;
    }).join('');

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = 'abzend-tour-bubble';
    bubble.id = 'abzend-tour-bubble';
    bubble.innerHTML = `
      <div class="abzend-tour-header">
        <div class="abzend-tour-title">${step.title}</div>
        <button class="abzend-tour-close" id="abzend-close">✕</button>
      </div>
      <div class="abzend-tour-content">${step.content}</div>
      ${step.cta ? `<a href="${step.cta.url}" class="abzend-tour-cta">${step.cta.text}</a>` : ''}
      <div class="abzend-tour-footer">
        <div class="abzend-tour-progress">${dots}</div>
        <div class="abzend-tour-btns">
          ${!isFirst ? `<button class="abzend-tour-btn abzend-tour-btn-secondary" id="abzend-prev">← Anterior</button>` : ''}
          ${!isLast
            ? `<button class="abzend-tour-btn abzend-tour-btn-primary" id="abzend-next">Siguiente →</button>`
            : `<button class="abzend-tour-btn abzend-tour-btn-secondary" id="abzend-end">Finalizar</button>`
          }
        </div>
      </div>
    `;

    document.body.appendChild(bubble);

    // Posicionar bubble
    positionBubble(bubble, rect, step.position || 'bottom');

    // Eventos
    document.getElementById('abzend-close')?.addEventListener('click', stop);
    document.getElementById('abzend-prev')?.addEventListener('click', prev);
    document.getElementById('abzend-next')?.addEventListener('click', next);
    document.getElementById('abzend-end')?.addEventListener('click', stop);

    // Scroll al elemento
    if (rect) {
      window.scrollTo({ top: rect.top + window.scrollY - 200, behavior: 'smooth' });
    }
  }

  function positionBubble(bubble, rect, position) {
    const margin = 16;
    const bw = 340;
    const bh = 200; // estimado

    let top, left;

    if (!rect || position === 'center') {
      top = (window.innerHeight - bh) / 2;
      left = (window.innerWidth - bw) / 2;
    } else {
      switch (position) {
        case 'bottom':
          top = rect.bottom + margin;
          left = rect.left + (rect.width - bw) / 2;
          break;
        case 'top':
          top = rect.top - bh - margin;
          left = rect.left + (rect.width - bw) / 2;
          break;
        case 'left':
          top = rect.top + (rect.height - bh) / 2;
          left = rect.left - bw - margin;
          break;
        case 'right':
          top = rect.top + (rect.height - bh) / 2;
          left = rect.right + margin;
          break;
        default:
          top = rect.bottom + margin;
          left = rect.left;
      }
    }

    // Mantener dentro del viewport
    left = Math.max(margin, Math.min(window.innerWidth - bw - margin, left));
    top = Math.max(margin, Math.min(window.innerHeight - bh - margin, top));

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
  }

  function cleanup() {
    document.getElementById('abzend-tour-overlay')?.remove();
    document.getElementById('abzend-tour-spotlight')?.remove();
    document.getElementById('abzend-tour-bubble')?.remove();
  }

  // ─── CONTROLES ─────────────────────────────────────────────────

  function start(panel) {
    const tourName = panel || detectPanel();
    currentTour = TOURS[tourName] || TOURS.cliente;
    currentStep = 0;
    injectStyles();
    document.getElementById('abzend-start-badge')?.remove();
    renderStep(currentTour, currentStep);

    // Guardar en sessionStorage que ya se inició
    sessionStorage.setItem('abzend_tour_seen', '1');
  }

  function next() {
    if (currentStep < currentTour.length - 1) {
      currentStep++;
      renderStep(currentTour, currentStep);
    }
  }

  function prev() {
    if (currentStep > 0) {
      currentStep--;
      renderStep(currentTour, currentStep);
    }
  }

  function stop() {
    cleanup();
    currentTour = null;
    currentStep = 0;
    showStartBadge();
  }

  function showStartBadge() {
    if (document.getElementById('abzend-start-badge')) return;
    const badge = document.createElement('button');
    badge.id = 'abzend-start-badge';
    badge.className = 'abzend-tour-badge';
    badge.innerHTML = '🎯 Ver tour del demo';
    badge.addEventListener('click', () => start());
    document.body.appendChild(badge);
  }

  // ─── AUTO-INICIO ───────────────────────────────────────────────

  function init() {
    injectStyles();

    const params = new URLSearchParams(window.location.search);
    const forceTour = params.get('tour');
    const tourSeen = sessionStorage.getItem('abzend_tour_seen');

    if (forceTour === '1' || (!tourSeen && isDemoEnvironment())) {
      // Espera a que la UI esté lista
      setTimeout(() => start(), 800);
    } else {
      showStartBadge();
    }
  }

  function isDemoEnvironment() {
    const host = window.location.hostname;
    return host.includes('abzend') || host === 'localhost' || host === '127.0.0.1';
  }

  // ─── API PÚBLICA ───────────────────────────────────────────────

  window.AbzendTour = { start, stop, next, prev };

  // Iniciar cuando DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
