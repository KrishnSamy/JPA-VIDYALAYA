'use strict';
// Initial content, written only on the very first run. Everything is editable from /admin.
exports.run = function run(db) {
  const done = db.prepare("SELECT value FROM settings WHERE key='seeded'").get();
  if (done) return;
  const ins = (table, rows) => {
    if (db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c) return;
    for (const r of rows) {
      const cols = Object.keys(r);
      db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).run(...cols.map((c) => r[c]));
    }
  };
  const U = (n) => `/uploads/photo-${String(n).padStart(2, '0')}.jpg`;

  db.exec('BEGIN');
  ins('slides', [
    { title: 'Foundation For Future', subtitle: 'A caring, activity-based school in Gangaigondan, Neyveli', image: U(14), link: '/about', sort: 1 },
    { title: 'Kindergarten Graduation Day', subtitle: 'Celebrating our youngest graduates — Graduation Day & Grandparents’ Day 2026', image: U(1), link: '/gallery', sort: 2 },
    { title: 'Learning Through Discovery', subtitle: 'Science Expo — hands-on projects by our students', image: U(5), link: '/activities', sort: 3 },
  ]);
  ins('notices', [
    { title: 'Admissions open for the upcoming academic year', body: 'Parents are welcome to visit the school office or send an online enquiry. Call 83006 20179 for details.', date: '2026-10-10', important: 1 },
    { title: 'Photos from Graduation Day 2026 are now in the gallery', body: 'Relive the kindergarten graduation celebrations on our Gallery page.', date: '2026-10-10', important: 0 },
  ]);
  ins('events', [
    { title: 'Graduation Day & Grandparents’ Day', description: 'Our kindergarten students received their diploma certificates in gowns and caps, cheered on by parents and grandparents.', date: '2026-03-28', location: 'JPA Vidyalaya Matric School campus', image: U(1) },
  ]);
  const gal = [
    [1, 'Kindergarten Graduation Day 2026 — graduates with their diplomas', 'Graduation Day'],
    [2, 'Graduation Day — young graduates on stage with guests', 'Graduation Day'],
    [3, 'Graduation Day — the whole batch together', 'Graduation Day'],
    [6, 'Graduation Day — guests with our graduates', 'Graduation Day'],
    [7, 'Graduation Day — group photo with the “2026” cut-outs', 'Graduation Day'],
    [4, 'Students present a memento on stage', 'Events'],
    [0, 'Special guests at the school celebrations', 'Events'],
    [11, 'Welcome ceremony for visiting guests', 'Events'],
    [12, 'Felicitating a guest with a shawl', 'Events'],
    [13, 'Felicitation by the management', 'Events'],
    [5, 'Science Expo — visitors try out the telescope', 'Science Expo'],
    [8, 'Science Expo — little learners explain their project', 'Science Expo'],
    [9, 'Science Expo — a guest greets a little learner in the LKG block', 'Science Expo'],
    [10, 'Students receiving refreshments at the fair', 'Events'],
    [14, 'Our school campus and courtyard', 'Campus'],
  ];
  ins('gallery', gal.map(([n, title, category], i) => ({ title, category, image: U(n), sort: i + 1 })));
  ins('activities', [
    { title: 'Science Expo', description: 'Students build and present working models, charts and experiments, learning by doing and by explaining.', image: U(8), sort: 1 },
    { title: 'Graduation & Grandparents’ Day', description: 'A joyful annual celebration where our kindergarten children graduate in gowns and caps with their families watching.', image: U(2), sort: 2 },
    { title: 'Tamil Language & Culture Exhibits', description: 'Classroom displays celebrating Tamil literature, heritage and the classical language.', image: U(5), sort: 3 },
    { title: 'Food Fair & Student Stalls', description: 'Students run stalls and learn teamwork, money sense and confidence while parents and guests enjoy the fair.', image: U(14), sort: 4 },
    { title: 'Welcome & Cultural Traditions', description: 'Guests are welcomed the traditional way, teaching children respect and warmth.', image: U(11), sort: 5 },
  ]);
  ins('features', [
    { icon: '🎨', title: 'Colourful, Child-friendly Classrooms', description: 'Bright themed rooms — from science corners to LKG classrooms — make learning inviting.', sort: 1 },
    { icon: '🔬', title: 'Hands-on Science Learning', description: 'Exhibitions, models and demonstrations bring concepts to life.', sort: 2 },
    { icon: '🎓', title: 'Celebrating Every Milestone', description: 'Graduation Day and school events recognise each child’s progress.', sort: 3 },
    { icon: '👨‍👩‍👧', title: 'Strong Parent Partnership', description: 'Parents and grandparents are part of our celebrations and our school community.', sort: 4 },
    { icon: '📹', title: 'Monitored, Safe Campus', description: 'A secure campus with CCTV cameras and caring staff on duty.', sort: 5 },
    { icon: '🗣️', title: 'Tamil & English Learning', description: 'A balanced language environment that respects our culture while preparing children for the world.', sort: 6 },
  ]);
  db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('seeded','1')").run();
  db.exec('COMMIT');
};
