'use strict';
// Server-side rendered public pages. All dynamic values pass through esc().

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = (t) => String(t || '').split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? esc(iso) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const dayMon = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? { d: '', m: '' } : { d: d.getDate(), m: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase() };
};
const telHref = (p) => 'tel:+91' + String(p).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const initials = (n) => esc(String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase());

const NAV = [['/', 'Home'], ['/about', 'About'], ['/management', 'Management'], ['/activities', 'Co-Curricular'], ['/events', 'Events'], ['/features', 'Features'], ['/gallery', 'Gallery'], ['/contact', 'Contact Us']];

const TITLES = {
  home: '', about: 'About Us', management: 'Management Team', activities: 'Co-Curricular Activities',
  events: 'Events & Notices', features: 'Features', gallery: 'Gallery', contact: 'Contact Us',
};

function layout(page, d, body) {
  const s = d.s;
  const title = TITLES[page] ? `${TITLES[page]} | ${s.school_name}` : `${s.school_name} — ${s.tagline}`;
  const desc = `${s.school_name}, ${s.address}. ${s.tagline}. Admissions, events, activities and gallery.`;
  const social = [['facebook', 'Facebook', 'f'], ['instagram', 'Instagram', 'in'], ['youtube', 'YouTube', '▶']]
    .filter(([k]) => s[k]).map(([k, n, g]) => `<a href="${esc(s[k])}" target="_blank" rel="noopener noreferrer" aria-label="${n}">${g}</a>`).join('');
  const wa = String(s.whatsapp || '').replace(/\D/g, '');
  const ld = {
    '@context': 'https://schema.org', '@type': 'School', name: s.school_name, slogan: s.tagline,
    telephone: s.phone, email: s.email, address: { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'IN' },
    logo: s.logo,
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#23288a">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">
<link rel="icon" href="/uploads/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Poppins:wght@500;600;700&family=Noto+Sans+Tamil:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="wrap">
  <div class="topbar-l"><a href="${telHref(s.phone)}">📞 ${esc(s.phone)}</a><a href="mailto:${esc(s.email)}">✉️ ${esc(s.email)}</a></div>
  <div class="topbar-r">${esc(s.working_hours)}</div>
</div></div>
<header class="nav"><div class="wrap nav-in">
  <a class="brand" href="/"><img src="${esc(s.logo)}" alt="${esc(s.school_name)} logo" width="52" height="52">
    <span><strong>${esc(s.school_name)}</strong><small>${esc(s.tagline)}</small></span></a>
  <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
  <nav id="menu" aria-label="Main">${NAV.map(([h, l]) => `<a href="${h}"${h === (page === 'home' ? '/' : '/' + page) ? ' class="on" aria-current="page"' : ''}>${l}</a>`).join('')}
    ${s.admission_open === '1' ? '<a class="btn btn-gold sm" href="/contact#enquiry">Apply Now</a>' : ''}</nav>
</div></header>
<main id="main">${body}</main>
<footer class="foot"><div class="wrap foot-grid">
  <div><div class="foot-brand"><img src="${esc(s.logo)}" alt="" width="46" height="46"><strong>${esc(s.school_name)}</strong></div>
    <p>${esc(s.tagline)}</p>${s.footer_note ? `<p class="muted">${esc(s.footer_note)}</p>` : ''}
    ${social ? `<div class="social">${social}</div>` : ''}</div>
  <div><h4>Quick Links</h4><ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
  <div><h4>Contact</h4><ul class="contact-list">
    <li>📍 ${esc(s.address)}</li><li>📞 <a href="${telHref(s.phone)}">${esc(s.phone)}</a></li>
    <li>✉️ <a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li><li>🕘 ${esc(s.working_hours)}</li></ul></div>
</div><div class="copy"><div class="wrap">© ${new Date().getFullYear()} ${esc(s.school_name)}. All rights reserved.</div></div></footer>
${wa ? `<a class="wa" href="https://wa.me/91${wa.replace(/^91(?=\d{10}$)/, '')}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">WhatsApp</a>` : ''}
<script src="/js/site.js" defer></script>
</body></html>`;
}

const LIGHTBOX = `<div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photo viewer"><button class="lb-close" aria-label="Close">×</button><button class="lb-nav lb-prev" aria-label="Previous">‹</button>
  <figure><img alt=""><figcaption></figcaption></figure><button class="lb-nav lb-next" aria-label="Next">›</button></div>`;
const pageHead = (title, sub) => `<section class="pagehead"><div class="wrap"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></section>`;
const sectionHead = (kicker, title, sub) => `<div class="sechead"><span class="kicker">${esc(kicker)}</span><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
const empty = (msg) => `<p class="empty">${esc(msg)}</p>`;

function inquiryForm(s, type = 'contact') {
  return `<form class="form" id="inquiry-form" novalidate>
  <div class="row2">
    <label>Your name *<input name="name" required maxlength="100" autocomplete="name"></label>
    <label>Phone *<input name="phone" type="tel" required maxlength="20" autocomplete="tel" inputmode="tel"></label>
  </div>
  <div class="row2">
    <label>Email<input name="email" type="email" maxlength="120" autocomplete="email"></label>
    <label>I am writing about
      <select name="type"><option value="admission"${type === 'admission' ? ' selected' : ''}>Admission enquiry</option><option value="contact"${type === 'contact' ? ' selected' : ''}>General enquiry</option></select></label>
  </div>
  <label data-show="admission">Class applying for
    <select name="class_applying"><option value="">Select class</option>${['Pre-KG', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => `<option>${c}</option>`).join('')}</select></label>
  <label>Message<textarea name="message" rows="4" maxlength="2000" placeholder="How can we help you?"></textarea></label>
  <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button class="btn btn-blue" type="submit">Send Enquiry</button>
  <p class="form-msg" role="status" aria-live="polite"></p>
</form>`;
}

/* ───────── Sections ───────── */
function hero(d) {
  if (!d.slides.length) {
    return `<section class="hero static"><div class="hero-txt wrap"><h1>${esc(d.s.school_name)}</h1><p>${esc(d.s.tagline)}</p></div></section>`;
  }
  return `<section class="hero" aria-roledescription="carousel" aria-label="Highlights">
  ${d.slides.map((sl, i) => `<div class="slide${i === 0 ? ' on' : ''}" role="group" aria-label="Slide ${i + 1} of ${d.slides.length}">
    <img src="${esc(sl.image)}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
    <div class="shade"></div>
    <div class="hero-txt wrap"><h1>${esc(sl.title)}</h1>${sl.subtitle ? `<p>${esc(sl.subtitle)}</p>` : ''}
      <div class="hero-btns">${sl.link ? `<a class="btn btn-gold" href="${esc(sl.link)}">Learn more</a>` : ''}${d.s.admission_open === '1' ? '<a class="btn btn-ghost" href="/contact#enquiry">Admission Enquiry</a>' : ''}</div></div>
  </div>`).join('')}
  ${d.slides.length > 1 ? `<button class="hero-nav prev" aria-label="Previous slide">‹</button><button class="hero-nav next" aria-label="Next slide">›</button>
  <div class="dots">${d.slides.map((_, i) => `<button aria-label="Go to slide ${i + 1}"${i === 0 ? ' class="on"' : ''}></button>`).join('')}</div>` : ''}
</section>`;
}
function stats(s) {
  const items = [1, 2, 3, 4].map((n) => [s[`stat${n}_value`], s[`stat${n}_label`]]).filter(([v, l]) => v && l);
  if (!items.length) return '';
  return `<section class="stats"><div class="wrap stats-grid">${items.map(([v, l]) => `<div><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('')}</div></section>`;
}
function admissionBanner(s) {
  if (s.admission_open !== '1') return '';
  return `<section class="banner"><div class="wrap banner-in"><div><strong>🎒 Admissions Open</strong><span>${esc(s.admission_text)}</span></div>
    <a class="btn btn-gold" href="/contact#enquiry">Enquire Now</a></div></section>`;
}
function noticeList(list) {
  if (!list.length) return empty('No notices right now.');
  return `<ul class="notices">${list.map((n) => `<li${n.important ? ' class="imp"' : ''}><time>${fmtDate(n.date)}</time><div><strong>${n.important ? '📌 ' : ''}${esc(n.title)}</strong>${n.body ? `<p>${esc(n.body)}</p>` : ''}</div></li>`).join('')}</ul>`;
}
function eventCard(e, past) {
  const dm = dayMon(e.date);
  return `<article class="event${past ? ' past' : ''}">
    ${e.image ? `<div class="event-img"><img src="${esc(e.image)}" alt="${esc(e.title)}" loading="lazy"></div>` : ''}
    <div class="event-body"><div class="date-chip"><b>${dm.d}</b><span>${dm.m}</span></div>
    <div><h3>${esc(e.title)}</h3><p class="meta">${fmtDate(e.date)}${e.location ? ' · ' + esc(e.location) : ''}</p>${e.description ? `<p>${esc(e.description)}</p>` : ''}</div></div></article>`;
}
const cards = (items, kind) => `<div class="grid cards">${items.map((a) => `<article class="card">
  ${a.image ? `<div class="card-img"><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"></div>` : ''}
  <div class="card-body"><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p></div></article>`).join('')}</div>`;
const featureGrid = (items) => `<div class="grid feats">${items.map((f) => `<div class="feat"><div class="ico" aria-hidden="true">${esc(f.icon)}</div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div>`).join('')}</div>`;
const galleryGrid = (items) => `<div class="gal">${items.map((g) => `<a class="gal-item" href="${esc(g.image)}" data-cat="${esc(g.category)}" data-cap="${esc(g.title)}">
  <img src="${esc(g.image)}" alt="${esc(g.title || 'School photo')}" loading="lazy"><span>${esc(g.title)}</span></a>`).join('')}</div>`;
const testimonialsBlock = (items) => items.length ? `<section class="section alt"><div class="wrap">${sectionHead('Voices', 'What Parents Say')}
  <div class="grid testi">${items.map((t) => `<figure class="testi-card"><blockquote>“${esc(t.message)}”</blockquote><figcaption><b>${esc(t.name)}</b> · ${esc(t.role)}</figcaption></figure>`).join('')}</div></div></section>` : '';

/* ───────── Pages ───────── */
const pages = {
  home(d) {
    const s = d.s;
    const upcoming = d.events.filter((e) => e.date >= d.today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    const recent = d.events.filter((e) => e.date < d.today).slice(0, 3);
    const evs = upcoming.length ? upcoming : recent;
    return `${hero(d)}${admissionBanner(s)}${stats(s)}
<section class="section"><div class="wrap two">
  <div class="two-txt">${sectionHead('Welcome', s.welcome_title)}${paras(s.welcome_message)}
    <p class="sign">— ${esc(s.welcome_by)}</p><a class="btn btn-blue" href="/about">More about us</a></div>
  <div class="two-img">${s.management_photo ? `<img src="${esc(s.management_photo)}" alt="School management with students" loading="lazy">` : ''}</div>
</div></section>
${d.features.length ? `<section class="section alt"><div class="wrap">${sectionHead('Why JPA Vidyalaya', 'What Makes Us Special')}${featureGrid(d.features.slice(0, 6))}
  <p class="center"><a class="btn btn-ghost-dark" href="/features">All features</a></p></div></section>` : ''}
<section class="section"><div class="wrap two-col">
  <div><h2 class="h-line">📢 Notice Board</h2>${noticeList(d.notices.slice(0, 5))}</div>
  <div><h2 class="h-line">🗓️ ${upcoming.length ? 'Upcoming Events' : 'Recent Events'}</h2>
    ${evs.length ? evs.map((e) => eventCard(e, !upcoming.length)).join('') : empty('Events will be announced soon.')}
    <p><a class="link" href="/events">View all events →</a></p></div>
</div></section>
${d.activities.length ? `<section class="section alt"><div class="wrap">${sectionHead('Beyond the classroom', 'Co-Curricular Activities')}${cards(d.activities.slice(0, 3))}
  <p class="center"><a class="btn btn-ghost-dark" href="/activities">Explore activities</a></p></div></section>` : ''}
${d.gallery.length ? `<section class="section"><div class="wrap">${sectionHead('Moments', 'From Our Gallery')}${galleryGrid(d.gallery.slice(0, 8))}
  <p class="center"><a class="btn btn-blue" href="/gallery">See all photos</a></p></div></section>${LIGHTBOX}` : ''}
${testimonialsBlock(d.testimonials)}
<section class="section cta"><div class="wrap cta-in"><div><h2>Visit us. Meet our team. See the difference.</h2><p>Call <a href="${telHref(s.phone)}">${esc(s.phone)}</a> or send an enquiry and we will get back to you.</p></div>
  <a class="btn btn-gold" href="/contact#enquiry">Send an Enquiry</a></div></section>`;
  },

  about(d) {
    const s = d.s;
    return `${pageHead('About Us', s.tagline)}
<section class="section"><div class="wrap two"><div class="two-txt">${sectionHead('Our story', s.school_name)}${paras(s.about_text)}</div>
  <div class="two-img"><img src="${esc(d.slides[0]?.image || s.management_photo)}" alt="School campus" loading="lazy"></div></div></section>
<section class="section alt"><div class="wrap grid vm">
  <div class="vm-card"><div class="ico">🔭</div><h3>Our Vision</h3><p>${esc(s.vision)}</p></div>
  <div class="vm-card"><div class="ico">🎯</div><h3>Our Mission</h3><p>${esc(s.mission)}</p></div>
</div></section>
<section class="section"><div class="wrap two rev"><div class="two-txt">${sectionHead('Message', s.welcome_title)}${paras(s.welcome_message)}<p class="sign">— ${esc(s.welcome_by)}</p></div>
  <div class="two-img">${s.management_photo ? `<img src="${esc(s.management_photo)}" alt="Management" loading="lazy">` : ''}</div></div></section>
<section class="section alt"><div class="wrap"><div class="info-grid">
  <div><span>📍 Address</span><b>${esc(s.address)}</b></div><div><span>📞 Phone</span><b>${esc(s.phone)}</b></div>
  <div><span>✉️ Email</span><b>${esc(s.email)}</b></div><div><span>🕘 Office hours</span><b>${esc(s.working_hours)}</b></div></div></div></section>`;
  },

  management(d) {
    const s = d.s;
    const groups = {};
    for (const p of d.staff) (groups[p.grp] ||= []).push(p);
    const order = Object.keys(groups).sort((a, b) => (a === 'Management' ? -1 : b === 'Management' ? 1 : a.localeCompare(b)));
    return `${pageHead('Management Team', 'The people who guide and care for our school')}
<section class="section"><div class="wrap two"><div class="two-img">${s.management_photo ? `<img src="${esc(s.management_photo)}" alt="School management with students" loading="lazy">` : ''}</div>
  <div class="two-txt">${sectionHead('Leadership', 'Our Management')}${paras(s.management_text)}${paras(s.welcome_message)}<p class="sign">— ${esc(s.welcome_by)}</p></div></div></section>
${order.map((g, i) => `<section class="section${i % 2 === 0 ? ' alt' : ''}"><div class="wrap">${sectionHead(g === 'Management' ? 'Leadership' : 'Our team', g === 'Management' ? 'Management' : g)}
  <div class="grid team">${groups[g].map((p) => `<article class="person">
    <div class="avatar">${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">` : `<span>${initials(p.name)}</span>`}</div>
    <h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p>${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}</article>`).join('')}</div></div></section>`).join('')}`;
  },

  activities(d) {
    return `${pageHead('Co-Curricular Activities', 'Learning that goes far beyond textbooks')}
<section class="section"><div class="wrap">${d.activities.length ? cards(d.activities) : empty('Activities will be listed soon.')}</div></section>`;
  },

  features(d) {
    return `${pageHead('Features', 'What children and parents love about us')}
<section class="section"><div class="wrap">${d.features.length ? featureGrid(d.features) : empty('Features will be listed soon.')}</div></section>
${admissionBanner(d.s)}`;
  },

  events(d) {
    const up = d.events.filter((e) => e.date >= d.today).sort((a, b) => a.date.localeCompare(b.date));
    const past = d.events.filter((e) => e.date < d.today);
    return `${pageHead('Events & Notices', 'Stay up to date with school life')}
<section class="section"><div class="wrap two-col">
  <div><h2 class="h-line">🗓️ Upcoming Events</h2>${up.length ? up.map((e) => eventCard(e)).join('') : empty('No upcoming events right now. Please check back soon.')}
    <h2 class="h-line" style="margin-top:2.5rem">🏆 Past Events</h2>${past.length ? past.map((e) => eventCard(e, true)).join('') : empty('Nothing here yet.')}</div>
  <aside><h2 class="h-line">📢 Notice Board</h2>${noticeList(d.notices)}</aside>
</div></section>`;
  },

  gallery(d) {
    const cats = [...new Set(d.gallery.map((g) => g.category))];
    return `${pageHead('Gallery', 'Moments from our school')}
<section class="section"><div class="wrap">
  ${cats.length > 1 ? `<div class="chips" role="tablist" aria-label="Filter photos"><button class="chip on" data-f="all">All</button>${cats.map((c) => `<button class="chip" data-f="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
  ${d.gallery.length ? galleryGrid(d.gallery) : empty('Photos will be added soon.')}
</div></section>
${LIGHTBOX}`;
  },

  contact(d) {
    const s = d.s;
    const map = s.map_url || `https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed`;
    return `${pageHead('Contact Us', 'We would love to hear from you')}
<section class="section"><div class="wrap two-col">
  <div><h2 class="h-line">Get in touch</h2><ul class="contact-cards">
    <li><span>📍</span><div><b>Address</b>${esc(s.address)}</div></li>
    <li><span>📞</span><div><b>Phone</b><a href="${telHref(s.phone)}">${esc(s.phone)}</a></div></li>
    <li><span>✉️</span><div><b>Email</b><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></div></li>
    <li><span>🕘</span><div><b>Office hours</b>${esc(s.working_hours)}</div></li></ul>
    <iframe class="map" title="School location map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(map)}"></iframe></div>
  <div id="enquiry"><h2 class="h-line">Send an enquiry</h2>${s.admission_open === '1' ? `<p class="muted">${esc(s.admission_text)}</p>` : ''}${inquiryForm(s, 'admission')}</div>
</div></section>`;
  },
};

exports.render = (page, data) => layout(page, data, pages[page](data));
